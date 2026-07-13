<p align="center">
  <img src="./assets/logo.png" alt="Tuteliq" width="200" />
</p>

<h1 align="center">@tuteliq/sdk</h1>

<p align="center">
  <strong>Official TypeScript/JavaScript SDK for the Tuteliq API</strong><br>
  AI-powered child safety, fraud detection, and content moderation for modern applications
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tuteliq/sdk"><img src="https://img.shields.io/npm/v/@tuteliq/sdk.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@tuteliq/sdk"><img src="https://img.shields.io/npm/dm/@tuteliq/sdk.svg" alt="npm downloads"></a>
  <a href="https://github.com/Tuteliq/node/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@tuteliq/sdk.svg" alt="license"></a>
  <a href="https://github.com/Tuteliq/node/actions"><img src="https://img.shields.io/github/actions/workflow/status/Tuteliq/node/ci.yml" alt="build status"></a>
  <a href="https://bundlephobia.com/package/@tuteliq/sdk"><img src="https://img.shields.io/bundlephobia/minzip/@tuteliq/sdk" alt="bundle size"></a>
</p>

<p align="center">
  <a href="https://docs.tuteliq.ai">Documentation</a> •
  <a href="https://tuteliq.ai/dashboard">Dashboard</a> •
  <a href="https://trust.tuteliq.ai">Trust</a> •
  <a href="https://discord.gg/7kbTeRYRXD">Discord</a> •
  <a href="https://twitter.com/tuteliqdev">Twitter</a>
</p>

---

## Overview

Tuteliq provides AI-powered content analysis to help protect children and vulnerable users in digital environments. This SDK makes it easy to integrate Tuteliq's capabilities into your Node.js, browser, or edge runtime applications.

### Key Features

- **Bullying Detection** — Identify verbal abuse, exclusion, and harassment patterns
- **Grooming Risk Analysis** — Detect predatory behavior across conversation threads
- **Unsafe Content Detection** — Flag self-harm, violence, hate speech, and age-inappropriate content
- **Social Engineering Detection** — Detect pretexting, urgency fabrication, trust exploitation, and authority impersonation
- **App Fraud Detection** — Identify fake investment platforms, phishing apps, subscription traps, and malicious links
- **Romance Scam Detection** — Detect love-bombing, financial requests, and identity deception
- **Mule Recruitment Detection** — Identify money mule recruitment and laundering facilitation
- **Gambling Harm Detection** — Detect chasing losses, concealment behavior, and gambling-related distress
- **Coercive Control Detection** — Identify isolation tactics, financial control, monitoring, and threats
- **Vulnerability Exploitation Detection** — Detect targeting of the elderly, disabled, or emotionally vulnerable
- **Radicalisation Detection** — Identify extremist rhetoric, us-vs-them framing, and ideological grooming
- **Multi-Endpoint Analysis** — Run multiple detection types on a single piece of content in one call
- **Voice Analysis** — Transcribe audio and run safety analysis on the transcript with timestamped segments
- **Image Analysis** — Visual safety classification with OCR text extraction and text safety analysis
- **Video Analysis** — Analyze video files for safety concerns via key frame extraction
- **Document Analysis** — Upload PDFs for per-page multi-endpoint safety detection with chain-of-custody hashing
- **Emotional State Analysis** — Understand emotional signals and concerning trends
- **Action Guidance** — Generate age-appropriate response recommendations
- **Incident Reports** — Create professional summaries for review
- **Synthetic Content Detection** — Multi-signal forensic detection of AI-generated text, images, audio, and video
- **Synthetic Image Forensics** — 6-signal pipeline: vision AI, EXIF metadata, pixel statistics, C2PA Content Credentials, watermark detection, perceptual hashing
- **Synthetic Audio Forensics** — Transcript analysis + mel spectrogram vision + quantitative audio statistics
- **Synthetic Video Forensics** — Temporal face consistency, lip-sync correlation, per-frame vision, spectral audio
- **Synthetic Profiling** — Account-level 30-day rolling window with trend detection
- **Age Verification** — Session-based age verification with document capture and liveness detection
- **Identity Verification** — Session-based identity verification with face matching, document authentication, MRZ validation, barcode reading, and 45-country document number validation

### Why Tuteliq?

| Feature | Description |
|---------|-------------|
| **Privacy-First** | Stateless analysis, no mandatory data storage |
| **Human-in-the-Loop** | Designed to assist, not replace, human judgment |
| **Clear Rationale** | Every decision includes explainable reasoning |
| **Safe Defaults** | Conservative escalation, no automated responses to children |

---

## Installation

```bash
# npm
npm install @tuteliq/sdk

# yarn
yarn add @tuteliq/sdk

# pnpm
pnpm add @tuteliq/sdk

# bun
bun add @tuteliq/sdk
```

### Requirements

- Node.js 18+ (or any runtime with `fetch` support)
- TypeScript 4.7+ (optional, for type definitions)

---

## Quick Start

```typescript
import { Tuteliq } from '@tuteliq/sdk'

const tuteliq = new Tuteliq(process.env.TUTELIQ_API_KEY)

// Quick safety analysis
const result = await tuteliq.analyze("User message to analyze")

if (result.risk_level !== 'safe') {
  console.log('Risk detected:', result.risk_level)
  console.log('Summary:', result.summary)
  console.log('Action:', result.recommended_action)
}
```

---

## API Reference

### Initialization

```typescript
import { Tuteliq } from '@tuteliq/sdk'

// Simple
const tuteliq = new Tuteliq('your-api-key')

// With options
const tuteliq = new Tuteliq('your-api-key', {
  timeout: 30000,    // Request timeout in ms (default: 30 seconds)
  retries: 3,        // Retry attempts for transient failures (default: 3)
  retryDelay: 1000,  // Initial retry delay in ms (default: 1000)
})
```

---

### Common Parameters

#### Tracking Fields

All detection methods accept optional tracking fields for correlation, multi-tenant routing, and custom metadata:

```typescript
const result = await tuteliq.detectBullying({
  content: "Nobody likes you, just leave",
  context: 'chat',

  // Optional tracking fields — echoed back in the response and included in webhooks
  external_id: 'msg_abc123',       // Your unique identifier for correlation
  customer_id: 'cust_xyz789',      // Your end-customer ID (B2B2C / multi-tenant)
  metadata: { channel: 'discord' } // Arbitrary key-value pairs
})

// Echoed back in response
console.log(result.external_id)   // 'msg_abc123'
console.log(result.customer_id)   // 'cust_xyz789'
console.log(result.metadata)      // { channel: 'discord' }
```

| Field | Type | Max Length | Description |
|-------|------|-----------|-------------|
| `external_id` | `string?` | 255 | Your internal identifier (message ID, content ID, etc.) |
| `customer_id` | `string?` | 255 | Your end-customer identifier for multi-tenant / B2B2C scenarios |
| `metadata` | `object?` | — | Custom key-value pairs stored with the detection result |

These fields are:
- **Echoed** in the API response for easy matching
- **Included** in webhook payloads, enabling you to route alerts to the correct customer from a single webhook endpoint
- **Stored** with the incident in Firestore for audit trail

#### Support Threshold

All detection methods accept an optional `supportThreshold` parameter that controls when crisis support resources are included in the response:

```typescript
const result = await tuteliq.detectUnsafe({
  content: "I don't want to be here anymore",
  supportThreshold: 'medium'  // 'low' | 'medium' | 'high' (default) | 'critical'
})

// When severity meets or exceeds the threshold, result.support will contain:
// - helpline phone numbers (region-aware)
// - crisis text lines
// - relevant web resources
```

> **Note:** `critical` severity always includes support resources regardless of the threshold setting.

---

### Safety Detection

#### `detectBullying(input)`

Detects bullying and harassment in text content.

```typescript
const result = await tuteliq.detectBullying({
  content: "Nobody likes you, just leave",
  context: 'chat'  // or { ageGroup: '11-13', relationship: 'classmates' }
})

console.log(result.is_bullying)      // true
console.log(result.severity)         // 'medium' | 'high' | 'critical'
console.log(result.bullying_type)    // ['exclusion', 'verbal_abuse']
console.log(result.confidence)       // 0.92
console.log(result.risk_score)       // 0.75
console.log(result.rationale)        // "Direct exclusion language..."
console.log(result.recommended_action) // 'flag_for_moderator'
```

