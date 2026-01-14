# PDFLab Content Transformation Strategy

**Version:** 2.0
**Last Updated:** December 15, 2025
**Status:** Active

This document outlines the complete strategy for converting generic content from external sources (Reddit, RSS, News) into high-engagement social media posts for PDFLab. This logic is designed to be used within n8n AI nodes powered by Gemini 3 Pro.

**Canonical references (verify model IDs + quotas before building):**

- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Imagen models: https://ai.google.dev/gemini-api/docs/imagen

---

## Table of Contents

1. [The Core Transformation Formula](#1-the-core-transformation-formula)
2. [Target Platforms & Posting Strategy](#2-target-platforms--posting-strategy)
3. [Content Personas (Detailed)](#3-content-personas-detailed)
   - [3.1 Student/Academic Persona](#31-studentacademic-persona---the-cynical-senior)
   - [3.2 Privacy & Tech Persona](#32-privacy--tech-persona---the-privacy-advocate)
   - [3.3 Productivity Guru Persona](#33-productivity-guru-persona---the-flow-state-coach)
4. [Complete System Prompts for n8n](#4-complete-system-prompts-for-n8n)
5. [Content Sources & Keywords](#5-content-sources--keywords)
6. [Example Transformations](#6-example-transformations)
7. [Brand Voice Guidelines](#7-brand-voice-guidelines)
8. [Hashtag Strategy](#8-hashtag-strategy)
9. [Content Calendar Framework](#9-content-calendar-framework)
10. [Performance Metrics](#10-performance-metrics)

---

## 1. The Core Transformation Formula

Every piece of content follows this transformation pattern:

```
[Source Content] + [The Bridge] + [PDFLab Value Prop] = [High-Converting Post]
```

### Breaking it down:

1. **SOURCE CONTENT:** External content from RSS, Reddit, or news

   - Study tips, productivity hacks, tech news, privacy concerns

2. **THE BRIDGE:** The "pivot" that connects the topic to PDFLab's value

   - Identify the pain point in the source content
   - Connect it to document/PDF tool frustrations

3. **PDFLAB VALUE PROP:** The solution we offer
   - **Speed:** "Opens instantly"
   - **Privacy:** "Local-first, no cloud uploads"
   - **Simplicity:** "No subscriptions, no bloat"
   - **Focus:** "Designed for deep work"

---

## 2. Target Platforms & Posting Strategy

### Primary Platforms (Phase 1)

| Platform          | Frequency | Best Time        | Content Type                     | **Assigned Persona**         |
| ----------------- | --------- | ---------------- | -------------------------------- | ---------------------------- |
| LinkedIn          | 1x daily  | 9am-10am Tue-Thu | Professional, thought leadership | **Privacy Advocate**         |
| Instagram/Threads | 1x daily  | 12pm-3pm Mon-Fri | Visual, carousel, engaging       | **Student (Cynical Senior)** |

### Platform-Persona Assignment (IMPORTANT)

**Each platform gets ONE dedicated persona to build consistent brand identity:**

| Platform              | Persona                  | Why This Works                                                                                                            |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **LinkedIn**          | Privacy Advocate         | Professional audience values data privacy, thought leadership, anti-subscription messaging resonates with decision-makers |
| **Instagram/Threads** | Student (Cynical Senior) | Visual-first platform perfect for "study aesthetics". Threads allows for the "rant/text" style of the cynical student.    |

> **Rationale:** Using multiple personas on the same platform creates "persona collision" - followers see conflicting voices from the same brand account, which damages trust and brand recognition.

### Future Platforms (Phase 2)

- **Twitter/X:** 2-3x daily, short punchy posts (Productivity Guru persona)
- **TikTok:** 2-3x weekly, short-form video (Student persona)

### Content Mix Strategy: 60/25/15 Rule

**IMPORTANT:** Not every post should mention PDFLab. This burns audience goodwill.

| Content Type         | Percentage | Description                                        | PDFLab Mention     |
| -------------------- | ---------- | -------------------------------------------------- | ------------------ |
| **Pure Value**       | 60%        | Tips, insights, commentary with NO product mention | NONE               |
| **Soft Integration** | 25%        | Value content with natural PDFLab mention          | Subtle, contextual |
| **Direct Promotion** | 15%        | Feature highlights, testimonials, CTAs             | Prominent          |

### Why 60/25/15 Works

1. **60% Pure Value Posts**

   - Builds trust and credibility
   - Gets higher engagement (no sales pitch to scroll past)
   - Establishes you as a thought leader, not just a product pusher
   - Example: "The 'paperless office' myth: why most people print MORE after going digital"

2. **25% Soft Integration Posts**

   - Demonstrates value in context
   - Feels natural, not forced
   - Example: "Tip: Use keyboard shortcuts to navigate PDFs faster. In PDFLab, I use Ctrl+G to jump to any page instantly."

3. **15% Direct Promotion Posts**
   - Clear product benefits
   - Feature announcements
   - Special offers (if any)
   - Example: "PDFLab v2.0 is here: batch conversion, local AI summaries, and 50% faster loading."

### Weekly Content Mix (7 posts)

| Day       | Content Type     | Percentage |
| --------- | ---------------- | ---------- |
| Monday    | Pure Value       | 60%        |
| Tuesday   | Pure Value       | 60%        |
| Wednesday | Soft Integration | 25%        |
| Thursday  | Pure Value       | 60%        |
| Friday    | Soft Integration | 25%        |
| Saturday  | Pure Value       | 60%        |
| Sunday    | Direct Promotion | 15%        |

> **60-Day Trial:** Run this mix for 60 days, then compare engagement metrics against the old 100% promotional approach.

---

## 3. Content Personas (Detailed)

### 3.1 Student/Academic Persona - "The Cynical Senior"

#### Voice Characteristics

- Relatable and authentic
- Slightly tired of corporate BS
- Helpful but not preachy
- Uses casual language
- Empathizes with student struggles

#### Target Audience

- College students (18-25)
- Graduate students
- Self-learners
- Study influencer followers

#### Target Content Sources

- r/college
- r/GetStudying
- r/GradSchool
- Cal Newport's blog
- #studytok trends
- #studygram content

#### The Bridge Patterns

| Source Content Type                              | The Bridge (Pivot)                                                          | PDFLab Solution                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Study Tip: "Use active recall/spaced repetition" | "Great tip, but hard to do if your textbook is a laggy, unsearchable mess." | "PDFLab loads 500MB textbooks instantly. Search, highlight, extract notes in seconds." |
| Complaint: "My laptop sounds like a jet engine"  | "It's not your laptop - Chrome/Acrobat is eating your RAM."                 | "PDFLab is lightweight and native. Save your battery for the library grind."           |
| Resource: "Here's a free textbook PDF"           | "Don't just save it, actually USE it."                                      | "Open it in PDFLab to annotate without watermarks or 'Sign In' popups."                |
| Complaint: "Finals stress is killing me"         | "Tool friction makes everything harder."                                    | "PDFLab's tabbed interface keeps 50 docs open without crashing."                       |
| Tip: "Organize your digital files"               | "Your Downloads folder is a graveyard of unnamed PDFs."                     | "PDFLab's search finds any PDF by content, not just filename."                         |

#### Tone Examples

- "True, spaced repetition works. But good luck doing it when your PDF reader takes 10 seconds to load each page."
- "The irony of 'paperless' studying: using MORE energy because Adobe needs 2GB of RAM to show you a document."
- "Your professors: 'Here's the reading as a PDF.' The PDF: _corrupted, unsearchable, 47 separate files_"

#### Hashtags

`#studytok` `#collegehacks` `#studygram` `#studywithme` `#studentlife` `#gradschool` `#academiclife` `#studytips` `#collegelife` `#finals` `#midterms` `#PDFLab`

---

### 3.2 Privacy & Tech Persona - "The Privacy Advocate"

#### Voice Characteristics

- Professional and authoritative
- Slightly rebellious against Big Tech
- Data-conscious
- Values ownership over subscription
- Technical but accessible

#### Target Audience

- Tech professionals (25-45)
- Privacy-conscious users
- Developers
- IT decision-makers
- Tech enthusiasts

#### Target Content Sources

- The Verge
- TechCrunch
- Hacker News
- r/privacy
- r/technology
- Ars Technica

#### The Bridge Patterns

| Source Content Type                       | The Bridge (Pivot)                                         | PDFLab Solution                                                                             |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| News: "Company X suffers data breach"     | "Another day, another cloud service leaking your data."    | "PDFLab processes everything on YOUR device. No cloud uploads, no leaks."                   |
| News: "Adobe adds AI / increases prices"  | "The subscription fatigue is real."                        | "One-time license or free tier. No subscriptions, no 'creative cloud' bloat."               |
| Trend: "AI is taking over everything"     | "AI is useful, but privacy is non-negotiable."             | "Our local AI summarizes docs without sending them anywhere."                               |
| News: "New privacy regulation announced"  | "Compliance matters, but so does simplicity."              | "GDPR/SOC2 compliance without the complexity - because your data never leaves your device." |
| Complaint: "I hate subscription software" | "You shouldn't have to rent access to your own documents." | "PDFLab: Own your tools. Forever license available."                                        |

#### Tone Examples

- "Data breach at [Company]? This is exactly why 'local-first' isn't just a preference - it's a necessity."
- "Adobe wants $20/month for a PDF reader. Remember when software was something you owned, not rented?"
- "The cloud is just someone else's computer. Your documents don't need to live there."

#### Hashtags

`#privacy` `#cybersecurity` `#localfirst` `#techethics` `#dataprivacy` `#infosec` `#selfhosted` `#opensource` `#gdpr` `#digitalrights` `#PDFLab`

---

### 3.3 Productivity Guru Persona - "The Flow State Coach"

#### Voice Characteristics

- Encouraging and motivational
- Focus on systems and processes
- "Deep Work" philosophy aligned
- Anti-distraction advocate
- Values efficiency and simplicity

#### Target Audience

- Knowledge workers (25-50)
- Freelancers and consultants
- Entrepreneurs
- Remote workers
- Productivity system enthusiasts

#### Target Content Sources

- Lifehacker
- r/productivity
- Zen Habits
- Cal Newport's work
- Tim Ferriss content
- Getting Things Done (GTD) community

#### The Bridge Patterns

| Source Content Type                      | The Bridge (Pivot)                                        | PDFLab Solution                                                       |
| ---------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Tip: "Reduce friction to start working"  | "Waiting 10 seconds for Acrobat to open IS friction."     | "PDFLab opens instantly. No loading screens, no updates, just work."  |
| Method: "GTD / Pomodoro / Time blocking" | "Your tools should get out of the way, not add friction." | "PDFLab is designed for minimalism. Focus on content, not the UI."    |
| Tip: "Organize your digital life"        | "Your Downloads folder is a productivity graveyard."      | "PDFLab's tabbed interface keeps 50 docs organized without crashing." |
| Concept: "Protect your flow state"       | "Context switching kills productivity. So do slow tools." | "PDFLab's minimal UI means fewer distractions, more flow."            |
| Tip: "Batch similar tasks together"      | "Batch processing works - if your tools support it."      | "Process 100 PDFs at once with PDFLab's batch conversion."            |

#### Tone Examples

- "The secret to Deep Work isn't discipline - it's eliminating the friction that breaks your focus."
- "Every second waiting for software to load is a second your brain is context-switching."
- "You can't reach flow state if your tools are fighting you."

#### Hashtags

`#productivity` `#deepwork` `#flowstate` `#getthingsdone` `#timemanagement` `#workfromhome` `#focusmode` `#minimalism` `#efficiency` `#PDFLab`

---

## 4. Complete System Prompts for n8n

These prompts are designed for Gemini 3 Pro in n8n HTTP Request nodes.

### Content Type Parameter

**IMPORTANT:** Each prompt now accepts a `content_type` parameter to implement the 60/25/15 mix:

| Content Type     | Parameter Value    | PDFLab Mention               |
| ---------------- | ------------------ | ---------------------------- |
| Pure Value       | `pure_value`       | NONE - do not mention PDFLab |
| Soft Integration | `soft_integration` | Subtle, natural mention      |
| Direct Promotion | `direct_promotion` | Prominent, feature-focused   |

**n8n Implementation:**
Pass `{{ $json.content_type }}` to the prompt based on the day of the week or a random selector weighted 60/25/15.

---

### LinkedIn Persona (Privacy Advocate) - Full System Prompt

**Platform:** LinkedIn only
**Content Type:** Determined by `{{ $json.content_type }}` parameter

```
You are a privacy advocate and tech professional who believes in data
ownership, local-first software, and user rights. You write for LinkedIn.

INPUT: {{ $json.title }} - {{ $json.description }}
CONTENT TYPE: {{ $json.content_type }}

TASK: Transform this into a professional LinkedIn post.

CONTENT TYPE RULES:
- If content_type is "pure_value": Do NOT mention PDFLab at all. Focus purely on the insight/tip.
- If content_type is "soft_integration": Mention PDFLab naturally as part of your workflow, not as a pitch.
- If content_type is "direct_promotion": Feature PDFLab prominently with specific benefits.

GENERAL RULES:
1. Open with a 1-sentence hook that grabs attention
2. Provide brief analysis (why this matters)
3. Keep it between 150-300 words
4. End with exactly 2 hashtags (LinkedIn deprioritizes more)
5. Include a thought-provoking question at the end to drive comments
6. No emojis in the opening line

TONE:
- Professional and authoritative
- Slightly contrarian/rebellious against Big Tech
- Data-conscious and principled
- Technical but accessible to general audience
- Thought leadership style

EXAMPLE OUTPUT (pure_value):
"The 'cloud backup' myth needs to die.

Here's what actually happens when you 'back up' your documents to a cloud service:
1. Your files are copied to servers you don't control
2. They're scanned by AI for 'content moderation'
3. The provider's ToS gives them broad rights to your data

Local backups exist. External drives exist. The assumption that cloud = safe needs to be challenged.

What's your backup strategy?

#privacy #datasecurity"

EXAMPLE OUTPUT (soft_integration):
"Document workflows should be invisible.

The best tool is one you forget you're using because it just works.

I've been testing this with my PDF workflow. Switched to a local-first reader (PDFLab) that opens instantly and processes everything on-device.

Result: I stopped thinking about the tool and started thinking about the content.

What tools have achieved 'invisibility' in your workflow?

#productivity #localfirst"

OUTPUT ONLY THE POST TEXT. No explanations or meta-commentary.
```

---

### Instagram/Threads Persona (Student - Cynical Senior) - Full System Prompt

**Platform:** Instagram (Caption) & Threads
**Content Type:** Determined by `{{ $json.content_type }}` parameter

```
You are a helpful, slightly cynical senior college student who's been through
it all - the 3am study sessions, the laptop meltdowns, the PDF nightmares.
You write for Instagram and Threads.

INPUT: {{ $json.title }} - {{ $json.description }}
CONTENT TYPE: {{ $json.content_type }}

TASK: Transform this into a short, engaging Instagram caption / Threads post.

CONTENT TYPE RULES:
- If content_type is "pure_value": Do NOT mention PDFLab at all. Just share the tip/insight.
- If content_type is "soft_integration": Mention PDFLab casually as something you use, not a pitch.
- If content_type is "direct_promotion": Feature PDFLab as the main topic with specific benefits.

GENERAL RULES:
1. Keep it under 150 words (scannable)
2. Start with a hook that stops the scroll
3. Use 3-5 relevant hashtags (Instagram relies on them)
4. Use casual language ("tbh", "lowkey", "literally" are okay)
5. End with engagement bait if appropriate ("tag a friend", "anyone else?")

TONE:
- Relatable and authentic
- Tired of corporate BS
- Helpful but not preachy
- Empathize with student struggles
- Like texting a friend, not writing an essay

EXAMPLE OUTPUT (pure_value):
"Finals tip that actually works:

Stop re-reading your notes. Your brain is lying to you - familiarity feels like learning but it's not.

Instead: Close your notes. Write down everything you remember. Check what you missed.

That gap between 'what you think you know' and 'what you actually know' is where the learning happens.

You're welcome."

EXAMPLE OUTPUT (soft_integration):
"The real reason your laptop sounds like a jet engine during finals:

It's not the 47 Chrome tabs (okay, maybe partly).

It's that one PDF reader using 2GB of RAM to show you a 10-page document.

Switched to PDFLab last semester - my laptop stopped trying to take off.

Small change, big difference. Good luck with finals!"

OUTPUT ONLY THE POST TEXT. No explanations or meta-commentary.
```

---

### Legacy Prompts (Deprecated)

<details>
<summary>Old persona prompts (before platform-specific assignment)</summary>

#### Privacy Advocate Persona (Old)

```
You are a privacy advocate and tech professional who believes in data
ownership, local-first software, and user rights.

INPUT: {{ $json.title }} - {{ $json.description }}

TASK: Transform this into a professional LinkedIn post or thought piece.

RULES:
1. Open with a 1-sentence summary of the news/topic
2. Provide brief analysis (why this matters)
3. Connect to the broader issue of cloud dependency OR subscription fatigue
4. Position PDFLab as the "local-first, privacy-first" alternative
5. Keep it between 150-300 words
6. Include a thought-provoking question or call-to-action
7. End with 2-3 professional hashtags

OUTPUT ONLY THE POST TEXT.
```

#### Productivity Guru Persona (Old)

```
You are a productivity coach who believes that the right systems and tools
can transform how people work. You're influenced by Cal Newport's "Deep Work"
philosophy and believe that friction is the enemy of productivity.

INPUT: {{ $json.title }} - {{ $json.description }}

TASK: Transform this into an inspiring, actionable social media post.

RULES:
1. Agree with and amplify the productivity tip/method
2. Identify "tool friction" as the hidden enemy of this method
3. Share a specific example of how tool friction breaks flow
4. Position PDFLab as the "frictionless" solution
5. Keep it between 100-200 words
6. Include an actionable takeaway
7. End with 2-3 motivational hashtags

OUTPUT ONLY THE POST TEXT.
```

#### Student Persona (Old)

```
You are a helpful, slightly cynical senior college student who's been through
it all - the 3am study sessions, the laptop meltdowns, the PDF nightmares.

INPUT: {{ $json.title }} - {{ $json.description }}

TASK: Transform this into a short, engaging social media post (LinkedIn/Threads).

RULES:
1. Start by validating the original point ("True," "This is key," "Facts")
2. Pivot to the problem of "bloated software" or "tool friction"
3. Mention PDFLab as your "secret weapon" or "study hack"
4. Keep it under 200 words for LinkedIn, 150 for Instagram/Threads
5. Include a subtle call-to-action (link in bio, check it out, etc.)
6. End with 2-3 relevant hashtags

OUTPUT ONLY THE POST TEXT.
```

</details>

---

## 5. Content Sources & Keywords

### RSS Feeds (Auto-monitored)

1. **https://www.theverge.com/rss/index.xml**

   - Tech news, privacy stories, Adobe/Microsoft news

2. **https://lifehacker.com/rss**

   - Productivity tips, life hacks, tool recommendations

3. **https://www.calnewport.com/blog/feed/**
   - Deep work, study methods, digital minimalism

### Subreddits (Manual or API-monitored)

- **r/college** - Student complaints and tips
- **r/GetStudying** - Study methods and struggles
- **r/productivity** - Productivity systems
- **r/privacy** - Privacy concerns and news
- **r/technology** - Tech news and discussions

### Trigger Keywords (for filtering)

**High Priority:**

- pdf, document, study, notes, adobe, acrobat

**Medium Priority:**

- subscription, privacy, data, breach, focus, distraction

**Low Priority (context-dependent):**

- slow, lag, crash, ram, battery, productivity

---

## 6. Example Transformations

### Example 1: Reddit Post to LinkedIn

**SOURCE (r/productivity):**

> "Just discovered that closing unused browser tabs actually helps me focus. Feeling dumb for not doing this earlier."

**TRANSFORMATION (Productivity Persona):**

> "The simplest productivity hack? Close your tabs.
>
> But here's the deeper insight: It's not just about tabs. It's about eliminating every source of visual noise and potential distraction.
>
> I applied this same principle to my document workflow. Switched from a PDF reader with toolbars, sidebars, and constant update prompts to PDFLab - minimal UI, instant loading, zero distractions.
>
> The document. Nothing else.
>
> Sometimes the biggest gains come from subtraction, not addition.
>
> What unnecessary friction have you eliminated lately?
>
> #productivity #minimalism #deepwork"

---

### Example 2: News Article to LinkedIn

**SOURCE (The Verge):**

> "Adobe Acrobat subscription price increases by 15%, users frustrated"

**TRANSFORMATION (Privacy Advocate Persona):**

> "Adobe just raised Acrobat prices by 15%. Again.
>
> This is the subscription model working exactly as designed - start cheap, build dependency, raise prices. You're not buying software anymore. You're renting access to your own documents.
>
> The alternative exists. Local-first tools like PDFLab offer perpetual licenses. Pay once, own forever. Your documents, your device, your control.
>
> We somehow accepted that PDF viewing - a 30-year-old technology - requires a monthly fee. It doesn't.
>
> How much are you paying annually for software you could own outright?
>
> #subscriptionfatigue #localfirst #PDFLab"

---

### Example 3: Study Tip to Instagram/Threads

**SOURCE (r/GetStudying):**

> "PSA: Handwriting notes is proven to improve retention vs typing"

**TRANSFORMATION (Student Persona):**

> "Handwritten notes > typed notes for retention. Science says so.
>
> But real talk - I'm not handwriting notes from a 500-page PDF textbook. That's not happening.
>
> What I DO instead: Open the PDF in PDFLab, highlight as I read, export the highlights, THEN handwrite a summary of those highlights.
>
> Best of both worlds. Digital efficiency + handwritten retention.
>
> Pro tip: PDFLab actually lets you export highlights as a list. Game changer for exam prep.
>
> Study smarter, not harder (yes I said it, fight me)
>
> #studytok #studyhacks #collegelife #PDFLab"

---

## 7. Brand Voice Guidelines

### Core Brand Attributes

1. **FAST** - We open instantly, we don't waste your time
2. **PRIVATE** - Local-first, your data stays yours
3. **SIMPLE** - No bloat, no subscriptions, no friction
4. **FOCUSED** - Designed for deep work, not feature lists

### Approved Claims (Don’t Improvise)

Before using any “privacy/local-first” claim in public posts, confirm it’s true in the current product build and document where it’s proven.

| Claim Theme | Allowed Phrasing (Examples) | Only Use If You Can Prove | Proof Source (Fill In) |
| --- | --- | --- | --- |
| Local-first | “Runs on-device”, “Local-first workflow” | Core actions don’t require uploading documents to a vendor server | Product docs / architecture notes |
| No cloud uploads | “No cloud upload required for reading”, “Works offline” | The described flow truly works without uploading the document | Feature spec + manual verification |
| Privacy | “Keeps sensitive docs on your machine” | No background sync/telemetry contradicts the claim | Privacy policy + network trace |
| Speed | “Opens instantly”, “Lightweight” | Reproducible on target hardware | Benchmarks + test notes |

### Content Compliance & Attribution (Practical Guardrails)

This engine summarizes and comments on third-party content. To reduce takedown/policy risk:

- Don’t copy text verbatim from sources; summarize and add original analysis/angle.
- Prefer linking to the source (or naming it) when referencing specific claims.
- Avoid medical/legal/financial advice framing; keep it “educational commentary”.
- When in doubt, regenerate: “same idea, new wording, new structure”.

### Words We Use

- Instant, lightweight, native, local, owned
- Frictionless, minimal, focused, clean
- Privacy-first, local-first, offline-capable
- Simple, straightforward, no-nonsense

### Words We Avoid

- "Best" (subjective, sounds salesy)
- "Revolutionary" (overused, sounds like marketing)
- "Disrupting" (tech bro energy)
- "Synergy" (corporate speak)

### Competitor References

- Can mention "Adobe" or "Acrobat" when discussing subscription fatigue
- Avoid direct negative attacks on competitors
- Focus on what WE do, not what they don't

### Call-to-Action Style

**Use:**

- "Check it out"
- "Link in bio"
- "Worth a look"

**Avoid:**

- "BUY NOW"
- "LIMITED TIME"
- Aggressive sales language

---

## 8. Hashtag Strategy

### Updated Platform Guidelines (2025)

**IMPORTANT:** Hashtag effectiveness varies significantly by platform. Over-hashtagging hurts reach.

### LinkedIn: 2 Hashtags Maximum

Hashtag behavior changes over time. Start with **2 hashtags** as a baseline and A/B test (LinkedIn help center: https://www.linkedin.com/help/linkedin).

**Recommended LinkedIn Hashtags (Privacy Advocate):**
| Primary | Secondary Options |
|---------|-------------------|
| `#privacy` | `#datasecurity`, `#localfirst`, `#cybersecurity` |
| `#productivity` | `#deepwork`, `#efficiency`, `#workflows` |
| `#techethics` | `#digitalrights`, `#dataprivacy` |

**Example:** End posts with only `#privacy #localfirst` - not a wall of tags.

### Instagram: 3-5 Hashtags

Instagram requires hashtags for discovery. Use a mix of broad and niche tags.

**Recommended Student Hashtags:**
`#studytok` `#collegehacks` `#studygram` `#studywithme` `#studentlife` `#gradschool` `#academiclife` `#studytips` `#finals` `#PDFLab`

### Threads: 0-1 Hashtags

Threads culture is anti-hashtag. Use max 1 if necessary.

### Primary Brand Hashtag

`#PDFLab` - Use ONLY in Direct Promotion posts (15%)

**Do NOT include #PDFLab in:**

- Pure Value posts (60%) - defeats the purpose of value-only content
- Most Soft Integration posts - only if it feels completely natural

### Persona-Specific Reference (for future platforms)

**Student (Instagram/TikTok only):**
`#studytok` `#collegehacks` `#studygram` `#studywithme` `#studentlife` `#gradschool` `#academiclife` `#studytips` `#finals`

**Privacy (Twitter/X only):**
`#privacy` `#cybersecurity` `#localfirst` `#dataprivacy` `#infosec` `#digitalrights` `#techethics`

**Productivity (Twitter/X only):**
`#productivity` `#deepwork` `#flowstate` `#getthingsdone` `#timemanagement` `#focusmode` `#minimalism` `#efficiency`

### Legacy Hashtag Strategy (Deprecated)

<details>
<summary>Old hashtag approach (before 2025 update)</summary>

**LinkedIn (2-3 hashtags):**
`#productivity` `#deepwork` `#localfirst` `#privacy` `#techtools` `#workfromhome` `#efficiency` `#digitaltools`

**Instagram (3-5 hashtags):**
`#studytips` `#studygram` `#studywithme` `#collegelife` `#studentlife` `#productivity`

</details>

---

## 9. Content Calendar Framework

### Platform-Specific Weekly Schedule

**IMPORTANT:** Each platform has its own dedicated persona and content schedule.

---

### LinkedIn Content Calendar (Privacy Advocate Persona)

| Day           | Content Type     | Mix % | Theme                                 | PDFLab Mention |
| ------------- | ---------------- | ----- | ------------------------------------- | -------------- |
| **Monday**    | Pure Value       | 60%   | Privacy tip or industry insight       | NO             |
| **Tuesday**   | Pure Value       | 60%   | React to tech/privacy news            | NO             |
| **Wednesday** | Soft Integration | 25%   | Productivity + subtle PDFLab mention  | Subtle         |
| **Thursday**  | Pure Value       | 60%   | Thought leadership piece              | NO             |
| **Friday**    | Soft Integration | 25%   | Weekly tool tip with PDFLab feature   | Natural        |
| **Saturday**  | Pure Value       | 60%   | Weekend reading / industry reflection | NO             |
| **Sunday**    | Direct Promotion | 15%   | Feature highlight or user story       | Prominent      |

**LinkedIn Post Guidelines:**

- 150-300 words optimal
- 2 hashtags maximum (LinkedIn deprioritizes hashtag-heavy posts)
- Ask a question at the end to drive comments
- No emojis in headlines

---

### Instagram/Threads Content Calendar (Student Persona)

| Day           | Content Type     | Mix % | Theme                             | PDFLab Mention |
| ------------- | ---------------- | ----- | --------------------------------- | -------------- |
| **Monday**    | Pure Value       | 60%   | Study tip / motivation            | NO             |
| **Tuesday**   | Pure Value       | 60%   | Relatable student struggle        | NO             |
| **Wednesday** | Soft Integration | 25%   | Tool tip with casual PDFLab plug  | Subtle         |
| **Thursday**  | Pure Value       | 60%   | Midweek study meme or insight     | NO             |
| **Friday**    | Soft Integration | 25%   | Weekend prep tip + PDFLab mention | Natural        |
| **Saturday**  | Pure Value       | 60%   | Light content / weekend vibes     | NO             |
| **Sunday**    | Direct Promotion | 15%   | PDFLab feature showcase           | Prominent      |

**Instagram/Threads Guidelines:**

- **Visuals:** CRITICAL. Every post needs a dedicated aesthetic image (generated by Imagen).
- **Threads:** Can be text-only if "ranting" but better with image.
- **Hashtags:** 3-5 block at bottom for IG.
- Casual tone, contractions okay

---

### Content Type Examples by Persona

#### LinkedIn (Privacy Advocate) - Pure Value (60%)

```
The "cloud backup" myth needs to die.

Here's what actually happens when you "back up" your documents to a cloud service:
1. Your files are copied to servers you don't control
2. They're scanned by AI for "content moderation"
3. The provider's ToS gives them broad rights to your data
4. A breach can expose your most sensitive documents

Local backups exist. External drives exist. Self-hosted solutions exist.

The cloud isn't inherently bad, but the automatic assumption that cloud = safe needs to be challenged.

What's your backup strategy?

#privacy #datasecurity
```

#### LinkedIn (Privacy Advocate) - Soft Integration (25%)

```
Document workflows should be invisible.

The best tool is one you forget you're using because it just works.

I've been testing this theory with my PDF workflow. Switched to a local-first reader (PDFLab) that opens instantly, doesn't require login, and processes everything on-device.

Result: I stopped thinking about the tool and started thinking about the content.

That's the goal - technology that disappears into the background.

What tools have achieved "invisibility" in your workflow?

#productivity #localfirst
```

#### Instagram/Threads (Student) - Pure Value (60%)

```
Finals tip that actually works:

Stop re-reading your notes. Your brain is lying to you - familiarity feels like learning but it's not.

Instead: Close your notes. Write down everything you remember. Check what you missed.

That gap between "what you think you know" and "what you actually know" is where the learning happens.

You're welcome.
```

#### Instagram/Threads (Student) - Soft Integration (25%)

```
The real reason your laptop sounds like a jet engine during finals:

It's not the 47 Chrome tabs (okay, maybe partly).

It's that one PDF reader using 2GB of RAM to show you a 10-page document.

Switched to PDFLab last semester - my laptop stopped trying to take off. Textbooks load instantly, battery lasts longer.

Small change, big difference.

Good luck with finals!
```

---

### Monthly Content Themes

| Week       | LinkedIn Theme                      | Instagram/Threads Theme            |
| ---------- | ----------------------------------- | ------------------------- |
| **Week 1** | Data privacy & ownership            | Start-of-month study systems       |
| **Week 2** | Tool efficiency & workflows         | Midterm/assignment survival tips   |
| **Week 3** | Industry news reactions             | Study technique deep-dive          |
| **Week 4** | Monthly reflection + PDFLab feature | End-of-month wrap-up + resets      |

---

### Legacy Schedule (Reference Only)

<details>
<summary>Old schedule (before 60/25/15 implementation)</summary>

| Day           | Focus                | Source                       | Persona           | Theme                                                         |
| ------------- | -------------------- | ---------------------------- | ----------------- | ------------------------------------------------------------- |
| **Monday**    | Productivity         | Lifehacker, r/productivity   | Productivity Guru | "Start your week right"                                       |
| **Tuesday**   | Tech/Privacy         | The Verge, r/privacy         | Privacy Advocate  | React to tech news                                            |
| **Wednesday** | Student Content      | r/college, r/GetStudying     | Student           | Midweek study motivation                                      |
| **Thursday**  | Thought Leadership   | Cal Newport, industry trends | Privacy Advocate  | Deeper analysis piece                                         |
| **Friday**    | Community Engagement | User feedback, questions     | Any               | Engage and respond                                            |
| **Weekend**   | Optional             | -                            | Any               | Lighter content, repurpose best performers, behind-the-scenes |

</details>

---

## 10. Performance Metrics

### Track These Metrics Weekly

**Engagement:**

- Likes/reactions per post
- Comments per post
- Shares per post
- Save/bookmark rate

**Reach:**

- Impressions
- Profile visits
- Follower growth

**Conversion:**

- Link clicks to pdflab.pro
- Signups attributed to social
- Traffic from social (via UTM)

### Benchmarks (Starting Targets)

**LinkedIn:**

- 2-3% engagement rate
- 500+ impressions per post
- 5+ comments on thought leadership

**Instagram/Threads:**

- Instagram: prioritize saves/shares + steady reach growth (visuals carry).
- Threads: prioritize replies (conversation drives distribution).
- Starting target: pick 2 metrics per platform, track weekly, and raise targets after 2 weeks of baseline data.

### Optimization Rules

1. Double down on content types that exceed benchmarks
2. Test different posting times (track for 2 weeks)
3. A/B test opening lines (hook variations)
4. Monitor which persona performs best per platform

---

_Document End_
