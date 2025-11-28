# Deploy Supabase Edge Function using Management API
# This script deploys the fetch-phone-from-places function to your hosted Supabase instance

param(
    [Parameter(Mandatory=$false)]
    [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN
)

# Configuration
$ProjectRef = "ekklokrukxmqlahtonnc"
$FunctionName = "fetch-phone-from-places"
$FunctionPath = "supabase\functions\$FunctionName\index.ts"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Supabase Edge Function Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if access token is provided
if ([string]::IsNullOrWhiteSpace($AccessToken)) {
    Write-Host "ERROR: No access token provided!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please provide your Supabase access token using one of these methods:" -ForegroundColor Yellow
    Write-Host "  1. Set environment variable: " -ForegroundColor White -NoNewline
    Write-Host "`$env:SUPABASE_ACCESS_TOKEN = 'your_token'" -ForegroundColor Green
    Write-Host "  2. Pass as parameter: " -ForegroundColor White -NoNewline
    Write-Host ".\deploy-function-api.ps1 -AccessToken 'your_token'" -ForegroundColor Green
    Write-Host ""
    Write-Host "Get your access token from: https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
    exit 1
}

# Check if function file exists
if (-not (Test-Path $FunctionPath)) {
    Write-Host "ERROR: Function file not found at: $FunctionPath" -ForegroundColor Red
    exit 1
}

Write-Host "Function: $FunctionName" -ForegroundColor White
Write-Host "Project: $ProjectRef" -ForegroundColor White
Write-Host ""

# Read the function code
$FunctionCode = Get-Content -Path $FunctionPath -Raw

Write-Host "Reading function code... " -ForegroundColor Yellow -NoNewline
Write-Host "OK ($($FunctionCode.Length) bytes)" -ForegroundColor Green

# Prepare the deployment payload
$Body = @{
    slug = $FunctionName
    name = $FunctionName
    verify_jwt = $false
    import_map = $false
    entrypoint_path = "index.ts"
} | ConvertTo-Json

Write-Host "Preparing deployment payload... " -ForegroundColor Yellow -NoNewline
Write-Host "OK" -ForegroundColor Green

# Deploy using Supabase Management API
$ApiUrl = "https://api.supabase.com/v1/projects/$ProjectRef/functions/$FunctionName"

Write-Host ""
Write-Host "Deploying to Supabase..." -ForegroundColor Yellow

try {
    # First, create or update the function metadata
    $Headers = @{
        "Authorization" = "Bearer $AccessToken"
        "Content-Type" = "application/json"
    }

    Write-Host "  - Creating/updating function metadata..." -ForegroundColor Gray

    $Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers -Body $Body -ErrorAction Stop

    Write-Host "  - Function metadata updated" -ForegroundColor Green

    # Now deploy the function code using the CLI
    Write-Host "  - Uploading function code via CLI..." -ForegroundColor Gray

    $env:SUPABASE_ACCESS_TOKEN = $AccessToken
    & npx supabase functions deploy $FunctionName --project-ref $ProjectRef --no-verify-jwt

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "  Deployment Successful!" -ForegroundColor Green
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Set the GOOGLE_MAPS_API_KEY secret:" -ForegroundColor White
        Write-Host "     https://supabase.com/dashboard/project/$ProjectRef/settings/functions" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Test your function at:" -ForegroundColor White
        Write-Host "     https://$ProjectRef.supabase.co/functions/v1/$FunctionName" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "ERROR: Deployment failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host ""
    Write-Host "ERROR: Deployment failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use the Supabase Dashboard to deploy manually:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/$ProjectRef/functions" -ForegroundColor Gray
    exit 1
}
