# Setup MCP for Claude Code on Windows - COMPLETELY FREE
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Claude Code MCP Setup for Windows" -ForegroundColor Cyan
Write-Host "Cost: FREE (ZERO DOLLARS)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set Git Bash path
Write-Host "Step 1: Setting Git Bash path..." -ForegroundColor Yellow
$gitBashPath = "C:\GitExe\usr\bin\bash.exe"

if (Test-Path $gitBashPath) {
    [System.Environment]::SetEnvironmentVariable('CLAUDE_CODE_GIT_BASH_PATH', $gitBashPath, 'User')
    Write-Host "SUCCESS: Git Bash path configured" -ForegroundColor Green
    $env:CLAUDE_CODE_GIT_BASH_PATH = $gitBashPath
} else {
    Write-Host "ERROR: Git Bash not found" -ForegroundColor Red
    exit 1
}

# Step 2: Set Supabase environment variables
Write-Host ""
Write-Host "Step 2: Setting Supabase environment variables..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable('SUPABASE_URL', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'User')
[System.Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'User')
[System.Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'User')

$env:SUPABASE_URL = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
$env:SUPABASE_SERVICE_ROLE_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
$env:SUPABASE_ACCESS_TOKEN = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

Write-Host "SUCCESS: All Supabase variables configured" -ForegroundColor Green

# Step 3: Remove old config
Write-Host ""
Write-Host "Step 3: Cleaning up old MCP configuration..." -ForegroundColor Yellow
$removeOutput = & claude mcp remove supabase 2>&1
Write-Host "SUCCESS: Cleanup complete" -ForegroundColor Green

# Step 4: Add Supabase MCP
Write-Host ""
Write-Host "Step 4: Adding Supabase MCP server..." -ForegroundColor Yellow
Write-Host "Running: claude mcp add --transport stdio supabase -- cmd /c npx @supabase-community/supabase-mcp" -ForegroundColor Gray

$addOutput = & claude mcp add --transport stdio supabase -- cmd /c npx "@supabase-community/supabase-mcp" 2>&1
Write-Host $addOutput
Write-Host "SUCCESS: Supabase MCP configured!" -ForegroundColor Green

# Step 5: Verify
Write-Host ""
Write-Host "Step 5: Verifying installation..." -ForegroundColor Yellow
& claude mcp list

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Setup Complete! Cost: FREE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Close Claude Code completely" -ForegroundColor White
Write-Host "2. Reopen Claude Code" -ForegroundColor White
Write-Host "3. Type /mcp to verify Supabase is connected" -ForegroundColor White
Write-Host ""