#### `detectGrooming(input)`

Analyzes conversation threads for grooming patterns.

```typescript
const result = await tuteliq.detectGrooming({
  messages: [
    { role: 'adult', content: "This is our special secret" },
    { role: 'child', content: "Ok I won't tell anyone" }
  ],
  childAge: 12
})

console.log(result.grooming_risk)    // 'none' | 'low' | 'medium' | 'high' | 'critical'
console.log(result.flags)            // ['secrecy', 'isolation', 'trust_building']
console.log(result.confidence)       // 0.89
console.log(result.risk_score)       // 0.85
console.log(result.rationale)        // "Multiple grooming indicators..."
console.log(result.recommended_action) // 'immediate_intervention'

// Per-message breakdown (optional, returned on conversation-aware endpoints)
if (result.message_analysis) {
  for (const m of result.message_analysis) {
    console.log(`Message ${m.message_index}: risk=${m.risk_score}, flags=${m.flags}, summary=${m.summary}`)
  }
}
```

#### `detectUnsafe(input)`

Identifies potentially dangerous or harmful content.

```typescript
const result = await tuteliq.detectUnsafe({
  content: "I don't want to be here anymore"
})

console.log(result.unsafe)           // true
console.log(result.categories)       // ['self_harm', 'crisis']
console.log(result.severity)         // 'critical'
console.log(result.risk_score)       // 0.9
console.log(result.rationale)        // "Expression of suicidal ideation..."
console.log(result.recommended_action) // 'immediate_intervention'
```

#### `analyze(content)`

Quick combined analysis — runs bullying and unsafe detection in parallel.

> **Note**: This method fires one API call per detection type included (default: 2 calls for bullying + unsafe). Each call counts against your monthly quota. Use `include` to run only the checks you need.

```typescript
// Simple string input (costs 2 API calls: bullying + unsafe)
const result = await tuteliq.analyze("Message to check")

// With options — run only bullying (costs 1 API call)
const result = await tuteliq.analyze({
  content: "Message to check",
  context: 'social_media',
  include: ['bullying', 'unsafe']  // Select which checks to run
})

console.log(result.risk_level)       // 'safe' | 'low' | 'medium' | 'high' | 'critical'
console.log(result.risk_score)       // 0.0 - 1.0
console.log(result.summary)          // "Bullying detected (medium). Unsafe content: self_harm"
console.log(result.bullying)         // Full bullying result (if included)
console.log(result.unsafe)           // Full unsafe result (if included)
console.log(result.recommended_action) // Combined recommendation
```

---

### Fraud & Harm Detection

All fraud and harm detection methods share the same `DetectionInput` and return a unified `DetectionResult`:

```typescript
import type { DetectionInput, DetectionResult } from '@tuteliq/sdk'
```

**Input:**

```typescript
{
  content: string,                                      // Text content to analyze
  context?: ContextInput,                               // Optional analysis context
  includeEvidence?: boolean,                            // Include evidence excerpts
  supportThreshold?: 'low' | 'medium' | 'high' | 'critical',  // Crisis support threshold
  external_id?: string,                                 // Tracking ID
  customer_id?: string,                                 // Customer ID
  metadata?: Record<string, unknown>,                   // Custom metadata
}
```

**Result:**

```typescript
{
  endpoint: string,                    // e.g., 'social-engineering'
  detected: boolean,                   // Whether a threat was detected
  severity: number,                    // 0.0 - 1.0
  confidence: number,                  // 0.0 - 1.0
  risk_score: number,                  // Age-adjusted risk score (0.0 - 1.0)
  level: 'none' | 'low' | 'medium' | 'high' | 'critical',
  categories: DetectionCategory[],     // Detected categories with tags and confidence
  evidence?: DetectionEvidence[],      // Evidence excerpts (if includeEvidence was true)
  age_calibration?: AgeCalibration,    // Age calibration details
  recommended_action: string,
  rationale: string,
  language: string,                    // Detected language code
  language_status: LanguageStatus,     // 'stable' | 'beta'
  credits_used?: number,
  processing_time_ms?: number,
}
```

#### Context Fields

All detection methods accept an optional `context` object:

| Field | Type | Effect |
|-------|------|--------|
| `ageGroup` | `string` | Age group (e.g., `"10-12"`, `"13-15"`, `"under 18"`). Triggers age-calibrated scoring. |
| `language` | `string` | ISO 639-1 code. Auto-detected if omitted. |
| `platform` | `string` | Platform name (e.g., `"Discord"`, `"Roblox"`). Adjusts for platform norms. |
| `sender_trust` | `string` | `"verified"`, `"trusted"`, or `"unknown"`. See below. |
| `sender_name` | `string` | Sender identifier (used with `sender_trust`). |
| `conversation_history` | `array` | Prior messages for context-aware analysis. |

**`sender_trust` behavior:** When set to `"verified"` or `"trusted"`, the API fully suppresses `AUTH_IMPERSONATION` — a verified sender cannot be impersonating an authority. Routine urgency (schedules, deadlines) is also suppressed. Only genuinely malicious content (credential theft, phishing links, financial demands) will flag a verified sender. This prevents false positives on legitimate institutional messages.

#### `detectSocialEngineering(input)`

Detects social engineering tactics such as pretexting, urgency fabrication, trust exploitation, and authority impersonation.

```typescript
const result = await tuteliq.detectSocialEngineering({
  content: "Your account will be suspended unless you verify your details immediately",
  includeEvidence: true,
  context: { sender_trust: 'unknown' }
})

console.log(result.detected)        // true
console.log(result.level)           // 'high'
console.log(result.categories)      // [{ tag: 'URGENCY_FABRICATION', label: 'Urgency Fabrication', confidence: 0.9 }]
console.log(result.evidence)        // [{ text: 'suspended unless', tactic: 'URGENCY_FABRICATION', weight: 0.9 }]
console.log(result.rationale)       // "Classic urgency-based social engineering..."
```

#### `detectAppFraud(input)`

Detects app-based fraud patterns such as fake investment platforms, phishing apps, subscription traps, and malicious download links.

```typescript
const result = await tuteliq.detectAppFraud({
  content: "Download this app to earn $500/day with guaranteed returns!"
})
```

#### `detectRomanceScam(input)`

Detects romance scam patterns such as love-bombing, financial requests, identity deception, and emotional manipulation.

```typescript
const result = await tuteliq.detectRomanceScam({
  content: "I know we just met online but I need help with a medical bill. I'll pay you back, I promise."
})
```

#### `detectMuleRecruitment(input)`

Detects money mule recruitment tactics such as easy-money offers, bank account sharing requests, and laundering facilitation.

```typescript
const result = await tuteliq.detectMuleRecruitment({
  content: "Easy job, just receive money in your bank and forward 90% to this account"
})
```

#### `detectGamblingHarm(input)`

Detects gambling-related harm indicators such as chasing losses, borrowing to gamble, concealment behavior, and emotional distress.

```typescript
const result = await tuteliq.detectGamblingHarm({
  content: "I lost everything again but I know if I just bet one more time I can win it all back"
})
```

#### `detectCoerciveControl(input)`

Detects coercive control patterns such as isolation tactics, financial control, monitoring behavior, threats, and emotional manipulation.

```typescript
const result = await tuteliq.detectCoerciveControl({
  content: "You're not allowed to see your friends anymore. Give me your phone, I need to check your messages."
})
```

#### `detectVulnerabilityExploitation(input)`

Detects exploitation of vulnerable individuals including targeting the elderly, disabled, financially distressed, or emotionally vulnerable. Returns a `cross_endpoint_modifier` (1.0-2.0) when used with `analyseMulti`.

```typescript
const result = await tuteliq.detectVulnerabilityExploitation({
  content: "Since your husband passed, you must be so lonely. I can help manage your finances."
})
```

#### `detectRadicalisation(input)`

Detects radicalisation indicators such as extremist rhetoric, us-vs-them framing, calls to action, conspiracy narratives, and ideological grooming.

```typescript
const result = await tuteliq.detectRadicalisation({
  content: "They are the enemy. Only we understand the truth. It's time to take action."
})
```

---

### Multi-Endpoint Analysis

#### `analyseMulti(input)`

Run multiple detection endpoints on a single piece of content in one API call. When `vulnerability-exploitation` is included, its cross-endpoint modifier automatically adjusts severity scores across all other results.

