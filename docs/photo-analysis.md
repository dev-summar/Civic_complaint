# Photo reporting

The authenticated `/api/v1/ai/classify` endpoint sends actual image content to `@cf/meta/llama-4-scout-17b-16e-instruct` using multimodal message parts. It replaces the LLaVA endpoint and removes keyword-based guesses and category-based priority defaults.

The visual assessment must contain a status, confidence label, category, priority, title, description and visible evidence. Invalid output produces a recoverable error. It is never converted into a confident complaint by guessing from a few words.

- `issue_visible` with `high` confidence supplies a reviewable suggestion. These confidence labels are model judgments, not calibrated probability estimates.
- `no_clear_issue` and `unclear` return an empty title/summary, category `others`, priority `low`, and a helpful message. Neither automatically creates a complaint description.
- English spoken text matches the visible description. Hindi localization happens after visual analysis. Hinglish display text is a separate Roman transliteration of the Hindi sentence, with matching Hindi speech. This keeps localization from changing the visual category.
- Supported input is base64 JPEG, PNG or WebP, at most 1 MiB of decoded content. The service never fetches arbitrary image URLs supplied by a client.

In voice chat, the camera action is available before or after a voice report. Photo analysis can be read aloud when spoken replies are enabled, or replayed with the photo's listen control. The existing report stays unchanged until the citizen chooses the suggested description. If it suggests another category, the button explicitly offers replacement.

Choosing the description sends `confirmedPhotoDraft` to report-chat. The backend preserves exactly those citizen-reviewed details rather than asking a second model to recategorize them. Citizens can still correct the report by voice or edit the title and description. Submission always requires an exact map pin and explicit confirmation. Photo category and summary are included as triage hints only after acceptance, and only when they match the submitted draft category.

Replacing/removing a photo aborts its old request and ignores late responses. Submission and navigation also invalidate pending photo analysis. A late result cannot interrupt a submission confirmation. The regular report form only fills empty fields for a clear suggestion, preserves citizen edits, and clears obsolete automatic values when the photo changes. Errors are visible and retryable.

## Checks

From `mobile`:

```text
node node_modules/jest/bin/jest.js --runInBand --watch=false --cacheDirectory .cache/jest __tests__/ReportPhoto.test.tsx __tests__/ReportChat.test.tsx
```

From `cloudflare-backend`:

```text
node test/photo.test.cjs
node test/voice.test.cjs
node --experimental-sqlite test/workflow.test.cjs
node test/photo-live.cjs
```

The live script needs `SWACHHSETU_TEST_EMAIL` and `SWACHHSETU_TEST_PASSWORD`. It downloads fixed public fixtures if missing and stores the inference results in `.wrangler/photo-live-report.json`. It checks a normal road, a bottle on a restaurant table, unrelated people, discarded outdoor litter, and road damage; it also checks Hindi/Hinglish descriptions and the confirmed-photo handoff to conversational drafting. It never files complaints. These samples are regression checks, not a benchmark proving accuracy across every civic category.

Web previews use the actual React Native components with fixture speech/API responses. Native layout was also checked on an Android API 34 emulator at 360 × 800 dp, with normal and 130% system text size (fresh app launch after changing text size). English/Hindi/Hinglish tabs remain visible, and both bottom actions stay above the navigation bar. Hindi selection, the typing toggle, and the composer above the open keyboard were checked without filing a complaint or activating the microphone. The composer explicitly reserves the bottom safe-area inset.

Chat actions and language tabs use **gesture-handler Pressable**, whose native button is a single layout view. Keep this import when changing these controls: React Native's responder-based Pressable is affected by a [reported Fabric/native-stack problem on physical Android phones](https://github.com/software-mansion/react-native-screens/issues/2219), which can be absent on an emulator. The earlier gesture-handler TouchableOpacity has a separate outer layout wrapper; replacing it requires preserving button sizing and flex on the native touch view. Avoid moving actions to onPressIn/onPressOut: scrolling or cancelling a touch must not activate an action. Physical-phone confirmation remains necessary for device-specific touch failures.

The signed ARM64 release and x86 emulator APK contain identical JavaScript bundles; the packaged source map is also compared with the changed source files. These checks verify layout, not physical-device acoustics or the native map renderer. Native screenshots are saved in `android/build/chat-layout-fixed.png`, `chat-layout-large-final.png`, and `chat-layout-keyboard.png`.

## References and fixture provenance

- [Cloudflare Llama 4 Scout model](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/) and [structured JSON output](https://developers.cloudflare.com/workers-ai/features/json-mode/).
- [TACO dataset](https://github.com/pedropro/TACO): indoor bottle and outdoor litter fixtures; the live script records the exact public image URLs.
- [Cracks and Potholes in Road Images](https://github.com/biankatpas/Cracks-and-Potholes-in-Road-Images-Dataset): normal-road and damaged-road fixtures.
- [Ultralytics YOLOv5 sample images](https://github.com/ultralytics/yolov5/tree/master/data/images): unrelated-person negative control.
