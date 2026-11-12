# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `auto_capture` on `createVerificationSession`: `false` turns off automatic document capture in the web UI, so the user taps Capture. Defaults to `true` on the API. Returned on the session.

## [3.0.0] - 2026-11-08

Brings the SDK up to date with the API: new methods and fields, request bugs fixed, and types corrected to what the API returns.

### Breaking changes

Every change below fixes something that never worked against the API, but each can stop existing TypeScript code from compiling, and one changes runtime behaviour:

- **Voice streaming:** `sendAudio()` throws until the session is ready. Audio sent earlier was never read by the server; wait for the ready event before sending.
- **Action plan:** `'educator'` is no longer an `Audience` value. The API always rejected it with a 400.
- **Multi-analysis:** `AnalyseMultiInput.detections` is typed as `DetectionName[]` instead of `string[]`.
- **Incident review:** `batchReviewIncidents` requires `moderator_external_id`, as the API already did. `IncidentStatus` and `IncidentSeverity` list the values the API returns (`reviewed`, `moderate`); `new_risk_level` and `new_risk_category` are typed to the accepted values.
- **Audit logs:** `AuditLogEntry.details` is a string, which is what the API sends.
- **Usage summary:** `UsageSummary` has the shape the API returns (`usage`, `quota`). The old fields stay as deprecated optionals but were always `undefined`.
- **Verification:** session poll timestamps are numbers (epoch milliseconds), and fields the poll never returns are no longer declared. `createVerificationSession` is never retried automatically.
- **Synthetic media:** results use the API's field names (`semantic_analysis`, `rms_level`, `temporal_consistency.score`); the old names stay as deprecated optionals.

### Added

#### Text detection

- **`detectNickname()`** for `POST /api/v1/safety/nickname`. Reads a display name before it is shown and returns a signal about the name, not a verdict on the person. It carries `recommendation` (`allow`, `allow_and_watch`, `ask_to_rename`, `hold_for_review`), not `recommended_action`, so do not pass it to `strongestAction` or `isActionable`. When `reading_complete` is false nothing was analysed or charged: retry.
- **Declared setting and participants on `context`.** `sender`, `recipients` (with `relationshipToSender`), `conversationType`, `minorDisclosureCheck` and `authorRole` (distress signals), translated to the API's snake_case keys. `ConversationType` and `CONVERSATION_TYPES` are exported, and `default_conversation_type` is typed on the detection settings.
- **`attestation` and `messageId`** on `detectBullying`, `detectGrooming`, `detectUnsafe` and the unified detectors; **`newConversation`** on `detectUnsafe`; **`includeRelationshipFrame`** on `detectGrooming`.
- **Result fields the API returns.** Signed `attestation`, `conversation_type_in_effect` and its source, `participants_applied`, `minor_disclosure`, `speaker_role`/`speaker_stance`, `bullying_reported`, grooming `analysis_status` and `relationship_frame`, unsafe `third_party_concern`, and the coercive-control `disclosure_capped` outcome. Result adjustment fields are now typed (`ResultAdjustments`). The ten unified detectors return per-endpoint result types that extend `DetectionResult`.
- **`analyseMulti` summary.** `analysis_status` (with `recommended_action` and `failed_endpoints` on a partial run), `highest_risk.close_calls`, `skipped_endpoints`, `total_credits_used`, and top-level `support`. `results` is typed as `MultiDetectionResult[]`, and `flagProfanity`/`flagRiskTerms` are accepted.
- **`Detection`** gains `DISTRESS_SIGNALS`, `TFGBV` and `SYNTHETIC_CONTENT`, and is exported from the package root. `BatchResultItem.error_code` and `MessageAnalysis.unsupported_flags` are typed.

#### Media

