# Prepwise

A personal AI-powered mock interview app for daily interview practice. Built to run entirely on free-tier services so you can use it as much as you want without burning through credits.

## What it does

1. **Generate** a role-specific interview by filling out a form (role, experience level, type, tech stack, number of questions). Gemini generates a tailored question set.
2. **Take** the interview by voice — the AI interviewer speaks each question aloud, you answer aloud, and click "Done answering" when ready. Recognition keeps listening through pauses so you can think mid-sentence without being cut off.
3. **Get scored feedback** — Gemini analyzes the full transcript and returns scores (0–100) across Communication, Technical Knowledge, Problem-Solving, Cultural Fit, and Confidence, plus strengths and areas for improvement.

## Why this fork exists

The original [tutorial project](https://github.com/adrianhajdin/ai_mock_interviews) uses [Vapi](https://vapi.ai/) for the real-time voice agent. Vapi is excellent but charges per call minute after the initial free credits (~10–20 minutes total) are exhausted, which kills daily-use practice.

This fork replaces Vapi with the browser's native **Web Speech API** (`speechSynthesis` for TTS + `SpeechRecognition` for STT), which is:

- **Free and unlimited** — runs locally in your browser
- **Works in Chrome, Edge, and Safari** out of the box
- **No API key required** for the voice layer

Trade-off: voice quality is the OS default voice rather than a polished cloud TTS like ElevenLabs. For self-prep, this is fine.

The interview generation flow was also simplified — instead of Vapi voice collecting form parameters conversationally, there's now a plain form. Gemini still generates the questions on submit.

## Tech stack

- **Next.js 15** (App Router, server actions)
- **Firebase Auth** + **Firestore** — user authentication and data persistence (free Spark plan)
- **Google Gemini 2.5 Flash** (via Vercel AI SDK) — question generation + feedback analysis
- **Web Speech API** — browser-native TTS + STT
- **TailwindCSS 4** + **shadcn/ui** — UI components and styling
- **Zod** — schema validation for AI feedback output

## Free-tier limits

| Service | Free tier | Realistic daily usage |
|---|---|---|
| Firebase Spark | 50K reads, 20K writes per day | Will not hit limits |
| Gemini 2.5 Flash | 250 req/day, 10 RPM | One interview = ~2 calls; safely supports many sessions |
| Web Speech API | Unlimited | n/a (runs in browser) |

## Setup

### Prerequisites

- **Node.js 22 LTS** (Node 25 is incompatible with `firebase-admin`)
- **Chrome, Edge, or Safari** for taking interviews (Firefox lacks `SpeechRecognition`)
- A Google account (for Firebase + Gemini API)

### Install

```bash
git clone <your-fork-url>
cd ai_mock_interviews
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
GOOGLE_GENERATIVE_AI_API_KEY=

NEXT_PUBLIC_BASE_URL=http://localhost:3000

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

#### Getting the keys

**Gemini API key**

1. Visit https://aistudio.google.com/apikey
2. Click "Create API key" → "Create API key in new project" (avoids billing-enabled projects with no free tier)
3. Paste into `GOOGLE_GENERATIVE_AI_API_KEY`

**Firebase web config (the `NEXT_PUBLIC_FIREBASE_*` vars)**

1. Create a project at https://console.firebase.google.com
2. Project settings → Your apps → register a web app
3. Copy the config object values into the matching env vars

**Firebase admin (the `FIREBASE_*` vars)**

1. Project settings → Service accounts → Generate new private key
2. From the downloaded JSON, copy `project_id`, `client_email`, and `private_key` into the matching env vars
3. For `FIREBASE_PRIVATE_KEY`, keep the value wrapped in double quotes and leave the literal `\n` characters as-is

**Enable Firebase services**

- Authentication → Sign-in method → enable Email/Password
- Firestore Database → create database → set rules to:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

The home page query also needs two composite indexes — Firestore will print a clickable link in the dev server logs the first time it runs the query. Click each link, hit "Create", wait ~1 minute, refresh.

### Run

```bash
npm run dev
```

Open http://localhost:3000 in Chrome, Edge, or Safari.

## Usage flow

1. Sign up with an email + password
2. Click **Start an Interview** on the home page
3. Fill the form (role, experience level, type, tech stack, number of questions) and submit
4. The new interview appears on your dashboard — click its card
5. Click **Start Interview** and grant mic permission when prompted
6. The AI greets you, speaks each question; you respond aloud and click **Done answering** to advance
7. After the last answer, feedback is generated and you're redirected to the scored breakdown

## Project structure

```
app/
  (auth)/                Sign-in / sign-up routes
  (root)/
    page.tsx             Dashboard (your interviews + take interviews)
    interview/
      page.tsx           Generate a new interview (form)
      [id]/page.tsx      Take an interview
      [id]/feedback/     View scored feedback
  api/vapi/generate/     Server route: Gemini generates questions, saves to Firestore
components/
  Agent.tsx              Voice interview UI — Web Speech API + Gemini feedback trigger
  InterviewGenerateForm.tsx  Form for creating new interviews
  ...
firebase/
  client.ts              Firebase web SDK init (browser)
  admin.ts               Firebase admin SDK init (server)
lib/
  actions/
    auth.action.ts       Server actions for sign-up / sign-in / session
    general.action.ts    Server actions for interview & feedback CRUD + Gemini analysis
constants/index.ts       Tech-icon mappings + Zod feedback schema
```

## Known limitations

- **Firefox is not supported** for taking interviews — it has no `SpeechRecognition` API. The dashboard and creation flow work fine.
- **Voice quality** depends on the OS-installed voices (macOS / Windows defaults are decent; Linux varies).
- **No follow-up questions** — the AI iterates through the pre-generated question list verbatim. There's no dynamic clarification or branching mid-interview.
- **Single-language** — currently hardcoded to `en-US` for both TTS and STT.

## Original credit

This project was originally built as a [tutorial](https://www.youtube.com/watch?v=8GK8R77Bd7g) by [JavaScript Mastery](https://www.youtube.com/@javascriptmastery). This fork strips Vapi for cost-free daily use.
