# RAPID DEPLOYMENT GUIDE - Netlify to SQL Server

## 🚀 FASTEST DEPLOYMENT (5 Minutes)

### Step 1: Package Lambda Function (1 minute)

```bash
cd aws-lambda/create-account
npm install
zip -r function.zip index.js node_modules/
```

### Step 2: Deploy CloudFormation Stack (3 minutes)

```bash
aws cloudformation create-stack \
  --stack-name musicsupplies-create-account \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=SQLServerHost,ParameterValue=10.0.1.100 \
    ParameterKey=SQLServerPort,ParameterValue=1433 \
    ParameterKey=SQLServerUser,ParameterValue=sa \
    ParameterKey=SQLServerPassword,ParameterValue=YOUR_PASSWORD \
    ParameterKey=SQLServerDatabase,ParameterValue=YourDatabase \
    ParameterKey=AllowedOrigin,ParameterValue=https://your-site.netlify.app \
    ParameterKey=VpcId,ParameterValue=vpc-xxxxx \
    ParameterKey=SubnetIds,ParameterValue=\"subnet-xxxxx,subnet-yyyyy\" \
    ParameterKey=SQLServerSecurityGroupId,ParameterValue=sg-xxxxx \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Replace these values:**
- `10.0.1.100` - Your EC2 SQL Server private IP
- `YOUR_PASSWORD` - Your SQL Server password
- `YourDatabase` - Your database name
- `https://your-site.netlify.app` - Your Netlify URL
- `vpc-xxxxx` - Your VPC ID
- `subnet-xxxxx,subnet-yyyyy` - Your private subnet IDs (where SQL Server lives)
- `sg-xxxxx` - Your SQL Server EC2 security group ID

### Step 3: Wait for Stack Creation

```bash
# Check status
aws cloudformation describe-stacks --stack-name musicsupplies-create-account --query 'Stacks[0].StackStatus'

# Get the API endpoint once complete
aws cloudformation describe-stacks \
  --stack-name musicsupplies-create-account \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

### Step 4: Update Lambda Function Code (1 minute)

```bash
# Get Lambda function name
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name musicsupplies-create-account \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
  --output text)

# Upload your code
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip
```

---

## 🔥 EVEN FASTER: One-Line Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Configuration
SQL_HOST="10.0.1.100"
SQL_PORT="1433"
SQL_USER="sa"
SQL_PASSWORD="YOUR_PASSWORD"
SQL_DATABASE="YourDatabase"
NETLIFY_URL="https://your-site.netlify.app"
VPC_ID="vpc-xxxxx"
SUBNET_IDS="subnet-xxxxx,subnet-yyyyy"
SQL_SG_ID="sg-xxxxx"
STACK_NAME="musicsupplies-create-account"

echo "📦 Step 1: Packaging Lambda..."
cd create-account
npm install --production
zip -r ../function.zip index.js node_modules/
cd ..

echo "🚀 Step 2: Deploying CloudFormation stack..."
aws cloudformation create-stack \
  --stack-name $STACK_NAME \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=SQLServerHost,ParameterValue=$SQL_HOST \
    ParameterKey=SQLServerPort,ParameterValue=$SQL_PORT \
    ParameterKey=SQLServerUser,ParameterValue=$SQL_USER \
    ParameterKey=SQLServerPassword,ParameterValue=$SQL_PASSWORD \
    ParameterKey=SQLServerDatabase,ParameterValue=$SQL_DATABASE \
    ParameterKey=AllowedOrigin,ParameterValue=$NETLIFY_URL \
    ParameterKey=VpcId,ParameterValue=$VPC_ID \
    ParameterKey=SubnetIds,ParameterValue=\"$SUBNET_IDS\" \
    ParameterKey=SQLServerSecurityGroupId,ParameterValue=$SQL_SG_ID \
  --capabilities CAPABILITY_NAMED_IAM

echo "⏳ Waiting for stack creation..."
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME

echo "📤 Step 3: Uploading Lambda code..."
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
  --output text)

aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip

echo "✅ DONE! Your API endpoint:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

Run it:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📋 Prerequisites (Get These First)

1. **AWS CLI configured** with credentials
2. **VPC ID** where SQL Server lives
3. **Subnet IDs** (private subnets with route to SQL Server)
4. **SQL Server Security Group ID**
5. **SQL Server private IP address**
6. **SQL Server credentials**

### Find Your Values

```bash
# Find VPC ID
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' --output table

# Find Subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=YOUR_VPC_ID" \
  --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' --output table

# Find SQL Server Security Group
aws ec2 describe-instances --filters "Name=tag:Name,Values=*sql*" \
  --query 'Reservations[*].Instances[*].[InstanceId,PrivateIpAddress,SecurityGroups[0].GroupId]' \
  --output table
```

---

## 🧪 Test the API

```bash
curl -X POST https://YOUR_API_ENDPOINT/create-account \
  -H "Content-Type: application/json" \
  -d '{
    "acct_name": "Test Account",
    "address": "123 Main St",
    "city": "Nashville",
    "state": "TN",
    "zip": "37201",
    "phone": "6155551234",
    "email_address": "test@example.com",
    "salesman": "John",
    "prospect_id": 123,
    "converted_by": "staff@musicsupplies.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "account_number": 1001,
  "message": "Account created successfully",
  "data": {
    "account_number": 1001,
    "acct_name": "Test Account"
  }
}
```

---

## 🔧 Troubleshooting

### Lambda can't connect to SQL Server
- Check Lambda is in correct subnets (same VPC as SQL Server)
- Verify security group ingress rule allows Lambda SG → SQL Server port 1433
- Check SQL Server is listening on 0.0.0.0 (not just 127.0.0.1)

### CORS errors from Netlify
- Update `AllowedOrigin` parameter to match your exact Netlify URL
- Include https:// protocol

### SQL Server authentication fails
- Verify SQL Server is in mixed authentication mode
- Check username/password are correct
- Ensure SQL Server user has INSERT permissions on accounts_lcmd table

---

## ⚡ Update Deployment (After First Deploy)

Just update Lambda code:
```bash
cd aws-lambda/create-account
zip -r function.zip index.js node_modules/
aws lambda update-function-code \
  --function-name musicsupplies-create-account-create-account \
  --zip-file fileb://function.zip
```

---

## 💰 Cost Estimate

- Lambda: ~$0.20 per 1 million requests
- API Gateway: ~$3.50 per 1 million requests
- Data transfer: Negligible (same region)

**Total: ~$0.00004 per account creation**

---

## 🗑️ Clean Up (If Needed)

```bash
aws cloudformation delete-stack --stack-name musicsupplies-create-account
```

This removes everything except the VPC, subnets, and SQL Server (those are protected).