- **Video on the voice stream:** `enableVideo` and `frameIntervalSeconds` in `VoiceStreamConfig`, `sendVideoFrame()` on the session, the `frame_analysis` event with `onFrameAnalysis`, `visual` alerts, `video_frames_analyzed` on the session summary, `'all'` in `analysisTypes`, and `context.childAge`.
- **`verifyImageMatch()`** (`POST /verify-image-match`): face match, age estimate, explicit-content and synthetic-image checks on one image in one call. Image bytes are base64-encoded for you.
- **`getSafetyClassification()`** (`GET /safety-classification`): the account's daily safety classification. An account with no classification yet answers `{ exists: false }`, never a zero score.
- `flagRiskTerms` on `analyzeImage` and `analyzeVideo`, with `risk_terms` on their results; `analysisType` and `maxFrames` on `analyzeVideo`.
- `analyzeDocument` accepts PNG, JPEG and WebP images as one-page documents, and `splitBySender` for messaging screenshots.
- `language` and `language_status` on `VoiceAnalysisResult`.
- `fileId` on synthetic image, audio and video inputs; `screenshot_detection` (`is_screenshot`, `confidence`), `metadata` and `file_id` on synthetic image results; `metadata` and `file_id` on synthetic audio results; `drift_signature`, `forensic_signals`, `language_status`, `metadata` and `file_id` on synthetic video results. These types follow the published response shape for the synthetic media endpoints.

#### Verification and webhooks

- `getVerification(id)` retrieves a past verification, including its age.
- `getVerificationConfig({ country, region })` returns which check a user in a market gets under your API key, and the age threshold.
- `chip_policy` on `createVerificationSession` (`optional`, `required`, `instead_of_photo`), returned on the session and the poll. New `ChipPolicy`, `VerificationCheck` and `DocumentEvidence` enums.
- Session poll fields `verification_mode`, `document_evidence`, `step_progress`, `chip_policy`, `capture`, `result.age_range`, `result.document_evidence`, and the full set of extracted document fields.
- `VerificationSessionStatus.DOCUMENT_REQUIRED`.
- `VerificationLimitError` (402) with `limitDetails` when the monthly verification allowance is used up.
- `WebhookEventType` values `verification.completed`, `minor.detected`, `csam.detected`, `csam.critical`.
- Typed webhook deliveries: `WebhookPayload`, `WebhookEventData`, `VerificationWebhookData`.
- `verifyWebhookSignature(rawBody, header, secret, options)` for the `X-Tuteliq-Signature-V2` header, with a timestamp tolerance window and constant-time comparison.
- Verification error codes in `ErrorCode`.

#### Account and platform

- `getDsaTransparencyReport({ from, to, format? })`: DSA transparency report data for a reporting period, as a typed JSON object or, with `format: 'csv'`, as CSV text.
- `getStatus()`, `ping()` and `pingComponent(component)`: public health endpoints. A 503 is returned as a typed answer, not thrown, and never retried.
- `getFleet()` and `getFleetDevice(deviceId)`: device attestation reads for the org behind the API key.
- `getApiKeyQuota()`: active API keys, the tier maximum and whether another key can be created.
- `getUsageSummary(date?)` accepts a date (YYYY-MM-DD).
- `UsageMonthlyResult.verification`: the period's verification allowance on enterprise verification plans.
- Incident rows carry `recommended_actions`, `policy_action`, `recommended_status`, `escalation_capped`, `escalation_capped_reason`, `speaker_stance`, `action_capped`, `action_capped_reason` and `is_test`.
- Audit receipt payloads carry `harm_descriptor` and `external_ref`; `moderator_review.action` includes `resolve` and `reopen`.
- `IncidentCategory` union; the `RiskCategory` and `IncidentStatus` enums list every value the API uses.
- `ConsentRecord.ip_hash`; `AuditLogEntry.ip_hash`, `user_agent` and `_encrypted`; `AccountExportResult.incompleteCollections` and `unverifiedCollections`.

### Fixed

#### Text detection

- **`analyzeEmotions` and batch emotions items now send the declared age as `context.age_group`.** They sent `ageGroup`, which the route does not read, so the age never arrived. `incident_moderation_enabled` is now forwarded too.
- **`getActionPlan`** rejects `audience: 'educator'` with a `ValidationError` instead of a 400 from the API (`Audience` no longer lists it), and returns `approx_reading_level`, copied to `reading_level` for existing callers.
- **`generateReport`** sends `conversationId` and `timestampRange` in `meta`, and no longer sends `incident`, which the API dropped.
- **`analyseMulti`** forwards `flagProfanity`/`flagRiskTerms` and no longer sends `verdictOnly`, which the route does not accept.
- **`batch`** keeps the per-item `error_code` the API returns.

