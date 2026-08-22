# Bringing Aniquiz back to life + free hosting on Render

## Why it died

1. Replit removed free always-on hosting, so the bot process stopped.
2. `config.json` (bot token) was never in git, so it's gone.
3. The old AI commands used OpenAI's `text-davinci-003`, which OpenAI shut down in Jan 2024. Now replaced with **Gemini (free tier)**.

## Step 1 — Get your keys (5 min)

### Discord bot token
1. Go to https://discord.com/developers/applications and open your **Aniquiz** app.
2. Left sidebar → **Bot** → click **Reset Token** → copy it (you won't see it again).
3. On the same page, scroll to **Privileged Gateway Intents** and turn ON:
   - ✅ **MESSAGE CONTENT INTENT** (required — quiz/chat commands read messages)
   - ✅ SERVER MEMBERS INTENT (optional)
4. Note your **Application ID** (General Information page) — needed for slash commands.

### Gemini API key (free)
1. Go to https://aistudio.google.com/apikey
2. Click **Create API key** → copy it.

## Step 2 — Push to GitHub

```bash
git add -A
git commit -m "revive: gemini ai, render-ready"
git push
```

(`.gitignore` already protects `config.json` from being committed.)

## Step 3 — Deploy on Render (free)

1. Sign up at https://render.com with your GitHub account.
2. Dashboard → **New +** → **Web Service** → pick your repo.
3. Settings:
   - **Language**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free
4. Open **Environment** tab and add:
   | Key | Value |
   |---|---|
   | `DISCORD_TOKEN` | your bot token |
   | `GEMINI_API_KEY` | your Gemini key |
   | `CLIENT_ID` | your Application ID |
5. Click **Deploy Web Service**. Watch logs until you see `Project is running!` and no errors.

## Step 4 — Keep it awake 24/7 (free)

Render's free tier sleeps the service after ~15 min without web traffic.

1. Copy your service URL (e.g. `https://aniquiz.onrender.com`).
2. Go to https://cron-job.org (free) → create a cron job that GETs that URL **every 5 minutes**.
3. Done — the ping keeps the bot awake almost permanently (~99% uptime).

## Optional — register slash commands

Slash commands (`/ping`, `/quiz`, `/help`, ...) need a one-time registration:

```bash
CLIENT_ID=your_app_id DISCORD_TOKEN=your_bot_token node deploy-commands.js
```

## Local testing (optional)

Create `config.json` in the project root:

```json
{
  "token": "YOUR_BOT_TOKEN",
  "GEMINI_API_KEY": "YOUR_GEMINI_KEY",
  "clientId": "YOUR_APPLICATION_ID"
}
```

Then `npm start`.

## Commands

| Command | What it does |
|---|---|
| `let test` | check bot is alive |
| `let quiz` / `/quiz` | anime quiz from local bank |
| `let trivia` | true/false anime trivia (API) |
| `chat <text>` | talk to Gemini |
| `giveimg <text>` | Gemini image generation |
| `/ping`, `/help`, `/avatar`, `/server`, `/user` | slash commands |

## Free-tier limits to know

- **Render free**: 750 hrs/month of a small instance — enough for one always-on bot.
- **Gemini free**: generous daily limits for chat; image generation has a low daily cap. If you hit it, chat still works.
- If Render ever annoys you, the same repo runs unchanged on any Node host (Koyeb, Oracle Cloud Always Free VM, your own machine).
