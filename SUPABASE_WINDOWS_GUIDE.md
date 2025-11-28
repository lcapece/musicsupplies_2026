# Supabase Windows Workaround Guide

Since the Supabase MCP is broken and CLI output isn't captured on Windows, use these alternative tools:

## Quick Start

1. **Test Connection**: Open `test-supabase-connection.html` in browser
2. **Run Operations**: Use PowerShell scripts that save output to files
3. **Deploy Functions**: Use `deploy-edge-function.ps1`
4. **Query Database**: Use `supabase-db-query.ps1` or HTML tool

## Available Tools

### 1. Main Operations Script
```powershell
.\supabase-ops.ps1 help          # Show all commands
.\supabase-ops.ps1 status        # Check project status
.\supabase-ops.ps1 functions     # List Edge Functions
.\supabase-ops.ps1 db-push       # Push migrations
.\supabase-ops.ps1 test          # Run comprehensive test
```

### 2. Edge Function Deployment
```powershell
.\deploy-edge-function.ps1 -FunctionName "send-email"           # Deploy
.\deploy-edge-function.ps1 -FunctionName "send-email" -Verify   # Deploy & verify
.\deploy-edge-function.ps1 -FunctionName "send-email" -Delete   # Delete function
```

### 3. Database Queries
```powershell
.\supabase-db-query.ps1 -ListTables                            # List all tables
.\supabase-db-query.ps1 -Schema                                # Dump full schema
.\supabase-db-query.ps1 "SELECT * FROM users LIMIT 10"         # Run query
```

### 4. HTML Testing Tools
- **test-supabase-connection.html** - Full connection tester with query capability
- **supabase-query-tool.html** - Simplified query interface (auto-created)
- **test-function-[name].html** - Function-specific testers (created on deploy)

## How It Works

1. **Commands Execute Blindly**: Supabase CLI runs but doesn't show output on Windows
2. **Output Saved to Files**: All scripts save output to `supabase_logs/` directory
3. **HTML for Verification**: Use browser-based tools to verify operations worked

## Workflow Example

```powershell
# 1. Deploy a function
.\deploy-edge-function.ps1 -FunctionName "send-email" -Verify

# 2. Check the logs
Get-Content "supabase_logs\*deploy_send-email.txt"

# 3. Test in browser
Start "test-function-send-email.html"

# 4. Query database
.\supabase-db-query.ps1 "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10"
```

## Important Notes

- **Always check `supabase_logs/`** for actual command output
- **Use HTML tools** for real-time verification
- **Commands work** even if you don't see output
- **Project Ref**: ekklokrukxmqlahtonnc

## Troubleshooting

If scripts don't run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass
```

If Supabase CLI not found:
```powershell
npm install -g supabase
```

## Your Project Details
- **Project Ref**: ekklokrukxmqlahtonnc
- **URL**: https://ekklokrukxmqlahtonnc.supabase.co
- **Anon Key**: (Enter in HTML tools or set in environment)