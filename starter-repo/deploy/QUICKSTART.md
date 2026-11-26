# Deploy to Any Device — Quick Start

Choose **ONE** path:

---

## 🌐 Path A: Cloudflare Tunnel (Free, Your Machine = Server)

**Best for:** Personal use, data stays on your machine, free forever

### Prerequisites
- Your machine runs Docker 24/7 (or when you need it)
- Internet connection

### Steps (3 minutes)

```bash
# 1. Start your local stack
cd outputs/jee-ai-starter/starter-repo
docker compose up -d

# 2. Install cloudflared (one-time)
# Windows: choco install cloudflared
# Mac: brew install cloudflared
# Linux: sudo apt install cloudflared

# 3. Run tunnel (gives you a random https://*.trycloudflare.com URL)
cloudflared tunnel --url http://localhost:3000 --url http://localhost:8000
```

**Output example:**
```
https://random-name-123.trycloudflare.com  →  Your frontend
https://random-name-123.trycloudflare.com/api  →  Your API
```

**Share that URL** — works on phone, tablet, any device, anywhere.

### Make URL Permanent (Optional)
```bash
# 1. Login
cloudflared tunnel login

# 2. Create named tunnel
cloudflared tunnel create jee-ai

# 3. Configure (edit ~/.cloudflared/config.yml)
tunnel: <tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: jee-ai.yourdomain.com
    service: http://localhost:3000
  - hostname: api.jee-ai.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404

# 4. Run
cloudflared tunnel run jee-ai
```

**Cost: $0** — Cloudflare Tunnel is free for personal use.

---

## ☁️ Path B: Railway (Free $5/mo Credit, True Cloud)

**Best for:** 24/7 uptime, no machine needed, custom domain

### Steps (5 minutes)

1. **Push to GitHub**
   ```bash
   cd outputs/jee-ai-starter/starter-repo
   git init && git add . && git commit -m "JEE AI local"
   git remote add origin https://github.com/YOUR_USERNAME/jee-ai.git
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to https://railway.app → "New Project" → "Deploy from GitHub"
   - Select your repo
   - Click "Add Plugin" → **PostgreSQL** (free tier)
   - Click "Add Plugin" → **Redis** (free tier)

3. **Set Environment Variables** (in Railway dashboard → Variables)
   ```
   POSTGRES_PASSWORD = your-secure-password
   VITE_API_URL = https://your-app-name.railway.app
   ```

4. **Deploy** — Railway auto-builds, gives you `https://your-app.railway.app`

### Custom Domain (Optional)
- Railway → Settings → Domains → Add your domain
- Free SSL auto-provisioned

### Cost
- **Free tier**: $5/mo credit (covers small PostgreSQL + Redis + 2 services)
- **After credit**: ~$1-3/mo for hobby usage
- **No credit card** for free tier

---

## 📱 Test on Any Device

Once deployed (either path), open the URL on:
- ✅ Phone (iOS/Android)
- ✅ Tablet
- ✅ Laptop (any OS)
- ✅ Friend's device

All data syncs to your **single SQLite (Path A) or PostgreSQL (Path B)**.

---

## 🔒 Security Notes

| Path | Data Location | HTTPS | Auth |
|------|---------------|-------|------|
| Cloudflare Tunnel | Your machine | ✅ Auto | ❌ Add if needed |
| Railway | Railway cloud | ✅ Auto | ❌ Add if needed |

**For personal use only** — no auth built in. Add later if sharing:
```python
# Quick auth middleware in backend/main.py
from fastapi import Depends, HTTPException, Header
async def verify_token(x_api_key: str = Header(...)):
    if x_api_key != os.getenv("API_KEY"):
        raise HTTPException(401, "Invalid key")
```

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| `cloudflared: command not found` | Install cloudflared (see Path A step 2) |
| Railway build fails | Check logs → usually missing `package-lock.json` or Python deps |
| API calls fail | Check `VITE_API_URL` matches your Railway/Cloudflare URL |
| DB connection error | Railway: ensure PostgreSQL plugin added; Local: `docker compose down -v && docker compose up -d` |
| CORS errors | Backend allows `*` — check frontend `VITE_API_URL` |

---

## 🎯 Recommendation

| Your Situation | Use |
|----------------|-----|
| Machine on 24/7, want total control, $0 | **Cloudflare Tunnel** |
| Want 24/7 without machine on, okay with ~$1-3/mo | **Railway** |
| Just testing locally | **Don't deploy — use `docker compose up -d` + localhost** |

---

**Your files are ready in:** `outputs/jee-ai-starter/starter-repo/deploy/`
- `cloudflare-tunnel.yml` — Tunnel config
- `railway.toml` — Railway service config
- `docker-compose.railway.yml` — Production compose
- `frontend/Dockerfile.prod` + `nginx.conf` — Production frontend
- `QUICKSTART.md` — This guide