```typescript
import { Detection } from '@tuteliq/sdk'

const result = await tuteliq.analyseMulti({
  content: "Suspicious message content",
  detections: [
    Detection.SOCIAL_ENGINEERING,
    Detection.ROMANCE_SCAM,
    Detection.VULNERABILITY_EXPLOITATION
  ],
  includeEvidence: true,
  supportThreshold: 'medium',
})

console.log(result.summary.total_endpoints)     // 3
console.log(result.summary.detected_count)       // 2
console.log(result.summary.highest_risk)         // { endpoint: 'romance-scam', risk_score: 0.85 }
console.log(result.summary.overall_risk_level)   // 'high'
console.log(result.cross_endpoint_modifier)      // 1.3 (vulnerability modifier)
console.log(result.credits_used)                 // 3

// Individual results
for (const r of result.results) {
  console.log(`${r.endpoint}: detected=${r.detected}, risk=${r.risk_score}, level=${r.level}`)
}
```

**Available detection endpoints:**

| Endpoint ID | Method |
|-------------|--------|
| `bullying` | `detectBullying` |
| `grooming` | `detectGrooming` |
| `unsafe` | `detectUnsafe` |
| `social-engineering` | `detectSocialEngineering` |
| `app-fraud` | `detectAppFraud` |
| `romance-scam` | `detectRomanceScam` |
| `mule-recruitment` | `detectMuleRecruitment` |
| `gambling-harm` | `detectGamblingHarm` |
| `coercive-control` | `detectCoerciveControl` |
| `vulnerability-exploitation` | `detectVulnerabilityExploitation` |
| `radicalisation` | `detectRadicalisation` |

---

### Media Analysis

#### `analyzeVoice(input)`

Transcribes audio and runs safety analysis on the transcript. Accepts `Buffer` or file data.

```typescript
import { readFileSync } from 'fs'

const result = await tuteliq.analyzeVoice({
  file: readFileSync('./recording.mp3'),
  filename: 'recording.mp3',
  analysisType: 'all',           // 'bullying' | 'unsafe' | 'grooming' | 'emotions' | 'all'
  ageGroup: '11-13',
  fileId: 'my-file-ref-123',    // Optional: echoed in response
})

console.log(result.transcription.text)       // Full transcript
console.log(result.transcription.segments)   // Timestamped segments
console.log(result.analysis?.bullying)       // Bullying analysis on transcript
console.log(result.overall_risk_score)       // 0.0 - 1.0
console.log(result.overall_severity)         // 'none' | 'low' | 'medium' | 'high' | 'critical'
```

Supported audio formats: mp3, wav, m4a, ogg, flac, webm, mp4 (max 25MB).

#### `analyzeImage(input)`

Analyzes images for visual safety concerns and extracts text via OCR. If text is found, runs text safety analysis.

```typescript
import { readFileSync } from 'fs'

const result = await tuteliq.analyzeImage({
  file: readFileSync('./screenshot.png'),
  filename: 'screenshot.png',
  analysisType: 'all',           // 'bullying' | 'unsafe' | 'emotions' | 'all'
  fileId: 'img-ref-456',        // Optional: echoed in response
})

console.log(result.vision.extracted_text)       // OCR text
console.log(result.vision.visual_severity)      // Visual content severity
console.log(result.vision.visual_categories)    // Visual harm categories
console.log(result.text_analysis?.bullying)     // Text safety analysis (if OCR found text)
console.log(result.overall_risk_score)          // 0.0 - 1.0
console.log(result.overall_severity)            // Combined severity
```

Supported image formats: png, jpg, jpeg, gif, webp (max 10MB).

#### `analyzeDocument(input)`

Upload a PDF for per-page multi-endpoint safety analysis. Text is extracted from each page, detection endpoints run in parallel, and results are aggregated with an overall risk score. Zero-retention: no document data is stored after processing.

```typescript
import { readFileSync } from 'fs'

const result = await tuteliq.analyzeDocument({
  file: readFileSync('./report.pdf'),
  filename: 'report.pdf',
  endpoints: ['unsafe', 'coercive-control', 'radicalisation'],  // Optional (these are the defaults)
  ageGroup: '13-15',                   // Optional: age-calibrated scoring
  language: 'en',                      // Optional: auto-detected if omitted
  fileId: 'doc-ref-789',              // Optional: echoed in response
  supportThreshold: 'high',           // Optional: when to include crisis helplines
})

console.log(result.document_hash)          // SHA-256 for chain-of-custody
console.log(result.total_pages)            // Total pages in PDF
console.log(result.pages_analyzed)         // Pages with extractable text
console.log(result.overall_risk_score)     // 0.0 - 1.0
console.log(result.overall_severity)       // 'none' | 'low' | 'medium' | 'high' | 'critical'
console.log(result.flagged_pages)          // Pages with risk >= 0.3
console.log(result.detected_endpoints)     // Endpoints that found threats
console.log(result.credits_used)           // Dynamic: max(3, pages × endpoints)

// Per-page results
for (const page of result.page_results) {
  console.log(`Page ${page.page_number}: ${page.page_severity}`)
  for (const r of page.results) {
    if (r.detected) console.log(`  ${r.endpoint}: ${r.rationale}`)
  }
}
```

Available endpoints: `unsafe`, `bullying`, `grooming`, `social-engineering`, `coercive-control`, `radicalisation`, `romance-scam`, `mule-recruitment`. Supported format: PDF only (max 50MB, 100 pages).

#### `voiceStream(config?, handlers?)`

Real-time voice streaming with live safety analysis over WebSocket. Requires the `ws` package:

```bash
npm install ws
```

```typescript
const session = tuteliq.voiceStream(
  { intervalSeconds: 10, analysisTypes: ['bullying', 'unsafe'] },
  {
    onTranscription: (e) => console.log('Transcript:', e.text),
    onAlert: (e) => console.log('Alert:', e.category, e.severity),
  }
)

// Send audio chunks as they arrive
session.sendAudio(audioBuffer)

// End session and get summary
const summary = await session.end()
console.log('Risk:', summary.overall_risk)
console.log('Score:', summary.overall_risk_score)
console.log('Full transcript:', summary.transcript)
```

---

### Synthetic Content Detection

Detect AI-generated text, images, audio, and video with multi-signal forensic analysis. Designed for child safety — detects synthetic CSAM, deepfakes, and AI-generated impersonation content.

#### `detectSyntheticText(input)`

Analyzes text for AI-generation indicators. Uses 10 child-safety-focused categories including synthetic CSAM narratives, deepfake impersonation, and AI-generated grooming scripts.

```typescript
const result = await tuteliq.detectSyntheticText({
  content: "Text to analyze for AI generation indicators",
  context: { ageGroup: '11-13' },
})

console.log(result.detected)          // true
console.log(result.classification)    // 'confirmed_synthetic' | 'suspected_synthetic' | 'unknown' | 'confirmed_authentic'
console.log(result.confidence)        // 0.87
console.log(result.risk_score)        // 0.75
console.log(result.level)             // 'high'
console.log(result.categories)        // [{ tag: 'SYNTHETIC_CSAM', label: '...', confidence: 0.9 }]
console.log(result.rationale)         // "AI-generated text with..."
console.log(result.recommended_action) // 'immediate_review'
```

#### `detectSyntheticImage(input)`

Multi-signal forensic image analysis using 6 parallel engines: vision AI, EXIF metadata, pixel statistics, C2PA Content Credentials, watermark detection, and perceptual hashing.

```typescript
import { readFileSync } from 'fs'

const result = await tuteliq.detectSyntheticImage({
  file: readFileSync('./suspect-image.jpg'),
  filename: 'suspect-image.jpg',
  ageGroup: '13-15',
})

// Classification
console.log(result.classification)              // 'confirmed_synthetic'
console.log(result.confidence)                  // 0.94
console.log(result.level)                       // 'critical'

// Vision AI forensic analysis
console.log(result.vision.is_likely_synthetic)  // true
console.log(result.vision.artifacts)            // ['smooth_skin_texture', 'inconsistent_lighting']
console.log(result.vision.face_analysis)        // "Uncanny valley facial features..."

// EXIF/metadata analysis
console.log(result.metadata_analysis.has_exif)             // false
console.log(result.metadata_analysis.ai_generator_detected) // true
console.log(result.metadata_analysis.ai_generator)         // 'Midjourney'
console.log(result.metadata_analysis.suspicious_absence)   // true

// C2PA Content Credentials (when present)
if (result.provenance) {
  console.log(result.provenance.has_c2pa)         // true
  console.log(result.provenance.is_ai_generated)  // true
  console.log(result.provenance.ai_tool)          // 'DALL-E 3'
}

// Multi-signal ensemble
console.log(result.forensic_signals.signal_count)              // 14
console.log(result.forensic_signals.combined_confidence_boost) // 0.25

// Perceptual hash (for known-image matching)
console.log(result.perceptual_hash)            // 'a3f5c7d901e2b4f8'

// Known synthetic match (if pHash matches a known AI-generated image)
if (result.known_synthetic_match) {
  console.log(result.known_synthetic_match.distance)  // 3
  console.log(result.known_synthetic_match.category)  // 'SYNTHETIC_CSAM'
}
```

