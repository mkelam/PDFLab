# PDFLab n8n Implementation Guide

**Version:** 1.0
**Last Updated:** December 15, 2025
**Status:** Ready for Implementation
**Prerequisites:** Read `PDFLab_n8n_Workflow_Specification.md` and `PDFLab_Content_Transformation_Strategy.md` first

This document contains the exact node configurations, prompts, and code to copy-paste into n8n. Use this as your build checklist.

---

## Quick Reference

| Total Nodes | Estimated Build Time | Monthly Cost    |
| ----------- | -------------------- | --------------- |
| ~20-24 nodes (depends on dedup option) | 3-5 hours | Varies (verify current quotas/pricing) |

---

## Node-by-Node Implementation

### Step 1: RSS Trigger (Lifehacker)

| Property          | Value                      |
| ----------------- | -------------------------- |
| **Node Type**     | RSS Feed Read              |
| **Poll Interval** | Every 6 hours              |
| **Purpose**       | Fetch productivity content |

**Configuration:**

```
Feed URL: https://lifehacker.com/rss
```

**Output Fields:**

- `{{ $json.title }}` - Article title
- `{{ $json.link }}` - Article URL
- `{{ $json.description }}` - Article summary
- `{{ $json.pubDate }}` - Publication date

---

### Step 2: RSS Trigger (The Verge)

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Node Type**     | RSS Feed Read           |
| **Poll Interval** | Every 6 hours           |
| **Purpose**       | Fetch tech/privacy news |

**Configuration:**

```
Feed URL: https://www.theverge.com/rss/index.xml
```

---

### Step 3: RSS Trigger (Cal Newport)

| Property          | Value                         |
| ----------------- | ----------------------------- |
| **Node Type**     | RSS Feed Read                 |
| **Poll Interval** | Every 6 hours                 |
| **Purpose**       | Fetch deep work/study content |

**Configuration:**

```
Feed URL: https://www.calnewport.com/blog/feed/
```

---

### Step 4: Reddit Trigger

| Property          | Value                          |
| ----------------- | ------------------------------ |
| **Node Type**     | Reddit                         |
| **Credential**    | Reddit OAuth2                  |
| **Poll Interval** | Every 24 hours                 |
| **Purpose**       | Fetch trending community posts |

**Credential Setup:**

1. Go to: https://www.reddit.com/prefs/apps
2. Create app (type: "script")
3. Copy Client ID + Secret to n8n credentials

**Configuration:**

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

**Duplicate this node for:** `college`, `GetStudying`, `privacy`

---

### Step 5: Merge Triggers

| Property      | Value                                  |
| ------------- | -------------------------------------- |
| **Node Type** | Merge                                  |
| **Mode**      | Append                                 |
| **Purpose**   | Combine all sources into single stream |

**Configuration:**

```
Mode: Append
```

**Connect:** All RSS + Reddit nodes → Merge node

---

### Step 6: URL Deduplication

| Property      | Value                                |
| ------------- | ------------------------------------ |
| **Node Type** | Code + Redis + IF                    |
| **Purpose**   | Prevent reprocessing same content    |
| **Requires**  | Redis credential (Upstash free tier) |

**Implementation (recommended n8n pattern):**

1) **Code Node: Compute Redis Key**

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

2) **Redis Node: Get**

- Operation: `Get`
- Key: `={{ $json.dedupKey }}`

3) **IF Node: Already Processed?**

- Condition: “Is Empty” on the Redis `Get` output value
- If NOT empty → stop/skip

4) **Redis Node: Set**

- Operation: `Set`
- Key: `={{ $json.dedupKey }}`
- Value: `={{ $now.toISO() }}`
- Expire: `2592000` (30 days, seconds)

**Redis Setup (Upstash - Free):**

1. Go to: https://upstash.com
2. Create free Redis database
3. Copy connection string to n8n Redis credential

---

### Step 7: Keyword Filter

| Property      | Value                                |
| ------------- | ------------------------------------ |
| **Node Type** | IF                                   |
| **Purpose**   | Only process PDFLab-relevant content |

