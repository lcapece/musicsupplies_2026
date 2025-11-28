# Cline Model Mismatch and 10–20min “API Request…” Fix

Use this exact sequence to stop the stalls and ensure Cline uses your chosen provider/model.

IMPORTANT: Plan Mode and Act Mode can use different models. Per-task overrides can also pin a model unexpectedly. These steps clear hidden overrides and align both modes.

1) Force Plan Mode to your target provider/model
- Ctrl+Shift+P → “Cline: Switch to Plan Mode”
- Ctrl+Shift+P → “Cline: View/Change Model”
- Select your intended Provider and Model (e.g., OpenAI → gpt-4o). Avoid “Thinking” models while debugging.
- If a “Thinking” model is active, switch to a non‑thinking model OR set Max Thinking Time to 10–15s temporarily.

2) Force Act Mode to the same provider/model
- Ctrl+Shift+P → “Cline: Switch to Act Mode”
- Ctrl+Shift+P → “Cline: View/Change Model”
- Pick the exact same provider/model as Plan Mode.
- In the same panel, ensure “Use separate model for Act Mode” is OFF or set Act Mode to the same provider/model explicitly.

3) Clear per‑task model overrides
- Ctrl+Shift+P → “Cline: Start New Task”
- Start a brand new task (do not reuse the stuck task). Per‑task overrides are wiped with a new task.

4) Reload the window (forces settings to apply)
- Ctrl+Shift+P → “Developer: Reload Window”

5) Verify model actually in use in Cline Output
- VS Code → View → Output → (dropdown) Cline
- Start a trivial prompt in Plan Mode: `ping`
- In the Output panel, confirm the top lines of the request show YOUR provider/model (not Claude).
- If Output still shows Claude, repeat steps 1–2 and reload again.

6) Check Settings for hidden overrides
- File → Preferences → Settings → search “Cline”
- Ensure Plan/Act models are explicitly set to your provider/model.
- If you previously created Custom Model Configs (e.g., for Anthropic), remove stale entries that could be selected by default.
- Make sure no workspace setting pins a model: `.vscode/settings.json` (we checked; no Cline model override in this repo).

7) If latency persists (10–20 minutes)
- Use a non‑thinking model to test. Thinking models can legitimately take long if Max Thinking Time is high.
- Set Max Thinking Time to 10–15s while debugging, then increase only if needed.
- Temporarily disable VPN/Proxy/Corp filters and test again; network middleboxes often cause stalls.
- Re-run the “ping” test in Plan Mode and watch Output → Cline timings.

8) Known root causes and fixes
- Plan/Act Mode mismatch: Fix by aligning both modes (steps 1–2).
- Per‑task override pinned a different model: Fix by starting a new task (step 3).
- Extension not reloading new selection: Fix by reloading window (step 4).
- Stale Custom Model Config pointing to Anthropic: Remove or select OpenAI explicitly (step 6).
- Thinking model max time excessive: Cap to 10–15s, or switch to non‑thinking (step 7).
- Network/VPN/Proxy: Disable temporarily to confirm latency source (step 7).

9) Fast validation checklist
- [ ] Plan Mode shows: Provider=YOUR_PROVIDER, Model=YOUR_MODEL
- [ ] Act Mode shows: Provider=YOUR_PROVIDER, Model=YOUR_MODEL
- [ ] “Use separate model for Act Mode” OFF or set to same model
- [ ] New task started
- [ ] Window reloaded
- [ ] Output → Cline shows your provider/model for a trivial prompt
- [ ] Non‑thinking model or Max Thinking Time set to 10–15s during test
- [ ] No VPN/Proxy impact

10) What to capture if still failing
Copy/paste from View → Output → Cline for one slow request:
- Request start lines that show provider/model
- Any warnings/errors
- Total duration until response/timeout

This information pinpoints whether the stall is model selection, thinking-time cap, or network/perimeter.

Notes from this workspace investigation:
- .mcp.json: empty (no MCP servers)
- .clinerules/.kilocodemodes: no model overrides
- .vscode/settings.json: no Cline model settings here
- Repo contains many docs/code references to Claude/OpenAI, but nothing that can force Cline’s model selection from the filesystem; selection is done via Cline’s UI settings and per-task state.