Supported formats: png, jpg, jpeg, gif, webp (max 10MB).

#### `detectSyntheticAudio(input)`

Dual-signal audio forensics: transcript analysis + mel spectrogram vision + quantitative audio statistics. Detects AI-generated voice clones, TTS output, and synthetic speech.

```typescript
import { readFileSync } from 'fs'

const result = await tuteliq.detectSyntheticAudio({
  file: readFileSync('./voice-message.mp3'),
  filename: 'voice-message.mp3',
})

console.log(result.classification)     // 'suspected_synthetic'
console.log(result.confidence)         // 0.78

// Transcription
console.log(result.transcription?.text)  // "Transcribed audio content..."

// Quantitative audio stats
if (result.audio_stats) {
  console.log(result.audio_stats.dynamic_range)   // 12.5  (dB — low = suspicious)
  console.log(result.audio_stats.silence_ratio)    // 0.02  (low = no natural pauses)
  console.log(result.audio_stats.flat_factor)      // 0.8   (high = uniform/synthetic)
}

// Spectral signals from mel spectrogram analysis
console.log(result.spectral_signals)  // ['low_dynamic_range', 'missing_breath_noise', 'uniform_pitch']
```

Supported formats: mp3, wav, m4a, ogg, flac, webm, mp4 (max 25MB).

#### `detectSyntheticVideo(input)`

5-track video analysis: per-frame vision forensics, temporal face consistency, lip-sync correlation, spectral audio analysis, and transcript detection.

```typescript
import { readFileSync } from 'fs'

const result = await tuteliq.detectSyntheticVideo({
  file: readFileSync('./suspect-video.mp4'),
  filename: 'suspect-video.mp4',
  maxFrames: 10,  // Extract up to 10 frames (default: 6, max: 20)
})

console.log(result.classification)     // 'confirmed_synthetic'
console.log(result.confidence)         // 0.91
console.log(result.video.duration_seconds)   // 15.2
console.log(result.video.frames_analyzed)    // 10
console.log(result.video.has_audio)          // true

// Temporal face consistency (detects face-swapped deepfakes)
if (result.temporal_consistency) {
  console.log(result.temporal_consistency.identity_consistency_score) // 0.4 (low = face drift)
  console.log(result.temporal_consistency.landmark_stability_score)   // 0.3 (low = jitter)
  console.log(result.temporal_consistency.temporal_consistency_score) // 0.35
  console.log(result.temporal_consistency.anomalous_frame_pairs)     // [{ frame_a: 3, frame_b: 4, distance: 0.7 }]
  console.log(result.temporal_consistency.signals)                   // ['face_identity_drift', 'landmark_jitter']
}

// Lip-sync correlation (detects dubbed deepfakes)
if (result.lip_sync) {
  console.log(result.lip_sync.correlation)                 // 0.15 (low = poor sync)
  console.log(result.lip_sync.has_silent_mouth_movement)   // true
  console.log(result.lip_sync.has_voice_without_movement)  // false
  console.log(result.lip_sync.signals)                     // ['poor_lip_sync', 'silent_mouth_movement']
}
```

Supported formats: mp4, webm, avi, mov (max 100MB).

#### `getSyntheticProfile(customerId)` (deprecated)

> ⚠️ **Deprecated:** the backing API route was never shipped and this method returns a 404. It will be removed in the next major version.

Retrieve account-level synthetic content profiling — a 30-day rolling window of all synthetic detections for a given customer.

```typescript
const profile = await tuteliq.getSyntheticProfile('cust_xyz789')

console.log(profile.total_items)                // 50
console.log(profile.synthetic_count)            // 42
console.log(profile.authentic_count)            // 6
console.log(profile.account_synthetic_score)    // 0.84
console.log(profile.trend)                      // 'increasing' | 'stable' | 'decreasing'
console.log(profile.category_distribution)      // { DEEPFAKE_IMPERSONATION: 15, SYNTHETIC_CSAM: 3, ... }
console.log(profile.avg_confidence)             // 0.82
console.log(profile.window_days)                // 30
```

---

### Emotional Analysis

#### `analyzeEmotions(input)`

Summarizes emotional signals in content or conversations.

```typescript
// Single content
const result = await tuteliq.analyzeEmotions({
  content: "I'm so stressed about everything lately"
})

// Or conversation history
const result = await tuteliq.analyzeEmotions({
  messages: [
    { sender: 'child', content: "I failed the test" },
    { sender: 'child', content: "Everyone else did fine" },
    { sender: 'child', content: "I'm so stupid" }
  ]
})

console.log(result.dominant_emotions)   // ['anxiety', 'sadness', 'frustration']
console.log(result.emotion_scores)      // { anxiety: 0.8, sadness: 0.6, ... }
console.log(result.trend)               // 'improving' | 'stable' | 'worsening'
console.log(result.summary)             // "Child expressing academic anxiety..."
console.log(result.recommended_followup) // "Check in about school stress..."
```

---

### Guidance & Reports

#### `getActionPlan(input)`

Generates age-appropriate action guidance.

```typescript
const plan = await tuteliq.getActionPlan({
  situation: 'Someone is spreading rumors about me at school',
  childAge: 12,
  audience: 'child',  // 'child' | 'parent' | 'educator' | 'platform'
  severity: 'medium'
})

console.log(plan.audience)       // 'child'
console.log(plan.steps)          // ['Talk to a trusted adult', ...]
console.log(plan.tone)           // 'supportive'
console.log(plan.reading_level)  // 'grade_5'
```

#### `generateReport(input)`

Creates structured incident summaries for professional review.

```typescript
const report = await tuteliq.generateReport({
  messages: [
    { sender: 'user1', content: 'Threatening message' },
    { sender: 'child', content: 'Please stop' }
  ],
  childAge: 14,
  incident: {
    type: 'harassment',
    occurredAt: new Date()
  }
})

console.log(report.summary)                  // "Incident summary..."
console.log(report.risk_level)               // 'low' | 'medium' | 'high' | 'critical'
console.log(report.categories)               // ['bullying', 'threats']
console.log(report.recommended_next_steps)   // ['Document incident', ...]
```

---

### Verification

Session-based age and identity verification. The SDK creates a verification session and provides a URL — the user completes the verification flow (document capture, liveness checks, selfie) in a hosted web UI. Your application polls for the result.

#### How It Works

1. **Create a session** — call `createVerificationSession()` with the desired mode
2. **Open the URL** — redirect the user or open `session.url` in a new tab / web view
3. **Poll for result** — call `getVerificationSession()` until `status` is `completed` or `failed`
4. **Read the result** — access age or identity verification data from the response

#### `createVerificationSession(input)`

Creates a verification session and returns a URL for the user to complete the flow. Costs **10 credits** (age) or **15 credits** (identity) when the user completes the verification.

```typescript
import { Tuteliq, VerificationMode, DocumentType } from '@tuteliq/sdk'

const tuteliq = new Tuteliq(process.env.TUTELIQ_API_KEY)

// Age verification
const session = await tuteliq.createVerificationSession({
  mode: VerificationMode.AGE,
})

console.log(session.session_id)  // 'abc123...'
console.log(session.url)         // 'https://verify.tuteliq.ai/age/?session=...&token=...'
console.log(session.expires_at)  // '2026-03-05T12:00:00Z'

// Identity verification with options
const session = await tuteliq.createVerificationSession({
  mode: VerificationMode.IDENTITY,
  document_type: DocumentType.PASSPORT,     // Optional hint for the web UI
  redirect_url: 'https://example.com/done', // Optional redirect after completion
  external_id: 'user_123',                  // Optional tracking
  customer_id: 'cust_456',                  // Optional multi-tenant ID
  metadata: { source: 'onboarding' },       // Optional custom data
})
```

