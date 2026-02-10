<p align="center">
  <img src="./assets/logo.png" alt="SafeNest" width="200" />
</p>

<h1 align="center">@safenest/sdk</h1>

<p align="center">
  <strong>Official TypeScript/JavaScript SDK for the SafeNest API</strong><br>
  AI-powered child safety analysis for modern applications
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@safenest/sdk"><img src="https://img.shields.io/npm/v/@safenest/sdk.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@safenest/sdk"><img src="https://img.shields.io/npm/dm/@safenest/sdk.svg" alt="npm downloads"></a>
  <a href="https://github.com/SafeNestSDK/node/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@safenest/sdk.svg" alt="license"></a>
  <a href="https://github.com/SafeNestSDK/node/actions"><img src="https://img.shields.io/github/actions/workflow/status/SafeNestSDK/node/ci.yml" alt="build status"></a>
  <a href="https://bundlephobia.com/package/@safenest/sdk"><img src="https://img.shields.io/bundlephobia/minzip/@safenest/sdk" alt="bundle size"></a>
</p>

<p align="center">
  <a href="https://docs.safenest.dev">Documentation</a> •
  <a href="https://safenest.dev/dashboard">Dashboard</a> •
  <a href="https://discord.gg/7kbTeRYRXD">Discord</a> •
  <a href="https://twitter.com/safenestdev">Twitter</a>
</p>

---

## Overview

SafeNest provides AI-powered content analysis to help protect children in digital environments. This SDK makes it easy to integrate SafeNest's capabilities into your Node.js, browser, or edge runtime applications.

### Key Features

- **Bullying Detection** — Identify verbal abuse, exclusion, and harassment patterns
- **Grooming Risk Analysis** — Detect predatory behavior across conversation threads
- **Unsafe Content Detection** — Flag self-harm, violence, hate speech, and age-inappropriate content
- **Emotional State Analysis** — Understand emotional signals and concerning trends
- **Action Guidance** — Generate age-appropriate response recommendations
- **Incident Reports** — Create professional summaries for review

### Why SafeNest?

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
npm install @safenest/sdk

# yarn
yarn add @safenest/sdk

# pnpm
pnpm add @safenest/sdk

# bun
bun add @safenest/sdk
```

### Requirements

- Node.js 18+ (or any runtime with `fetch` support)
- TypeScript 4.7+ (optional, for type definitions)

---

## Quick Start

```typescript
import { SafeNest } from '@safenest/sdk'

const safenest = new SafeNest(process.env.SAFENEST_API_KEY)

// Quick safety analysis
const result = await safenest.analyze("User message to analyze")

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
import { SafeNest } from '@safenest/sdk'

// Simple
const safenest = new SafeNest('your-api-key')