**Configuration:**

```
Value 1: ={{ $json.title.toLowerCase() + ' ' + ($json.description || '').toLowerCase() }}
Operation: Matches Regex
Value 2: pdf|document|study|notes|adobe|acrobat|subscription|privacy|breach|focus|productivity|distraction|slow|lag
```

---

### Step 8: Content Type Selector (60/25/15 Mix)

| Property      | Value                                     |
| ------------- | ----------------------------------------- |
| **Node Type** | Function                                  |
| **Purpose**   | Assign content type for 60/25/15 strategy |

**Code (copy-paste):**

```javascript
const rand = Math.random() * 100;
let contentType;

if (rand < 60) {
  contentType = "pure_value";
} else if (rand < 85) {
  contentType = "soft_integration";
} else {
  contentType = "direct_promotion";
}

return [
  {
    json: {
      ...$input.first().json,
      content_type: contentType,
    },
  },
];
```

---

### Step 9: Platform Router

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| **Node Type** | Switch                                   |
| **Purpose**   | Split into LinkedIn + Instagram pipelines |

**Configuration:**

```
Routing Rules:
  Rule 1: Output 0 (LinkedIn) - Always true
  Rule 2: Output 1 (Instagram) - Always true
```

_Note: Same content goes to both outputs, but will be processed with different personas._

---

### Step 10a: LinkedIn AI Transform (Privacy Advocate)

| Property      | Value                                                |
| ------------- | ---------------------------------------------------- |
| **Node Type** | HTTP Request                                         |
| **Method**    | POST                                                 |
| **Purpose**   | Generate LinkedIn post with Privacy Advocate persona |

**URL:**

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key={{ $env.GOOGLE_AI_API_KEY }}
```

**Headers:**

```
Content-Type: application/json
```

**Body (copy-paste entire JSON):**

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "You are a privacy advocate and tech professional who believes in data ownership, local-first software, and user rights. You write for LinkedIn.\n\nINPUT: {{ $json.title }} - {{ $json.description }}\nCONTENT TYPE: {{ $json.content_type }}\n\nTASK: Transform this into a professional LinkedIn post.\n\nCONTENT TYPE RULES:\n- If content_type is \"pure_value\": Do NOT mention PDFLab at all. Focus purely on the insight/tip.\n- If content_type is \"soft_integration\": Mention PDFLab naturally as part of your workflow, not as a pitch.\n- If content_type is \"direct_promotion\": Feature PDFLab prominently with specific benefits.\n\nGENERAL RULES:\n1. Open with a 1-sentence hook that grabs attention\n2. Provide brief analysis (why this matters)\n3. Keep it between 150-300 words\n4. End with exactly 2 hashtags (LinkedIn deprioritizes more)\n5. Include a thought-provoking question at the end to drive comments\n6. No emojis in the opening line\n\nTONE:\n- Professional and authoritative\n- Slightly contrarian/rebellious against Big Tech\n- Data-conscious and principled\n- Technical but accessible to general audience\n- Thought leadership style\n\nOUTPUT ONLY THE POST TEXT. No explanations or meta-commentary."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500
  }
}
```

---

### Step 10b: Instagram/Threads AI Transform (Student Persona)

| Property      | Value                                       |
| ------------- | ------------------------------------------- |
| **Node Type** | HTTP Request                                |
| **Method**    | POST                                        |
| **Purpose**   | Generate Instagram/Threads post with Student persona |