#### `getVerificationSession(sessionId)`

Polls the status of a verification session. When `status` is `completed`, the result contains full document intelligence — MRZ validation, barcode reading, document authenticity, face matching, and liveness.

```typescript
import { VerificationSessionStatus } from '@tuteliq/sdk'

const session = await tuteliq.getVerificationSession('abc123...')

console.log(session.status)  // VerificationSessionStatus.COMPLETED
console.log(session.mode)    // VerificationMode.AGE

if (session.status === VerificationSessionStatus.COMPLETED && session.result) {
  // Core result
  console.log(session.result.status)            // 'verified' | 'failed' | 'needs_review'
  console.log(session.result.age)               // 22
  console.log(session.result.date_of_birth)     // '1990-01-15'
  console.log(session.result.is_minor)          // false
  console.log(session.result.failure_reasons)   // []

  // Document extraction and validation
  console.log(session.result.document.ocr_confidence)       // 92
  console.log(session.result.document.name_extracted)        // 'John Doe'
  console.log(session.result.document.document_number)       // 'AB1234567'
  console.log(session.result.document.document_number_valid) // true (45-country validation)
  console.log(session.result.document.country_code)          // 'US'
  console.log(session.result.document.expired)               // false

  // MRZ validation (passports, ID cards with MRZ)
  if (session.result.document.mrz_valid !== null) {
    console.log(session.result.document.mrz_valid)              // true
    console.log(session.result.document.mrz_fields?.surname)    // 'DOE'
    console.log(session.result.document.mrz_fields?.given_names) // 'JOHN'
    console.log(session.result.document.mrz_fields?.nationality) // 'USA'
  }

  // PDF417 barcode (US/CA driver's licenses)
  if (session.result.barcode) {
    console.log(session.result.barcode.format)              // 'PDF417'
    console.log(session.result.barcode.has_aamva)           // true
    console.log(session.result.barcode.fields?.first_name)  // 'JOHN'
    console.log(session.result.barcode.fields?.state)       // 'CA'
  }

  // AI-powered document authenticity
  if (session.result.document_authenticity) {
    console.log(session.result.document_authenticity.is_authentic)              // true
    console.log(session.result.document_authenticity.confidence)                // 0.92
    console.log(session.result.document_authenticity.security_features_visible) // ['hologram', 'microprint']
    console.log(session.result.document_authenticity.anomalies)                // []
    console.log(session.result.document_authenticity.recapture_detected)       // false
  }

  // Face matching
  console.log(session.result.face_match)  // { matched: true, distance: 0.3, confidence: 0.95 }

  // Liveness
  console.log(session.result.liveness)    // { valid: true }
}
```

#### `cancelVerificationSession(sessionId)`

Cancels an active verification session. No credits are consumed.

```typescript
await tuteliq.cancelVerificationSession('abc123...')
```

#### `getAgeVerification(verificationId)`

Retrieves a past age verification result by its verification ID.

```typescript
const result = await tuteliq.getAgeVerification('vrf_001')

console.log(result.status)       // 'verified'
console.log(result.age)          // 22
console.log(result.is_minor)     // false
console.log(result.created_at)   // '2026-03-05T11:00:00Z'
```

#### `getIdentityVerification(verificationId)`

Retrieves a past identity verification result by its verification ID.

```typescript
const result = await tuteliq.getIdentityVerification('vrf_002')

console.log(result.status)         // 'verified'
console.log(result.full_name)      // 'John Doe'
console.log(result.date_of_birth)  // '1990-01-15'
console.log(result.document_type)  // 'passport'
console.log(result.country_code)   // 'US'
```

#### Verification Enums

The SDK provides enums to avoid hardcoded strings:

```typescript
import {
  VerificationMode,           // AGE, IDENTITY
  DocumentType,               // PASSPORT, ID_CARD, DRIVERS_LICENSE
  VerificationStatus,         // VERIFIED, FAILED, NEEDS_REVIEW
  VerificationSessionStatus,  // PENDING, IN_PROGRESS, COMPLETED, FAILED, EXPIRED, CANCELLED
} from '@tuteliq/sdk'
```

#### Polling Example

```typescript
import { VerificationMode, VerificationSessionStatus } from '@tuteliq/sdk'

const session = await tuteliq.createVerificationSession({
  mode: VerificationMode.AGE,
})

// Open session.url in the user's browser...

// Poll until complete
const poll = setInterval(async () => {
  const status = await tuteliq.getVerificationSession(session.session_id)

  if (status.status === VerificationSessionStatus.COMPLETED) {
    clearInterval(poll)
    console.log('Verified! Is minor:', status.result?.is_minor)
  }

  if (status.status === VerificationSessionStatus.FAILED ||
      status.status === VerificationSessionStatus.EXPIRED) {
    clearInterval(poll)
    console.log('Verification failed or expired')
  }
}, 5000)
```

---

### Webhooks

#### `listWebhooks()`

List all webhooks for your account.

```typescript
const { webhooks } = await tuteliq.listWebhooks()
webhooks.forEach(w => console.log(w.name, w.is_active, w.events))
```

#### `createWebhook(input)`

Create a new webhook. The returned `secret` is only shown once — store it securely.

```typescript
import { WebhookEventType } from '@tuteliq/sdk'

const result = await tuteliq.createWebhook({
  name: 'Safety Alerts',
  url: 'https://example.com/webhooks/tuteliq',
  events: [
    WebhookEventType.INCIDENT_CRITICAL,
    WebhookEventType.GROOMING_DETECTED,
    WebhookEventType.SELF_HARM_DETECTED
  ]
})

console.log('Webhook ID:', result.id)
console.log('Secret:', result.secret) // Store this securely!
```

#### `updateWebhook(id, input)`

Update an existing webhook.

```typescript
await tuteliq.updateWebhook('webhook-123', {
  name: 'Updated Name',
  isActive: false,
  events: [WebhookEventType.INCIDENT_CRITICAL]
})
```

#### `deleteWebhook(id)`

```typescript
await tuteliq.deleteWebhook('webhook-123')
```

#### `testWebhook(id)`

Send a test payload to verify webhook delivery.

```typescript
const result = await tuteliq.testWebhook('webhook-123')
console.log('Success:', result.success)
console.log('Latency:', result.latency_ms, 'ms')
```

#### `regenerateWebhookSecret(id)`

Regenerate the signing secret. The old secret is immediately invalidated.

```typescript
const { secret } = await tuteliq.regenerateWebhookSecret('webhook-123')
// Update your verification logic with the new secret
```

---

### Pricing

#### `getPricing()`

Get public pricing plans (no authentication required).

```typescript
const { plans } = await tuteliq.getPricing()
plans.forEach(p => console.log(p.name, p.price, p.features))
```

#### `getPricingDetails()`

Get detailed pricing plans with monthly/yearly prices and rate limits.

```typescript
const { plans } = await tuteliq.getPricingDetails()
plans.forEach(p => {
  console.log(p.name, `$${p.price_monthly}/mo`, `${p.api_calls_per_month} calls/mo`)
})
```

---

### Policy Configuration

#### `getPolicy()` / `setPolicy(config)`

Customize safety thresholds for your application.

```typescript
// Get current policy
const policy = await tuteliq.getPolicy()

// Update policy
await tuteliq.setPolicy({
  bullying: {
    enabled: true,
    minRiskScoreToFlag: 0.5,
    minRiskScoreToBlock: 0.8
  },
  selfHarm: {
    enabled: true,
    alwaysEscalate: true
  }
})
```

---

### Policy Automation Rules

Define rules that act automatically when a detection result matches — block, flag, escalate, notify, or log-only.

#### `listPolicyRules()` / `getPolicyRule(ruleId)`

```typescript
const { rules } = await tuteliq.listPolicyRules()
const { rule } = await tuteliq.getPolicyRule('rule_123')
```

#### `createPolicyRule(input)` / `updatePolicyRule(ruleId, input)` / `deletePolicyRule(ruleId)`

