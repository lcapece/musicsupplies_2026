# 🚀 QUICKSTART - Deploy in 5 Minutes

## Before You Start
Gather these 6 values (ask your AWS admin if needed):

1. **SQL Server Private IP**: `10.0.x.x` (EC2 instance IP)
2. **SQL Server Password**: Your `sa` or user password
3. **VPC ID**: `vpc-xxxxx` (where SQL Server lives)
4. **Subnet IDs**: `subnet-xxxxx,subnet-yyyyy` (2+ private subnets)
5. **SQL Server Security Group**: `sg-xxxxx`
6. **Netlify URL**: `https://yoursite.netlify.app`

---

## OPTION 1: One-Command Deploy (FASTEST) ⚡

### 1. Edit deploy.sh
```bash
cd aws-lambda
nano deploy.sh  # or use any editor
```

Update these lines:
```bash
SQL_HOST="10.0.1.100"           # ← Your SQL Server IP
SQL_PASSWORD="YourPassword"      # ← Your password
SQL_DATABASE="YourDB"            # ← Your database name
NETLIFY_URL="https://yoursite.netlify.app"  # ← Your URL
VPC_ID="vpc-xxxxx"               # ← Your VPC
SUBNET_IDS="subnet-a,subnet-b"   # ← Your subnets
SQL_SG_ID="sg-xxxxx"             # ← Your security group
```

### 2. Run It
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Copy the API endpoint from output
It will look like: `https://abc123.execute-api.us-east-1.amazonaws.com/prod/create-account`

### 4. Add to Netlify Environment Variables
Go to: Netlify Dashboard → Site Settings → Environment Variables → Add:
```
VITE_CREATE_ACCOUNT_API=https://abc123.execute-api.us-east-1.amazonaws.com/prod/create-account
```

### 5. Redeploy Netlify
```bash
git add .
git commit -m "Add create account API"
git push
```

---

## OPTION 2: Manual Deploy (Step by Step) 📋

### Step 1: Package Lambda
```bash
cd aws-lambda/create-account
npm install
zip -r ../function.zip index.js node_modules/
cd ..
```

### Step 2: Deploy CloudFormation
```bash
aws cloudformation create-stack \
  --stack-name musicsupplies-create-account \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=SQLServerHost,ParameterValue=YOUR_SQL_IP \
    ParameterKey=SQLServerPassword,ParameterValue=YOUR_PASSWORD \
    ParameterKey=SQLServerDatabase,ParameterValue=YOUR_DB \
    ParameterKey=SQLServerUser,ParameterValue=sa \
    ParameterKey=AllowedOrigin,ParameterValue=https://yoursite.netlify.app \
    ParameterKey=VpcId,ParameterValue=vpc-xxxxx \
    ParameterKey=SubnetIds,ParameterValue=\"subnet-a,subnet-b\" \
    ParameterKey=SQLServerSecurityGroupId,ParameterValue=sg-xxxxx \
  --capabilities CAPABILITY_NAMED_IAM
```

### Step 3: Wait for completion (2-3 minutes)
```bash
aws cloudformation wait stack-create-complete --stack-name musicsupplies-create-account
```

### Step 4: Upload Lambda code
```bash
FUNCTION=$(aws cloudformation describe-stacks \
  --stack-name musicsupplies-create-account \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
  --output text)

aws lambda update-function-code \
  --function-name $FUNCTION \
  --zip-file fileb://function.zip
```

### Step 5: Get API endpoint
```bash
aws cloudformation describe-stacks \
  --stack-name musicsupplies-create-account \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

---

## Using It in Your Code

### Example 1: Convert Prospect Button
```typescript
import { convertProspectToAccount } from '../lib/createAccount';

