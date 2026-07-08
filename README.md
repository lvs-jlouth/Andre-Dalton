# AURORA — Adaptive Universal Response & Operations Reasoning Assistant

> An original, privacy-first, voice-forward AI assistant with a cinematic HUD interface. Designed with deep accessibility support for users with non-standard speech (including dysarthric patterns), mobility constraints, and diverse interaction needs.

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Git | Current stable |
| Windows PowerShell | 5.1+ (Windows 10/11) |

### 1. Clone and install

```bash
git clone https://github.com/lvs-jlouth/Andre-Dalton.git
cd Andre-Dalton
npm install
```

### 2. Configure environment

```powershell
Copy-Item .env.example packages\backend\.env
# Edit packages\backend\.env and set at least one provider key
```

### 3. Run in development

Open **two terminal tabs**:

```bash
# Tab 1 — backend (port 3001)
npm run dev --workspace=packages/backend

# Tab 2 — frontend (port 5173)
npm run dev --workspace=packages/frontend
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

> **Samsung Android / PWA**: open the same URL from your device's browser while on the same network, then use "Add to Home Screen" to install as a PWA.

### 4. Run tests

```bash
npm test --workspace=packages/backend   # 55 tests
npm test --workspace=packages/frontend  # 38 tests
```

### 5. Install Methods of Procedure (MOP)

#### #1 — Homelab (Windows desktop, full capabilities)

1. Install Node.js LTS, Git, and Edge/Chrome on the host.
2. Clone and install:

   ```powershell
   git clone https://github.com/lvs-jlouth/Andre-Dalton.git
   cd Andre-Dalton
   npm install
   Copy-Item .env.example packages\backend\.env
   ```

3. Edit `packages\backend\.env`:
   - Set at least one LLM provider key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `AZURE_OPENAI_*`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, or local `LOCAL_LLM_BASE_URL`).
   - Set `STT_PROVIDER=browser` (or `deepgram` + `DEEPGRAM_API_KEY`).
   - Set `TTS_PROVIDER=browser` (or `elevenlabs` + `ELEVENLABS_API_KEY`).
   - Keep `DEBUG_MODE=false` unless active troubleshooting is required.
4. Start services in two terminals:

   ```powershell
   npm run dev --workspace=packages/backend
   npm run dev --workspace=packages/frontend
   ```

5. Open `http://localhost:5173`, grant microphone access, and validate provider switch, STT, TTS, and wake-word behavior.

#### #2 — QNAP NAS (Linux Station/VM install)

> This repository does not currently include a Dockerfile/compose stack, so this MOP uses a Linux guest on QNAP (Linux Station or Virtualization Station) for a full-feature install.

1. Create an Ubuntu guest on QNAP and install prerequisites:

   ```bash
   sudo apt update
   sudo apt install -y git curl
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   node -v && npm -v
   ```

2. Clone and configure:

   ```bash
   git clone https://github.com/lvs-jlouth/Andre-Dalton.git
   cd Andre-Dalton
   npm install
   cp .env.example packages/backend/.env
   ```

3. Set `packages/backend/.env` the same way as Homelab, then update:
   - `HOST=0.0.0.0`
   - `CORS_ORIGIN=http://<qnap-or-frontend-host>:5173`
4. Start backend and frontend, then access from a browser at `http://<guest-ip>:5173`.
5. For always-on lab usage, run both services under your process manager of choice (for example, `systemd` units in the guest).

#### #3 — Azure (backend on App Service + frontend on Static Web App)

1. Provision resources (example names):

   ```bash
   az group create -n rg-aurora -l eastus
   az appservice plan create -g rg-aurora -n plan-aurora --is-linux --sku B1
   az webapp create -g rg-aurora -p plan-aurora -n aurora-api-prod --runtime "NODE|20-lts"
   ```

2. Configure backend startup and app settings:

   ```powershell
   az webapp config set -g rg-aurora -n aurora-api-prod --startup-file "npm run start --workspace=packages/backend"
   az webapp config appsettings set -g rg-aurora -n aurora-api-prod --settings `
     PORT=8080 HOST=0.0.0.0 NODE_ENV=production DEBUG_MODE=false PERSIST_TRANSCRIPTS=false `
     OPENAI_API_KEY="<value>" ANTHROPIC_API_KEY="<value>" GOOGLE_GEMINI_API_KEY="<value>" `
     AZURE_OPENAI_API_KEY="<value>" AZURE_OPENAI_ENDPOINT="<value>" AZURE_OPENAI_DEPLOYMENT="<value>" `
     MISTRAL_API_KEY="<value>" OPENROUTER_API_KEY="<value>" LOCAL_LLM_BASE_URL="http://localhost:11434"
   ```

