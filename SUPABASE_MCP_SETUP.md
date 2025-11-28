# Supabase MCP Server Setup Documentation

## Installation Complete

The Supabase MCP (Model Context Protocol) server has been successfully installed and configured for your project.

## Configuration Details

### 1. **MCP Server Installation**
- **Package**: `supabase-mcp` v1.5.0
- **Location**: `/home/ubuntu/.nvm/versions/node/v20.19.4/bin/supabase-mcp`
- **Installation Type**: Global npm package

### 2. **Claude Desktop Configuration**
- **Config File**: `/home/ubuntu/.config/Claude/claude_desktop_config.json`
- **Configuration**:
  ```json
  {
    "mcpServers": {
      "supabase": {
        "command": "/home/ubuntu/.nvm/versions/node/v20.19.4/bin/supabase-mcp",
        "env": {
          "SUPABASE_URL": "https://ekklokrukxmqlahtonnc.supabase.co",
          "SUPABASE_SERVICE_KEY": "YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
        }
      }
    }
  }
  ```

### 3. **Environment Variables**
- **File**: `/home/ubuntu/git/musicsupplies_oct2025/.env.supabase`
- **Required Variables**:
  - `SUPABASE_URL`: https://ekklokrukxmqlahtonnc.supabase.co
  - `SUPABASE_SERVICE_KEY`: Your service role key (needs to be added)

## IMPORTANT: Next Steps

### 1. **Add Your Service Role Key**

You MUST add your Supabase service role key to complete the setup:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to: **Settings → API**
3. Find the **Service role key** (secret - has full database access)
4. Update the key in TWO locations:

   a. **For MCP Server** (Claude Desktop):
   ```bash
   nano /home/ubuntu/.config/Claude/claude_desktop_config.json
   # Replace YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE with your actual key
   ```

   b. **For Local Testing**:
   ```bash
   nano /home/ubuntu/git/musicsupplies_oct2025/.env.supabase
   # Replace YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE with your actual key
   ```

### 2. **Test the Connection**

After adding your service role key, test the connection:

```bash
cd /home/ubuntu/git/musicsupplies_oct2025
node test-supabase-mcp-connection.js
```

Expected output:
```
Testing Supabase MCP Server connection...
SUCCESS: MCP Server is working!
Available tools: execute_sql, select_table, insert_row, update_row, delete_row, ...
```

### 3. **Execute Your Migration**

Once the connection is verified, run your S3 cache migration:

```bash
cd /home/ubuntu/git/musicsupplies_oct2025
node execute-migration.js
```

This will create three functions in your database:
- `add_file_to_s3_cache(filename)` - Add files to S3 cache
- `clear_s3_cache()` - Clear the entire cache
- `get_s3_image_filename(input_filename)` - Case-insensitive filename lookup

## Available MCP Tools

Once configured, the Supabase MCP server provides these tools:

### Database Operations
- **execute_sql** - Execute arbitrary SQL queries
- **select_table** - Query data from tables
- **insert_row** - Insert new records
- **update_row** - Update existing records
- **delete_row** - Delete records
- **list_tables** - List all tables in the database

### Function Operations
- **call_function** - Call stored procedures/functions
- **create_function** - Create new functions
- **drop_function** - Remove functions

### Schema Operations
- **describe_table** - Get table structure
- **create_table** - Create new tables
- **alter_table** - Modify table structure
- **drop_table** - Delete tables

## Usage Examples

### Example 1: Execute SQL Query
```javascript
// In Claude with MCP enabled:
await supabase.execute_sql({
  query: "SELECT * FROM s3_image_cache LIMIT 10;"
});
```

### Example 2: Insert Data
```javascript
await supabase.insert_row({
  table: "s3_image_cache",
  data: {
    filename: "example.jpg",
    filename_lower: "example.jpg",
    cache_updated: new Date().toISOString()
  }
});
```

### Example 3: Call Function
```javascript
await supabase.call_function({
  function_name: "get_s3_image_filename",
  parameters: ["MyImage.JPG"]
});
```

## Security Notes

1. **Service Role Key Security**:
   - Never commit the service role key to git
   - `.env.supabase` is already added to `.gitignore`
   - The service role key has full admin access to your database
   - Keep it secure and rotate it periodically

2. **MCP Server Access**:
   - The MCP server runs with the permissions of the service role
   - Only use in development or trusted environments
   - For production, use application-specific API keys with limited scope

## Troubleshooting

### Issue: "MCP server not found in Claude"
**Solution**: Restart Claude Desktop after updating the configuration file

### Issue: "Authentication failed"
**Solution**: Verify your service role key is correct and properly formatted (no extra spaces)

### Issue: "Connection timeout"
**Solution**: Check your network connection and ensure the Supabase project is active

### Issue: "Permission denied" errors
**Solution**: The service role key might be incorrect or the database permissions have changed

## File Locations Reference

- **MCP Server Binary**: `/home/ubuntu/.nvm/versions/node/v20.19.4/bin/supabase-mcp`
- **Claude Config**: `/home/ubuntu/.config/Claude/claude_desktop_config.json`
- **Environment File**: `/home/ubuntu/git/musicsupplies_oct2025/.env.supabase`
- **Test Script**: `/home/ubuntu/git/musicsupplies_oct2025/test-supabase-mcp-connection.js`
- **Migration Script**: `/home/ubuntu/git/musicsupplies_oct2025/execute-migration.js`
- **SQL Migration**: `/home/ubuntu/git/musicsupplies_oct2025/supabase/migrations/20251002_manual_s3_cache.sql`

## Support

For issues with:
- **Supabase**: Check the Supabase documentation at https://supabase.com/docs
- **MCP Protocol**: Refer to the Model Context Protocol specification
- **supabase-mcp package**: Check npm package page at https://www.npmjs.com/package/supabase-mcp