# Supabase Database Query Tool for Windows
# Works around Windows CLI output capture issues

param(
    [Parameter(Position=0)]
    [string]$Query = "",
    
    [switch]$ListTables,
    [switch]$Schema,
    [switch]$Help
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logDir = "supabase_logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Show-Help {
    Write-Host "`n==================================" -ForegroundColor Cyan
    Write-Host " Supabase Database Query Tool" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host '  .\supabase-db-query.ps1 "SELECT * FROM users LIMIT 10"' -ForegroundColor White
    Write-Host '  .\supabase-db-query.ps1 -ListTables' -ForegroundColor White
    Write-Host '  .\supabase-db-query.ps1 -Schema' -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Query       SQL query to execute" -ForegroundColor Gray
    Write-Host "  -ListTables  List all tables in public schema" -ForegroundColor Gray
    Write-Host "  -Schema      Dump full database schema" -ForegroundColor Gray
    Write-Host "  -Help        Show this help message" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host '  .\supabase-db-query.ps1 "SELECT COUNT(*) FROM users"' -ForegroundColor Gray
    Write-Host '  .\supabase-db-query.ps1 "SELECT * FROM orders WHERE status = ''pending''"' -ForegroundColor Gray
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host "`n🔍 Supabase Database Query Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if ($ListTables) {
    Write-Host "📋 Listing all tables..." -ForegroundColor Yellow
    
    $listQuery = @"
SELECT 
    schemaname as schema,
    tablename as table_name,
    tableowner as owner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
"@
    
    $tempFile = "$logDir/temp_list_tables.sql"
    $listQuery | Out-File -FilePath $tempFile -Encoding UTF8
    
    $logFile = "$logDir/${timestamp}_list_tables.txt"
    Write-Host "Executing query..." -ForegroundColor Gray
    
    $output = & cmd /c "supabase db query --file `"$tempFile`" 2>&1"
    $output | Out-File -FilePath $logFile
    
    Write-Host "✓ Query executed" -ForegroundColor Green
    Write-Host "  Results saved to: $logFile" -ForegroundColor Gray
    
    # Try to parse and display results
    if ($output) {
        Write-Host ""
        Write-Host "Output preview:" -ForegroundColor Cyan
        $output | Select-Object -First 20 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
} elseif ($Schema) {
    Write-Host "📊 Dumping database schema..." -ForegroundColor Yellow
    
    $schemaFile = "$logDir/${timestamp}_schema_dump.sql"
    
    Write-Host "Executing schema dump..." -ForegroundColor Gray
    $output = & cmd /c "supabase db dump --schema public --file `"$schemaFile`" 2>&1"
    
    if (Test-Path $schemaFile) {
        Write-Host "✓ Schema dumped successfully" -ForegroundColor Green
        Write-Host "  File: $schemaFile" -ForegroundColor Gray
        
        # Show summary
        $lineCount = (Get-Content $schemaFile | Measure-Object -Line).Lines
        $tables = (Get-Content $schemaFile | Select-String "CREATE TABLE" | Measure-Object).Count
        $functions = (Get-Content $schemaFile | Select-String "CREATE FUNCTION" | Measure-Object).Count
        
        Write-Host ""
        Write-Host "Schema Summary:" -ForegroundColor Cyan
        Write-Host "  Total lines: $lineCount" -ForegroundColor Gray
        Write-Host "  Tables: $tables" -ForegroundColor Gray
        Write-Host "  Functions: $functions" -ForegroundColor Gray
        
        # Show table names
        Write-Host ""
        Write-Host "Tables found:" -ForegroundColor Cyan
        Get-Content $schemaFile | Select-String "CREATE TABLE" | ForEach-Object {
            if ($_ -match "CREATE TABLE\s+(\S+)") {
                Write-Host "  - $($Matches[1])" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✗ Schema dump may have failed" -ForegroundColor Red
        Write-Host "  Check Supabase CLI configuration" -ForegroundColor Yellow
    }
    
} elseif ($Query) {
    Write-Host "🔎 Executing custom query..." -ForegroundColor Yellow
    Write-Host "Query: $Query" -ForegroundColor Gray
    Write-Host ""
    
    # Save query to temp file
    $tempFile = "$logDir/temp_query.sql"
    $Query | Out-File -FilePath $tempFile -Encoding UTF8
    
    $logFile = "$logDir/${timestamp}_query_result.txt"
    
    Write-Host "Executing..." -ForegroundColor Gray
    $output = & cmd /c "supabase db query --file `"$tempFile`" 2>&1"
    $output | Out-File -FilePath $logFile
    
    Write-Host "✓ Query executed" -ForegroundColor Green
    Write-Host "  Results saved to: $logFile" -ForegroundColor Gray
    
    # Try to display results
    if ($output) {
        Write-Host ""
        Write-Host "Results:" -ForegroundColor Cyan
        $output | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
} else {
    Write-Host "No query specified. Use -Help for usage information." -ForegroundColor Yellow
    Write-Host ""
    
    # Show quick examples
    Write-Host "Quick examples:" -ForegroundColor Cyan
    Write-Host '  .\supabase-db-query.ps1 -ListTables' -ForegroundColor Gray
    Write-Host '  .\supabase-db-query.ps1 "SELECT * FROM your_table LIMIT 10"' -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📁 All logs saved in: $logDir/" -ForegroundColor Yellow
Write-Host ""

# Create companion HTML query tool
$htmlFile = "supabase-query-tool.html"
if (!(Test-Path $htmlFile)) {
    Write-Host "💡 Creating HTML query tool: $htmlFile" -ForegroundColor Cyan
    
    $htmlContent = @'
<!DOCTYPE html>
<html>
<head>
    <title>Supabase Query Tool</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        input, textarea { width: 100%; padding: 8px; margin: 5px 0; }
        button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #45a049; }
        pre { background: #f0f0f0; padding: 10px; overflow-x: auto; }
        .error { color: red; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>🔍 Supabase Query Tool</h1>
    
    <div class="section">
        <h3>Connection</h3>
        <input type="text" id="url" placeholder="Supabase URL" value="https://ekklokrukxmqlahtonnc.supabase.co">
        <input type="password" id="key" placeholder="Anon Key">
        <button onclick="connect()">Connect</button>
        <div id="status"></div>
    </div>
    
    <div class="section">
        <h3>Quick Queries</h3>
        <button onclick="listTables()">List Tables</button>
        <button onclick="countRecords()">Count Records</button>
        <input type="text" id="tableName" placeholder="Table name for count">
    </div>
    
    <div class="section">
        <h3>Custom Query (SELECT only via JS client)</h3>
        <select id="queryTable">
            <option value="">Select a table...</option>
        </select>
        <input type="text" id="columns" placeholder="Columns (e.g., *, id, name)" value="*">
        <input type="text" id="filter" placeholder="Filter (e.g., id.eq.1)">
        <input type="number" id="limit" placeholder="Limit" value="10">
        <button onclick="runQuery()">Run Query</button>
    </div>
    
    <div class="section">
        <h3>Results</h3>
        <pre id="results">No results yet</pre>
    </div>
    
    <script>
        let supabase = null;
        
        async function connect() {
            const url = document.getElementById('url').value;
            const key = document.getElementById('key').value;
            
            try {
                supabase = supabaseJs.createClient(url, key);
                document.getElementById('status').innerHTML = '<span class="success">Connected!</span>';
                
                // Try to get table list
                const tables = ['users', 'orders', 'products', 'customers']; // Add your tables here
                const select = document.getElementById('queryTable');
                select.innerHTML = '<option value="">Select a table...</option>';
                tables.forEach(table => {
                    select.innerHTML += `<option value="${table}">${table}</option>`;
                });
                
            } catch (error) {
                document.getElementById('status').innerHTML = `<span class="error">Error: ${error.message}</span>`;
            }
        }
        
        async function listTables() {
            if (!supabase) { alert('Please connect first'); return; }
            
            // This is limited by JS client capabilities
            document.getElementById('results').textContent = 'JavaScript client cannot directly list tables.\nUse PowerShell script or check your Supabase dashboard.';
        }
        
        async function countRecords() {
            if (!supabase) { alert('Please connect first'); return; }
            
            const table = document.getElementById('tableName').value || 'users';
            
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                if (error) throw error;
                
                document.getElementById('results').textContent = `Table: ${table}\nCount: ${count}`;
            } catch (error) {
                document.getElementById('results').textContent = `Error: ${error.message}`;
            }
        }
        
        async function runQuery() {
            if (!supabase) { alert('Please connect first'); return; }
            
            const table = document.getElementById('queryTable').value;
            const columns = document.getElementById('columns').value || '*';
            const filter = document.getElementById('filter').value;
            const limit = parseInt(document.getElementById('limit').value) || 10;
            
            if (!table) { alert('Please select a table'); return; }
            
            try {
                let query = supabase.from(table).select(columns);
                
                if (filter) {
                    // Parse simple filters like "id.eq.1"
                    const parts = filter.split('.');
                    if (parts.length === 3) {
                        query = query[parts[1]](parts[0], parts[2]);
                    }
                }
                
                query = query.limit(limit);
                
                const { data, error } = await query;
                
                if (error) throw error;
                
                document.getElementById('results').textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                document.getElementById('results').textContent = `Error: ${error.message}`;
            }
        }
        
        // Auto-connect if credentials are in localStorage
        window.onload = () => {
            const savedUrl = localStorage.getItem('supabase_url');
            const savedKey = localStorage.getItem('supabase_anon_key');
            
            if (savedUrl) document.getElementById('url').value = savedUrl;
            if (savedKey) document.getElementById('key').value = savedKey;
            
            if (savedUrl && savedKey) connect();
        };
    </script>
</body>
</html>
'@
    
    $htmlContent | Out-File -FilePath $htmlFile -Encoding UTF8
    Write-Host "  Open this file in a browser for interactive queries" -ForegroundColor Gray
}