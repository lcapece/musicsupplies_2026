# Supabase Operations Helper for Windows
# Since CLI output isn't captured, this script saves everything to files

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Arg1 = "",
    
    [Parameter(Position=2)]
    [string]$Arg2 = ""
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logDir = "supabase_logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Run-SupabaseCommand {
    param($cmd, $description)
    
    Write-Host "`n$description" -ForegroundColor Yellow
    Write-Host "Running: $cmd" -ForegroundColor Cyan
    
    $logFile = "$logDir/${timestamp}_$(($cmd -replace ' ', '_' -replace '[^\w\-]', '')).txt"
    
    # Execute and capture output
    $output = & cmd /c "$cmd 2>&1"
    $output | Out-File -FilePath $logFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Command completed. Output saved to: $logFile" -ForegroundColor Green
    } else {
        Write-Host "✗ Command may have failed. Check: $logFile" -ForegroundColor Red
    }
    
    # Show first few lines of output
    if ($output) {
        Write-Host "`nFirst few lines of output:" -ForegroundColor Gray
        $output | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }
    
    return $logFile
}

switch ($Command.ToLower()) {
    "help" {
        Write-Host "`nSupabase Operations Helper" -ForegroundColor Cyan
        Write-Host "=========================" -ForegroundColor Cyan
        Write-Host "Usage: .\supabase-ops.ps1 [command] [args]" -ForegroundColor White
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  status       - Check project status"
        Write-Host "  functions    - List all functions"
        Write-Host "  deploy-fn    - Deploy a function (provide function name)"
        Write-Host "  db-push      - Push database migrations"
        Write-Host "  db-reset     - Reset database"
        Write-Host "  query        - Run a SQL query (provide query as arg)"
        Write-Host "  dump         - Dump database schema"
        Write-Host "  test         - Test connection with all info"
        Write-Host ""
        Write-Host "All outputs are saved to supabase_logs/" -ForegroundColor Gray
    }
    
    "status" {
        Run-SupabaseCommand "supabase status" "Checking project status..."
    }
    
    "functions" {
        Run-SupabaseCommand "supabase functions list" "Listing Edge Functions..."
    }
    
    "deploy-fn" {
        if ($Arg1) {
            Run-SupabaseCommand "supabase functions deploy $Arg1" "Deploying function: $Arg1"
        } else {
            Write-Host "Error: Please provide function name" -ForegroundColor Red
            Write-Host "Usage: .\supabase-ops.ps1 deploy-fn [function-name]" -ForegroundColor Yellow
        }
    }
    
    "db-push" {
        Run-SupabaseCommand "supabase db push" "Pushing database migrations..."
    }
    
    "db-reset" {
        Write-Host "WARNING: This will reset your database!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -eq "yes") {
            Run-SupabaseCommand "supabase db reset" "Resetting database..."
        }
    }
    
    "query" {
        if ($Arg1) {
            $query = $Arg1
            $tempSql = "$logDir/temp_query.sql"
            $query | Out-File -FilePath $tempSql
            Run-SupabaseCommand "supabase db query --file $tempSql" "Running SQL query..."
            Remove-Item $tempSql
        } else {
            Write-Host "Error: Please provide SQL query" -ForegroundColor Red
            Write-Host 'Usage: .\supabase-ops.ps1 query "SELECT * FROM table_name"' -ForegroundColor Yellow
        }
    }
    
    "dump" {
        $dumpFile = "$logDir/${timestamp}_schema_dump.sql"
        Run-SupabaseCommand "supabase db dump --file $dumpFile" "Dumping database schema..."
        Write-Host "Schema dumped to: $dumpFile" -ForegroundColor Green
    }
    
    "test" {
        Write-Host "`nRunning comprehensive Supabase test..." -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        
        # Check installation
        $supabasePath = Get-Command supabase -ErrorAction SilentlyContinue
        if ($supabasePath) {
            Write-Host "✓ Supabase CLI found at: $($supabasePath.Source)" -ForegroundColor Green
        } else {
            Write-Host "✗ Supabase CLI not found!" -ForegroundColor Red
            exit 1
        }
        
        # Run multiple checks
        Run-SupabaseCommand "supabase --version" "Getting version..."
        Run-SupabaseCommand "supabase status" "Checking status..."
        Run-SupabaseCommand "supabase functions list" "Listing functions..."
        
        Write-Host "`n✓ All test commands executed. Check supabase_logs/ for results." -ForegroundColor Green
    }
    
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Run '.\supabase-ops.ps1 help' for usage" -ForegroundColor Yellow
    }
}

Write-Host "`n📁 All logs saved in: $logDir/" -ForegroundColor Cyan