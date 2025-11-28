# URGENT: Supabase MCP Setup Instructions

## 1. Install Supabase MCP (if not already installed)
```bash
npm install -g @modelcontextprotocol/server-supabase
```

## 2. Get Your Supabase Credentials
- **Supabase URL**: `https://ekklokrukxmqlahtonnc.supabase.co`
- **Service Role Key**: Get from Supabase Dashboard > Settings > API > Service Role (secret)

## 3. Configure Claude Desktop (claude_desktop_config.json)

Location: 
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this to your config:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase",
        "--url",
        "https://ekklokrukxmqlahtonnc.supabase.co",
        "--service-role-key",
        "YOUR_SERVICE_ROLE_KEY_HERE"
      ]
    }
  }
}
```

## 4. Alternative: Environment Variable Method

Create a `.env` file in your home directory:
```
SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Then use this config:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://ekklokrukxmqlahtonnc.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
      }
    }
  }
}
```

## 5. Restart Claude Desktop
After adding the config, completely quit and restart Claude Desktop.

## 6. Verify It's Working
Once restarted, I should have access to MCP Supabase tools like:
- mcp_supabase_query
- mcp_supabase_insert
- mcp_supabase_update
- mcp_supabase_delete

## IMPORTANT NOTES:
- Use SERVICE ROLE KEY (not anon key) - it has full admin access
- Keep the service role key SECRET - never commit it to git
- The service role key starts with "eyJ..."