#### Media

- **Voice streaming connects again.** `voiceStream()` dialled a URL the API does not serve, so sessions could not connect. It now connects to `/api/v1/safety/voice/stream`. The initial config is sent once the session is ready (it was sent before the server read messages, so it never applied), and context goes out in the wire format: `ageGroup` now takes effect and `platform` is attributed like every other call. `sendAudio()` now throws until the session is ready, instead of sending audio the server would not read.
- **`incident_moderation_enabled` is sent on `analyzeVoice`, `analyzeImage`, `analyzeVideo` and `analyzeDocument`.** It was accepted on the input types but never sent, so the per-call override had no effect.
- **Synthetic image, audio and video results now match what the API returns.** Image analysis is in `semantic_analysis` (`vision` was always `undefined`); `AudioStats` holds the published measurements (`rms_level`, `rms_peak`, `dc_offset`, `dynamic_range`, `silence_ratio`, `peak_count`, `flat_factor`); video `temporal_consistency` uses `score`, `identity_consistency`, `landmark_stability` and `anomalous_pairs`. Transcription `segments` is optional on these results, since it is absent when there is no speech and on video.
- **`DocumentAnalysisResult.file_id` is always present** (your reference, or the uploaded filename).

#### Verification and webhooks

- `DocumentType.ID_CARD` sent `id_card`, which the API rejects; national ID cards now send `national_id` (`DocumentType.NATIONAL_ID`).
- `createVerificationSession` is no longer retried automatically, so a lost response cannot create a duplicate session.
- `createVerificationSession` no longer drops `chip_policy` from the response.
- Session poll types match the served response: timestamps are epoch milliseconds, and fields the poll never returns are no longer typed as present. Documented that extracted document fields are released only on the first authenticated poll after completion.
- `getAgeVerification` and `getIdentityVerification` result types no longer declare fields those routes never return.
- `Webhook.last_triggered_at` and `last_error` are typed as nullable.

#### Account and platform

- `UsageSummary` matches the response (`apiKeyId`, `tier`, `date`, `usage`, `quota`); every previously declared field read `undefined`.
- `PricingPlan.isPopular` / `ctaLink`, `ConsentRecord.userId` and `AuditLogEntry.userId` use the API's field names. `AuditLogEntry.details` is typed as a string.
- `IncidentStatus` is `new | reviewed | escalated | resolved | dismissed` and `IncidentSeverity` is `low | moderate | high | critical`; list filters still accept `medium` and `reviewing`.
- Review inputs type `new_risk_level` and `new_risk_category` with the values the API accepts. `batchReviewIncidents` requires `moderator_external_id`, and both review methods check for it before sending.

### Deprecated

#### Text detection

- Fields the API never returns or accepts, kept for compatibility: `UnsafeResult.risk_level`, `DetectionResult.trajectory_risk`/`trajectory`/`severity_series`, `SupportData.response_guides`/`language`, `SupportResponseGuide.childSpecificActions`/`confidential`/`language`, `AnalyseMultiResult.credits_used` (use `summary.total_credits_used`), `AnalyseMultiInput.verdictOnly`, `BatchAnalyzeInput.continueOnError`, `GenerateReportInput.incident`, and `ActionPlanResult.reading_level` (use `approx_reading_level`).

#### Media

- `bypassCache` on synthetic-content inputs: a no-op, as there is no verdict cache. The SDK no longer sends it.
- Fields the API never returns, kept for compatibility: `SyntheticImageResult.vision`, `AudioStats.rms_mean`, the old `TemporalConsistency` field names and `signals`, `LipSyncResult.signals`, `action_detail` on synthetic text, image, audio and video results, and `action_detail` / `detected_language` on document page results.
- `incident_moderation_enabled` on synthetic image, audio and video inputs (not read by those endpoints), and voice stream `context.relationship` (never read).
- `getSyntheticProfile()`: the note now says the route was removed from the API (not that it never shipped).

#### Verification and webhooks