**URL:**

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key={{ $env.GOOGLE_AI_API_KEY }}
```

**Headers:**

```
Content-Type: application/json
```

**Body (copy-paste entire JSON):**

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "You are a helpful, slightly cynical senior college student who's been through it all - the 3am study sessions, the laptop meltdowns, the PDF nightmares. You write for Instagram and Threads.\n\nINPUT: {{ $json.title }} - {{ $json.description }}\nCONTENT TYPE: {{ $json.content_type }}\n\nTASK: Transform this into a short, engaging Instagram caption.\n\nCONTENT TYPE RULES:\n- If content_type is \"pure_value\": Do NOT mention PDFLab at all. Just share the tip/insight.\n- If content_type is \"soft_integration\": Mention PDFLab casually as something you use, not a pitch.\n- If content_type is \"direct_promotion\": Feature PDFLab as the main topic with specific benefits.\n\nGENERAL RULES:\n1. Keep it under 150 words\n2. Start with a hook that stops the scroll\n3. Use 3-5 hashtags (Instagram needs them)\n4. Use casual language (\"tbh\", \"lowkey\", \"literally\" are okay)\n5. End with engagement bait if appropriate (\"tag a friend\", \"anyone else?\")\n\nTONE:\n- Relatable and authentic\n- Tired of corporate BS\n- Helpful but not preachy\n- Empathize with student struggles\n- Like texting a friend, not writing an essay\n\nOUTPUT ONLY THE POST TEXT. No explanations or meta-commentary."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.8,
    "maxOutputTokens": 400
  }
}
```

---

### Step 11: Extract AI Response

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| **Node Type** | Set                                      |
| **Purpose**   | Parse Gemini response into usable fields |

**Fields to Set:**

```
ai_generated_post = {{ $json.candidates[0].content.parts[0].text }}
source_title = {{ $('Merge').item.json.title }}
source_url = {{ $('Merge').item.json.link }}
target_platform = [Set based on which pipeline: "linkedin" or "instagram"]
```

---

### Step 12: Image Generation (Imagen)

| Property      | Value                         |
| ------------- | ----------------------------- |
| **Node Type** | HTTP Request                  |
| **Method**    | POST                          |
| **Purpose**   | Generate social media graphic |

**URL:**

```
https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict
```

**Headers:**

```
Content-Type: application/json
x-goog-api-key: {{ $env.GOOGLE_AI_API_KEY }}
```

**Body:**

```json
{
  "instances": [
    {
      "prompt": "Create a clean, professional social media graphic. Theme: {{ $json.content_type }}. Style: Modern, minimalist, tech-forward. Brand colors: Purple and blue gradient background. Include subtle PDF or document imagery. Do NOT include: faces, text overlays, cluttered elements, watermarks."
    }
  ],
  "parameters": {
    "sampleCount": 1,
    "aspectRatio": "={{ $json.target_platform === 'linkedin' ? '16:9' : '1:1' }}"
  }
}
```

_Note: Instagram prefers 1:1 or 4:5. LinkedIn prefers 16:9. Supported ratios vary by model; verify here: https://ai.google.dev/gemini-api/docs/imagen._

---

### Step 13: Process Image Binary

| Property | Value |
|----------|-------|
| **Node Type** | Function |
| **Purpose** | Convert base64 to uploadable binary |

