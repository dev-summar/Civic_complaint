# SwachhSetu voice assistant

The assistant uses the existing Android speech service, Cloudflare Workers AI for conversation and complaint drafting, and Android text-to-speech. No new speech-provider account or API key is required.

## Conversation

1. The citizen starts the microphone and grants Android permission.
2. Recognition readiness, live words and microphone levels appear as Android supplies them. Android detects when the citizen finishes speaking; the stop control can finish a turn manually.
3. Clear speech is sent to the authenticated report-chat endpoint. Uncertain recognition stays in the text box for review. If recognition fails after partial words arrive, those words are preserved for editing.
4. The assistant asks one short follow-up when the civic issue is unclear. After playback finishes, the microphone resumes within that user-started conversation.
5. A clear complaint opens the map. Exact location and submission still require citizen confirmation. Assignment, ownership and deadlines use the existing complaint workflow.

The mic or interrupt button cancels pending AI work and playback before starting a new turn. Generation checks prevent late responses from reopening an old turn. Leaving the screen or backgrounding the app stops the voice session. This is tap-to-interrupt; the microphone is not kept active over the assistant's playback for acoustic barge-in.

## Language and playback

- English uses `en-IN` recognition and playback.
- Hindi uses `hi-IN`.
- Hinglish starts with Hindi recognition. On Android 14+, it requests Hindi/English language switching when supported by the device service, with a one-time single-language fallback for missing language models.
- The API returns separate `reply` and `spokenReply` fields. Hinglish remains Roman script on screen, while spoken words are transliterated into Devanagari and played with a Hindi voice. This avoids reading Roman Hindi with English pronunciation.
- The screen initializes Android synthesis in advance, without recording or speaking. Voice choices are cached. Playback prefers an installed device voice, then the requested region, higher quality and lower reported latency. This avoids making every reply depend on a network voice.
- If a device voice fails before playback starts, an available network voice is tried once. A stalled network voice can switch to an available device voice after 1.5 seconds. Engine initialization has a four-second timeout, speech startup an eight-second timeout, and playback a 45-second timeout. The app does not install voices or change device settings. Phones without an installed voice for the selected language still depend on network synthesis.
- The UI distinguishes voice startup from audible playback using the Android utterance-start callback. It does not label silent initialization as the AI already speaking.
- Replay remembers the reply's original language. Android services vary in partial-result, language-switching and voice support; synthesis quality depends on the installed engine and voices.

## Response latency

The server supplies a shorter localized map handoff, so the citizen spends less time listening before continuing. The validated multilingual model response format is retained for both drafts and follow-up questions.

The backend checks existing database metadata in a single batched call on a cold isolate, coalesces concurrent checks, and caches the result for warm requests. The legacy upgrade path remains for databases that need the existing schema changes. This avoids repeated sequential DDL requests on already-updated databases.

API timing comparisons are saved under `cloudflare-backend/.wrangler/voice-latency-before.json` and `voice-latency-after.json` when running the latency check. They exclude recognition and audio startup on a real phone; device audio timing still requires a physical-device check.

## Verification

Run from `mobile`:

```text
node node_modules/jest/bin/jest.js --runInBand --watch=false --cacheDirectory .cache/jest __tests__/ReportChat.test.tsx
```

The speech bridge is mocked in these tests. They cover context, final draft playback, map confirmation, submission retry, partial/uncertain transcription, Hinglish playback language, interruption, stale-response rejection and background cancellation. Android compilation checks the actual Kotlin bridge. Neither check proves physical microphone accuracy or how a particular phone's voice sounds.

Run from `cloudflare-backend`:

```text
node test/voice.test.cjs
node --experimental-sqlite test/workflow.test.cjs
node --experimental-sqlite test/schema-latency.test.cjs
node test/voice-live.cjs
```

The live check requires `SWACHHSETU_TEST_EMAIL` and `SWACHHSETU_TEST_PASSWORD` environment variables. It logs in and tests synthetic conversations without submitting complaints. Its report goes to `.wrangler/voice-live-report.json`; no authentication tokens or passwords are written there. It measures API round-trip time, excluding speech recognition and audio playback.

## Public design references

- [LiveKit turn-taking patterns](https://docs.livekit.io/agents/logic/turns/tuning/): explicit turn states and cancellation/interrupt handling informed the interaction. The app does not use LiveKit or its adaptive interruption model.
- [Android RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent) and [RecognitionListener](https://developer.android.com/reference/android/speech/RecognitionListener): partial transcripts, recognition events and service-dependent language switching.
- [Android Voice](https://developer.android.com/reference/android/speech/tts/Voice): voice locale, quality, latency and network requirements.
- [Cloudflare Qwen3 model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/): the existing conversational and triage model.
