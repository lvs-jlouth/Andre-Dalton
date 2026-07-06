# AURORA Threat Model

## Scope

This document covers the current browser frontend, Fastify backend, LLM provider integrations, local speech-profile storage, and planned future local-network and desktop-wrapper features.

## Trust boundaries

- **Browser UI**: untrusted input surface for text, voice transcripts, and local storage.
- **Backend API**: trusted boundary for provider access, key handling, and request validation.
- **LLM providers**: third-party processors that receive only sanitized conversation content.
- **Local device storage**: browser storage for opted-in transcripts and speech-profile preferences.
- **Future integrations**: local-network devices, Android-installed PWA usage, and a future desktop wrapper.

## Assets

- Provider API keys
- User prompts and assistant responses
- Speech transcripts and partial transcripts
- Sensitive speech-profile data such as substitutions, custom vocabulary, aliases, and preferred name
- Confirmation decisions for potentially risky actions

## Threats and mitigations

| Threat | Current mitigation | Residual notes |
| --- | --- | --- |
| API key leakage | Keys remain backend-only; provider list responses never include secrets; logger redacts key-like values and metadata. | Production should still use managed secret storage and least-privilege deployment access. |
| Prompt logging | Backend does not log prompt or transcript bodies by default; debug logging stays disabled unless explicitly enabled. | `DEBUG_MODE` must remain off for shared or production environments. |
| Transcript retention | Transcripts stay in memory unless the user explicitly enables local transcript retention; disabling retention clears stored transcripts. | Browser storage is device-local, so shared devices still need OS/browser protections. |
| Speech profile sensitivity | Sensitive learning data is only persisted when the relevant consent flags are enabled; users can clear local data from the privacy panel. | Preferred names and local settings still exist in runtime memory while the app is open. |
| Provider failure | Provider errors return a safe failure message that encourages retry or provider switching without exposing internals. | Failover is manual today to avoid silently sending data to a different provider. |
| Prompt injection | Client-supplied `system` messages are rejected; backend owns the immutable safety prompt and strips control characters from conversation content. | LLM prompt injection can still influence model output, so no tool execution is exposed. |
| Risky actions | High-risk requests are intercepted in the client and require explicit confirmation before being sent upstream. | This is advisory today because the app does not execute real-world actions yet. |
| Confirmation flow bypass | Confirmation prompts are handled locally and require a follow-up `confirm` or `cancel` response. | Future action routes must enforce server-side confirmation tokens as well. |
| Local-network integrations planned for later | Current browser build does not directly call LAN devices; planned integrations must stay backend-only and allowlist destinations. | Ollama is already treated as a backend-side local endpoint. |
| Android PWA exposure | PWA caches static assets only, excludes `/api` navigation fallback, and documents HTTPS use for microphone access. | Installed PWAs on shared devices should rely on device screen locks and site-data clearing. |
| Desktop wrapper risks | No wrapper is shipped today; future wrappers must keep renderer sandboxes enabled and preserve backend-only secret handling. | Do not expose Node or shell APIs directly to renderer content. |

## Security requirements for future work

- Keep provider keys out of the browser, service workers, and desktop renderers.
- Require explicit confirmation plus server-side authorization for any future action-capable route.
- Restrict future local-network integrations to backend allowlists and explicit user opt-in.
- Keep transcript retention opt-in and provide user-visible clearing controls.
- Preserve CSP, no-store caching, and sanitized logging when packaging a desktop wrapper.