- `DocumentType.ID_CARD`: use `DocumentType.NATIONAL_ID` (same value).
- `redirect_url`, `external_id`, `customer_id` and `metadata` on `createVerificationSession`: the API does not accept them and the SDK no longer sends them. Set the redirect URL in the dashboard.
- `VerificationSessionStatus.CANCELLED`: never returned; a cancelled session reads as `expired`.

#### Account and platform

- `UsageSummary.messages_used`, `message_limit`, `purchased_credits`, `total_available`, `usage_percentage`, `period_start`, `period_end`, `days_remaining`: never sent by this endpoint; use `getUsageMonthly()`.
- `PricingPlan.is_popular` and `cta_link`: use `isPopular` and `ctaLink`.
- `ConsentRecord.user_id` and `AuditLogEntry.user_id`: use `userId`.

## [2.33.0] - 2026-09-21

### Fixed

- **`UsageQuota` now matches what `GET /usage/quota` returns.** The type declared flat `rate_limit` / `remaining` / `reset_in_seconds` fields the API never sent, so every consumer reading them got `undefined` (the MCP server's quota tool printed "undefined/min" and "[object Object]", reported by a customer on 2026-09-21). The type is now the wire shape: `limits.{requestsPerMinute,requestsPerDay,requestsPerMonth}` (`-1` = unlimited), `current.{requestsThisMinute,requestsToday}`, `remaining.{requestsThisMinute,requestsToday}`, and optional `apiKeyId`. Types only; `getUsageQuota()` forwarded the raw response all along, so runtime values are unchanged. Code that read the old flat fields must move to the nested ones (it was reading `undefined` before).

### Added

- **`UsageQuota.resetsInSeconds`**, seconds until the per-minute window resets. Optional: absent on API deployments before 2026-09-21.

## [2.32.0] - 2026-08-28

### Added

- **`context.priorMessages` and `continuationToken`/`resetConversation` on `detectUnsafe`.** `detectUnsafe` never exposed multi-turn support at all, unlike `detectBullying`/`detectGrooming` — no context field for submitting prior turns, and no way to carry trajectory across separate calls, despite the API's `/unsafe` route supporting `continuation_token` all along, and now also supporting `context.prior_messages` (Tuteliq/api#173). `priorMessages` is a new `ContextInput` field (idiomatic camelCase; `normalizeContext` translates it to the wire's `prior_messages` — every other endpoint using `ContextInput` picks it up automatically too, ignored server-side where unsupported). `continuationToken`/`resetConversation` on `DetectUnsafeInput`, and `continuation_token`/`continuation_expires_at`/`state_source`/`trajectory_risk`/`trajectory`/`severity_series` on `UnsafeResult`, mirror `BullyingResult`'s existing shape exactly — `/unsafe`'s continuation machinery has always returned these, the SDK just never had types for them.

## [2.31.0] - 2026-08-27

### Added

