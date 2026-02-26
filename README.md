<p align="center">
  <img src="./assets/logo.png" alt="Tuteliq" width="200" />
</p>

<h1 align="center">@tuteliq/sdk</h1>

<p align="center">
  <strong>Official TypeScript/JavaScript SDK for the Tuteliq API</strong><br>
  AI-powered child safety analysis for modern applications
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

Tuteliq provides AI-powered content analysis to help protect children in digital environments. This SDK makes it easy to integrate Tuteliq's capabilities into your Node.js, browser, or edge runtime applications.

### Key Features

- **Bullying Detection** — Identify verbal abuse, exclusion, and harassment patterns
- **Grooming Risk Analysis** — Detect predatory behavior across conversation threads
- **Unsafe Content Detection** — Flag self-harm, violence, hate speech, and age-inappropriate content
- **Voice Analysis** — Transcribe audio and run safety analysis on the transcript with timestamped segments
- **Image Analysis** — Visual safety classification with OCR text extraction and text safety analysis
- **Emotional State Analysis** — Understand emotional signals and concerning trends
- **Action Guidance** — Generate age-appropriate response recommendations
- **Incident Reports** — Create professional summaries for review

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

### Tracking Fields

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
| `analyzeEmotions()` | 1 per 10 msgs | `ceil(messages / 10)`, min 1 |
| `getActionPlan()` | 2 | Longer generation |
| `generateReport()` | 3 | Structured output |
| `analyzeVoice()` | 5 | Transcription + analysis |
| `analyzeImage()` | 3 | Vision + OCR + analysis |

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

  // Inputs
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
} from '@tuteliq/sdk'

// Type-safe severity checks
if (result.severity === Severity.CRITICAL) {
  // Handle critical severity
}

// Grooming risk comparisons
if (result.grooming_risk === GroomingRisk.HIGH) {
  // Handle high grooming risk
}

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

## API Documentation

- **Base URL**: `https://api.tuteliq.ai`
- **Swagger UI**: [docs.tuteliq.ai](https://docs.tuteliq.ai)
- **OpenAPI JSON**: [docs.tuteliq.ai/json](https://docs.tuteliq.ai/json)

### Rate Limits

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
| **Young People (10–16)** | Young people who want to learn to spot manipulation | ~60 min |
| **Companies & Platforms** | Product managers, trust & safety teams, CTOs, compliance officers | ~120 min |

**Start here →** [tuteliq.ai/certify](https://tuteliq.ai/certify)

- 100% Free — no login required
- Verifiable certificate on completion
- Covers grooming recognition, sextortion, cyberbullying, regulatory obligations (KOSA, EU DSA), and more

---

## The Mission: Why This Matters

Before you decide to contribute or sponsor, read these numbers. They are not projections. They are not estimates from a pitch deck. They are verified statistics from the University of Edinburgh, UNICEF, NCMEC, and Interpol.

- **302 million** children are victims of online sexual exploitation and abuse every year. That is **10 children every second**. *(Childlight / University of Edinburgh, 2024)*
- **1 in 8** children globally have been victims of non-consensual sexual imagery in the past year. *(Childlight, 2024)*
- **370 million** girls and women alive today experienced rape or sexual assault in childhood. An estimated **240–310 million** boys and men experienced the same. *(UNICEF, 2024)*
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
