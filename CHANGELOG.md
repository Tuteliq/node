# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.26.0] - 2026-08-24

### Changed

- **`verdictOnly` no longer omits `rationale` on `detectBullying` / `detectUnsafe` — it omits `action_detail` instead.** Two accounts on this SDK found every persisted bullying incident summary reading as the same flat generic string, because `rationale` — the one field a moderator reads to triage an incident — was the field fast mode cut server-side. `action_detail` (the secondary, comparably-sized moderator-guidance field) was left unconditional, backwards from what fast mode should prioritise. `detectGrooming` already had this right; bullying and unsafe are now consistent with it. `GroomingResult.rationale` is correspondingly now typed as required (`string`, not `string?`) — it was always unconditional at runtime, the type just hadn't caught up. `BullyingResult.rationale` / `UnsafeResult.rationale` stay optional at the type level as a defensive measure (a malformed LLM response could still theoretically omit it), but are documented as always generated. **Requires the API deployed on or after 2026-08-24**; against an older deployment, `verdictOnly` continues to omit `rationale` as before.

- **`verdictOnly` now implies `includeEvidence: false` on the fraud/safety-extended endpoints, unless `includeEvidence` is set explicitly.** Previously `verdictOnly` had no effect at all on `detectRomanceScam`, `detectSocialEngineering`, `detectAppFraud`, `detectMuleRecruitment`, `detectGamblingHarm`, `detectCoerciveControl`, `detectVulnerabilityExploitation`, `detectRadicalisation`, `detectDistressSignals`, `detectTFGBV` and `detectSyntheticContent` — the full `evidence[]` array, including quoted excerpts from the input, was always returned regardless. `evidence` is this endpoint family's equivalent of `action_detail`: the expensive, skippable field. `rationale` was already unconditional here and is untouched. Pass `includeEvidence: true` alongside `verdictOnly: true` if you want fast mode's other savings without losing evidence. **Requires the API deployed on or after 2026-08-24**; against an older deployment, `verdictOnly` continues to have no effect on evidence.

### Fixed

- **`includeEvidence: false` was silently dropped and never reached the API.** `buildDetectionBody` only forwarded `includeEvidence` when it was truthy (`if (input.includeEvidence) ...`), so an explicit `includeEvidence: false` — the caller's choice to exclude evidence entirely — was indistinguishable from not setting it at all, and the server's default (`true`) applied instead. Found auditing the `verdictOnly` change above. Now forwards `true` and `false` alike, and omits the field only when the caller truly didn't set it (letting the server apply its own default, including the new `verdictOnly` inference above).

## [2.25.0] - 2026-08-20

### Added

- **Conversation-level risk: `trajectory_risk`, `trajectory` and `severity_series`.** `risk_score` has only ever scored the message in the current request. An external reviewer fed a six-turn bullying escalation and watched the scores go 5, 10, 65, 5, 75, 5 — the final "see you tomorrow :)", sent immediately after two flagged messages, came back described as a positive social interaction. Correct per message; useless for a child who had just been excluded. Slow-burn exclusion cannot be seen one message at a time.

  The API now returns a conversation-level view alongside the continuation token, and it is typed here on `BullyingResult`, `GroomingResult` and `DetectionResult` — the same three result types that carry `continuation_token`:

  - `trajectory_risk` (0-1) — risk for the conversation rather than for the turn. Anchored on the highest severity seen so far, decaying slowly across benign turns and never falling below the current turn, so a friendly message straight after an escalation does not reset it. On the reviewer's conversation it reads `0.74` where `risk_score` reads `0.10`.
  - `trajectory` — `rising` | `stable` | `declining` | `none`, exported as the `ConversationTrajectory` type.
  - `severity_series` — per-turn severity, oldest first: the evidence behind the other two, so the number can be shown rather than asserted.

  All three are optional and absent on the first turn of a fresh conversation, where they would only restate `risk_score`. They require a `continuationToken` to be threaded through the conversation; without one, every call is a first turn. Branch on the higher of `risk_score` and `trajectory_risk`, not on `risk_score` alone.

### Fixed

- **`analyze()` accepted `incident_moderation_enabled`, dropped it, and reported it as applied.** The flag lives on the shared `TrackingFields`, so `analyze()` accepted it — but it was never forwarded to the `detectBullying` / `detectUnsafe` calls the method fans out to, while being copied verbatim into the returned result. A caller passing `false` to suppress incident persistence got incidents persisted by both sub-calls and a response claiming otherwise. It is now forwarded to both, and declared on `AnalyzeResult` instead of being an untyped extra field.

### Note

- `analyze()` still cannot report a trajectory: it accepts no `continuationToken`, so every call is a fresh first turn and its combined `risk_score` remains the maximum of the per-message scores. Where a sub-result does carry conversation state it is preserved in full under `result.bullying`. For multi-turn work call `detectBullying` directly.

