Privacy & Egress Report (Local, Offline)
========================================

Objective
- Identify all outbound network egress points (HTTP, WebSocket, SDKs).
- Explain what data could leave the browser/app.
- Provide immediate lockdown controls and 60-second recovery steps.

Stabilizers Already Added (Local Only)
- Egress kill switch with allowlist in [src/main.tsx](src/main.tsx)
- Chat kill switch + preflight health check in [src/components/ChatWidget.tsx](src/components/ChatWidget.tsx)
- Local overrides in [.env.local](.env.local)
  - VITE_CHAT_ENABLED=0 (chat disabled)
  - VITE_EGRESS_BLOCK=0 (egress blocking disabled in local to prevent false positives; see Lockdown Steps)

Inventory of External Endpoints
A. Supabase (first-party vendor backend)
- Client setup: [src/lib/supabase.ts](src/lib/supabase.ts)
- Data access: [src/context/AuthContext.tsx](src/context/AuthContext.tsx), [src/context/CartContext.tsx](src/context/CartContext.tsx), [src/pages/Dashboard*.tsx](src/pages), [src/utils/*](src/utils)
- Types of calls:
  - PostgREST table CRUD via supabase.from(...).select/insert/update/delete
  - RPC/functions via supabase.rpc('function_name', payload)
  - Auth session via supabase.auth.getSession/refreshSession
- Typical data: account numbers, login attempts, cart contents, products, promo codes, system events for logging

B. Socket.io Chat server
- Client: [src/components/ChatWidget.tsx](src/components/ChatWidget.tsx)
- Env: VITE_CHAT_SERVER_URL (default http://localhost:3001)
- Protocol: WebSocket (with fallback polling)
- Typical data: chat messages, direct messages, typing indicators, username, role, accountNumber

C. LLM/AI Services
1) OpenAI
- Usage: chat completions, embeddings
- Code: [src/services/aiChatService.ts](src/services/aiChatService.ts)
- Endpoints:
  - https://api.openai.com/v1/chat/completions
  - https://api.openai.com/v1/embeddings
- Data: user prompts, product/customer context text to create responses; embeddings input text

2) Anthropic
- Code: [src/services/aiChatService.ts](src/services/aiChatService.ts)
- Endpoint: https://api.anthropic.com/v1/messages
- Data: user prompts/context text

3) Perplexity
- Code: [src/services/aiChatService.ts](src/services/aiChatService.ts)
- Endpoint: https://api.perplexity.ai/chat/completions
- Data: user prompts/context text

D. Text-to-Speech (ElevenLabs)
- Code: [src/services/secureVoiceService.ts](src/services/secureVoiceService.ts), [src/services/aiChatService.ts](src/services/aiChatService.ts)
- Endpoint: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
- Data: text to synthesize; voice id; audio config

E. SMS Providers (ClickSend)
- Code: [src/utils/frontendSms.ts](src/utils/frontendSms.ts), [src/components/OrderConfirmationModal.tsx](src/components/OrderConfirmationModal.tsx), [src/components/admin/GeneralSettingsTab.tsx](src/components/admin/GeneralSettingsTab.tsx), [src/components/admin/ClickSendTab.tsx](src/components/admin/ClickSendTab.tsx)
- Endpoint: https://rest.clicksend.com/v3/sms/send
- Data: phone number(s), SMS body, optional metadata

F. Netlify Admin API
- Code: [src/components/admin/NetlifyTab.tsx](src/components/admin/NetlifyTab.tsx)
- Endpoint: https://api.netlify.com/api/v1/...
- Data: site id, deploy info; requires Netlify API token (server-side preferred)

G. Public IP check (Development telemetry)
- Code: [src/services/activityTracker.ts](src/services/activityTracker.ts), [src/context/AuthContext.tsx](src/context/AuthContext.tsx)
- Endpoint: https://api.ipify.org?format=json
- Data: public IP (JSON)

H. S3 Buckets (static images/uploads)
- Buckets observed: mus86077.s3.amazonaws.com
- Code: [src/utils/imageLoader.ts](src/utils/imageLoader.ts), [src/pages/ManagerPage.tsx](src/pages/ManagerPage.tsx), [src/components/admin/S3ImageCacheTab.tsx](src/components/admin/S3ImageCacheTab.tsx), [src/pages/DashboardClean*.tsx](src/pages)
- Data: image GET/HEAD fetches; uploads via pre-signed URLs (when used)

I. Misc Dev/Legacy
- Google Analytics in /cleaning-website (not active in app): [cleaning-website/README.md](cleaning-website/README.md), [cleaning-website/index.html](cleaning-website/index.html)
- Socket.io proxy notice: [netlify/functions/chat-proxy.js](netlify/functions/chat-proxy.js) (explains Netlify cannot proxy WS)

Data Shapes (High-Level)
- Chat: message text, sender/recipient identifiers, room code LCMD, role (customer/staff/admin), accountNumber
- LLM: user prompts, summaries, lightweight context strings; responses may be cached locally in app state
- SMS (ClickSend): to phone number, text body, optional account references
- TTS (ElevenLabs): text body, voice id, audio settings
- Supabase (first-party vendor): account numbers, user IDs, login events, promo code usage, cart contents, orders, system logs
- S3: static image file names, pre-signed URL PUT for uploads

Lockdown Steps (No outbound unless allowlisted)
1) Enable the egress kill switch
   - In .env.local set:
     - VITE_EGRESS_BLOCK=1
     - VITE_EGRESS_ALLOWLIST=api.netlify.com,ekklokrukxmqlahtonnc.supabase.co,mus86077.s3.amazonaws.com
   - Runtime overrides:
     - localStorage.EGRESS_BLOCK = "1"
     - localStorage.EGRESS_ALLOW_ALL = "0"
   - Implementation lives in [src/main.tsx](src/main.tsx)

2) Keep Chat Off until server reachable
   - In .env.local: VITE_CHAT_ENABLED=0
   - When ready, set VITE_CHAT_SERVER_URL to your deployed chat host and set VITE_CHAT_ENABLED=1
   - The client performs GET /health preflight and caps reconnection attempts (prevents infinite queue)

3) Avoid entering any third-party API keys in the browser
   - Ensure LLM/TTS calls route through your backend where keys are kept server-side
   - For any direct browser calls, verify CORS and policy, and keep keys out of client code

Fast “Was Working Yesterday” Recovery (60 seconds)
- Already done: Chat disabled so UI won’t spin or queue when server is down
- Minimal local settings (.env.local):
  - VITE_CHAT_ENABLED=0
  - VITE_EGRESS_BLOCK=0 (for local dev; change to 1 to audit egress)
- To re-enable chat safely:
  1) Ensure chat server is online and returns 200 JSON at {VITE_CHAT_SERVER_URL}/health
  2) Set VITE_CHAT_SERVER_URL to that URL
  3) Set VITE_CHAT_ENABLED=1
  4) Hard refresh the app (clear cache) and watch console for connection success

Operational Notes
- With VITE_EGRESS_BLOCK=1 the app will block all non-allowlisted hosts at the fetch/XHR layer.
- Allowlist should include your Supabase project and any required asset buckets; add more via VITE_EGRESS_ALLOWLIST (comma-separated hostnames or URLs).
- The chat client now preflights and fails fast; it will not spin indefinitely or queue messages without a healthy server.

Files Updated In This Hardening
- Egress policy hook: [src/main.tsx](src/main.tsx)
- Chat gating & health preflight: [src/components/ChatWidget.tsx](src/components/ChatWidget.tsx)
- Env template additions: [.env.example](.env.example)
- Local overrides to disable chat: [.env.local](.env.local)

End of Report