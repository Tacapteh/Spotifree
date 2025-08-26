# Here are your Instructions

## Deploy

### Vercel
- **Root Directory:** `frontend`
- **Install Command:** `npm install` (or `npm install --legacy-peer-deps` if needed)
- **Build Command:** `npm run build`
- **Output Directory:** `build`

### Render
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port 10000`
- Ensure environment variable `PORT=10000` is set.