## [2.24.0] - 2026-08-20

### Fixed

- **`batch()` sent a request shape the API has never accepted.** `POST /api/v1/batch/analyze` requires each item to be `{ id, type, data }`; the SDK sent `{ type, text, context, external_id }`, so every batch call was rejected with `body/items/0 must have required property 'id'`. Three separate mismatches: the missing `id`, `text`/`messages` sitting on the item instead of inside `data`, and `parallel` nested under an `options` object the route never reads — so `parallel: false` was silently ignored even had the rest been valid. Batch analysis did not work through the SDK, or through the MCP server that calls it.

  Items now carry an optional `id`; one is generated positionally (`item-0`, `item-1`, …) when you do not supply it. `id` addresses an item within the request and is echoed on its result — it is not `external_id`, which is your own record's identifier and is still returned alongside it.

- **`batch()` returned a result shape that did not match its own type.** The API keys results by `id` and reports timing as `summary.processingTimeMs`; `BatchAnalyzeResult` declares `results[].index` and a top-level `processing_time_ms`. Both were `undefined` at runtime, so `items[r.index]` never resolved. The response is now mapped back: positional `index` restored by id, `external_id` re-attached from the request, `processing_time_ms` and `summary.total_credits_used` populated.

- **`createVerificationSession()` discarded `recommended_image_width` and `verification_mode`.** The API returns both; the SDK projected the response down to four fields. `recommended_image_width` is the capture width at which document small print (document number, issuing authority, issue date) survives OCR, so dropping it left callers guessing at a value the API had already supplied. `expires_at` is also now correctly typed as `number` (epoch milliseconds), which is what the API sends.

### Added

- **All twelve batch analysis types.** `batch()` previously typed only `bullying`, `unsafe`, `emotions` and `grooming`. It now accepts the full set the route supports: those four plus `social_engineering`, `app_fraud`, `romance_scam`, `mule_recruitment`, `gambling_harm`, `coercive_control`, `vulnerability_exploitation` and `radicalisation`.

- **Batch emotions items take `messages`.** The emotions endpoint is message-based and uses `sender`/`text`, not grooming's `sender_role`/`text`. Pass `messages: [{ sender, content }]`, or keep passing `content` and the SDK wraps it into a one-message conversation.

- **`continuationToken` / `resetConversation` on the unified detection endpoints.** `detectCoerciveControl`, `detectVulnerabilityExploitation` and `detectDistressSignals` maintain conversation state server-side and return a fresh `continuation_token` on every result, but there was no way to send one back — multi-turn trajectory on those endpoints was unreachable from the SDK. The fields are accepted on every `DetectionInput`; endpoints that do not track state ignore them.

- **`SupportData` / `SupportHelpline` / `SupportResponseGuide` types.** The `support` block attached to a positive detection was undeclared, so every consumer cast through `any`. `support` is now typed on `BullyingResult`, `GroomingResult`, `UnsafeResult` and `DetectionResult`, alongside `continuation_token`, `continuation_expires_at` and `state_source`.

### Changed

- **`DetectionResult.rationale` is now optional.** `verdictOnly: true` suppresses rationale generation server-side, so the field was already absent at runtime while the type promised a `string`. Callers interpolating it printed the literal string `undefined`. This is a type-level breaking change for TypeScript consumers who read `rationale` unguarded; it matches the runtime behaviour and the already-optional `rationale` on `BullyingResult` and `GroomingResult`.

## [2.23.0] - 2026-08-12

### Added

- **Per-call incident logging control** — every detection method now accepts an optional `incident_moderation_enabled` (via the shared `TrackingFields`). It overrides your account-level incident-logging setting for that single request: `true` forces the incident to be persisted, `false` suppresses persistence, and omitting it defers to your account default (which itself defaults to enabled). Useful for suppressing logging on test traffic or opting specific calls in or out. `false` is passed through correctly, not treated as "unset".

## [2.21.0] - 2026-08-05

### Fixed

- **Every Buffer upload was rejected by the API** — `analyzeImage`, `analyzeVoice`, `analyzeVideo`, `analyzeDocument`, `detectSyntheticImage`, `detectSyntheticAudio` and `detectSyntheticVideo` wrapped the buffer in `new Blob([file])`, which carries no MIME type. The multipart part therefore went out as `application/octet-stream` and the API rejected it against its per-endpoint allowlist (`Unsupported image type: application/octet-stream`). This broke the documented `readFileSync(...)` pattern for all seven methods; only pre-typed `Blob`/`File` inputs (the browser path) worked. The type is now derived from the filename.

  The type also decides behaviour, not just admission: `image/gif` is what tells the API to decode an animated GIF and analyse its frames rather than treat it as a still, so an untyped upload would have silently got first-frame-only handling even if it had been accepted.

