# PDFLab n8n Workflow Specification

**Version:** 2.0
**Last Updated:** December 15, 2025
**Status:** Ready for Implementation

This document provides the complete technical blueprint for building the "PDFLab Content Engine" in n8n. It includes all API configurations, credentials setup, and step-by-step implementation details.

---

## Table of Contents

1. [Workflow Architecture Overview](#1-workflow-architecture-overview)
2. [Required APIs & Credentials Summary](#2-required-apis--credentials-summary)
3. [Triggers & Inputs (Detailed Setup)](#3-triggers--inputs-detailed-setup)
4. [URL Deduplication (Prevent Reprocessing)](#4-url-deduplication-prevent-reprocessing)
5. [Filtering Logic](#5-filtering-logic)
6. [AI Text Generation (Gemini 3 Pro)](#6-ai-text-generation-gemini-3-pro)
7. [Image Generation (Imagen 4)](#7-image-generation-imagen-4)
8. [Image Storage (Hostinger API)](#8-image-storage-hostinger-api)
9. [Human Review (Slack)](#9-human-review-slack)
10. [Publishing (LinkedIn/Instagram)](#10-publishing-linkedininstagram)
11. [Complete n8n Node Configurations](#11-complete-n8n-node-configurations)
12. [MVP Quick Start Guide](#12-mvp-quick-start-guide)
13. [Troubleshooting & FAQ](#13-troubleshooting--faq)

---

## 1. Workflow Architecture Overview

### High-Level Flow

```
Trigger (RSS/Reddit) -> Filter (Keywords) -> AI Agent (Gemini 3 Pro) ->
Image Generation (Imagen 4) -> Human Review (Slack) -> Publish (LinkedIn/Instagram)
```

### Visual Diagram

```
    +---------------+     +---------------+     +---------------+
    |  RSS Feeds    |     |    Reddit     |     |   Schedule    |
    |  (6 hours)    |     |  (24 hours)   |     |   (1x/day)    |
    +-------+-------+     +-------+-------+     +-------+-------+
            |                     |                     |
            +---------------------+---------------------+
                                  |
                                  v
                        +-----------------+
                        |  DEDUP CHECK    |
                        |  (Redis/SQLite) |
                        |  Skip if seen   |
                        +--------+--------+
                                 |
                                 v
                        +-----------------+
                        |  FILTER NODE    |
                        |  Keywords:      |
                        |  pdf, study,    |
                        |  privacy, adobe |
                        +--------+--------+
                                 |
                                 v
                        +-----------------+
                        |  PLATFORM       |
                        |  ROUTER         |
                        +--------+--------+
                                 |
                +----------------+----------------+
                |                                 |
                v                                 v
        +---------------+                 +---------------+
        |   LINKEDIN    |                 |   INSTAGRAM   |
        |   Pipeline    |                 |   Pipeline    |
        +-------+-------+                 +-------+-------+
                |                                 |
                v                                 v
        +---------------+                 +---------------+
        |   Privacy     |                 |   Student     |
        |   Advocate    |                 |   Cynical     |
        |   PERSONA     |                 |   PERSONA     |
        +-------+-------+                 +-------+-------+
                |                                 |
                v                                 v
        +---------------+                 +---------------+
        |  GEMINI 3 PRO |                 |  GEMINI 3 PRO |
        |  + Content    |                 |  + Content    |
        |  Type Check   |                 |  Type Check   |
        +-------+-------+                 +-------+-------+
                |                                 |
                +----------------+----------------+
                                 |
                                 v
                      +-------------------+
                      |    IMAGEN 4       |
                      |  Generate image   |
                      |   (FREE tier)     |
                      +--------+----------+
                               |
                               v
                      +-------------------+
                      |  HOSTINGER API    |
                      |  Upload image     |
                      |  Get public URL   |
                      +--------+----------+
                               |
                               v
                      +-------------------+
                      |      SLACK        |
                      |  Human Review     |
                      |                   |
                      | [Approve] [Edit]  |
                      | [Regen] [Skip]    |
                      | [Reject]          |
                      +--------+----------+
                               |
            +------------------+------------------+
            |                  |                  |
            v                  v                  v
    +------------+      +------------+      +------------+
    |  Approved  |      |    Edit    |      |   Reject   |
    +-----+------+      +-----+------+      +-----+------+
          |                   |                   |
          |                   v                   v
          |            +------------+      +------------+
          |            |  Manual    |      |    End     |
          |            |  Modify    |      +------------+
          |            +-----+------+
          |                  |
          +------------------+
                    |
                    v
          +------------------+
          |     PUBLISH      |
          |                  |
          |  +-----------+   |
          |  | LinkedIn  |   |
          |  | (Privacy) |   |
          |  +-----------+   |
          |  +-----------+   |
          |  | Instagram |   |
          |  | (Student) |   |
          |  +-----------+   |
          +------------------+
```

### Platform-Persona Assignment

**IMPORTANT:** Each platform gets ONE dedicated persona to build consistent brand identity:

| Platform      | Persona                  | Rationale                                                     |
| ------------- | ------------------------ | ------------------------------------------------------------- |
| **LinkedIn**  | Privacy Advocate         | Professional audience values data privacy, thought leadership |
| **Instagram** | Student (Cynical Senior) | Visual platform, better demographics for students/studygram   |

> This prevents "persona collision" where followers see conflicting voices from the same brand account.

---

## 2. Required APIs & Credentials Summary

| Service      | API Required?  | Where to Get                 | Cost   |
| ------------ | -------------- | ---------------------------- | ------ |
| RSS Feeds    | NO             | Public URLs (no auth needed) | FREE   |
| Reddit       | YES            | reddit.com/prefs/apps        | FREE   |
| Gemini 3 Pro | YES            | aistudio.google.com/apikey   | FREE\* |
| Imagen 4     | YES (same key) | aistudio.google.com/apikey   | FREE\* |
| Slack        | YES            | api.slack.com/apps           | FREE   |
| LinkedIn     | YES            | linkedin.com/developers      | FREE   |
| Instagram    | YES            | developers.facebook.com      | FREE   |

> \*Free tier limits apply. See individual sections for details.

**IMPORTANT:** One Google AI Studio API key works for BOTH Gemini 3 Pro AND Imagen 4.

---

## 3. Triggers & Inputs (Detailed Setup)

### A. RSS Feed Trigger (The "News" Stream)

**n8n Node Type:** RSS Feed Read
**API Required:** NO (RSS feeds are public)

**Configuration:**

- Feed URL: (add one node per feed, or use merge node)
- Poll Times: Every 6 hours

**URL Sources:**

1. Tech/Privacy: `https://www.theverge.com/rss/index.xml`
2. Productivity: `https://lifehacker.com/rss`
3. Deep Work/Study: `https://www.calnewport.com/blog/feed/`

**n8n Node Settings:**

```json
{
  "feedUrl": "https://www.theverge.com/rss/index.xml",
  "options": {}
}
```

**Output Fields Available:**

- `{{ $json.title }}` - Article title
- `{{ $json.link }}` - Article URL
- `{{ $json.description }}` - Article summary/excerpt
- `{{ $json.pubDate }}` - Publication date
- `{{ $json.creator }}` - Author name

---

### B. Reddit Trigger (The "Community" Stream)

**n8n Node Type:** Reddit
**API Required:** YES

#### Step-by-Step Reddit API Setup

1. Go to: https://www.reddit.com/prefs/apps
2. Scroll down, click "create another app..."
3. Fill in the form:
   - **Name:** PDFLab Content Engine
   - **App type:** Select "script"
   - **Description:** Content automation for PDFLab
   - **About URL:** https://pdflab.pro
   - **Redirect URI:** `http://localhost` (required but not used for script apps)
4. Click "Create app"
5. Copy your credentials:
   - **Client ID:** The string under "personal use script" (e.g., "abc123xyz")
   - **Client Secret:** The "secret" field

**n8n Credentials Setup:**

1. In n8n, go to: Credentials > Add Credential
2. Search for: "Reddit OAuth2 API"
3. Enter:
   - Client ID: [your client ID from step 5]
   - Client Secret: [your client secret from step 5]
4. Click "Connect my account" and authorize

**n8n Node Configuration:**

```json
{
  "resource": "subreddit",
  "operation": "getNew",
  "subreddit": "productivity",
  "limit": 5,
  "filters": {
    "time": "day"
  }
}
```

**Target Subreddits:**

- r/college (Student content)
- r/productivity (Productivity tips)
- r/privacy (Privacy/tech news)
- r/GetStudying (Study tips)

**Output Fields Available:**

- `{{ $json.title }}` - Post title
- `{{ $json.selftext }}` - Post body text
- `{{ $json.subreddit }}` - Source subreddit
- `{{ $json.score }}` - Upvotes
- `{{ $json.url }}` - Post URL
- `{{ $json.author }}` - Username

---

### C. Schedule Trigger (Manual/Timed)

**n8n Node Type:** Schedule Trigger
**API Required:** NO (built into n8n)

**Configuration Options:**

**Option 1 - Simple Interval:**

```json
{
  "rule": {
    "interval": [{ "field": "hours", "hoursInterval": 24 }]
  }
}
```

**Option 2 - Cron Expression (daily at 9am):**

```json
{
  "rule": {
    "cronExpression": "0 9 * * *"
  }
}
```

**Option 3 - Specific Times:**

```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 9,14,18 * * *"
      }
    ]
  }
}
```

> Runs at 9am, 2pm, and 6pm daily

---

## 4. URL Deduplication (Prevent Reprocessing)

**Purpose:** Prevent processing the same content multiple times when RSS feeds re-serve old articles.

**n8n Node Type:** Code + Redis nodes (or SQLite nodes)

### Why Deduplication Matters

RSS feeds often include the same articles across multiple poll cycles. Without deduplication:

- Same article gets transformed into 5+ posts
- Wastes AI API calls
- Floods Slack review queue with duplicates
- Annoys reviewers

### Option A: Redis (Recommended for Production)

**n8n Nodes Required (recommended n8n pattern):**

1. Code node (compute `dedupKey`)
2. Redis node: `Get`
3. IF node (skip if exists)
4. Redis node: `Set` (with TTL)

**Redis Setup:**

```bash
# If using Upstash (free tier, serverless Redis)
# Get credentials from: https://upstash.com

REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
```

**Code Node - Compute Redis Key (place this BEFORE the Filter node):**

```javascript
const crypto = require("crypto");

const first = $input.first().json;
const url = first.link || first.url;

if (!url) return [];

const urlHash = crypto.createHash("md5").update(url).digest("hex");

return [
  {
    json: {
      ...first,
      url,
      urlHash,
      dedupKey: `pdflab:processed:${urlHash}`,
    },
  },
];
```

**Redis Node - Get:**

- Operation: `Get`
- Key: `={{ $json.dedupKey }}`

**IF Node - Skip If Exists:**

- Condition: “Is Empty” on the Redis `Get` output value
- If NOT empty → stop/skip

**Redis Node - Set:**

- Operation: `Set`
- Key: `={{ $json.dedupKey }}`
- Value: `={{ $now.toISO() }}`
- Expire: `2592000` (30 days, seconds)

### Option B: SQLite (Simpler, Local Storage)

**n8n Node Type:** SQLite

**Create Table (run once):**

```sql
CREATE TABLE IF NOT EXISTS processed_urls (
  url_hash TEXT PRIMARY KEY,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**SQLite Dedup (recommended n8n pattern):**

1) Code node: compute `urlHash` (same as Redis option)

2) SQLite node: `Execute Query` (check if exists)

```sql
SELECT 1 FROM processed_urls WHERE url_hash = '{{ $json.urlHash }}'
```

3) IF node: if the SELECT returns any row → stop/skip

4) SQLite node: `Execute Query` (insert)

```sql
INSERT INTO processed_urls (url_hash) VALUES ('{{ $json.urlHash }}')
```

_Note: Storing only the hash avoids URL-to-SQL injection issues._

### Cleanup (Optional - Cron Job)

```sql
-- Delete records older than 30 days
DELETE FROM processed_urls
WHERE processed_at < datetime('now', '-30 days');
```

---

## 5. Filtering Logic

**Purpose:** Only process content relevant to PDFLab's messaging angles.

**n8n Node Type:** IF (or Filter)

**Keywords to Match (in title OR description):**

- pdf, document, study, notes, slow, lag
- adobe, acrobat, subscription, privacy
- data, breach, focus, distraction
- productivity, efficiency

**n8n IF Node Configuration:**

```json
{
  "conditions": {
    "options": {
      "caseSensitive": false,
      "leftValue": "",
      "typeValidation": "loose"
    },
    "conditions": [
      {
        "id": "condition1",
        "leftValue": "={{ $json.title.toLowerCase() + ' ' + $json.description.toLowerCase() }}",
        "rightValue": "pdf|document|study|notes|adobe|acrobat|subscription|privacy|breach|focus|productivity",
        "operator": {
          "type": "string",
          "operation": "regex"
        }
      }
    ],
    "combinator": "or"
  }
}
```

---

## 6. AI Text Generation (Gemini 3 Pro)

**n8n Node Type:** HTTP Request
**Model:** Gemini 3 Pro
**API Provider:** Google AI Studio

### Google AI Studio API Setup

1. Go to: https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Select your Google Cloud project (or create one)
5. Copy the API key (starts with "AIza...")
6. **IMPORTANT:** Store this securely - do NOT share in chat or commit to git

**n8n Credentials Setup:**

1. Go to: Credentials > Add Credential
2. Select: "Header Auth"
3. Name: "Google AI API Key"
4. Header Name: (leave empty - we'll use URL parameter)
5. Header Value: [your API key]

**Alternative - Store as Environment Variable:**

```
GOOGLE_AI_API_KEY=AIza...your-key-here
```

### Gemini 3 Pro Node Configuration

**HTTP Request Node Settings:**

- Method: POST
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key={{ $env.GOOGLE_AI_API_KEY }}`
- Body Content Type: JSON

**Request Body (Privacy Advocate persona):**

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "You are a privacy advocate and tech enthusiast.\n\nINPUT: {{ $json.title }} - {{ $json.description }}\n\nTASK: Write a LinkedIn post that:\n1. Summarizes the news in 1 sentence\n2. Highlights the danger of cloud-based tools OR the value of ownership\n3. Pitches PDFLab as the 'Local-First, Privacy-First' alternative\n4. Tone: Professional, authoritative, slightly rebellious against Big Tech\n\nOutput ONLY the post text, no explanations."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500,
    "topP": 0.9
  }
}
```

**Request Body (Student persona):**

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "You are a helpful, slightly cynical senior college student.\n\nINPUT: {{ $json.title }} - {{ $json.description }}\n\nTASK: Rewrite this as a short, punchy social media post that:\n1. Validates the original point ('True,' 'This is key')\n2. Pivots to the problem of 'bloated software' or 'inefficient tools'\n3. Mentions PDFLab as the 'secret weapon' for speed and focus\n4. Include hashtags: #studytok #collegehacks #PDFLab\n5. Tone: Relatable, tired of corporate BS, helpful\n\nOutput ONLY the post text, no explanations."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.8,
    "maxOutputTokens": 400,
    "topP": 0.9
  }
}
```

**Request Body (Productivity Guru persona):**

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "You are a no-nonsense productivity coach.\n\nINPUT: {{ $json.title }} - {{ $json.description }}\n\nTASK: Write a motivational social media post that:\n1. Agrees with the productivity method/tip\n2. Identifies 'Tool Friction' as the enemy of this method\n3. Positions PDFLab as the 'Frictionless' tool\n4. Tone: Encouraging, focused on 'Flow State' and 'Deep Work'\n\nOutput ONLY the post text, no explanations."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 400,
    "topP": 0.9
  }
}
```

**Response Handling:**

- Extract text from: `{{ $json.candidates[0].content.parts[0].text }}`
- Store as: `{{ $json.ai_generated_post }}`

**Quotas (Gemini):**

Quotas vary by model and account. Verify current limits/pricing before building:

- Models: https://ai.google.dev/gemini-api/docs/models
- Pricing: https://ai.google.dev/pricing

---

## 7. Image Generation (Imagen 4)

**n8n Node Type:** HTTP Request
**Model:** Imagen 4
**API Provider:** Google AI Studio (same API key as Gemini)

### Imagen 4 Node Configuration

**HTTP Request Node Settings:**

- Method: POST
- URL: `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`
- Body Content Type: JSON

**Request Body:**

```json
{
  "instances": [
    {
      "prompt": "Create a clean, professional social media graphic for PDFLab. Theme: {{ $json.persona }} (student/privacy/productivity). Headline idea: '{{ $json.headline }}'. Style: modern, minimalist, tech-forward. Brand colors: purple/blue gradient background. Include subtle PDF/document imagery. Avoid: faces, clutter, watermarks, misspelled text."
    }
  ],
  "parameters": {
    "sampleCount": 1,
    "aspectRatio": "={{ $json.target_platform === 'linkedin' ? '16:9' : '1:1' }}"
  }
}
```

**Headers (recommended):**

- `Content-Type: application/json`
- `x-goog-api-key: {{ $env.GOOGLE_AI_API_KEY }}`

**Platform-Specific Aspect Ratios:**
| Platform | Aspect Ratio | Dimensions |
|----------|--------------|------------|
| LinkedIn | 16:9 | 1200x675 |
| Instagram | 1:1 | 1080x1080 |
| Twitter/X | 16:9 | 1200x675 |

**Response Handling:**

 - Image data location depends on the client/output. Common paths:
   - `{{ $json.predictions[0].imageBytes }}`
   - `{{ $json.generatedImages[0].image.imageBytes }}`
 - Convert base64 to image file or upload to cloud storage
 - Store URL as: `{{ $json.generated_image }}`

**Base64 to File Conversion (Function Node):**

```javascript
// Add a Function node after HTTP Request
const json = $input.first().json;

const base64Data =
  json?.predictions?.[0]?.bytesBase64Encoded ||
  json?.predictions?.[0]?.imageBytes ||
  json?.generatedImages?.[0]?.image?.imageBytes;

if (!base64Data) {
  throw new Error(
    "No image bytes found. Inspect the prior node output and update the extraction path."
  );
}
const buffer = Buffer.from(base64Data, "base64");

return [
  {
    json: $input.first().json,
    binary: {
      image: {
        data: buffer.toString("base64"),
        mimeType: "image/png",
        fileName: "pdflab_social_" + Date.now() + ".png",
      },
    },
  },
];
```

**Verify current model options + parameters + quotas before you build:**

- Imagen docs: https://ai.google.dev/gemini-api/docs/imagen
- Pricing: https://ai.google.dev/pricing

---

## 8. Image Storage (Hostinger API)

**Purpose:** Store generated images on Hostinger for public URL access. Social platforms require publicly accessible image URLs.

### Storage Architecture

```
+------------------+     +------------------+     +------------------+
|   IMAGEN 4       |     |  LOCAL BACKUP    |     |   HOSTINGER      |
|   (Base64)       | --> |  (Historical)    | --> |   (Live Images)  |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                                  +------------------+
                                                  |  PUBLIC URL      |
                                                  |  for social      |
                                                  |  media posts     |
                                                  +------------------+
```

### Hostinger FTP/SFTP Setup

**Step 1: Get FTP Credentials from Hostinger**

1. Log into Hostinger hPanel
2. Go to: Files > FTP Accounts
3. Create new FTP account OR use existing
4. Note down:
   - **FTP Host:** ftp.yourdomain.com (or IP)
   - **FTP Username:** Your FTP username
   - **FTP Password:** Your FTP password
   - **Port:** 21 (FTP) or 22 (SFTP)

**Step 2: Create Image Directory**

```bash
# Connect via FTP client (FileZilla) or terminal
# Create directory for social images

mkdir /public_html/assets/social-images
```

**Your public URL pattern:** `https://yourdomain.com/assets/social-images/filename.png`

### n8n FTP Upload Node Configuration

**n8n Node Type:** FTP

**n8n Credentials Setup:**

1. Go to: Credentials > Add Credential
2. Search: "FTP"
3. Enter:
   - Host: `ftp.yourdomain.com`
   - Port: `21`
   - Username: `[your FTP username]`
   - Password: `[your FTP password]`
4. Click "Save"

**FTP Node Settings:**

```json
{
  "operation": "upload",
  "path": "/public_html/assets/social-images/",
  "binaryPropertyName": "image",
  "options": {}
}
```

### Complete Image Upload Workflow (Function Node)

**Place this after the Imagen 4 node:**

```javascript
// Function Node: Process Image for Upload

const base64Data = $input.first().json.predictions[0].bytesBase64Encoded;
const timestamp = Date.now();
const platform = $input.first().json.target_platform || "social";
const fileName = `pdflab_${platform}_${timestamp}.png`;

// Convert base64 to binary
const buffer = Buffer.from(base64Data, "base64");

// Also save to local storage (historical backup)
const localPath = `/data/images/${fileName}`;
// Note: n8n may need Write node for local storage

return [
  {
    json: {
      ...$input.first().json,
      fileName: fileName,
      publicUrl: `https://yourdomain.com/assets/social-images/${fileName}`,
      localBackupPath: localPath,
    },
    binary: {
      image: {
        data: buffer.toString("base64"),
        mimeType: "image/png",
        fileName: fileName,
      },
    },
  },
];
```

### Alternative: Hostinger File Manager API

If you prefer API over FTP (REST-based):

**Note:** Hostinger doesn't have a public API for file management. Use one of these alternatives:

**Option A: FTP (Recommended)**

- Works with n8n's built-in FTP node
- Most reliable for Hostinger

**Option B: Custom PHP Upload Endpoint**

Create a file on your Hostinger server: `/public_html/api/upload-image.php`

```php
<?php
// Simple image upload endpoint with API key auth
header('Content-Type: application/json');

$apiKey = 'YOUR_SECRET_API_KEY_HERE'; // Generate a random string

// Verify API key
if ($_SERVER['HTTP_X_API_KEY'] !== $apiKey) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Check for POST with image data
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get base64 image from POST body
$input = json_decode(file_get_contents('php://input'), true);
$base64Image = $input['image'] ?? null;
$fileName = $input['fileName'] ?? 'image_' . time() . '.png';

if (!$base64Image) {
    http_response_code(400);
    echo json_encode(['error' => 'No image provided']);
    exit;
}

// Decode and save
$imageData = base64_decode($base64Image);
$uploadDir = __DIR__ . '/../assets/social-images/';
$filePath = $uploadDir . $fileName;

// Ensure directory exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Save file
if (file_put_contents($filePath, $imageData)) {
    $publicUrl = 'https://' . $_SERVER['HTTP_HOST'] . '/assets/social-images/' . $fileName;
    echo json_encode([
        'success' => true,
        'url' => $publicUrl,
        'fileName' => $fileName
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save image']);
}
?>
```

**n8n HTTP Request Node to call PHP endpoint:**

```json
{
  "method": "POST",
  "url": "https://yourdomain.com/api/upload-image.php",
  "headers": {
    "X-API-KEY": "YOUR_SECRET_API_KEY_HERE",
    "Content-Type": "application/json"
  },
  "body": {
    "image": "={{ $json.predictions[0].bytesBase64Encoded }}",
    "fileName": "pdflab_{{ $json.platform }}_{{ Date.now() }}.png"
  }
}
```

### Local Backup Storage

**Purpose:** Keep historical copies of all generated images locally.

**n8n Write Node Configuration:**

```json
{
  "fileName": "={{ $json.fileName }}",
  "filePath": "/data/pdflab/images/",
  "binaryPropertyName": "image"
}
```

**Directory Structure:**

```
/data/pdflab/images/
├── 2025/
│   ├── 12/
│   │   ├── pdflab_linkedin_1702656000000.png
│   │   ├── pdflab_facebook_1702656001000.png
│   │   └── ...
```

---

## 9. Human Review (Slack)

**n8n Node Type:** Slack
**Purpose:** Never auto-post AI content without human approval

### Slack App Setup (Detailed)

#### Step 1: Create Slack App

1. Go to: https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. App Name: `PDFLab Content Engine`
5. Pick your workspace
6. Click "Create App"

#### Step 2: Configure Bot Token Scopes

1. In left sidebar: "OAuth & Permissions"
2. Scroll to "Scopes" > "Bot Token Scopes"
3. Add these scopes:
   - `chat:write` (Send messages)
   - `chat:write.public` (Post to public channels without joining)
   - `files:write` (Upload images)
   - `files:read` (Read uploaded files)
4. Click "Save Changes"

#### Step 3: Enable Interactivity (for buttons)

1. In left sidebar: "Interactivity & Shortcuts"
2. Toggle ON "Interactivity"
3. Request URL: `[Your n8n webhook URL]`
   - Example: `https://your-n8n-instance.com/webhook/slack-actions`
4. Click "Save Changes"

#### Step 4: Install App to Workspace

1. In left sidebar: "OAuth & Permissions"
2. Click "Install to Workspace"
3. Review permissions and click "Allow"
4. Copy "Bot User OAuth Token" (starts with `xoxb-`)

#### Step 5: n8n Credentials Setup

1. In n8n: Credentials > Add Credential
2. Search: "Slack API"
3. Access Token: [paste your xoxb- token]
4. Click "Save"

#### Step 6: Create a Channel

1. In Slack, create channel: `#pdflab-content-review`
2. Invite the bot: `/invite @PDFLab Content Engine`

### Slack Node Configuration

**n8n Slack Node Settings:**

```json
{
  "resource": "message",
  "operation": "post",
  "channel": "#pdflab-content-review",
  "blocksUi": {
    "blocksValues": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*New PDFLab Post Ready for Review*\n\n*Source:* {{ $json.source_title }}\n*Platform:* {{ $json.target_platform }}\n\n*Draft Post:*\n{{ $json.ai_generated_post }}"
        }
      },
      {
        "type": "image",
        "imageUrl": "={{ $json.image_url }}",
        "altText": "Generated social image for PDFLab"
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "Approve", "emoji": true },
            "style": "primary",
            "value": "approve",
            "actionId": "approve_post"
          },
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "Edit", "emoji": true },
            "value": "edit",
            "actionId": "edit_post"
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Regenerate",
              "emoji": true
            },
            "value": "regenerate",
            "actionId": "regenerate_post"
          },
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "Skip", "emoji": true },
            "value": "skip",
            "actionId": "skip_post"
          },
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "Reject", "emoji": true },
            "style": "danger",
            "value": "reject",
            "actionId": "reject_post"
          }
        ]
      }
    ]
  }
}
```

### Action Button Behaviors

| Button     | Action                                                      |
| ---------- | ----------------------------------------------------------- |
| Approve    | Post as-is to selected platform(s)                          |
| Edit       | Open Slack Modal to modify text inline -> Submit -> Publish |
| Regenerate | Discard and regenerate new text + image with same source    |
| Skip       | Skip this post, move to next (no action taken)              |
| Reject     | Permanently discard (mark source as processed)              |

**Webhook for Button Responses:**

1. Create Webhook node in n8n: "Slack Button Response"
2. Path: `/webhook/slack-actions`
3. Method: POST
4. Parse response body to get action value

**Switch Node After Webhook:**
Route based on: `{{ $json.actions[0].value }}`

- `approve` -> LinkedIn/Instagram publish nodes
- `edit` -> Open Slack Modal (views.open)
- `regenerate` -> Loop back to AI generation
- `skip` -> End (mark as skipped)
- `reject` -> End (mark as rejected)

**SLACK PRICING:**

- Free Plan: 90 days message history, unlimited users
- Pro Plan: $7.25/user/month (full history, more features)

---

## 10. Publishing (LinkedIn/Instagram)

### LinkedIn API Setup

#### Step 1: Create LinkedIn App

1. Go to: https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in:
   - App name: `PDFLab Content Engine`
   - LinkedIn Page: [Your company page]
   - App logo: [Upload PDFLab logo]
   - Legal agreement: Check the box
4. Click "Create app"

#### Step 2: Request Products

1. In your app, go to "Products" tab
2. Request access to:
   - "Share on LinkedIn" (for posting)
   - "Sign In with LinkedIn using OpenID Connect"
3. Wait for approval (usually instant for Share)

#### Step 3: Get Credentials

1. Go to "Auth" tab
2. Copy:
   - Client ID
   - Client Secret
3. Add Redirect URL: `https://your-n8n-instance.com/rest/oauth2-credential/callback`

#### Step 4: n8n Credentials Setup

1. Credentials > Add Credential
2. Search: "LinkedIn OAuth2 API"
3. Enter Client ID and Secret
4. Click "Connect my account" and authorize

**n8n LinkedIn Node Configuration:**

```json
{
  "resource": "post",
  "operation": "create",
  "postType": "image",
  "text": "={{ $json.ai_generated_post }}",
  "mediaUrl": "={{ $json.image_url }}",
  "visibility": "PUBLIC"
}
```

---

### Instagram API Setup

#### Step 1: Facebook Developer Account

1. You still need a Facebook Developer account (Meta manages Instagram).
2. Go to: https://developers.facebook.com/apps
3. Create App > Type: "Business"

#### Step 2: Instagram Graph API

1. Ensure your Instagram account is switched to "Business" or "Creator".
2. Connect it to a Facebook Page.
3. In Developer Portal, add "Instagram Graph API" product.
4. Permissions needed: `instagram_basic`, `instagram_content_publish`.

**n8n Instagram Node Configuration:**

```json
{
  "resource": "media",
  "operation": "create",
  "instagramAccountId": "[YOUR API ID]",
  "imageUrl": "={{ $json.image_url }}",
  "caption": "={{ $json.ai_generated_post }}"
}
```

---

## 11. Complete n8n Node Configurations

**Full Workflow JSON Export (Import into n8n):**

> Note: Replace placeholder values with your actual credentials and settings.

```json
{
  "name": "PDFLab Content Engine",
  "nodes": [
    {
      "name": "RSS Trigger - Lifehacker",
      "type": "n8n-nodes-base.rssFeedRead",
      "parameters": {
        "url": "https://lifehacker.com/rss"
      },
      "position": [250, 300]
    },
    {
      "name": "Filter Keywords",
      "type": "n8n-nodes-base.filter",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.title.toLowerCase() }}",
              "operation": "regex",
              "value2": "pdf|productivity|focus|distraction|adobe|document"
            }
          ]
        }
      },
      "position": [450, 300]
    },
    {
      "name": "Gemini 3 Pro - Generate Text",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent",
        "qs": {
          "key": "={{ $env.GOOGLE_AI_API_KEY }}"
        },
        "body": {
          "contents": [
            { "parts": [{ "text": "You are a productivity coach..." }] }
          ],
          "generationConfig": { "temperature": 0.7, "maxOutputTokens": 500 }
        },
        "options": {}
      },
      "position": [650, 300]
    },
    {
      "name": "Imagen 4 - Generate Image",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict",
        "qs": {
          "key": "={{ $env.GOOGLE_AI_API_KEY }}"
        },
        "body": {
          "instances": [{ "prompt": "Create a professional social media graphic..." }],
          "parameters": { "sampleCount": 1, "aspectRatio": "16:9" }
        }
      },
      "position": [850, 300]
    },
    {
      "name": "Slack - Human Review",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "resource": "message",
        "operation": "post",
        "channel": "#pdflab-content-review",
        "blocksUi": "..."
      },
      "position": [1050, 300]
    }
  ],
  "connections": {}
}
```

---

## 12. MVP Quick Start Guide

If the full workflow is too complex, start with this minimal version:

### MVP Workflow (5 nodes only)

1. **RSS Trigger:** Lifehacker feed
2. **AI Agent:** Single prompt for productivity persona
3. **Image Gen:** Simple Imagen 4 call
4. **Slack:** Send to you (no interactive buttons)
5. **Manual Post:** Copy-paste to LinkedIn/Instagram

### MVP Steps

1. Set up Google AI API key
2. Create RSS Read node with Lifehacker URL
3. Add HTTP Request for Gemini 3 Pro
4. Add HTTP Request for Imagen 4
5. Add Slack node to send message to yourself
6. Manually review and post

> This gives you 80% of the value with 10% of the setup complexity.

---

## 13. Troubleshooting & FAQ

**Q: Gemini API returns 429 error**
A: You hit a rate limit/quota for your account/model. Add retries with exponential backoff and verify current limits (https://ai.google.dev/pricing).

**Q: Imagen 4 returns empty response**
A: Check your prompt doesn't violate content policies. Remove any text about people or controversial topics.

**Q: Slack buttons don't work**
A: Ensure Interactivity is enabled and Request URL points to your n8n webhook.

**Q: LinkedIn post fails**
A: Verify your app has "Share on LinkedIn" product approved and token is valid.

**Q: Images look wrong on social media**
A: Check aspect ratio matches platform (16:9 for LinkedIn, 1:1 or 4:5 for Instagram).

**Q: Reddit API authentication fails**
A: Ensure you created a "script" type app and are using correct credentials.

---

## Cost Summary

| Component    | Free Tier Limit  | Your Usage       |
| ------------ | ---------------- | ---------------- |
| Gemini 3 Pro | 50 requests/day  | ~2/day           |
| Imagen 4     | 10-20 images/day | ~2/day           |
| Slack        | 90 days history  | Unlimited posts  |
| Reddit API   | Unlimited        | ~5 requests/day  |
| RSS Feeds    | Unlimited        | ~12 requests/day |

**TOTAL MONTHLY COST: $0** (all within free tiers)

---

_Document End_
