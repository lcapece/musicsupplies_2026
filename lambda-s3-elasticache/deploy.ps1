# PowerShell deployment script for S3-ElastiCache Lambda function
param(
    [Parameter(Mandatory=$true)]
    [string]$RedisEndpoint,
    
    [Parameter(Mandatory=$true)]
    [string]$VpcSecurityGroupId,
    
    [Parameter(Mandatory=$true)]
    [string]$SubnetId1,
    
    [Parameter(Mandatory=$true)]
    [string]$SubnetId2,
    
    [string]$Region = "us-east-1",
    [string]$FunctionName = "s3-elasticache-sync",
    [string]$RoleName = "s3-elasticache-lambda-role"
)

Write-Host "Deploying S3-ElastiCache Lambda Function" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Step 1: Install dependencies
Write-Host "`nStep 1: Installing dependencies..." -ForegroundColor Yellow
npm ci --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 2: Create IAM role for Lambda
Write-Host "`nStep 2: Creating IAM role..." -ForegroundColor Yellow
$roleArn = aws iam get-role --role-name $RoleName --query 'Role.Arn' --output text 2>$null

if (-not $roleArn) {
    Write-Host "Creating new IAM role: $RoleName" -ForegroundColor Cyan
    
    # Create the role
    aws iam create-role `
        --role-name $RoleName `
        --assume-role-policy-document file://lambda-policy.json `
        --region $Region
    
    # Attach basic Lambda execution policy
    aws iam attach-role-policy `
        --role-name $RoleName `
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole `
        --region $Region
    
    # Create and attach custom policy for S3 and ElastiCache
    $policyName = "$RoleName-policy"
    aws iam create-policy `
        --policy-name $policyName `
        --policy-document file://lambda-execution-policy.json `
        --region $Region
    
    $accountId = aws sts get-caller-identity --query Account --output text
    aws iam attach-role-policy `
        --role-name $RoleName `
        --policy-arn "arn:aws:iam::${accountId}:policy/${policyName}" `
        --region $Region
    
    # Get the role ARN
    $roleArn = aws iam get-role --role-name $RoleName --query 'Role.Arn' --output text
    
    # Wait for role to propagate
    Write-Host "Waiting for IAM role to propagate (10 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
} else {
    Write-Host "Using existing IAM role: $RoleName" -ForegroundColor Cyan
}

Write-Host "Role ARN: $roleArn" -ForegroundColor Gray

# Step 3: Package Lambda function
Write-Host "`nStep 3: Packaging Lambda function..." -ForegroundColor Yellow
if (Test-Path "function.zip") {
    Remove-Item "function.zip"
}

# Create zip file (Windows compatible)
Compress-Archive -Path index.js, node_modules, package.json, package-lock.json -DestinationPath function.zip -Force

if (-not (Test-Path "function.zip")) {
    Write-Host "Failed to create function.zip" -ForegroundColor Red
    exit 1
}

$zipSize = (Get-Item "function.zip").Length / 1MB
Write-Host "Created function.zip (${zipSize:N2} MB)" -ForegroundColor Green

# Step 4: Create or update Lambda function
Write-Host "`nStep 4: Deploying Lambda function..." -ForegroundColor Yellow

# Check if function exists
$functionExists = aws lambda get-function --function-name $FunctionName --region $Region 2>$null

if (-not $functionExists) {
    Write-Host "Creating new Lambda function: $FunctionName" -ForegroundColor Cyan
    
    aws lambda create-function `
        --function-name $FunctionName `
        --runtime nodejs18.x `
        --role $roleArn `
        --handler index.handler `
        --zip-file fileb://function.zip `
        --timeout 60 `
        --memory-size 512 `
        --environment "Variables={REDIS_ENDPOINT=$RedisEndpoint,REDIS_PORT=6379}" `
        --vpc-config "SubnetIds=[$SubnetId1,$SubnetId2],SecurityGroupIds=[$VpcSecurityGroupId]" `
        --description "Syncs S3 bucket file list to ElastiCache" `
        --region $Region
    
} else {
    Write-Host "Updating existing Lambda function: $FunctionName" -ForegroundColor Cyan
    
    # Update function code
    aws lambda update-function-code `
        --function-name $FunctionName `
        --zip-file fileb://function.zip `
        --region $Region
    
    # Wait for update to complete
    Start-Sleep -Seconds 3
    
    # Update function configuration
    aws lambda update-function-configuration `
        --function-name $FunctionName `
        --timeout 60 `
        --memory-size 512 `
        --environment "Variables={REDIS_ENDPOINT=$RedisEndpoint,REDIS_PORT=6379}" `
        --vpc-config "SubnetIds=[$SubnetId1,$SubnetId2],SecurityGroupIds=[$VpcSecurityGroupId]" `
        --region $Region
}

# Step 5: Add S3 trigger
Write-Host "`nStep 5: Configuring S3 triggers..." -ForegroundColor Yellow

# Add permission for S3 to invoke Lambda
$sourceArn = "arn:aws:s3:::mus86077"

# Add permission for ObjectCreated events
aws lambda add-permission `
    --function-name $FunctionName `
    --statement-id s3-trigger-create `
    --action lambda:InvokeFunction `
    --principal s3.amazonaws.com `
    --source-arn $sourceArn `
    --region $Region 2>$null

# Add permission for ObjectRemoved events
aws lambda add-permission `
    --function-name $FunctionName `
    --statement-id s3-trigger-delete `
    --action lambda:InvokeFunction `
    --principal s3.amazonaws.com `
    --source-arn $sourceArn `
    --region $Region 2>$null

Write-Host "`nStep 6: Configure S3 bucket notification..." -ForegroundColor Yellow
Write-Host "NOTE: You need to manually configure S3 bucket notifications" -ForegroundColor Magenta
Write-Host "Go to S3 console > mus86077 bucket > Properties > Event notifications" -ForegroundColor White
Write-Host "Add notification with:" -ForegroundColor White
Write-Host "  - Event types: All object create events, All object removal events" -ForegroundColor White
Write-Host "  - Destination: Lambda function > $FunctionName" -ForegroundColor White

# Get Lambda function ARN
$functionArn = aws lambda get-function --function-name $FunctionName --query 'Configuration.FunctionArn' --output text --region $Region

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nFunction Details:" -ForegroundColor Cyan
Write-Host "  Name: $FunctionName" -ForegroundColor White
Write-Host "  ARN: $functionArn" -ForegroundColor White
Write-Host "  Region: $Region" -ForegroundColor White
Write-Host "  Redis Endpoint: $RedisEndpoint" -ForegroundColor White
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Configure S3 bucket notifications as described above" -ForegroundColor White
Write-Host "2. Test by uploading a file to the mus86077 bucket" -ForegroundColor White
Write-Host "3. Check CloudWatch logs for execution details" -ForegroundColor White