```typescript
const { rule } = await tuteliq.createPolicyRule({
  name: 'Auto-escalate critical grooming',
  enabled: true,
  endpoints: ['grooming'],
  conditions: { min_severity: 'critical' },        // also: min_risk_score, categories, age_groups
  action: { type: 'escalate', escalate_to: 'safety-team' }, // block | flag | escalate | notify | log_only
  priority: 0,
})

await tuteliq.updatePolicyRule(rule.id, { enabled: false })
await tuteliq.deletePolicyRule(rule.id)
```

#### `evaluatePolicyRules(input)`

Dry-run your rules against a hypothetical detection result:

```typescript
const { evaluation } = await tuteliq.evaluatePolicyRules({
  endpoint: 'grooming',
  risk_score: 0.92,
  severity: 'critical',
  categories: ['isolation'],
})
console.log(evaluation.policy_action)  // 'escalate'
console.log(evaluation.rules_matched)  // which rules fired
```

---

### Detection Settings

#### `getDetectionSettings()` / `updateDetectionSettings(input)` / `resetDetectionSettings()`

Enable or disable detection endpoints per account, and set a default context merged into every detection request. `enabled_endpoints` and `disabled_endpoints` are mutually exclusive.

```typescript
const settings = await tuteliq.getDetectionSettings()

await tuteliq.updateDetectionSettings({
  disabled_endpoints: ['gambling-harm'],
  default_context: { age_group: '13_17', platform: 'discord' },
})

await tuteliq.resetDetectionSettings()  // back to defaults
```

---

### Threat Intelligence (Business+ tier)

Anonymised, network-wide threat signals. Requires Business tier or higher — lower tiers receive a 403.

#### `getIntelligenceTrends(options?)`

```typescript
const trends = await tuteliq.getIntelligenceTrends({ days: 30, endpoint: 'grooming' })
console.log(trends.total_signals, trends.emerging_threats)
```

#### `getEmergingThreats(days?)`

```typescript
const { emerging_threats } = await tuteliq.getEmergingThreats(7)
```

#### `getWeeklyDigest()`

```typescript
const digest = await tuteliq.getWeeklyDigest()
console.log(digest.summary, digest.notable_changes)
```

#### `getRiskTrends(days?)`

```typescript
const { trends } = await tuteliq.getRiskTrends(30)
```

---

### Account Management (GDPR)

#### `deleteAccountData()`

Permanently delete all data associated with your account (Right to Erasure, GDPR Article 17).

```typescript
const result = await tuteliq.deleteAccountData()

console.log(result.message)        // "All user data has been deleted"
console.log(result.deleted_count)  // 42
```

#### `exportAccountData()`

Export all data associated with your account as JSON (Right to Data Portability, GDPR Article 20).

```typescript
const data = await tuteliq.exportAccountData()

console.log(data.userId)                    // 'user_123'
console.log(data.exportedAt)                // '2026-02-11T...'
console.log(Object.keys(data.data))         // ['api_keys', 'incidents', ...]
console.log(data.data.incidents.length)     // 5
```

#### `recordConsent(input)`

Record user consent for data processing (GDPR Article 6).

```typescript
const result = await tuteliq.recordConsent({
  consentType: 'data_processing',
  granted: true,
})
```

#### `getConsentStatus(consentType)`

Get current consent status for a specific consent type.

```typescript
const status = await tuteliq.getConsentStatus('data_processing')
console.log(status.granted)       // true
console.log(status.granted_at)    // '2026-01-15T...'
```

#### `withdrawConsent(consentType)`

Withdraw a previously granted consent.

```typescript
await tuteliq.withdrawConsent('data_processing')
```

#### `rectifyData(input)`

Correct personal data (Right to Rectification, GDPR Article 16).

```typescript
const result = await tuteliq.rectifyData({
  field: 'email',
  newValue: 'new@example.com',
})
```

#### `getAuditLogs(options?)`

Get audit trail of all data operations.

```typescript
const logs = await tuteliq.getAuditLogs({ limit: 50 })
logs.entries.forEach(entry => {
  console.log(entry.action, entry.timestamp, entry.details)
})
```

---

### Breach Management

#### `logBreach(input)`

Log a new data breach. Starts the 72-hour GDPR notification clock.

```typescript
const result = await tuteliq.logBreach({
  title: 'Unauthorized access to user data',
  description: 'API key was exposed in a public repository',
  severity: 'high',
  affected_users: 150,
})

console.log(result.breach_id)          // 'breach_001'
console.log(result.notification_deadline) // ISO timestamp (72 hours from now)
```

#### `listBreaches(options?)`

List all data breaches, optionally filtered by status.

```typescript
const { breaches } = await tuteliq.listBreaches({ status: 'open' })
breaches.forEach(b => console.log(b.title, b.status, b.created_at))
```

#### `getBreach(breachId)`

Get details of a specific data breach.

```typescript
const breach = await tuteliq.getBreach('breach_001')
console.log(breach.title, breach.status, breach.affected_users)
```

#### `updateBreachStatus(breachId, input)`

Update breach status and notification progress.

```typescript
await tuteliq.updateBreachStatus('breach_001', {
  status: 'resolved',
  resolution_notes: 'API key rotated, affected users notified',
})
```

---

## Usage Tracking

The SDK automatically captures usage metadata from API responses:

```typescript
const result = await tuteliq.detectBullying({ content: 'test' })

// Each response includes the number of credits consumed
console.log(result.credits_used)     // 1

// Access cumulative usage stats (from response headers)
console.log(tuteliq.usage)
// { limit: 10000, used: 5234, remaining: 4766 }

// Access request metadata
console.log(tuteliq.lastRequestId)   // 'req_1a2b3c...'
console.log(tuteliq.lastLatencyMs)   // 145
```

### Weighted Credits

Different endpoints consume different amounts of credits based on complexity:

| Method | Credits | Notes |
|--------|---------|-------|
| `detectBullying()` | 1 | Single text analysis |
| `detectUnsafe()` | 1 | Single text analysis |
| `detectGrooming()` | 1 per 10 msgs | `ceil(messages / 10)`, min 1 |
| `detectSocialEngineering()` | 1 | Single text analysis |
| `detectAppFraud()` | 1 | Single text analysis |
| `detectRomanceScam()` | 1 | Single text analysis |
| `detectMuleRecruitment()` | 1 | Single text analysis |
| `detectGamblingHarm()` | 1 | Single text analysis |
| `detectCoerciveControl()` | 1 | Single text analysis |
| `detectVulnerabilityExploitation()` | 1 | Single text analysis |
| `detectRadicalisation()` | 1 | Single text analysis |
| `analyseMulti()` | 1 per endpoint | Sum of individual endpoint costs |
| `analyzeEmotions()` | 1 per 10 msgs | `ceil(messages / 10)`, min 1 |
| `getActionPlan()` | 2 | Longer generation |
| `generateReport()` | 3 | Structured output |
| `analyzeVoice()` | 5 | Transcription + analysis |
| `analyzeImage()` | 3 | Vision + OCR + analysis |
| `analyzeVideo()` | 10 | Key frame extraction + analysis |
| `analyzeDocument()` | Dynamic | `max(3, pages × endpoints)` per document |
| `detectSyntheticText()` | 2 | LLM-based synthetic text detection |
| `detectSyntheticImage()` | 5 | 6-signal forensic pipeline |
| `detectSyntheticAudio()` | 4-7 | Transcription + spectral analysis |
| `detectSyntheticVideo()` | Dynamic | `2 + 3/frame + 2` (audio analysis) |
| `getSyntheticProfile()` | 0 | Read-only, no cost |
| `createVerificationSession()` (age) | 10 | Charged on completion |
| `createVerificationSession()` (identity) | 15 | Charged on completion |

The `credits_used` field is included in every response body. Credit balance is also available via the `X-Credits-Remaining` response header.

### Usage API Methods

#### `getUsageSummary()`

Get usage summary for the current billing period.

```typescript
const summary = await tuteliq.getUsageSummary()
console.log('Used:', summary.messages_used)
console.log('Limit:', summary.message_limit)
console.log('Percent:', summary.usage_percentage)
```

#### `getQuota()`

Get current rate limit quota status.

```typescript
const quota = await tuteliq.getQuota()
console.log('Rate limit:', quota.rate_limit, '/min')
console.log('Remaining:', quota.remaining)
```

#### `getUsageHistory(days?)`

Get daily usage history for the past N days (1-30, defaults to 7).

```typescript
const { days } = await tuteliq.getUsageHistory(14)
days.forEach(d => console.log(d.date, d.total_requests, d.success_requests))
```

