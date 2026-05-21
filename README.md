# Dermalyze Backend — Deploy in 5 Minutes

This folder contains the **secure backend** for the Dermalyze AI Skin Scanner. Your API key lives here as an environment variable — your frontend never sees it, so it can't be scraped.

---

## Step-by-Step Deploy (Vercel)

### 1. Sign up for Vercel
- Go to **vercel.com** → Sign up (free, you can use GitHub or email)

### 2. Push this folder to GitHub
- Create a new GitHub repo called `dermalyze-backend`
- Upload everything in this `backend/` folder to the repo root
- Or use Vercel CLI: `npm i -g vercel` then `vercel deploy` inside this folder

### 3. Import to Vercel
- In Vercel dashboard → **Add New** → **Project**
- Import your `dermalyze-backend` GitHub repo
- Click **Deploy** (no settings needed)

### 4. Add your API key as a secret
- In your Vercel project → **Settings** → **Environment Variables**
- Add:
  - **Name:** `ANTHROPIC_API_KEY`
  - **Value:** `sk-ant-api03-...` (your key)
  - **Environment:** Production, Preview, Development
- Click **Save** → then **Redeploy** the latest deployment

### 5. Get your backend URL
- Vercel gives you a URL like `https://dermalyze-backend.vercel.app`
- Your endpoints are:
  - `POST https://dermalyze-backend.vercel.app/api/analyze`
  - `POST https://dermalyze-backend.vercel.app/api/analyze-products`

### 6. Update your scanner frontend
- Open `Live Skin Scanner.html`
- Find the `fetch('https://api.anthropic.com/v1/messages', ...)` calls
- Replace them with `fetch('https://YOUR-VERCEL-URL/api/analyze', ...)`
- Remove the `EMBEDDED_KEY` and `x-api-key` headers — you don't need them anymore
- Re-deploy your frontend to the same Vercel project or wherever you host it

---

## Cost
- Vercel: **Free** for hobby use (100GB bandwidth, unlimited invocations)
- Anthropic API: ~$0.0015 per scan (Claude Haiku)

---

## Security checklist before public launch
- [ ] API key stored in Vercel env vars (not in code)
- [ ] CORS configured to allow only your frontend domain (edit `Access-Control-Allow-Origin` in both `.js` files)
- [ ] Spend limit set on console.anthropic.com → Billing
- [ ] Rate limiting added (optional — Vercel Pro plan or Upstash Redis)
- [ ] Privacy Policy + Terms hosted on your site