**Code (copy-paste):**
```javascript
const json = $input.first().json;

const base64Data =
  json?.predictions?.[0]?.bytesBase64Encoded ||
  json?.predictions?.[0]?.imageBytes ||
  json?.generatedImages?.[0]?.image?.imageBytes;

if (!base64Data) {
  throw new Error(
    "No image bytes found. Inspect the prior node output and update the extraction path (expected predictions[0].imageBytes or generatedImages[0].image.imageBytes)."
  );
}
const timestamp = Date.now();
const platform = $input.first().json.target_platform || 'social';
const fileName = `pdflab_${platform}_${timestamp}.png`;

const buffer = Buffer.from(base64Data, 'base64');

return [{
  json: {
    ...$input.first().json,
    fileName: fileName,
    publicUrl: `https://pdflab.pro/assets/social-images/${fileName}`
  },
  binary: {
    image: {
      data: buffer.toString('base64'),
      mimeType: 'image/png',
      fileName: fileName
    }
  }
}];
```

---

### Step 14: Upload to Hostinger (FTP)

| Property      | Value                             |
| ------------- | --------------------------------- |
| **Node Type** | FTP                               |
| **Operation** | Upload                            |
| **Purpose**   | Store image for public URL access |

**Credential Setup:**

1. Log into Hostinger hPanel
2. Go to: Files > FTP Accounts
3. Create/copy FTP credentials to n8n

**Configuration:**

```json
{
  "operation": "upload",
  "path": "/public_html/assets/social-images/",
  "binaryPropertyName": "image"
}
```

**Pre-requisite:** Create directory on server:

```bash
mkdir -p /public_html/assets/social-images
```

---

### Step 15: Slack Review Message

| Property      | Value                            |
| ------------- | -------------------------------- |
| **Node Type** | Slack                            |
| **Operation** | Post Message (Block Kit)         |
| **Channel**   | #pdflab-content-review           |
| **Purpose**   | Human approval before publishing |

**Credential Setup:**

1. Go to: https://api.slack.com/apps
2. Create app with scopes: `chat:write`, `chat:write.public`, `files:write`
3. Enable Interactivity (Request URL = your n8n webhook)
4. Install to workspace, copy Bot Token (xoxb-...)

**Block Kit Payload (copy-paste):**

````json
{
  "channel": "#pdflab-content-review",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*New PDFLab Post Ready for Review*\n\n*Platform:* {{ $json.target_platform }}\n*Content Type:* {{ $json.content_type }}\n*Source:* {{ $json.source_title }}\n\n*Draft Post:*\n```{{ $json.ai_generated_post }}```"
      }
    },
    {
      "type": "image",
      "image_url": "{{ $json.publicUrl }}",
      "alt_text": "Generated social image for PDFLab"
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Approve", "emoji": true },
          "style": "primary",
          "value": "approve",
          "action_id": "approve_post"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Edit", "emoji": true },
          "value": "edit",
          "action_id": "edit_post"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Regenerate", "emoji": true },
          "value": "regenerate",
          "action_id": "regenerate_post"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Skip", "emoji": true },
          "value": "skip",
          "action_id": "skip_post"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Reject", "emoji": true },
          "style": "danger",
          "value": "reject",
          "action_id": "reject_post"
        }
      ]
    }
  ]
}
````

---

### Step 16: Slack Webhook Receiver

| Property      | Value                          |
| ------------- | ------------------------------ |
| **Node Type** | Webhook                        |
| **Method**    | POST                           |
| **Path**      | /webhook/slack-actions         |
| **Purpose**   | Capture button click responses |

**Configuration:**

```
HTTP Method: POST
Path: /webhook/slack-actions
Response Mode: Immediately respond
```

**Important:** Copy this webhook URL to Slack App > Interactivity & Shortcuts > Request URL

**Response Handling:**

```
Action Value: {{ $json.actions[0].value }}
User: {{ $json.user.name }}
```

---

### Step 17: Action Router

| Property        | Value                            |
| --------------- | -------------------------------- |
| **Node Type**   | Switch                           |
| **Routing Key** | `{{ $json.actions[0].value }}`   |
| **Purpose**     | Route based on reviewer decision |

**Rules:**

```
approve     → Output 0 (Publish flow)
edit        → Output 1 (Slack Modal - Open Edit Window)
regenerate  → Output 2 (Loop back to Step 10)
skip        → Output 3 (End - log as skipped)
reject      → Output 4 (End - log as rejected)
```

---

### Step 18a: Publish to LinkedIn

| Property         | Value          |
| ---------------- | -------------- |
| **Node Type**    | LinkedIn       |
| **Operation**    | Create Post    |
| **Triggered by** | approve action |

**Credential Setup:**

1. Go to: https://www.linkedin.com/developers/apps
2. Create app, request "Share on LinkedIn" product
3. Get Client ID + Secret, add to n8n

**Configuration:**

```json
{
  "resource": "post",
  "operation": "create",
  "postType": "image",
  "text": "={{ $json.ai_generated_post }}",
  "mediaUrl": "={{ $json.publicUrl }}",
  "visibility": "PUBLIC"
}
```

---

### Step 18b: Publish to Instagram for Business

| Property         | Value                  |
| ---------------- | ---------------------- |
| **Node Type**    | Instagram for Business |
| **Operation**    | Create Photo Post      |
| **Triggered by** | approve action         |

**Credential Setup:**

1. Connect Instagram Business Account to a Facebook Page.
2. Use Meta Graph API credentials.
3. Requires `instagram_basic`, `instagram_content_publish`, and `pages_read_engagement` (verify: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/).

**Configuration:**

```json
{
  "resource": "media",
  "operation": "create",
  "instagramAccountId": "[YOUR_IG_ID]",
  "imageUrl": "={{ $json.publicUrl }}",
  "caption": "={{ $json.ai_generated_post }}"
}
```

---

### Step 19: Success Notification

| Property      | Value                  |
| ------------- | ---------------------- |
| **Node Type** | Slack                  |
| **Channel**   | #pdflab-content-review |
| **Purpose**   | Confirm post published |

**Message:**

```
Published to {{ $json.target_platform }}!
Post URL: {{ $json.postUrl }}
```

---

## Environment Variables

Set these in n8n Settings > Environment Variables:

| Variable            | Description             | Where to Get                       |
| ------------------- | ----------------------- | ---------------------------------- |
| `GOOGLE_AI_API_KEY` | Gemini + Imagen API key | https://aistudio.google.com/apikey |

---

## Credentials Checklist

| Credential         | Type              | Required Scopes/Permissions                      |
| ------------------ | ----------------- | ------------------------------------------------ |
| Reddit OAuth2      | OAuth2            | `read` (script app type)                         |
| Redis              | Connection String | Read/Write                                       |
| FTP (Hostinger)    | FTP               | Upload to /public_html/                          |
| Slack              | Bot Token         | `chat:write`, `chat:write.public`, `files:write` |
| LinkedIn OAuth2    | OAuth2            | Share on LinkedIn product                        |
| Meta Graph API (Instagram publishing) | Access Token | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` (verify: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/) |