#### `getUsageByTool(date?)`

Get usage broken down by tool/endpoint.

```typescript
const result = await tuteliq.getUsageByTool()
console.log('Tools:', result.tools)       // { detectBullying: 150, detectGrooming: 45, ... }
console.log('Endpoints:', result.endpoints) // { '/api/v1/safety/bullying': 150, ... }
```

#### `getUsageMonthly()`

Get monthly usage, billing info, and upgrade recommendations.

```typescript
const monthly = await tuteliq.getUsageMonthly()
console.log('Tier:', monthly.tier_display_name)
console.log('Used:', monthly.usage.used, '/', monthly.usage.limit)
console.log('Days left:', monthly.billing.days_remaining)

if (monthly.recommendations?.should_upgrade) {
  console.log('Consider upgrading to:', monthly.recommendations.suggested_tier)
}
```

---

## Error Handling

The SDK provides typed error classes for different failure scenarios:

```typescript
import {
  Tuteliq,
  TuteliqError,
  AuthenticationError,
  RateLimitError,
  QuotaExceededError,
  TierAccessError,
  ValidationError,
  NotFoundError,
  ServerError,
  TimeoutError,
  NetworkError,
} from '@tuteliq/sdk'

try {
  const result = await tuteliq.detectBullying({ content: 'test' })
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 - Invalid or missing API key
    console.error('Check your API key')
  } else if (error instanceof TierAccessError) {
    // 403 - Endpoint not available on your plan
    console.error('Upgrade your plan:', error.suggestion)
  } else if (error instanceof QuotaExceededError) {
    // 429 - Monthly quota exceeded
    console.error('Quota exceeded, upgrade or buy credits')
  } else if (error instanceof RateLimitError) {
    // 429 - Too many requests per minute
    console.error('Rate limited, retry after:', error.retryAfter)
  } else if (error instanceof ValidationError) {
    // 400 - Invalid request parameters
    console.error('Invalid input:', error.details)
  } else if (error instanceof NotFoundError) {
    // 404 - Resource not found
    console.error('Resource not found')
  } else if (error instanceof ServerError) {
    // 5xx - Server error
    console.error('Server error, try again later')
  } else if (error instanceof TimeoutError) {
    // Request timed out
    console.error('Request timed out')
  } else if (error instanceof NetworkError) {
    // Network connectivity issue
    console.error('Check your connection')
  } else if (error instanceof TuteliqError) {
    // Generic SDK error
    console.error('Error:', error.message)
  }
}
```

---

## Supported Languages (27)

Language is auto-detected when not specified. Beta languages have good accuracy but may have edge cases compared to English. All 24 EU official languages + Ukrainian, Norwegian, and Turkish.

| Language | Code | Status |
|----------|------|--------|
| English | `en` | Stable |
| Spanish | `es` | Beta |
| Portuguese | `pt` | Beta |
| French | `fr` | Beta |
| German | `de` | Beta |
| Italian | `it` | Beta |
| Dutch | `nl` | Beta |
| Polish | `pl` | Beta |
| Romanian | `ro` | Beta |
| Turkish | `tr` | Beta |
| Greek | `el` | Beta |
| Czech | `cs` | Beta |
| Hungarian | `hu` | Beta |
| Bulgarian | `bg` | Beta |
| Croatian | `hr` | Beta |
| Slovak | `sk` | Beta |
| Slovenian | `sl` | Beta |
| Lithuanian | `lt` | Beta |
| Latvian | `lv` | Beta |
| Estonian | `et` | Beta |
| Maltese | `mt` | Beta |
| Irish | `ga` | Beta |
| Swedish | `sv` | Beta |
| Norwegian | `no` | Beta |
| Danish | `da` | Beta |
| Finnish | `fi` | Beta |
| Ukrainian | `uk` | Beta |

Each language includes culture-specific safety guidelines covering local slang, grooming patterns, self-harm coded vocabulary, and filter evasion techniques.

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { Tuteliq } from '@tuteliq/sdk'
import type {
  // Safety Results
  BullyingResult,
  GroomingResult,
  UnsafeResult,
  EmotionsResult,
  ActionPlanResult,
  ReportResult,
  AnalyzeResult,

  // Detection Results (Fraud & Safety Extended)
  DetectionInput,
  DetectionResult,
  DetectionCategory,
  DetectionEvidence,
  AgeCalibration,
  MessageAnalysis,
  AnalyseMultiInput,
  AnalyseMultiResult,
  AnalyseMultiSummary,

  // Media Results
  VoiceAnalysisResult,
  ImageAnalysisResult,
  VisionResult,
  TranscriptionResult,
  TranscriptionSegment,

  // Webhook Types
  Webhook,
  WebhookListResult,
  CreateWebhookInput,
  CreateWebhookResult,
  UpdateWebhookInput,
  TestWebhookResult,
  RegenerateSecretResult,

  // Pricing Types
  PricingResult,
  PricingDetailsResult,

  // Usage Types
  UsageHistoryResult,
  UsageByToolResult,
  UsageMonthlyResult,

  // Safety Inputs
  DetectBullyingInput,
  DetectGroomingInput,
  DetectUnsafeInput,
  AnalyzeEmotionsInput,
  GetActionPlanInput,
  GenerateReportInput,
  AnalyzeVoiceInput,
  AnalyzeImageInput,

  // Account (GDPR)
  AccountDeletionResult,
  AccountExportResult,
  RecordConsentInput,
  ConsentStatusResult,
  ConsentActionResult,
  RectifyDataInput,
  RectifyDataResult,
  AuditLogsResult,

  // Breach Management
  LogBreachInput,
  LogBreachResult,
  BreachListResult,
  BreachResult,
  UpdateBreachInput,

  // Verification
  CreateVerificationSessionInput,
  VerificationSession,
  VerificationSessionResult,
  VerificationResult,
  DocumentDetails,
  MrzFields,
  BarcodeResult,
  DocumentAuthenticityResult,
  FaceMatchResult,
  LivenessResult,
  VerificationRetrieveResult,
  IdentityRetrieveResult,

  // Synthetic Content Detection
  DetectSyntheticTextInput,
  SyntheticTextResult,
  DetectSyntheticImageInput,
  SyntheticImageResult,
  SyntheticVisionResult,
  MetadataAnalysis,
  ProvenanceResult,
  ForensicSignals,
  KnownSyntheticMatch,
  DetectSyntheticAudioInput,
  SyntheticAudioResult,
  AudioStats,
  DetectSyntheticVideoInput,
  SyntheticVideoResult,
  TemporalConsistency,
  LipSyncResult,
  SyntheticProfile,
  SyntheticClassification,

  // Utilities
  Usage,
  ContextInput,
  GroomingMessage,
  EmotionMessage,
  ReportMessage,
} from '@tuteliq/sdk'
```

### Using Enums

The SDK exports enums for type-safe comparisons:

```typescript
import {
  Severity,
  GroomingRisk,
  RiskLevel,
  RiskCategory,
  AnalysisType,
  ContentSeverity,
  EmotionTrend,
  WebhookEventType,
  IncidentStatus,
  ErrorCode,
  Language,
  LanguageStatus,
  Detection,
  VerificationMode,
  DocumentType,
  VerificationStatus,
  VerificationSessionStatus,
} from '@tuteliq/sdk'

// Type-safe severity checks
if (result.severity === Severity.CRITICAL) {
  // Handle critical severity
}

// Grooming risk comparisons
if (result.grooming_risk === GroomingRisk.HIGH) {
  // Handle high grooming risk
}

// Detection endpoint IDs for multi-endpoint analysis
const result = await tuteliq.analyseMulti({
  content: "Message to analyze",
  detections: [Detection.SOCIAL_ENGINEERING, Detection.ROMANCE_SCAM],
})

// Language codes
console.log(Language.EN)  // 'en'
console.log(Language.PT)  // 'pt'

// Verification mode
const session = await tuteliq.createVerificationSession({
  mode: VerificationMode.AGE,
  document_type: DocumentType.PASSPORT,
})

// Error code handling
if (error.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
  // Handle rate limiting
}
```

You can also import enums separately:

```typescript
import { Severity, RiskCategory } from '@tuteliq/sdk/constants'
```

---

## Examples

### Next.js Integration (App Router)

Use a server-side API route to keep your API key secure:

```typescript
// app/api/safety/route.ts (server-side — API key stays on the server)
import { Tuteliq } from '@tuteliq/sdk'
import { NextResponse } from 'next/server'

