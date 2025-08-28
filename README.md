# Here are your Instructions

## Deploy

### Vercel
- **Root Directory:** `frontend`
- **Install Command:** `npm install` (or `npm install --legacy-peer-deps` if needed)
- **Build Command:** `npm run build`
- **Output Directory:** `build`

### API Keys

- The frontend optionally uses the Last.fm API for artist images.
  Define `REACT_APP_LASTFM_API_KEY` in your environment to supply your own
  Last.fm API key. Without this key the application will gracefully skip
  fetching artist images from Last.fm.

### Render
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port 10000`
- Ensure environment variable `PORT=10000` is set.
