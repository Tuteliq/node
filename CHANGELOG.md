# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