const tuteliq = new Tuteliq(process.env.TUTELIQ_API_KEY!)

export async function POST(req: Request) {
  const { message } = await req.json()
  const result = await tuteliq.analyze(message)
  return NextResponse.json(result)
}
```

```typescript
// app/components/MessageInput.tsx (client-side — no API key exposed)
'use client'
import { useState } from 'react'

function MessageInput() {
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState<string | null>(null)

  const handleSubmit = async () => {
    const res = await fetch('/api/safety', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    const result = await res.json()

    if (result.risk_level !== 'safe') {
      setWarning(result.summary)
      return
    }

    // Submit message...
  }

  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      {warning && <p className="warning">{warning}</p>}
      <button onClick={handleSubmit}>Send</button>
    </div>
  )
}
```

### Express Middleware

```typescript
import { Tuteliq, RateLimitError } from '@tuteliq/sdk'
import express from 'express'

const tuteliq = new Tuteliq(process.env.TUTELIQ_API_KEY)

const safetyMiddleware = async (req, res, next) => {
  const { message } = req.body

  try {
    const result = await tuteliq.analyze(message)

    if (result.risk_level === 'critical') {
      return res.status(400).json({
        error: 'Message blocked for safety reasons',
        details: result.summary
      })
    }

    req.safetyResult = result
    next()
  } catch (error) {
    if (error instanceof RateLimitError) {
      return res.status(429).json({ error: 'Too many requests' })
    }
    next(error)
  }
}

app.post('/messages', safetyMiddleware, (req, res) => {
  // Message passed safety check
})
```

### Batch Processing

```typescript
const messages = ['message1', 'message2', 'message3']

const results = await Promise.all(
  messages.map(content => tuteliq.analyze(content))
)

const flagged = results.filter(r => r.risk_level !== 'safe')
console.log(`${flagged.length} messages flagged for review`)
```

---

## Browser Support

The SDK works in browsers that support the Fetch API:

```html
<script type="module">
  import { Tuteliq } from 'https://esm.sh/@tuteliq/sdk'

  const tuteliq = new Tuteliq('your-api-key')
  const result = await tuteliq.analyze('Hello world')
</script>
```

> **Note**: Never expose your API key in client-side code for production applications. Use a backend proxy to protect your credentials.

---

## Rate Limits & Pricing

Rate limits depend on your subscription tier:

| Plan | Price | Credits/month | Rate Limit | Features |
|------|-------|---------------|------------|----------|
| **Starter** | Free | 1,000 | 60/min | 3 Safety endpoints, 1 API key, Community support |
| **Indie** | $29/mo | 10,000 | 300/min | All endpoints, 2 API keys, Dashboard analytics |
| **Pro** | $99/mo | 50,000 | 1,000/min | 5 API keys, Webhooks, Custom policy, Priority latency |
| **Business** | $349/mo | 200,000 | 5,000/min | 20 API keys, SSO, SLA 99.9%, Compliance docs |
| **Enterprise** | Custom | Unlimited | Custom | Dedicated infra, 24/7 support, SCIM, On-premise |

**Credit Packs** (available to all tiers): 5K credits/$15 | 25K credits/$59 | 100K credits/$199

> **Note:** Credits are weighted by endpoint complexity. A simple text check costs 1 credit, while voice analysis costs 5. See the [Weighted Credits](#weighted-credits) table above.

---

## Best Practices

### Message Batching

The **bullying** and **unsafe content** methods analyze a single `text` field per request. If your platform receives messages one at a time (e.g., a chat app), concatenate a **sliding window of recent messages** into one string before calling the API. Single words or short fragments lack context for accurate detection and can be exploited to bypass safety filters.

```typescript
// Bad — each message analyzed in isolation, easily evaded
for (const msg of messages) {
  await client.detectBullying({ content: msg });
}

// Good — recent messages analyzed together
const window = recentMessages.slice(-10).join(' ');
await client.detectBullying({ content: window });
```

The **grooming** method already accepts a `messages[]` array and analyzes the full conversation in context.

### PII Redaction

PII redaction is **enabled by default** on the Tuteliq API. It automatically strips emails, phone numbers, URLs, social handles, IPs, and other PII from detection summaries and webhook payloads. The original text is still analyzed in full — only stored outputs are scrubbed. Set `PII_REDACTION_ENABLED=false` to disable.

---

## API Documentation

- **Base URL**: `https://api.tuteliq.ai`
- **Swagger UI**: [docs.tuteliq.ai](https://docs.tuteliq.ai)
- **OpenAPI JSON**: [docs.tuteliq.ai/json](https://docs.tuteliq.ai/json)

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/Tuteliq/node/blob/main/CONTRIBUTING.md) for details.

```bash
# Clone the repo
git clone https://github.com/Tuteliq/node.git
cd node

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## Support

- **Documentation**: [docs.tuteliq.ai](https://docs.tuteliq.ai)
- **Discord**: [discord.gg/7kbTeRYRXD](https://discord.gg/7kbTeRYRXD)
- **Email**: support@tuteliq.ai
- **Issues**: [GitHub Issues](https://github.com/Tuteliq/node/issues)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Get Certified — Free

Tuteliq offers a **free certification program** for anyone who wants to deepen their understanding of online child safety. Complete a track, pass the quiz, and earn your official Tuteliq certificate — verified and shareable.

**Three tracks available:**

| Track | Who it's for | Duration |
|-------|-------------|----------|
| **Parents & Caregivers** | Parents, guardians, grandparents, teachers, coaches | ~90 min |
| **Young People (10-16)** | Young people who want to learn to spot manipulation | ~60 min |
| **Companies & Platforms** | Product managers, trust & safety teams, CTOs, compliance officers | ~120 min |

**Start here:** [tuteliq.ai/certify](https://tuteliq.ai/certify)

- 100% Free — no login required
- Verifiable certificate on completion
- Covers grooming recognition, sextortion, cyberbullying, regulatory obligations (KOSA, EU DSA), and more

---

## The Mission: Why This Matters

Before you decide to contribute or sponsor, read these numbers. They are not projections. They are not estimates from a pitch deck. They are verified statistics from the University of Edinburgh, UNICEF, NCMEC, and Interpol.

- **302 million** children are victims of online sexual exploitation and abuse every year. That is **10 children every second**. *(Childlight / University of Edinburgh, 2024)*
- **1 in 8** children globally have been victims of non-consensual sexual imagery in the past year. *(Childlight, 2024)*
- **370 million** girls and women alive today experienced rape or sexual assault in childhood. An estimated **240-310 million** boys and men experienced the same. *(UNICEF, 2024)*
- **29.2 million** incidents of suspected child sexual exploitation were reported to NCMEC's CyberTipline in 2024 alone — containing **62.9 million files** (images, videos). *(NCMEC, 2025)*
- **546,000** reports of online enticement (adults grooming children) in 2024 — a **192% increase** from the year before. *(NCMEC, 2025)*
- **1,325% increase** in AI-generated child sexual abuse material reports between 2023 and 2024. The technology that should protect children is being weaponized against them. *(NCMEC, 2025)*
- **100 sextortion reports per day** to NCMEC. Since 2021, at least **36 teenage boys** have taken their own lives because they were victimized by sextortion. *(NCMEC, 2025)*
- **84%** of reports resolve outside the United States. This is not an American problem. This is a **global emergency**. *(NCMEC, 2025)*

End-to-end encryption is making platforms blind. In 2024, platforms reported **7 million fewer incidents** than the year before — not because abuse stopped, but because they can no longer see it. The tools that catch known images are failing. The systems that rely on human moderators are overwhelmed. The technology to detect behavior — grooming patterns, escalation, manipulation — in real-time text conversations **exists right now**. It is running at [api.tuteliq.ai](https://api.tuteliq.ai).

The question is not whether this technology is possible. The question is whether we build the company to put it everywhere it needs to be.

**Every second we wait, another child is harmed.**

We have the technology. We need the support.

If this mission matters to you, consider [sponsoring our open-source work](https://github.com/sponsors/Tuteliq) so we can keep building the tools that protect children — and keep them free and accessible for everyone.

---

<p align="center">
  <sub>Built with care for child safety by the <a href="https://tuteliq.ai">Tuteliq</a> team</sub>
</p>
