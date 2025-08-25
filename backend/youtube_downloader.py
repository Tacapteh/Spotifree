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
        try:
            # Generate unique filename
            unique_id = str(uuid.uuid4())
            output_filename = f"{unique_id}.%(ext)s"
            output_path = self.download_dir / output_filename
            
            # Add random delay to avoid rate limiting
            time.sleep(random.uniform(1, 3))
            
            # Configure yt-dlp options with better anti-detection
            ydl_opts = {
                **self.common_opts,
                'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
                'outtmpl': str(output_path),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': format_type,
                    'preferredquality': '192',
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
                'extractor_retries': 3,
                'fragment_retries': 3,
                'retry_sleep_functions': {
                    'http': lambda n: min(4 ** n, 30),
                    'fragment': lambda n: min(4 ** n, 30),
                    'extractor': lambda n: min(4 ** n, 30),
                },
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Get info first
                info = ydl.extract_info(url, download=False)
                
                # Download the audio with retry logic
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        ydl.download([url])
                        break
                    except Exception as e:
                        if attempt == max_retries - 1:
                            raise e
                        logger.warning(f"Download attempt {attempt + 1} failed, retrying: {e}")
                        time.sleep(random.uniform(2, 5))
                
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
                    raise Exception("Downloaded file not found")
                    
        except Exception as e:
            logger.error(f"Error downloading audio: {e}")
            # More specific error messages
            error_msg = str(e)
            if "403" in error_msg or "Forbidden" in error_msg:
                raise Exception("YouTube has blocked this request. Try again later or use a different video.")
            elif "404" in error_msg or "not available" in error_msg:
                raise Exception("This video is not available or has been removed.")
            elif "private" in error_msg.lower():
                raise Exception("This video is private and cannot be downloaded.")
            elif "age" in error_msg.lower():
                raise Exception("This video has age restrictions and cannot be downloaded.")
            else:
                raise Exception(f"Download failed: {error_msg}")
    
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