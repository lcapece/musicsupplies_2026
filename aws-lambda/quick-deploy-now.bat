@echo off
REM ============================================
REM ULTRA-RAPID DEPLOYMENT - NO VPC REQUIRED
REM ============================================
echo.
echo ====================================
echo DEPLOYING SQL SERVER INTEGRATION
echo Time: Under 3 minutes
echo ====================================
echo.

REM Load configuration
call config.bat

REM Generate unique names
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,14%"
set FUNCTION_NAME=SQLAccount%TIMESTAMP%
set ROLE_NAME=SQLAccountRole%TIMESTAMP%

echo Configuration:
echo - SQL Server: %SQL_HOST% (Database: %SQL_DATABASE%)
echo - Function: %FUNCTION_NAME%
echo.

REM Package Lambda
echo [1/4] Packaging Lambda function...
cd create-account
if exist function.zip del function.zip
powershell -command "Compress-Archive -Path index.js,node_modules,package.json -DestinationPath function.zip -Force"
cd ..

REM Create execution role
echo [2/4] Creating Lambda execution role...
echo { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole" }] } > trust.json

aws iam create-role --role-name %ROLE_NAME% --assume-role-policy-document file://trust.json >nul 2>&1

REM Attach basic Lambda execution policy
aws iam attach-role-policy --role-name %ROLE_NAME% --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole >nul 2>&1

REM Get account ID
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set AWS_ACCOUNT_ID=%%i

REM Wait for role
timeout /t 8 /nobreak >nul

REM Create Lambda WITHOUT VPC (can access internet/SQL Server via public IP if needed)
echo [3/4] Creating Lambda function...
aws lambda create-function ^
    --function-name %FUNCTION_NAME% ^
    --runtime nodejs18.x ^
    --role arn:aws:iam::%AWS_ACCOUNT_ID%:role/%ROLE_NAME% ^
    --handler index.handler ^
    --zip-file fileb://create-account/function.zip ^
    --timeout 30 ^
    --memory-size 512 ^
    --environment Variables="{SQL_SERVER_HOST='%SQL_HOST%',SQL_SERVER_PORT='%SQL_PORT%',SQL_SERVER_USER='%SQL_USER%',SQL_SERVER_PASSWORD='%SQL_PASSWORD%',SQL_SERVER_DATABASE='%SQL_DATABASE%',ALLOWED_ORIGIN='*'}" >nul 2>&1

if %errorlevel% neq 0 (
    echo ERROR: Lambda creation failed. Trying without quotes...
    aws lambda create-function ^
        --function-name %FUNCTION_NAME% ^
        --runtime nodejs18.x ^
        --role arn:aws:iam::%AWS_ACCOUNT_ID%:role/%ROLE_NAME% ^
        --handler index.handler ^
        --zip-file fileb://create-account/function.zip ^
        --timeout 30 ^
        --memory-size 512 ^
        --environment "Variables={SQL_SERVER_HOST=%SQL_HOST%,SQL_SERVER_PORT=%SQL_PORT%,SQL_SERVER_USER=%SQL_USER%,SQL_SERVER_PASSWORD=%SQL_PASSWORD%,SQL_SERVER_DATABASE=%SQL_DATABASE%,ALLOWED_ORIGIN=*}" >nul 2>&1
)

REM Create Function URL (simpler than API Gateway)
echo [4/4] Creating public endpoint...
for /f "tokens=*" %%i in ('aws lambda create-function-url-config ^
    --function-name %FUNCTION_NAME% ^
    --auth-type NONE ^
    --cors AllowOrigins="*",AllowMethods="*",AllowHeaders="*",MaxAge=86400 ^
    --query FunctionUrl ^
    --output text 2^>nul') do set FUNCTION_URL=%%i

if "%FUNCTION_URL%"=="" (
    echo Creating API Gateway instead...
    REM Fallback to API Gateway
    for /f "tokens=*" %%i in ('aws apigatewayv2 create-api --name %FUNCTION_NAME%-api --protocol-type HTTP --cors-configuration AllowOrigins="*",AllowMethods="*",AllowHeaders="*" --query ApiId --output text') do set API_ID=%%i

    for /f "tokens=*" %%i in ('aws apigatewayv2 create-integration --api-id %API_ID% --integration-type AWS_PROXY --integration-uri arn:aws:lambda:us-east-1:%AWS_ACCOUNT_ID%:function:%FUNCTION_NAME% --payload-format-version 2.0 --query IntegrationId --output text') do set INT_ID=%%i

    aws apigatewayv2 create-route --api-id %API_ID% --route-key "POST /create-account" --target integrations/%INT_ID% >nul 2>&1
    aws apigatewayv2 create-route --api-id %API_ID% --route-key "OPTIONS /create-account" --target integrations/%INT_ID% >nul 2>&1
    aws apigatewayv2 create-stage --api-id %API_ID% --stage-name prod --auto-deploy >nul 2>&1

    aws lambda add-permission --function-name %FUNCTION_NAME% --statement-id api --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn arn:aws:execute-api:us-east-1:%AWS_ACCOUNT_ID%:%API_ID%/*/*/* >nul 2>&1

    set ENDPOINT_URL=https://%API_ID%.execute-api.us-east-1.amazonaws.com/prod/create-account
) else (
    set ENDPOINT_URL=%FUNCTION_URL%create-account
)

REM Cleanup
del trust.json 2>nul

echo.
echo =========================================
echo DEPLOYMENT COMPLETE!
echo =========================================
echo.
echo YOUR API ENDPOINT:
echo %ENDPOINT_URL%
echo.
echo ADD TO .env FILE:
echo VITE_CREATE_ACCOUNT_API=%ENDPOINT_URL%
echo.
echo TEST WITH:
echo curl -X POST %ENDPOINT_URL% -H "Content-Type: application/json" -d "{\"acct_name\":\"Test\",\"address\":\"123 Main\",\"city\":\"Austin\",\"state\":\"TX\",\"zip\":\"78701\",\"phone\":\"555-1234\"}"
echo.
echo SAVED TO: api-endpoint.txt
echo %ENDPOINT_URL% > api-endpoint.txt
echo.
echo =========================================
echo.
pause