@echo off
REM ============================================
REM EMERGENCY DEPLOYMENT - FASTEST OPTION
REM ============================================
echo.
echo ===========================================
echo EMERGENCY DEPLOYMENT - SQL Server Integration
echo Time Required: 3-5 minutes
echo ===========================================
echo.

REM Check if config exists
if not exist config.bat (
    echo ERROR: config.bat not found!
    echo Please edit config.bat first with your SQL Server details
    exit /b 1
)

REM Load configuration
call config.bat

echo Validating configuration...
if "%SQL_HOST%"=="YOUR_EC2_PRIVATE_IP_HERE" (
    echo.
    echo ERROR: You must edit config.bat first!
    echo.
    echo Quick steps:
    echo 1. Open config.bat in notepad
    echo 2. Replace placeholder values with your actual values
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo Configuration loaded:
echo - SQL Server: %SQL_HOST%:%SQL_PORT%
echo - Database: %SQL_DATABASE%
echo - Region: %REGION%
echo.

REM Generate unique names
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,14%"
set FUNCTION_NAME=CreateAccount%TIMESTAMP%
set API_NAME=AccountAPI%TIMESTAMP%

echo Deploying as: %FUNCTION_NAME%
echo.

REM Package Lambda
echo [1/5] Packaging Lambda function...
cd create-account
if exist function.zip del function.zip
powershell -command "Compress-Archive -Path index.js,node_modules,package.json -DestinationPath function.zip -Force" >nul 2>&1
cd ..

REM Get account ID
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set AWS_ACCOUNT_ID=%%i

REM Create Lambda execution role
echo [2/5] Creating Lambda execution role...
aws iam create-role --role-name %FUNCTION_NAME%Role --assume-role-policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}" >nul 2>&1

aws iam attach-role-policy --role-name %FUNCTION_NAME%Role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole >nul 2>&1

REM Wait for role propagation
timeout /t 5 /nobreak >nul

REM Deploy Lambda
echo [3/5] Deploying Lambda function...
aws lambda create-function ^
    --function-name %FUNCTION_NAME% ^
    --runtime nodejs18.x ^
    --role arn:aws:iam::%AWS_ACCOUNT_ID%:role/%FUNCTION_NAME%Role ^
    --handler index.handler ^
    --zip-file fileb://create-account/function.zip ^
    --timeout 30 ^
    --environment Variables="{SQL_SERVER_HOST='%SQL_HOST%',SQL_SERVER_PORT='%SQL_PORT%',SQL_SERVER_USER='%SQL_USER%',SQL_SERVER_PASSWORD='%SQL_PASSWORD%',SQL_SERVER_DATABASE='%SQL_DATABASE%',ALLOWED_ORIGIN='*'}" ^
    --vpc-config SubnetIds=%SUBNET_ID_1%,%SUBNET_ID_2%,SecurityGroupIds=%SECURITY_GROUP_ID% >nul 2>&1

if %errorlevel% neq 0 (
    echo ERROR: Lambda deployment failed. Check your VPC settings.
    pause
    exit /b 1
)

REM Create API Gateway
echo [4/5] Creating API Gateway...
for /f "tokens=*" %%i in ('aws apigatewayv2 create-api --name %API_NAME% --protocol-type HTTP --cors-configuration AllowOrigins="*",AllowMethods="*",AllowHeaders="*" --query ApiId --output text') do set API_ID=%%i

REM Create integration
for /f "tokens=*" %%i in ('aws apigatewayv2 create-integration --api-id %API_ID% --integration-type AWS_PROXY --integration-uri arn:aws:lambda:%REGION%:%AWS_ACCOUNT_ID%:function:%FUNCTION_NAME% --payload-format-version 2.0 --query IntegrationId --output text') do set INT_ID=%%i

REM Create routes
aws apigatewayv2 create-route --api-id %API_ID% --route-key "POST /create-account" --target integrations/%INT_ID% >nul 2>&1
aws apigatewayv2 create-route --api-id %API_ID% --route-key "OPTIONS /create-account" --target integrations/%INT_ID% >nul 2>&1

REM Deploy stage
aws apigatewayv2 create-stage --api-id %API_ID% --stage-name prod --auto-deploy >nul 2>&1

REM Add permissions
aws lambda add-permission --function-name %FUNCTION_NAME% --statement-id api --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn arn:aws:execute-api:%REGION%:%AWS_ACCOUNT_ID%:%API_ID%/*/*/* >nul 2>&1

echo [5/5] Finalizing deployment...
echo.
echo =============================================
echo DEPLOYMENT SUCCESSFUL!
echo =============================================
echo.
echo YOUR API ENDPOINT:
echo https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account
echo.
echo ADD TO YOUR .env FILE:
echo VITE_CREATE_ACCOUNT_API=https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account
echo.
echo TEST COMMAND:
echo curl -X POST https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account -H "Content-Type: application/json" -d "{\"acct_name\":\"Test\",\"address\":\"123 Main\",\"city\":\"Austin\",\"state\":\"TX\",\"zip\":\"78701\",\"phone\":\"555-1234\"}"
echo.
echo =============================================
echo.

REM Save endpoint to file
echo https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account > api-endpoint.txt
echo Endpoint saved to: api-endpoint.txt
echo.
pause