const handleConvertProspect = async () => {
  try {
    const result = await convertProspectToAccount(
      {
        id: prospect.id,
        name: prospect.name,
        phone: prospect.phone,
        email: prospect.email,
        city: prospect.city,
        state: prospect.state,
        zip: prospect.zip,
        assigned_to: staffUsername
      },
      staffUsername
    );

    if (result.success) {
      alert(`Account created! Account #${result.account_number}`);
      // Close modal, refresh data, etc.
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error(error);
    alert('Failed to create account');
  }
};
```

### Example 2: Direct Account Creation
```typescript
import { createAccountInSQLServer } from '../lib/createAccount';

const result = await createAccountInSQLServer({
  acct_name: 'New Music Store',
  address: '123 Main St',
  city: 'Nashville',
  state: 'TN',
  zip: '37201',
  phone: '6155551234',
  email_address: 'owner@musicstore.com',
  salesman: 'John Doe',
  terms: 'NET30'
});
```

---

## Testing

### Test from command line:
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
    "salesman": "Test User"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "account_number": 1001,
  "message": "Account created successfully"
}
```

---

## Troubleshooting

### ❌ "Cannot connect to SQL Server"
**Fix:** Check Lambda is in same VPC as SQL Server and security groups allow access

```bash
# Verify security group allows Lambda → SQL Server
aws ec2 describe-security-groups --group-ids YOUR_SQL_SG_ID
# Look for ingress rule from Lambda SG on port 1433
```

### ❌ "CORS error" from browser
**Fix:** Make sure `AllowedOrigin` matches your Netlify URL exactly (including https://)

### ❌ "Authentication failed"
**Fix:** Verify SQL Server credentials and mixed authentication mode is enabled

### ❌ API returns 500 error
**Fix:** Check Lambda CloudWatch logs:
```bash
aws logs tail /aws/lambda/musicsupplies-create-account-create-account --follow
```

---

## What Happens Behind the Scenes

1. **User clicks "Convert to Account" in Netlify app**
2. **Netlify → API Gateway** (public endpoint, no IP restrictions needed)
3. **API Gateway → Lambda** (triggered automatically)
4. **Lambda → SQL Server on EC2** (via VPC private network)
5. **SQL Server inserts record** into `accounts_lcmd` table
6. **Response flows back** through Lambda → API Gateway → Netlify
7. **SQL Server sync process** pushes new account to Supabase (your existing sync)
8. **Netlify refreshes** and shows new account

---

## Cost
- **Lambda**: $0.20 per million requests
- **API Gateway**: $3.50 per million requests
- **Data Transfer**: Free (same region)

**Total: ~$0.000004 per account creation** (essentially free)

---

## Need Help?

### Get Stack Status
```bash
aws cloudformation describe-stacks --stack-name musicsupplies-create-account
```

### View Lambda Logs
```bash
aws logs tail /aws/lambda/musicsupplies-create-account-create-account --follow
```

### Update Lambda Code Only
```bash
cd aws-lambda/create-account
zip -r ../function.zip index.js node_modules/
aws lambda update-function-code \
  --function-name musicsupplies-create-account-create-account \
  --zip-file fileb://../function.zip
```

### Delete Everything
```bash
aws cloudformation delete-stack --stack-name musicsupplies-create-account
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Netlify App (CRM)                      │
│                  (Dynamic IP - No Problem!)                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS API Gateway (Public Endpoint)              │
│          https://xxx.execute-api.region.amazonaws.com       │
└────────────────────────┬────────────────────────────────────┘
                         │ Invoke
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda Function                      │
│              (Node.js + mssql package)                      │
│                   [In VPC Private Subnet]                   │
└────────────────────────┬────────────────────────────────────┘
                         │ TCP 1433 (SQL Server)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 SQL Server on EC2 Instance                  │
│                    [VPC Private Subnet]                     │
│                   Master Database (LCMD)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ Existing Sync Process
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                               │
│                  (Web Operations DB)                        │
└─────────────────────────────────────────────────────────────┘
```

---

**✅ You're all set!** The deployment takes 5 minutes and creates a production-ready, secure, scalable API.