3. Deploy code to App Service from the repo root:

   ```bash
   az webapp up -g rg-aurora -n aurora-api-prod --runtime "NODE|20-lts"
   ```

4. Deploy frontend to Azure Static Web Apps and set the frontend API base URL to `https://aurora-api-prod.azurewebsites.net`.
5. Update backend `CORS_ORIGIN` to your Static Web App URL and confirm `/health`, UI load, message flow, STT, and TTS.

---

## Project Structure

```
Andre-Dalton/
├── .env.example                   # Required environment variables template
├── package.json                   # npm workspaces root
├── packages/
│   ├── backend/                   # Fastify API server
│   │   ├── src/
│   │   │   ├── index.ts           # Server entry point
│   │   │   ├── providers/         # LLM provider adapters
│   │   │   ├── routes/            # API route handlers
│   │   │   ├── services/          # speechProfile service
│   │   │   └── utils/             # env loader, logger, redaction
│   │   └── tests/                 # Vitest test suite
│   └── frontend/                  # React + Vite + Tailwind PWA
│       ├── src/
│       │   ├── components/
│       │   │   ├── core/          # CognitiveCore, WaveformDisplay, SystemsStream
│       │   │   ├── panels/        # DialogueLedger, IntentConsole, ModelRouter, VoiceAdaptation
│       │   │   ├── settings/      # AccessibilitySettings, PrivacySettings
│       │   │   ├── layout/        # HUDLayout, StatusBar
│       │   │   └── ui/            # Panel, Button, StatusRing primitives
│       │   ├── hooks/             # useAssistant, useVoiceInput, useTTS, useWakeWord
│       │   ├── services/
│       │   │   ├── stt/           # STT adapter (browser SpeechRecognition)
│       │   │   ├── tts/           # TTS adapter (browser SpeechSynthesis)
│       │   │   └── wakeWord/      # WakeWordDetector (fuzzy phrase matching)
│       │   ├── store/             # Zustand stores
│       │   └── types/             # Shared TypeScript interfaces
│       └── tests/                 # Vitest + jsdom test suite
```

---

## Backend API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health + version |
| `GET` | `/providers` | List configured LLM providers |
| `POST` | `/providers/test` | Validate a provider's API key |
| `POST` | `/assistant/message` | Send message → LLM response |
| `POST` | `/speech/transcribe` | Submit audio for STT |
| `POST` | `/speech/speak` | Request TTS audio |
| `GET` | `/profile/speech` | Load speech/interaction profile |
| `PUT` | `/profile/speech` | Save speech/interaction profile |
| `GET` | `/settings/accessibility` | Load accessibility settings |
| `PUT` | `/settings/accessibility` | Save accessibility settings |

---

## LLM Provider Support

AURORA uses a provider abstraction layer. Configure each via environment variables:

| Provider | Key variable |
|----------|-------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google Gemini | `GOOGLE_GEMINI_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` |
| Mistral | `MISTRAL_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Ollama (local) | No key — set `LOCAL_LLM_BASE_URL` (default: `http://localhost:11434`) |

---

## Wake Word Feature

AURORA supports an optional configurable wake phrase (default: **"Hey J"**). This is **opt-in** and never active by default.

- Enable it in the **Voice Adaptation** panel → Wake Word section
- Change the phrase to anything you like (minimum 2 characters)
- Adjust **sensitivity** (0–1): lower values accept fuzzier matches, helping users whose speech may not precisely match the phrase
- Fuzzy matching uses three strategies: exact substring, token overlap, and Levenshtein sliding-window similarity
- When enabled, a lightweight browser SpeechRecognition instance monitors continuously; the main STT pipeline only starts after detection
- Push-to-talk temporarily pauses wake word monitoring to avoid conflicts

---

## Accessibility Design

AURORA is built accessibility-first:

