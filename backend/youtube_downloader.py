import os
import yt_dlp
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import time
import random
import json
import subprocess

logger = logging.getLogger(__name__)

class YouTubeDownloader:
    def __init__(self):
        self.download_dir = Path("/tmp/music_downloads")
        self.download_dir.mkdir(exist_ok=True)
        
        # Rotate User-Agents for better success rate
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        ]
        
    def _get_random_user_agent(self):
        return random.choice(self.user_agents)
        
    def _get_base_options(self, attempt=0):
        """Get base yt-dlp options with rotation for different attempts"""
        user_agent = self._get_random_user_agent()
        
        base_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'writethumbnail': False,
            'writeinfojson': False,
            'ignoreerrors': False,
            # Enhanced headers rotation
            'http_headers': {
                'User-Agent': user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            },
            # Advanced bypass options
            'geo_bypass': True,
            'geo_bypass_country': ['US', 'CA', 'GB'][attempt % 3],
            'age_limit': None,
            'no_check_certificate': True,
            'prefer_insecure': False,
            # YouTube specific optimizations
            'youtube_include_dash_manifest': False,
            'youtube_include_hls_manifest': False,
            'extractor_retries': 5,
            'fragment_retries': 5,
            'skip_unavailable_fragments': True,
            'keep_fragments': False,
            'abort_on_unavailable_fragment': False,
            # Enhanced retry strategy
            'retry_sleep_functions': {
                'http': lambda n: min(2 ** n, 30) + random.uniform(0, 5),
                'fragment': lambda n: min(2 ** n, 30) + random.uniform(0, 5),
                'extractor': lambda n: min(2 ** n, 30) + random.uniform(0, 5),
            },
        }
        
        # Add attempt-specific modifications
        if attempt > 0:
            base_opts['http_headers']['X-Forwarded-For'] = f"192.168.{random.randint(1,254)}.{random.randint(1,254)}"
            
        if attempt > 1:
            # Use mobile user agent on later attempts
            base_opts['http_headers']['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            
        return base_opts
        
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get video information without downloading with enhanced robustness"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                # Add random delay
                time.sleep(random.uniform(0.5, 2))
                
                ydl_opts = {
                    **self._get_base_options(attempt),
                    'skip_download': True,
                    'no_color': True,
                }
                
                # Try different extractors on different attempts
                if attempt == 1:
                    ydl_opts['extractor_args'] = {
                        'youtube': {
                            'player_client': ['android', 'web'],
                            'player_skip': ['webpage', 'configs'],
                        }
                    }
                elif attempt == 2:
                    ydl_opts['extractor_args'] = {
                        'youtube': {
                            'player_client': ['ios', 'android'],
                            'player_skip': ['webpage'],
                        }
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
                        'description': info.get('description', '')[:200] + '...' if info.get('description') else '',
                        'availability': info.get('availability', 'unknown')
                    }
                    
            except Exception as e:
                logger.warning(f"Info extraction attempt {attempt + 1} failed: {e}")
                if attempt < max_attempts - 1:
                    time.sleep(random.uniform(2, 5))
                    continue
                else:
                    logger.error(f"All info extraction attempts failed: {e}")
                    raise Exception(f"Impossible de récupérer les informations de la vidéo après {max_attempts} tentatives: {str(e)}")
    
    def download_audio(self, url: str, format_type: str = 'mp3') -> Dict[str, Any]:
        """Download audio with maximum compatibility and bypass techniques"""
        max_attempts = 4
        
        for attempt in range(max_attempts):
            try:
                # Generate unique filename
                unique_id = str(uuid.uuid4())
                output_filename = f"{unique_id}.%(ext)s"
                output_path = self.download_dir / output_filename
                
                # Progressive delay increase
                delay = random.uniform(1 + attempt, 4 + attempt * 2)
                time.sleep(delay)
                
                # Progressive format degradation for better success
                format_selectors = [
                    # Attempt 0: Best quality
                    'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best[height<=720]',
                    # Attempt 1: Lower quality
                    'bestaudio[abr<=128]/best[height<=480]/worst[ext=mp4]',
                    # Attempt 2: Very conservative
                    'worst[ext=mp4]/worst',
                    # Attempt 3: Last resort
                    'best/worst'
                ]
                
                quality_levels = ['192', '128', '96', '64']
                
                ydl_opts = {
                    **self._get_base_options(attempt),
                    'format': format_selectors[min(attempt, len(format_selectors)-1)],
                    'outtmpl': str(output_path),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': format_type,
                        'preferredquality': quality_levels[min(attempt, len(quality_levels)-1)],
                    }],
                }
                
                # Progressive enhancement of bypass techniques
                if attempt == 0:
                    # Standard approach
                    pass
                elif attempt == 1:
                    # Enhanced client spoofing
                    ydl_opts['extractor_args'] = {
                        'youtube': {
                            'player_client': ['android', 'web'],
                            'player_skip': ['webpage', 'configs'],
                        }
                    }
                elif attempt == 2:
                    # Mobile client approach
                    ydl_opts['extractor_args'] = {
                        'youtube': {
                            'player_client': ['ios', 'android', 'mweb'],
                            'player_skip': ['webpage'],
                        }
                    }
                    # Additional mobile headers
                    ydl_opts['http_headers'].update({
                        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 13) gzip',
                        'X-YouTube-Client-Name': '3',
                        'X-YouTube-Client-Version': '19.09.37',
                    })
                elif attempt == 3:
                    # Last resort with minimal options
                    ydl_opts = {
                        'format': 'best/worst',
                        'outtmpl': str(output_path),
                        'quiet': True,
                        'no_warnings': True,
                        'extractor_args': {
                            'youtube': {
                                'player_client': ['android'],
                            }
                        },
                        'postprocessors': [{
                            'key': 'FFmpegExtractAudio',
                            'preferredcodec': format_type,
                            'preferredquality': '64',
                        }],
                    }
                
                logger.info(f"Download attempt {attempt + 1} with format: {ydl_opts.get('format', 'default')}")
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Get info first
                    info = ydl.extract_info(url, download=False)
                    
                    # Check availability
                    availability = info.get('availability', 'public')
                    if availability not in ['public', None, 'unlisted']:
                        if attempt < max_attempts - 1:
                            logger.warning(f"Video availability issue: {availability}, trying different approach...")
                            continue
                        else:
                            raise Exception(f"Vidéo non disponible: {availability}")
                    
                    # Attempt download
                    ydl.download([url])
                    
                    # Find downloaded file
                    downloaded_file = self.download_dir / f"{unique_id}.{format_type}"
                    
                    # Check if file exists and has reasonable size
                    if downloaded_file.exists() and downloaded_file.stat().st_size > 1000:  # At least 1KB
                        logger.info(f"Download successful on attempt {attempt + 1}")
                        return {
                            'success': True,
                            'file_path': str(downloaded_file),
                            'filename': f"{info.get('title', 'Unknown')}.{format_type}",
                            'title': info.get('title', 'Unknown Title'),
                            'artist': info.get('uploader', 'Unknown Artist'),
                            'duration': info.get('duration', 0),
                            'file_size': downloaded_file.stat().st_size,
                            'unique_id': unique_id,
                            'quality': quality_levels[min(attempt, len(quality_levels)-1)] + 'kbps'
                        }
                    else:
                        if downloaded_file.exists():
                            downloaded_file.unlink()  # Remove empty file
                        raise Exception("Fichier téléchargé invalide ou vide")
                        
            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"Download attempt {attempt + 1} failed: {e}")
                
                # Clean up any partial files
                for file in self.download_dir.glob(f"{unique_id}*"):
                    try:
                        file.unlink()
                    except:
                        pass
                
                # Specific error handling
                if "429" in error_msg or "rate" in error_msg:
                    if attempt < max_attempts - 1:
                        wait_time = random.uniform(10, 30) * (attempt + 1)
                        logger.info(f"Rate limited, waiting {wait_time:.1f}s before retry...")
                        time.sleep(wait_time)
                        continue
                
                if attempt < max_attempts - 1:
                    # Exponential backoff with jitter
                    wait_time = random.uniform(3, 8) * (2 ** attempt)
                    logger.info(f"Waiting {wait_time:.1f}s before next attempt...")
                    time.sleep(wait_time)
                    continue
                else:
                    # Final attempt failed
                    if "403" in error_msg or "forbidden" in error_msg:
                        raise Exception("YouTube a bloqué l'accès à cette vidéo. Cela peut être dû à des restrictions géographiques, des droits d'auteur, ou des mesures anti-bot temporaires. Essayez une vidéo différente ou réessayez plus tard.")
                    elif "404" in error_msg or "not available" in error_msg:
                        raise Exception("Cette vidéo n'est pas disponible, a été supprimée, ou est devenue privée.")
                    elif "private" in error_msg:
                        raise Exception("Cette vidéo est privée et ne peut pas être téléchargée.")
                    elif "copyright" in error_msg:
                        raise Exception("Cette vidéo est protégée par des droits d'auteur et ne peut pas être téléchargée.")
                    elif "age" in error_msg or "restricted" in error_msg:
                        raise Exception("Cette vidéo a des restrictions d'âge et ne peut pas être téléchargée.")
                    elif "429" in error_msg or "rate" in error_msg:
                        raise Exception("Trop de requêtes détectées par YouTube. Attendez 10-15 minutes avant de réessayer.")
                    else:
                        raise Exception(f"Échec du téléchargement après {max_attempts} tentatives avec différentes méthodes. Erreur: {str(e)}")
        
        # Should not reach here
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
    
    def test_connectivity(self) -> bool:
        """Test if YouTube is accessible"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Test with a very short, guaranteed available video
                ydl.extract_info('https://www.youtube.com/watch?v=jNQXAC9IVRw', download=False)
                return True
        except:
            return False