---

## Testing Checklist

| Step | Test                     | Expected Result                                           |
| ---- | ------------------------ | --------------------------------------------------------- |
| 1-4  | Trigger manually         | Items appear in output                                    |
| 5    | Check merge              | All items combined                                        |
| 6    | Run twice with same URL  | Second run returns empty                                  |
| 7    | Test with "pdf" in title | Item passes filter                                        |
| 8    | Run 100 times            | ~60 pure_value, ~25 soft, ~15 direct                      |
| 10   | Check AI response        | Valid post text returned                                  |
| 12   | Check image response     | Base64 image data present (16:9 for LinkedIn, 1:1 for IG) |
| 14   | Check Hostinger          | File exists at public URL                                 |
| 15   | Check Slack              | Message with buttons appears                              |
| 16   | Click Approve            | Webhook receives action                                   |
| 18   | Check social platform    | Post visible on profile (LI or IG)                        |

---

## Rate Limits & Quotas

| Service          | Free Tier Limit  | Your Usage | Buffer |
| ---------------- | ---------------- | ---------- | ------ |
| Gemini (verify model) | Varies by model/account | TBD | TBD |
| Imagen (verify model) | Varies by model/account | TBD | TBD |
| Reddit API       | 60 req/min       | ~20/day    | 99.9%  |
| Slack            | Unlimited        | ~4/day     | N/A    |

**Verify current quotas/pricing before you build:**

- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Imagen models: https://ai.google.dev/gemini-api/docs/imagen
- Pricing: https://ai.google.dev/pricing

---

## Troubleshooting Quick Reference

| Error                     | Cause                     | Fix                                |
| ------------------------- | ------------------------- | ---------------------------------- |
| 429 from Gemini           | Rate limit hit            | Add 30s delay between calls        |
| Empty Imagen response     | Content policy violation  | Remove faces/text from prompt      |
| Slack buttons not working | Interactivity not enabled | Enable in Slack app settings       |
| LinkedIn 401              | Token expired             | Re-authenticate OAuth              |
| FTP upload fails          | Wrong path                | Verify /public_html/assets/ exists |
| Duplicate posts           | Dedup not working         | Check Redis connection             |

---

## Version History

| Version | Date       | Changes                      |
| ------- | ---------- | ---------------------------- |
| 1.0     | 2025-12-15 | Initial implementation guide |

---

_Document End_
