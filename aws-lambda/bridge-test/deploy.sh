#!/bin/bash
# Deploy SQL Server Bridge Test Lambda with API Gateway
# Run from: C:\git\musicsupplies_nov\aws-lambda\bridge-test

set -e

FUNCTION_NAME="supabase-sqlserver-bridge"
REGION="us-east-1"
ROLE_ARN="arn:aws:iam::326686802112:role/adm"
VPC_CONFIG="SubnetIds=subnet-9caaf8f8,subnet-04b89e4f,subnet-f24cb8fd,SecurityGroupIds=sg-0fd96a70c11ccb48a"

echo "=== Deploying SQL Server Bridge Lambda ==="

# Check if Lambda exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo "Lambda exists, updating code..."

    # Package
    cd "$(dirname "$0")"
    zip -r function.zip lambda_function.py

    # Update
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION

    echo "Lambda code updated"
else
    echo "Creating new Lambda function..."

    # Package
    cd "$(dirname "$0")"
    zip -r function.zip lambda_function.py

    # Create Lambda
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://function.zip \
        --timeout 60 \
        --memory-size 256 \
        --vpc-config $VPC_CONFIG \
        --environment "Variables={DB_SERVER=172.31.66.246,DB_PORT=1433,DB_USER=dbox,DB_PASSWORD=Monday123\$,DB_NAME=LCMD_DB}" \
        --region $REGION

    echo "Lambda created"
fi

echo "=== Lambda deployment complete ==="
