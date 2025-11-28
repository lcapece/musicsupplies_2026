#!/bin/bash

#############################################
# RAPID DEPLOYMENT SCRIPT
# Deploys everything in one shot
#############################################

# ⚠️ CONFIGURE THESE VALUES FIRST ⚠️
SQL_HOST="10.0.1.100"                    # Your SQL Server EC2 private IP
SQL_PORT="1433"
SQL_USER="sa"                             # SQL Server username
SQL_PASSWORD="YOUR_PASSWORD_HERE"         # SQL Server password
SQL_DATABASE="YourDatabaseName"          # Database name
NETLIFY_URL="https://your-site.netlify.app"  # Your Netlify URL
VPC_ID="vpc-xxxxx"                       # VPC where SQL Server lives
SUBNET_IDS="subnet-xxxxx,subnet-yyyyy"   # Private subnets (comma separated)
SQL_SG_ID="sg-xxxxx"                     # SQL Server security group ID
STACK_NAME="musicsupplies-create-account"
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting rapid deployment...${NC}"

# Validation
if [ "$SQL_PASSWORD" == "YOUR_PASSWORD_HERE" ]; then
    echo -e "${RED}❌ ERROR: Please configure SQL_PASSWORD in deploy.sh${NC}"
    exit 1
fi

if [ "$VPC_ID" == "vpc-xxxxx" ]; then
    echo -e "${RED}❌ ERROR: Please configure VPC_ID in deploy.sh${NC}"
    exit 1
fi

# Step 1: Package Lambda
echo -e "${YELLOW}📦 Step 1/4: Packaging Lambda function...${NC}"
cd create-account || exit
npm install --production --silent
zip -q -r ../function.zip index.js node_modules/
cd .. || exit
echo -e "${GREEN}✅ Lambda packaged (function.zip created)${NC}"

# Step 2: Deploy CloudFormation
echo -e "${YELLOW}🚀 Step 2/4: Deploying CloudFormation stack...${NC}"
aws cloudformation create-stack \
  --stack-name "$STACK_NAME" \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=SQLServerHost,ParameterValue="$SQL_HOST" \
    ParameterKey=SQLServerPort,ParameterValue="$SQL_PORT" \
    ParameterKey=SQLServerUser,ParameterValue="$SQL_USER" \
    ParameterKey=SQLServerPassword,ParameterValue="$SQL_PASSWORD" \
    ParameterKey=SQLServerDatabase,ParameterValue="$SQL_DATABASE" \
    ParameterKey=AllowedOrigin,ParameterValue="$NETLIFY_URL" \
    ParameterKey=VpcId,ParameterValue="$VPC_ID" \
    ParameterKey=SubnetIds,ParameterValue="$SUBNET_IDS" \
    ParameterKey=SQLServerSecurityGroupId,ParameterValue="$SQL_SG_ID" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CloudFormation stack creation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CloudFormation stack creation initiated${NC}"

# Step 3: Wait for completion
echo -e "${YELLOW}⏳ Step 3/4: Waiting for stack creation (this takes 2-3 minutes)...${NC}"
aws cloudformation wait stack-create-complete \
  --stack-name "$STACK_NAME" \
  --region "$REGION"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Stack creation failed or timed out${NC}"
    echo "Check AWS Console for details"
    exit 1
fi

echo -e "${GREEN}✅ Stack created successfully${NC}"

# Step 4: Upload Lambda code
echo -e "${YELLOW}📤 Step 4/4: Uploading Lambda function code...${NC}"
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
  --output text)

aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://function.zip \
  --region "$REGION" \
  --no-cli-pager > /dev/null

echo -e "${GREEN}✅ Lambda code uploaded${NC}"

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📍 Your API Endpoint:${NC}"
echo -e "   ${GREEN}$API_ENDPOINT${NC}"
echo ""
echo -e "${YELLOW}🧪 Test with curl:${NC}"
echo "   curl -X POST $API_ENDPOINT \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"acct_name\":\"Test Account\",\"address\":\"123 Main St\",\"city\":\"Nashville\",\"state\":\"TN\",\"zip\":\"37201\",\"phone\":\"6155551234\"}'"
echo ""
echo -e "${YELLOW}📝 Add this to your Netlify .env:${NC}"
echo -e "   ${GREEN}VITE_CREATE_ACCOUNT_API=$API_ENDPOINT${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Save endpoint to file
echo "$API_ENDPOINT" > api-endpoint.txt
echo -e "${YELLOW}💾 API endpoint saved to: api-endpoint.txt${NC}"
