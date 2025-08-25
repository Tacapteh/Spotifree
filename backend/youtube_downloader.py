import os
import yt_dlp
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class YouTubeDownloader:
    def __init__(self):
        self.download_dir = Path("/tmp/music_downloads")
        self.download_dir.mkdir(exist_ok=True)
        
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get video information without downloading"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
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
            
            # Configure yt-dlp options
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': str(output_path),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': format_type,
                    'preferredquality': '192',
                }],
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Get info first
                info = ydl.extract_info(url, download=False)
                
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
                    raise Exception("Downloaded file not found")
                    
        except Exception as e:
            logger.error(f"Error downloading audio: {e}")
            raise Exception(f"Failed to download audio: {str(e)}")
    
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