### Added

- **`mimeTypeForFilename(filename)`** — exported helper returning the MIME type the SDK will send for a given filename, or `undefined` for an unrecognised extension. Covers png, jpg/jpeg, gif, webp, mp3, wav, m4a, ogg, flac, mp4, webm, mov, avi and pdf.

### Note

- Animated GIFs are now analysed frame by frame by `/safety/image` (up to 4 evenly-spaced frames, first and last always included) rather than failing. Send the original GIF instead of flattening it to a still; a still only ever exposes the first frame. Cost is unchanged at image rates. Requires the API deployed on or after 2026-08-05.

## [2.20.0] - 2026-08-04

### Added

- **`verdictOnly` on `analyze()`** — `AnalyzeInput` now accepts `verdictOnly`, forwarded to both detectors the method fans out to. Previously you had to drop `analyze()` and call `detectBullying` / `detectUnsafe` yourself to use fast mode, then recombine the results by hand. The combined `risk_level` and `recommended_action` are derived exactly as before.

  Because the sub-calls already run in parallel, the saving is the difference on the slower detector rather than the full per-call saving.

### Fixed

- **`verdictOnly` did nothing on `detectBullying` / `detectUnsafe`** — Both were documented as supporting it since 2.16.0 and `DetectBullyingInput` declared it, but the API never accepted the flag on those routes: it was validated away and silently discarded. The API now honours it and skips generating `rationale`, the only free-text field either endpoint produces. **Requires the API deployed on or after 2026-08-04**; against an older deployment the flag is still ignored rather than erroring.
- **`rationale` is now optional** on `BullyingResult`, `GroomingResult` and `UnsafeResult` — it is omitted from the response when `verdictOnly` is set, so the type no longer promises a field that will not be there.

## [2.19.0] - 2026-08-04

### Added

- **Synthetic-content and document results are typed to the action enum** — `SyntheticTextResult`, `SyntheticImageResult`, `SyntheticAudioResult`, `SyntheticVideoResult` and `DocumentPageEndpointResult` declared `recommended_action` as `string` and had no `action_detail`. They are standalone interfaces, so they missed the 2.18.0 change. Every detection result across the SDK now carries `recommended_action: RecommendedAction` and optional `action_detail`.

### Changed

- **A `medium` verdict now always returns `flag_for_review`** — the API previously let the model choose between `monitor` and `flag_for_review` at medium, so identical input could land on either side of the "a human should see this" line. The removed `normalized.actionable` field treated medium as actionable, so pinning it keeps alerting parity for anyone migrating off that field. If you want a tighter filter than medium, branch on `risk_score` or the level rather than `recommended_action`.

## [2.18.0] - 2026-08-04

### Added

- **Verdict fields on the media endpoints** — `analyzeImage`, `analyzeVoice` and `analyzeVideo` results now carry `detected`, `confidence`, `recommended_action`, `action_detail` and `rationale`, matching every other detection result. Previously these returned only `overall_severity`, so callers had to reimplement their own threshold logic to decide whether media needed a moderator. Branch on `recommended_action` (or `isActionable`) as you would elsewhere.

### Fixed

- **`VideoAnalysisResult.safety_findings` did not exist** — The type declared a `safety_findings: VideoSafetyFinding[]` field that the API has never returned, so `result.safety_findings.map(...)` type-checked and then threw at runtime. Replaced with the fields the endpoint actually returns: `frame_results` (per-frame analysis), `flagged_timestamps` (points exceeding the reporting threshold) and `duration_seconds`. `VideoSafetyFinding` is replaced by `VideoFrameResult` and `VideoFlaggedTimestamp`.
- **Voice severity can now be `none`** — The API floored voice `overall_severity` at `low`, so silent or benign audio reported as a low-severity concern. It now reports `none`, which `ContentSeverity` already allowed. If you filtered voice results with `severity !== 'low'`, add a `none` check.

## [2.17.1] - 2026-08-04

Documentation only. No code change from 2.17.0 — the published bundles are identical.

### Fixed

- **README documented two values the API does not emit** — The synthetic-content example showed `recommended_action` as `'immediate_review'`, which has never been a valid value; a comparison against it can never match. Corrected to `immediate_intervention`. The `DetectionResult` shape also still typed `recommended_action` as `string`; it now shows the `RecommendedAction` union and `action_detail`.

## [2.17.0] - 2026-08-04

### Fixed

- **`analyze()` silently returned `none` for moderator-worthy verdicts** — The combined `recommended_action` was computed by matching the literal string `flag_for_moderator`, which the API does not emit (it returns `flag_for_review`). Any result that should have aggregated to "a human needs to see this" resolved to `none` instead. The aggregation now ranks over the shared action enum, maps legacy spellings, and escalates an unrecognised value to `flag_for_review` rather than discarding it, so a verdict can no longer disappear.

