import os
import yt_dlp
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import time
import random

logger = logging.getLogger(__name__)

class YouTubeDownloader:
    def __init__(self):
        self.download_dir = Path("/tmp/music_downloads")
        self.download_dir.mkdir(exist_ok=True)
        
        # Common yt-dlp options to avoid detection
        self.common_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'writethumbnail': False,
            'writeinfojson': False,
            'cookiefile': None,
            # Headers to appear more like a real browser
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Accept-Encoding': 'gzip,deflate',
                'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                'Keep-Alive': '300',
                'Connection': 'keep-alive',
            },
        }
        
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get video information without downloading"""
        try:
            ydl_opts = {
                **self.common_opts,
                'skip_download': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                return {
                    'id': info.get('id', ''),
                    'title': info.get('title', 'Unknown Title'),
                    'uploader': info.get('uploader', 'Unknown Artist'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'view_count': info.get('view_count', 0),
                    'upload_date': info.get('upload_date', ''),
                    'description': info.get('description', '')[:200] + '...' if info.get('description') else ''
                }
        except Exception as e:
            logger.error(f"Error extracting video info: {e}")
            raise Exception(f"Failed to get video information: {str(e)}")
    
    def download_audio(self, url: str, format_type: str = 'mp3') -> Dict[str, Any]:
        """Download audio from YouTube URL"""
        max_attempts = 2
        
        for attempt in range(max_attempts):
            try:
                # Generate unique filename
                unique_id = str(uuid.uuid4())
                output_filename = f"{unique_id}.%(ext)s"
                output_path = self.download_dir / output_filename
                
                # Add random delay to avoid rate limiting
                time.sleep(random.uniform(1, 3))
                
                # Try different approaches based on attempt
                if attempt == 0:
                    # First attempt: Standard approach
                    format_selector = 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best[height<=480]'
                else:
                    # Second attempt: More conservative approach
                    format_selector = 'worst[ext=mp4]/worst'
                
                # Configure yt-dlp options with better anti-detection
                ydl_opts = {
                    **self.common_opts,
                    'format': format_selector,
                    'outtmpl': str(output_path),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': format_type,
                        'preferredquality': '128' if attempt > 0 else '192',
                    }],
                    # Additional options to avoid 403 errors
                    'geo_bypass': True,
                    'geo_bypass_country': 'US',
                    'age_limit': None,
                    'ignoreerrors': False,
                    'no_check_certificate': True,
                    'prefer_insecure': False,
                    # YouTube specific options
                    'youtube_include_dash_manifest': False,
                    'extractor_retries': 2,
                    'fragment_retries': 2,
                    'skip_unavailable_fragments': True,
                    'keep_fragments': False,
                    'abort_on_unavailable_fragment': False,
                    'retry_sleep_functions': {
                        'http': lambda n: min(2 ** n, 10),
                        'fragment': lambda n: min(2 ** n, 10),
                        'extractor': lambda n: min(2 ** n, 10),
                    },
                    # Additional headers specific to YouTube
                    'http_headers': {
                        **self.common_opts['http_headers'],
                        'X-YouTube-Client-Name': '1',
                        'X-YouTube-Client-Version': '2.20240101.00.00',
                    },
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Get info first
                    info = ydl.extract_info(url, download=False)
                    
                    # Check if video is available
                    if info.get('availability') not in [None, 'public']:
                        raise Exception(f"Video is not publicly available: {info.get('availability', 'unknown')}")
                    
                    # Download the audio
                    ydl.download([url])
                    
                    # Find the actual downloaded file
                    downloaded_file = self.download_dir / f"{unique_id}.{format_type}"
                    
                    if downloaded_file.exists():
                        return {
                            'success': True,
                            'file_path': str(downloaded_file),
                            'filename': f"{info.get('title', 'Unknown')}.{format_type}",
                            'title': info.get('title', 'Unknown Title'),
                            'artist': info.get('uploader', 'Unknown Artist'),
                            'duration': info.get('duration', 0),
                            'file_size': downloaded_file.stat().st_size,
                            'unique_id': unique_id
                        }
                    else:
                        if attempt < max_attempts - 1:
                            logger.warning(f"Downloaded file not found on attempt {attempt + 1}, retrying...")
                            continue
                        else:
                            raise Exception("Downloaded file not found after all attempts")
                        
            except Exception as e:
                logger.error(f"Download attempt {attempt + 1} failed: {e}")
                
                if attempt < max_attempts - 1:
                    # Wait before retrying
                    time.sleep(random.uniform(3, 7))
                    continue
                else:
                    # Final attempt failed, raise with better error message
                    error_msg = str(e)
                    if "403" in error_msg or "Forbidden" in error_msg:
                        raise Exception("YouTube a temporairement bloqué cette requête. Cette vidéo pourrait avoir des restrictions géographiques ou être protégée. Essayez une autre vidéo ou réessayez plus tard.")
                    elif "404" in error_msg or "not available" in error_msg:
                        raise Exception("Cette vidéo n'est pas disponible ou a été supprimée.")
                    elif "private" in error_msg.lower():
                        raise Exception("Cette vidéo est privée et ne peut pas être téléchargée.")
                    elif "age" in error_msg.lower() or "restricted" in error_msg.lower():
                        raise Exception("Cette vidéo a des restrictions d'âge et ne peut pas être téléchargée.")
                    elif "copyright" in error_msg.lower():
                        raise Exception("Cette vidéo est protégée par des droits d'auteur et ne peut pas être téléchargée.")
                    else:
                        raise Exception(f"Échec du téléchargement après {max_attempts} tentatives: {error_msg}")
        
        # This should not be reached, but just in case
        raise Exception("Échec du téléchargement après toutes les tentatives")
    
    def cleanup_file(self, file_path: str) -> bool:
        """Remove downloaded file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error(f"Error cleaning up file {file_path}: {e}")
            return False
    
    def get_supported_formats(self) -> list:
        """Get list of supported audio formats"""
        return ['mp3', 'wav', 'aac', 'ogg', 'flac']