# Vercel + Railway Deployment (Free)

**Frontend on Vercel (free, global CDN) + Backend on Railway (free $5/mo credit)**

---

## Step 1: Deploy Backend to Railway (5 min)

```bash
cd outputs/jee-ai-starter/starter-repo
git init && git add . && git commit -m "JEE AI"
git remote add origin https://github.com/YOUR_USERNAME/jee-ai.git
git push -u origin main
```

1. Go to **railway.app** → New Project → Deploy from GitHub
2. Select your repo
3. **Add PostgreSQL plugin** (free tier)
4. **Add Redis plugin** (free tier)
5. Set Environment Variables in Railway dashboard:
   ```
   POSTGRES_PASSWORD = your-secure-password
   ```
6. Deploy → Get your backend URL: `https://jee-ai-backend.railway.app`

---

## Step 2: Deploy Frontend to Vercel (2 min)

1. Go to **vercel.com** → New Project → Import from GitHub
2. Select same repo
3. **Framework Preset**: Vite
4. **Root Directory**: `starter-repo/frontend`
5. **Environment Variables**:
   ```
   VITE_API_URL = https://jee-ai-backend.railway.app
   ```
6. Deploy → Get your frontend URL: `https://jee-ai.vercel.app`

---

## Step 3: Update CORS (Backend)

In `starter-repo/backend/main.py`, update CORS origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jee-ai.vercel.app",  # Your Vercel URL
        "http://localhost:3000",      # Local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit & push → Railway auto-redeploys.

---

## Result

| Component | URL | Cost |
|-----------|-----|------|
| Frontend | `https://jee-ai.vercel.app` | **Free forever** (Vercel hobby) |
| Backend API | `https://jee-ai-backend.railway.app` | **Free** (Railway $5/mo credit) |
| Database | PostgreSQL on Railway | Included in credit |
| Redis | Redis on Railway | Included in credit |

---

## Why Not Full Vercel?

| Limitation | Impact |
|------------|--------|
| Serverless functions = 10s max timeout | IRT calculations, LLM calls need longer |
| No persistent SQLite | Need PostgreSQL |
| No WebSockets | Real-time tutor streaming won't work |
| Cold starts | First request slow |

**Vercel + Railway = Best of both worlds.**

---

## Custom Domain (Free)

1. **Vercel**: Settings → Domains → Add `jee-ai.yourdomain.com`
2. **Railway**: Settings → Domains → Add `api.jee-ai.yourdomain.com`
3. Update `VITE_API_URL` to `https://api.jee-ai.yourdomain.com`
4. SSL auto-provisioned on both