### Added

- **`RecommendedAction` type** — `recommended_action` is now typed as `'none' | 'monitor' | 'flag_for_review' | 'block' | 'immediate_intervention'` instead of `string`, on all detection results. Ordered weakest to strongest and safe to `switch` over.
- **`action_detail`** — Optional human-readable expansion of `recommended_action`, for display in a moderator UI. Free text; do not branch on it.
- **`isActionable(action)`** — Returns true for `flag_for_review` and above. Use it instead of branching on `is_bullying` / `unsafe` / a `low` grooming risk, all of which fire on monitor-only cases and over-alert.
- **`strongestAction(actions)`** and **`toRecommendedAction(value)`** — Helpers for combining and normalising action values across endpoints.

### Changed

- **Branching guidance no longer references `normalized`** — The API no longer returns a `normalized` block on the bullying, grooming and unsafe endpoints; it duplicated fields already present at the top level. The documented pattern `if (result.normalized?.actionable)` will silently stop matching, so replace it with `if (isActionable(result.recommended_action))`. The per-message detail formerly projected into `normalized.evidence` is available as `message_analysis`.

## [2.16.0] - 2026-07-25

### Added

- **Fast mode (`verdictOnly`)** — Pass `verdictOnly: true` on any detection method (`detectBullying`, `detectGrooming`, `detectUnsafe`, the fraud/safety-extended detectors, and `analyseMulti`) to omit the per-message `message_analysis` breakdown and return only the conversation-level verdict. Lower latency and a smaller payload for real-time screening of live chat; the verdict itself (risk level, categories, recommended action) is unchanged. Screen in fast mode, then re-run flagged content in standard mode for the full per-message trajectory.

## [2.5.0] - 2026-03-15

### Added

- **`country` context field** — Pass ISO 3166-1 alpha-2 country code (e.g., `"GB"`, `"US"`, `"SE"`) in the `context` object to receive geo-localised crisis helpline data in detection responses. Falls back to user profile country if omitted.

### Improved

- **Action escalation for minors** — All detection endpoints now enforce minimum `flag_for_review` when harm is detected and the subject is a minor. Criminal indicators (sextortion, trafficking, CSAM) targeting minors automatically escalate to `immediate_intervention`.
- **Risk score distribution** — Detection prompts now instruct the LLM to use graduated scoring across the full 0.0–1.0 range instead of clustering around a single value.
- **Evidence tactic format** — Evidence tactic fields are now normalised to SCREAMING_SNAKE_CASE (e.g., `"EMOTIONAL_MANIPULATION"` instead of `"Emotional Manipulation"`).

## [1.0.0] - 2024-02-05

### Added

- Initial release of the Tuteliq TypeScript SDK
- **Safety Detection**
  - `detectBullying()` - Detect bullying and harassment in text
  - `detectGrooming()` - Analyze conversations for grooming patterns
  - `detectUnsafe()` - Identify unsafe content (self-harm, violence, hate speech)
  - `analyze()` - Quick combined analysis with risk assessment
- **Emotional Analysis**
  - `analyzeEmotions()` - Summarize emotional signals in content
- **Guidance & Reports**
  - `getActionPlan()` - Generate age-appropriate action guidance
  - `generateReport()` - Create incident reports for professional review
- **Policy Management**
  - `getPolicy()` - Retrieve current safety policy configuration
  - `setPolicy()` - Update safety thresholds and rules
- **Features**
  - Full TypeScript support with comprehensive type definitions
  - Automatic retry with exponential backoff and jitter
  - Usage tracking via response headers
  - Typed error classes for different failure scenarios
  - Input validation for content length and message counts
  - Zero runtime dependencies (uses native `fetch`)

### Security

- API endpoint locked to official Tuteliq server
- API key validation (minimum length, type checking)
- Configuration bounds validation (timeout, retries)
- No sensitive data exposed in error messages

---

## [1.1.0] - 2026-02-10

### Added
- `customer_id` tracking field for multi-tenant / B2B2C scenarios
  - Available on all detection methods (`detectBullying`, `detectGrooming`, `detectUnsafe`, `analyze`, `analyzeEmotions`, `getActionPlan`, `generateReport`)
  - Echoed back in API response for easy correlation
  - Included in webhook payloads for routing alerts to the correct customer
  - Maximum 255 characters

## [Unreleased]

### Added
- `deleteAccountData()` — Delete all account data (GDPR Article 17 — Right to Erasure)
- `exportAccountData()` — Export all account data as JSON (GDPR Article 20 — Right to Data Portability)
- `AccountDeletionResult` and `AccountExportResult` types

### Changed
- PII redaction is now **enabled by default** on the API (opt-out instead of opt-in)