- **`flagRiskTerms` on `detectBullying`/`detectUnsafe`/`analyze()`, and `risk_terms` on `BullyingResult`/`UnsafeResult`.** The API added `options.flag_risk_terms` (a free, deterministic, additive word-list flag for bare drug/violence terms — never affects `is_bullying`/`unsafe`/`severity`/`risk_score`/`recommended_action`) and an account-level `default_flag_risk_terms` setting alongside `flag_profanity` (PR #149), but neither reached the SDK. Same precedence and shape as `flagProfanity`: explicit `true`/`false` on a call always overrides the account default; `analyze()` forwards it to both sub-calls from day one, unlike `flagProfanity` which needed a follow-up release (2.29.0) to close that gap. **Requires the API deployed on or after 2026-08-25.**

- **`default_flag_profanity` / `default_flag_risk_terms` on `DetectionSettings` and `UpdateDetectionSettingsInput`.** Both existed on the API's `GET`/`PUT /settings/detection` since PR #149, but the SDK's settings types never declared them — `updateDetectionSettings({ default_flag_profanity: true })` needed an `as any` cast to compile, and `getDetectionSettings()`'s return type hid the fields even though the raw response carried them through. `updateDetectionSettings`/`getDetectionSettings` already forward arbitrary JSON through `requestWithRetry` untyped, so this is a types-only fix — no behavior change.

## [2.30.1] - 2026-08-26

### Fixed

- **`context.platform`'s doc comment described the wrong thing.** It read "Platform type (e.g. \"chat\", \"social_media\", \"gaming\")", but the SDK treats the value as your app/product name and appends its own identifier before sending it — `"MyApp"` reaches the API as `"MyApp - Node SDK"`. Following the old doc's examples sent a bare category string instead of an identifiable app name, which is what shows up for dashboard attribution. Corrected here and on the equivalent `platform` fields across image/video/voice/document/synthetic-content inputs and the batch/voice-stream context shapes. No behavior change — types and doc comments only.

## [2.30.0] - 2026-08-26

### Added

- **`categories` on `VideoAnalysisResult`.** `analyzeVideo` already computed a deduped list of visual harm categories across every flagged frame server-side, but only folded it into the free-text `rationale` string — no field existed to read it from without parsing `frame_results` yourself. A client integration that expected a top-level `categories` field (matching every other detection endpoint) got silent empty results instead of an error. **Requires the API deployed on or after 2026-08-26.**

- **`flagProfanity` on `analyzeVideo`, and `profanity` on `VideoAnalysisResult`.** Extends the `flagProfanity`/`profanity` pair from `analyzeImage` (2.28.0) to video: the same free, deterministic, additive word-list check now also runs on video, with identical precedence to `flagProfanity` elsewhere — explicit per-request value wins, otherwise the account's `default_flag_profanity` setting applies. Only meaningful when the video actually contains on-screen text; a video with none never gets a `profanity` field regardless of this flag. **Requires the API deployed on or after 2026-08-26.**

## [2.29.0] - 2026-08-26

### Fixed

- **`flagProfanity` is now forwarded through `analyze()`.** Same gap `verdictOnly` had in 2.19, fixed in 2.20: `AnalyzeInput` accepted `flagProfanity`, but `analyze()` never passed it to the `detectBullying`/`detectUnsafe` calls it fans out to. Didn't block anyone — the account's `default_flag_profanity` setting still applied — but per-request override wasn't reachable through the combined method. `result.bullying.profanity`/`result.unsafe.profanity` were already typed correctly and now populate as expected.

## [2.28.0] - 2026-08-25

### Added

- **`flagProfanity` on `analyzeImage`, and `profanity` on `ImageAnalysisResult`.** Extends the `flagProfanity`/`profanity` pair added to `detectBullying`/`detectUnsafe` in 2.27.0 to the image endpoint: the API now runs the same free, deterministic, additive word-list check over an image's OCR'd text (`vision.extracted_text`) when `flag_profanity` is set on the request or the account's `default_flag_profanity` setting is on. Only meaningful when the image actually contains OCR text — `vision.contains_text: false` never produces a `profanity` field regardless of the flag. Never affects `overall_severity`, `recommended_action`, or any `text_analysis` result. Video was evaluated and left out: the API's video analysis has no OCR/text-extraction path to attach this to. **Requires the API deployed on or after 2026-08-25.**

## [2.27.0] - 2026-08-25

### Added

- **`flagProfanity` on `detectBullying` / `detectUnsafe`, and `profanity` / `escalation_capped` / `escalation_capped_reason` on `BullyingResult` / `UnsafeResult`.** The API added `options.flag_profanity` (a free, deterministic, additive word-list flag — never affects `is_bullying`/`unsafe`/`severity`/`risk_score`/`recommended_action`) and an account-level `default_flag_profanity` setting, plus `escalation_capped` on the coded-term corroboration cap, but neither reached the SDK's types or request body. A customer testing `default_flag_profanity` through the SDK had no typed way to override it per-request and no `profanity` field on the result, even though the API already supported both. Explicit `flagProfanity: true` or `flagProfanity: false` both reach the API (an explicit `false` overrides the account default, same precedence as the API itself); omit it to use the account default. **Requires the API deployed on or after 2026-08-25.**

  Not yet forwarded through the combined `analyze()` method, which fans out to `detectBullying`/`detectUnsafe` client-side — only the two direct detection methods.

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
