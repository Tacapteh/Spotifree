#!/usr/bin/env python3
import os
import sys
import tempfile
import subprocess
from pathlib import Path
from urllib.parse import urlparse

try:
    import yt_dlp
except ImportError:
    print("Erreur: yt-dlp n'est pas installé. Installez-le avec: pip install yt-dlp")
    sys.exit(1)

try:
    from mutagen.mp3 import MP3
    from mutagen.id3 import ID3, TIT2, TPE1, TALB, TPE2, TDRC
except ImportError:
    print("Erreur: mutagen n'est pas installé. Installez-le avec: pip install mutagen")
    sys.exit(1)

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_BIN = "ffmpeg"


def sanitize_filename(filename):
    """Nettoie le nom de fichier des caractères interdits"""
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename.strip()


def download_and_convert(video_url, output_dir="."):
    """Télécharge et convertit une vidéo en MP3 320kbps"""
    
    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"🎵 Traitement de: {video_url}")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_path = Path(tmpdir)
        
        def progress_hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                downloaded = d.get('downloaded_bytes', 0)
                if total > 0:
                    percent = (downloaded / total) * 100
                    bar_length = 40
                    filled = int(bar_length * downloaded / total)
                    bar = '█' * filled + '░' * (bar_length - filled)
                    speed = d.get('speed', 0)
                    speed_str = f"{speed/1024/1024:.2f} MB/s" if speed else "N/A"
                    print(f"\r📥 Téléchargement: [{bar}] {percent:.1f}% | {speed_str}", end='', flush=True)
            elif d['status'] == 'finished':
                print("\n✅ Téléchargement terminé")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(temp_path / '%(title)s.%(ext)s'),
            'noplaylist': True,
            'quiet': False,
            'no_warnings': False,
            'progress_hooks': [progress_hook],
            'postprocessors': [],
            'extract_flat': False,
            'geo_bypass': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        }
        
        print("📡 Récupération des informations de la vidéo...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(video_url, download=True)
            except Exception as e:
                print(f"\n❌ Erreur lors du téléchargement: {e}")
                return None
        
        if not info:
            print("❌ Impossible de récupérer les informations de la vidéo")
            return None
        
        title = info.get('title', 'audio')
        artist = info.get('artist') or info.get('uploader', 'Inconnu')
        album = info.get('album', '')
        album_artist = info.get('album_artist', '')
        release_year = info.get('release_year') or info.get('upload_date', '')[:4] if info.get('upload_date') else ''
        
        downloaded_files = list(temp_path.glob('*'))
        audio_file = None
        for f in downloaded_files:
            if f.suffix.lower() in ['.mp3', '.m4a', '.opus', '.webm', '.ogg', '.wav', '.flac', '.aac']:
                audio_file = f
                break
        
        if not audio_file:
            print("❌ Aucun fichier audio trouvé après téléchargement")
            return None
        
        print(f"🎼 Titre: {title}")
        print(f"🎤 Artiste: {artist}")
        if album:
            print(f"💿 Album: {album}")
        
        safe_title = sanitize_filename(title)
        output_file = output_path / f"{safe_title}.mp3"
        
        if output_file.exists():
            response = input(f"\n⚠️  Le fichier '{output_file.name}' existe déjà. Écraser? (o/N): ")
            if response.lower() not in ['o', 'oui', 'y', 'yes']:
                print("❌ Opération annulée")
                return None
        
        if audio_file.suffix.lower() == '.mp3':
            print("🔄 Fichier déjà en MP3, copie directe...")
            import shutil
            shutil.copy(audio_file, output_file)
        else:
            print("🔄 Conversion en MP3 320kbps...")
            ffmpeg_cmd = [
                FFMPEG_BIN,
                '-i', str(audio_file),
                '-vn',
                '-ar', '44100',
                '-ac', '2',
                '-b:a', '320k',
                '-y',
                str(output_file)
            ]
            
            try:
                result = subprocess.run(
                    ffmpeg_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                if result.returncode != 0:
                    print(f"❌ Erreur ffmpeg: {result.stderr}")
                    return None
                print("✅ Conversion terminée")
            except FileNotFoundError:
                print("❌ ffmpeg n'est pas installé ou introuvable dans le PATH")
                return None
            except Exception as e:
                print(f"❌ Erreur lors de la conversion: {e}")
                return None
        
        print("🏷️  Ajout des métadonnées...")
        try:
            audio = MP3(output_file, ID3=ID3)
            try:
                audio.add_tags()
            except:
                pass
            
            audio.tags['TIT2'] = TIT2(encoding=3, text=title)
            audio.tags['TPE1'] = TPE1(encoding=3, text=artist)
            if album:
                audio.tags['TALB'] = TALB(encoding=3, text=album)
            if album_artist:
                audio.tags['TPE2'] = TPE2(encoding=3, text=album_artist)
            if release_year:
                audio.tags['TDRC'] = TDRC(encoding=3, text=str(release_year))
            
            audio.save()
            print("✅ Métadonnées ajoutées")
        except Exception as e:
            print(f"⚠️  Avertissement: Impossible d'ajouter les métadonnées: {e}")
    
    print("=" * 60)
    print(f"✅ Conversion terminée : {output_file}")
    return str(output_file)


def main():
    if len(sys.argv) < 2:
        print("Usage: python yt2mp3.py <URL_VIDEO> [DOSSIER_SORTIE]")
        print("\nExemples:")
        print("  python yt2mp3.py https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        print("  python yt2mp3.py https://soundcloud.com/artist/track ./musique")
        print("\nPlateformes supportées: YouTube, SoundCloud, TikTok, Vimeo, etc.")
        sys.exit(1)
    
    video_url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    
    result = download_and_convert(video_url, output_dir)
    
    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