// With options
const safenest = new SafeNest('your-api-key', {
  timeout: 30000,    // Request timeout in ms (default: 30 seconds)
  retries: 3,        // Retry attempts for transient failures (default: 3)
  retryDelay: 1000,  // Initial retry delay in ms (default: 1000)
})
```

---

### Tracking Fields

All detection methods accept optional tracking fields for correlation, multi-tenant routing, and custom metadata:

```typescript
const result = await safenest.detectBullying({
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
const result = await safenest.detectBullying({
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
const result = await safenest.detectGrooming({
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
```

#### `detectUnsafe(input)`

Identifies potentially dangerous or harmful content.

```typescript
const result = await safenest.detectUnsafe({
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

```typescript
// Simple string input
const result = await safenest.analyze("Message to check")

// With options
const result = await safenest.analyze({
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

### Emotional Analysis

#### `analyzeEmotions(input)`

Summarizes emotional signals in content or conversations.

```typescript
// Single content
const result = await safenest.analyzeEmotions({
  content: "I'm so stressed about everything lately"
})

// Or conversation history
const result = await safenest.analyzeEmotions({
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
const plan = await safenest.getActionPlan({
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
const report = await safenest.generateReport({
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

### Policy Configuration

#### `getPolicy()` / `setPolicy(config)`

Customize safety thresholds for your application.

```typescript
// Get current policy
const policy = await safenest.getPolicy()

// Update policy
await safenest.setPolicy({
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

## Usage Tracking

The SDK automatically captures usage metadata from API responses:

```typescript
const result = await safenest.detectBullying({ content: 'test' })

// Access usage stats
console.log(safenest.usage)
// { limit: 10000, used: 5234, remaining: 4766 }

// Access request metadata
console.log(safenest.lastRequestId)   // 'req_1a2b3c...'
console.log(safenest.lastLatencyMs)   // 145
```

---

## Error Handling

The SDK provides typed error classes for different failure scenarios:

```typescript
import {
  SafeNest,
  SafeNestError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  ServerError,
  TimeoutError,
  NetworkError,
} from '@safenest/sdk'

try {
  const result = await safenest.detectBullying({ content: 'test' })
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 - Invalid or missing API key
    console.error('Check your API key')
  } else if (error instanceof RateLimitError) {
    // 429 - Too many requests
    console.error('Rate limited, slow down')
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
  } else if (error instanceof SafeNestError) {
    // Generic SDK error
    console.error('Error:', error.message)
  }
}
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { SafeNest } from '@safenest/sdk'
import type {
  // Results
  BullyingResult,
  GroomingResult,
  UnsafeResult,
  EmotionsResult,
  ActionPlanResult,
  ReportResult,
  AnalyzeResult,

  // Inputs
  DetectBullyingInput,
  DetectGroomingInput,
  DetectUnsafeInput,
  AnalyzeEmotionsInput,
  GetActionPlanInput,
  GenerateReportInput,

  // Utilities
  Usage,
  ContextInput,
  GroomingMessage,
  EmotionMessage,
  ReportMessage,
} from '@safenest/sdk'
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
  EmotionTrend,
  IncidentStatus,
  ErrorCode,
} from '@safenest/sdk'

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
import { Severity, RiskCategory } from '@safenest/sdk/constants'
```

---

## Examples

### React Integration

```typescript
import { SafeNest } from '@safenest/sdk'
import { useState } from 'react'

const safenest = new SafeNest(process.env.NEXT_PUBLIC_SAFENEST_API_KEY)

function MessageInput() {
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState<string | null>(null)

  const handleSubmit = async () => {
    const result = await safenest.analyze(message)

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
import { SafeNest, RateLimitError } from '@safenest/sdk'
import express from 'express'

const safenest = new SafeNest(process.env.SAFENEST_API_KEY)

const safetyMiddleware = async (req, res, next) => {
  const { message } = req.body

  try {
    const result = await safenest.analyze(message)

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
  messages.map(content => safenest.analyze(content))
)

const flagged = results.filter(r => r.risk_level !== 'safe')
console.log(`${flagged.length} messages flagged for review`)
```

---

## Browser Support

The SDK works in browsers that support the Fetch API:

```html
<script type="module">
  import { SafeNest } from 'https://esm.sh/@safenest/sdk'

  const safenest = new SafeNest('your-api-key')
  const result = await safenest.analyze('Hello world')
</script>
```

> **Note**: Never expose your API key in client-side code for production applications. Use a backend proxy to protect your credentials.

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/SafeNestSDK/node/blob/main/CONTRIBUTING.md) for details.

```bash
# Clone the repo
git clone https://github.com/SafeNestSDK/node.git
cd sdk-typescript

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## API Documentation

- **Base URL**: `https://api.safenest.dev`
- **Swagger UI**: [api.safenest.dev/docs](https://api.safenest.dev/docs)
- **OpenAPI JSON**: [api.safenest.dev/docs/json](https://api.safenest.dev/docs/json)

### Rate Limits

Rate limits depend on your subscription tier:

| Plan | Price | API Calls/month | Features |
|------|-------|-----------------|----------|
| **Starter** | Free | 1,000 | Basic moderation, JS SDK, Community support |
| **Pro** | $99/mo | 100,000 | Advanced AI, All SDKs, Edge network (sub-100ms), Real-time analytics |
| **Business** | $199/mo | 250,000 | Everything in Pro + 5 team seats, Custom webhooks, SSO, 99.9% SLA |
| **Enterprise** | Custom | Unlimited | Custom AI training, Dedicated infrastructure, 24/7 support, SOC 2 |

---

## Support

- **Documentation**: [docs.safenest.dev](https://docs.safenest.dev)
- **Discord**: [discord.gg/7kbTeRYRXD](https://discord.gg/7kbTeRYRXD)
- **Email**: support@safenest.dev
- **Issues**: [GitHub Issues](https://github.com/SafeNestSDK/node/issues)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with care for child safety by the <a href="https://safenest.dev">SafeNest</a> team</sub>
</p>