- **WCAG-aware colour contrast** — cyan/white on dark background, tested against AA minimums
- **Reduced-motion mode** — disables pulsing animations and transitions
- **Large-text mode** — scales all interface text up
- **High-contrast mode** — increases border and text contrast
- **Large touch targets** — all interactive elements meet 44×44 px minimum
- **One-handed mobile layout** — primary controls at bottom of viewport
- **Captions always visible** — spoken TTS output shown as on-screen captions
- **Keyboard navigation** — full tab order and focus indicators on all controls
- **Screen-reader labels** — ARIA labels on all animated HUD elements
- **No colour-only information** — status conveyed by text + shape + colour
- **Samsung Android support** — tested viewport sizes, installable PWA

### Speech Accessibility

The assistant is designed for users with **non-standard, non-fluid speech** including:

- Dysarthric or interrupted speech patterns
- Slow or irregular speech cadence
- Repeated or partial words
- Unexpected long pauses

The **Voice Adaptation** profile stores:
- Speech pace preference
- Pause tolerance (configurable silence detection window)
- Clarification mode (aggressive vs. relaxed inference)
- Custom vocabulary and command aliases
- Substitution list ("what I say" → "what I mean")
- Confirmation threshold for risky actions
- Wake word configuration
- Consent flags for local speech learning

Disfluencies are treated as **normal variation**, not errors.

---

## Privacy & Security

### What AURORA never does
- Never hard-codes API keys anywhere in source code
- Never logs prompts, transcripts, API keys, or personal data unless `DEBUG_MODE=true`
- Never exposes provider API keys to the browser/frontend
- Never stores transcripts without explicit user consent

### How secrets are protected
- All LLM provider calls are proxied through the backend — the browser never touches an API key
- `redactSensitive()` and `redactObject()` utilities strip keys, tokens, emails, and IPs from all log output
- Environment variables are the only secret store in development; production should use encrypted secret management (e.g. AWS Secrets Manager, Vault)
- Authorization headers use string concatenation (`'Bearer ' + key`) — template literals are avoided to prevent accidental logging

### Data retention
- Privacy Mode can be toggled in settings to disable all transcript persistence
- Speech profile corrections are only stored locally when `consentStoringCorrections: true`
- No analytics, telemetry, or third-party tracking

---

## Threat Model Notes

| Threat | Mitigation |
|--------|-----------|
| API key leakage via browser DevTools | Keys never sent to frontend; backend-only provider calls |
| Key leakage via logs | `redactSensitive()` applied to all pino log serializers |
| Prompt injection | Input sanitised before forwarding; no system-prompt override from user input |
| CORS misconfiguration | Backend restricts `CORS_ORIGIN` to configured frontend origin |
| Malformed speech profile payload | `validateSpeechProfile()` validates all fields with strict type + range checks |
| Wake word always-listening | Opt-in only; off by default; uses no cloud audio streaming |
| Excessive microphone access | STT only active during push-to-talk or after confirmed wake word; mic released on stop |

---

## Development Notes

### Environment variables

See `.env.example` for all supported variables. Key settings:

```env
DEBUG_MODE=false           # Set true to enable verbose logging (NEVER in production)
PERSIST_TRANSCRIPTS=false  # Set true to allow local transcript storage
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### TypeScript

- Backend: CommonJS target (`"module": "commonjs"` in tsconfig), run via `tsx`
- Frontend: ESM, bundled by Vite

### Adding a new LLM provider

1. Create `packages/backend/src/providers/MyProvider.ts` implementing `LlmProvider`
2. Register it in `packages/backend/src/providers/index.ts`
3. Add the API key variable to `.env.example` and `utils/env.ts`

### Adding a new STT adapter

Implement the `STTAdapter` interface in `packages/frontend/src/services/stt/` and register it in the STT index.

---

## Naming & Originality

AURORA is an **original project**. All names, visual concepts, and interaction patterns are independently created:

| Element | Name |
|---------|------|
| Assistant | AURORA |
| Status core | Cognitive Core |
| Activity feed | Systems Stream |
| Input area | Intent Console |
| Chat history | Dialogue Ledger |
| Provider switcher | Model Router |
| Speech settings | Voice Adaptation |

No copyrighted names, dialogue, visuals, logos, or fictional canon from any franchise are used or referenced.

---

## License

MIT
