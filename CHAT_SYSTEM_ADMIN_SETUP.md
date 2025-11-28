# Chat System Admin Setup & Management

## Overview
Complete AI chat system with backend management, voice selection, and IP-based rate limiting to prevent abuse.

## Features Implemented

### 1. Knowledge Base Management (Admin Panel)
- ✅ Add/Edit/Delete knowledge entries
- ✅ Categorize responses (Products, Services, Policies, etc.)
- ✅ Set priority levels for responses
- ✅ Keyword tagging for better matching
- ✅ Active/Inactive status control
- ✅ Search and filter capabilities

### 2. Voice Configuration
- ✅ **ElevenLabs Voice Selection Dropdown**
  - 10 different voice personalities available
  - Bella (Friendly Female) - Default
  - Rachel (Professional Female)
  - Antoni (Professional Male)
  - And more...
- ✅ Enable/Disable voice globally
- ✅ Configure voice settings per deployment

### 3. Security & Rate Limiting
- ✅ **IP-Based Rate Limiting**
  - 5 minutes of voice per IP address (configurable)
  - Automatic reset after 24 hours
  - Block/Unblock specific IPs
- ✅ **Daily Global Limit**
  - 100 minutes total per day (configurable)
  - Prevents API abuse
- ✅ **Secure API Proxy**
  - ElevenLabs API key never exposed to frontend
  - All requests go through backend proxy
  - Request validation and sanitization

## Admin Access

### Location
The chat management system is in the Admin Dashboard:
1. Login as admin (account 999)
2. Navigate to Admin Dashboard
3. Click "Chat System" tab (🤖)

### Three Management Sections

#### 1. Knowledge Base Tab
Manage Q&A entries that power the AI responses:
- **Category**: Group similar questions
- **Keywords**: Help with search matching
- **Question**: What users might ask
- **Response**: The answer to provide
- **Priority**: Higher priority shown first (0-100)
- **Status**: Active/Inactive toggle

#### 2. Voice Settings Tab
Configure voice synthesis:
- **Voice Selection**: Choose from 10 ElevenLabs voices
- **Rate Limit**: Minutes per IP (default: 5)
- **Daily Limit**: Total minutes per day (default: 100)
- **Enable/Disable**: Turn voice on/off globally

#### 3. Security & Limits Tab
Monitor and control usage:
- View all IPs using voice
- See minutes used per IP
- Reset limits for specific IPs
- Block/Unblock IPs
- Monitor daily usage

## Database Tables Created

```sql
-- Knowledge base entries
chat_knowledge_base
- id, category, keywords[], question, response, priority, active

-- Voice configuration
chat_voice_config
- voice_id, voice_name, rate_limit, daily_limit, enabled

-- IP tracking and limits
chat_ip_limits
- ip_address, minutes_used, last_reset, blocked

-- Usage logging
voice_usage_log
- ip_address, duration_seconds, voice_id, timestamp
```

## Security Implementation

### Rate Limiting Flow
1. User clicks voice button
2. System checks IP address
3. Verifies against limits:
   - Is IP blocked? → Deny
   - Daily limit reached? → Deny
   - IP limit reached? → Deny
   - All checks pass? → Allow

### API Protection
- ElevenLabs API key stored in environment variables
- Never sent to frontend
- All requests proxied through `/netlify/functions/secure-voice-proxy`
- Request validation before forwarding

## Configuration

### Environment Variables Required
```env
# Add to Netlify environment variables
ELEVENLABS_API_KEY=your-api-key-here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Default Limits
- **Per IP**: 5 minutes of voice
- **Per Day**: 100 minutes total
- **Text Length**: Max 1000 characters per request
- **Reset Period**: 24 hours

## Usage Monitoring

### View Current Usage
1. Go to Admin Dashboard → Chat System
2. Click "Security & Limits" tab
3. See all active IPs and their usage

### Handle Abuse
If you notice abuse:
1. Find the IP in the list
2. Click "Block" to immediately stop access
3. Or click "Reset" to give them another chance

### Adjust Limits
1. Go to "Voice Settings" tab
2. Change rate limit (per IP)
3. Change daily limit (global)
4. Click "Save Voice Settings"

## Testing the System

### Test as Non-Logged-In User
1. Open site in incognito/private browsing
2. Click chat button (bottom-right)
3. Type: "What products do you offer?"
4. Should get AI response from knowledge base
5. Try voice (will use IP limit)

### Test Rate Limiting
1. Use voice feature multiple times
2. After 5 minutes, should see limit message
3. Check admin panel → Security tab
4. Your IP should show 5.0/5 minutes used

### Test Voice Selection
1. Admin Dashboard → Chat System → Voice Settings
2. Select different voice
3. Save settings
4. Test chat with new voice

## Common Issues & Solutions

### "Voice not working"
1. Check if voice is enabled in admin
2. Verify ElevenLabs API key in Netlify
3. Check if user's IP is blocked
4. Verify daily limit not exceeded

### "Rate limit too restrictive"
1. Increase per-IP limit in Voice Settings
2. Consider increasing daily global limit
3. Reset specific IPs if needed

### "Knowledge base not responding correctly"
1. Check entries are marked "Active"
2. Verify keywords match user queries
3. Adjust priority for better responses
4. Add more specific Q&A entries

## Best Practices

### Knowledge Base Management
- Keep responses concise and helpful
- Use multiple keywords for better matching
- Set higher priority for common questions
- Regularly review and update entries

### Voice Configuration
- Start with conservative limits (5 min/IP)
- Monitor usage patterns first week
- Adjust based on legitimate usage
- Block abusive IPs immediately

### Security
- Never share ElevenLabs API key
- Monitor daily usage regularly
- Keep rate limits reasonable
- Document any IP blocks with reason

## Future Enhancements
- [ ] Analytics dashboard with usage graphs
- [ ] Automatic knowledge base learning
- [ ] Multiple language support
- [ ] Custom voice training
- [ ] Webhook notifications for limits

## Support
For issues:
1. Check Netlify function logs
2. Verify Supabase tables exist
3. Confirm environment variables set
4. Test with different browsers/IPs