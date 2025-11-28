@echo off
REM ============================================
REM RAPID DEPLOYMENT - 5 MINUTE SETUP
REM SQL Server Account Creation API
REM ============================================
echo.
echo ====================================
echo RAPID DEPLOYMENT STARTING
echo Target: SQL Server Account Creation
echo Time: Under 5 minutes
echo ====================================
echo.

REM === CONFIGURATION - MODIFY THESE ===
set SQL_HOST=10.0.1.100
set SQL_PORT=1433
set SQL_USER=sa
set SQL_PASSWORD=YourSQLPassword
set SQL_DATABASE=YourDatabaseName
set VPC_ID=vpc-xxxxxxxxx
set SUBNET_ID_1=subnet-xxxxxxxxx
set SUBNET_ID_2=subnet-yyyyyyyyy
set SECURITY_GROUP_ID=sg-xxxxxxxxx
set REGION=us-east-1
set STACK_NAME=musicsupplies-account-api
set FUNCTION_NAME=create-account-lambda

REM === AUTO-GENERATED VALUES ===
set TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set S3_BUCKET=musicsupplies-lambda-%TIMESTAMP%
set ROLE_NAME=CreateAccountLambdaRole-%TIMESTAMP%

echo Step 1: Creating IAM Role for Lambda...
echo ----------------------------------------

REM Create trust policy
echo { > trust-policy.json
echo   "Version": "2012-10-17", >> trust-policy.json
echo   "Statement": [{ >> trust-policy.json
echo     "Effect": "Allow", >> trust-policy.json
echo     "Principal": {"Service": "lambda.amazonaws.com"}, >> trust-policy.json
echo     "Action": "sts:AssumeRole" >> trust-policy.json
echo   }] >> trust-policy.json
echo } >> trust-policy.json

aws iam create-role ^
    --role-name %ROLE_NAME% ^
    --assume-role-policy-document file://trust-policy.json ^
    --region %REGION%

REM Attach VPC execution policy
aws iam attach-role-policy ^
    --role-name %ROLE_NAME% ^
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole ^
    --region %REGION%

echo.
echo Step 2: Packaging Lambda function...
echo ------------------------------------
cd create-account
call npm install --quiet
if exist function.zip del function.zip
powershell -command "Compress-Archive -Path index.js,node_modules,package.json -DestinationPath function.zip -Force"
cd ..

echo.
echo Step 3: Creating S3 bucket for deployment...
echo ---------------------------------------------
aws s3 mb s3://%S3_BUCKET% --region %REGION% 2>nul

echo.
echo Step 4: Uploading Lambda function...
echo -------------------------------------
aws s3 cp create-account/function.zip s3://%S3_BUCKET%/function.zip --region %REGION%

echo.
echo Step 5: Getting Account ID...
echo -----------------------------
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set AWS_ACCOUNT_ID=%%i
echo Account ID: %AWS_ACCOUNT_ID%

REM Wait for role to propagate
timeout /t 10 /nobreak >nul

echo.
echo Step 6: Creating Lambda function...
echo -----------------------------------
aws lambda create-function ^
    --function-name %FUNCTION_NAME% ^
    --runtime nodejs18.x ^
    --role arn:aws:iam::%AWS_ACCOUNT_ID%:role/%ROLE_NAME% ^
    --handler index.handler ^
    --code S3Bucket=%S3_BUCKET%,S3Key=function.zip ^
    --timeout 30 ^
    --memory-size 256 ^
    --environment Variables="{SQL_SERVER_HOST=%SQL_HOST%,SQL_SERVER_PORT=%SQL_PORT%,SQL_SERVER_USER=%SQL_USER%,SQL_SERVER_PASSWORD=%SQL_PASSWORD%,SQL_SERVER_DATABASE=%SQL_DATABASE%,ALLOWED_ORIGIN=*}" ^
    --vpc-config SubnetIds=%SUBNET_ID_1%,%SUBNET_ID_2%,SecurityGroupIds=%SECURITY_GROUP_ID% ^
    --region %REGION%

echo.
echo Step 7: Creating API Gateway...
echo -------------------------------
for /f "tokens=*" %%i in ('aws apigatewayv2 create-api ^
    --name musicsupplies-account-api ^
    --protocol-type HTTP ^
    --cors-configuration AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="*" ^
    --query ApiId ^
    --output text ^
    --region %REGION%') do set API_ID=%%i

echo API ID: %API_ID%

echo.
echo Step 8: Creating Lambda integration...
echo --------------------------------------
for /f "tokens=*" %%i in ('aws apigatewayv2 create-integration ^
    --api-id %API_ID% ^
    --integration-type AWS_PROXY ^
    --integration-method POST ^
    --integration-uri arn:aws:lambda:%REGION%:%AWS_ACCOUNT_ID%:function:%FUNCTION_NAME% ^
    --payload-format-version 2.0 ^
    --query IntegrationId ^
    --output text ^
    --region %REGION%') do set INTEGRATION_ID=%%i

echo Integration ID: %INTEGRATION_ID%

echo.
echo Step 9: Creating route...
echo -------------------------
aws apigatewayv2 create-route ^
    --api-id %API_ID% ^
    --route-key "POST /create-account" ^
    --target integrations/%INTEGRATION_ID% ^
    --region %REGION% >nul

aws apigatewayv2 create-route ^
    --api-id %API_ID% ^
    --route-key "OPTIONS /create-account" ^
    --target integrations/%INTEGRATION_ID% ^
    --region %REGION% >nul

echo.
echo Step 10: Creating deployment stage...
echo -------------------------------------
aws apigatewayv2 create-stage ^
    --api-id %API_ID% ^
    --stage-name prod ^
    --auto-deploy ^
    --region %REGION% >nul

echo.
echo Step 11: Adding Lambda permission for API Gateway...
echo ----------------------------------------------------
aws lambda add-permission ^
    --function-name %FUNCTION_NAME% ^
    --statement-id apigateway-invoke ^
    --action lambda:InvokeFunction ^
    --principal apigateway.amazonaws.com ^
    --source-arn arn:aws:execute-api:%REGION%:%AWS_ACCOUNT_ID%:%API_ID%/*/*/create-account ^
    --region %REGION% 2>nul

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo API ENDPOINT:
echo https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account
echo.
echo Add this to your .env file:
echo VITE_CREATE_ACCOUNT_API=https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account
echo.
echo Test with:
echo curl -X POST https://%API_ID%.execute-api.%REGION%.amazonaws.com/prod/create-account ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"acct_name\":\"Test Company\",\"address\":\"123 Main St\",\"city\":\"Austin\",\"state\":\"TX\",\"zip\":\"78701\",\"phone\":\"512-555-1234\"}"
echo.
echo ========================================

REM Cleanup
del trust-policy.json 2>nul

pause