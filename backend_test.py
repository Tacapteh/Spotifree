#!/usr/bin/env python3
"""
Backend Test Suite for Spotify Clone with yt-dlp and MP3 conversion
Tests the complete workflow from YouTube URL submission to MP3 download
"""

import requests
import time
import json
import os
from pathlib import Path

# Use local backend URL for testing
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

class SpotifyCloneTest:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {
            'health_check': False,
            'youtube_download': False,
            'mp3_conversion': False,
            'job_flow': False,
            'api_endpoints': False,
            'file_download': False
        }
        self.audio_id = None
        
    def test_health_check(self):
        """Test if the backend is running"""
        print("\n=== Testing Health Check ===")
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                print("✅ Backend health check passed")
                self.test_results['health_check'] = True
                return True
            else:
                print(f"❌ Health check failed with status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check failed: {str(e)}")
            return False
    
    def test_submit_youtube_url(self):
        """Test submitting a YouTube URL for processing"""
        print("\n=== Testing YouTube URL Submission ===")
        
        # Use a short test video (10 seconds)
        test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"  # "Me at the zoo" - first YouTube video, very short
        
        try:
            payload = {"url": test_url}
            response = self.session.post(
                f"{API_BASE}/audio/submit",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.audio_id = data.get('audio_id')
                status = data.get('status')
                
                if self.audio_id and status == 'queued':
                    print(f"✅ YouTube URL submitted successfully")
                    print(f"   Audio ID: {self.audio_id}")
                    print(f"   Status: {status}")
                    return True
                else:
                    print(f"❌ Invalid response format: {data}")
                    return False
            else:
                print(f"❌ Submit failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Submit request failed: {str(e)}")
            return False
    
    def test_job_status_polling(self):
        """Test polling job status until completion"""
        print("\n=== Testing Job Status Polling ===")
        
        if not self.audio_id:
            print("❌ No audio_id available for status polling")
            return False
        
        max_attempts = 60  # 5 minutes max
        attempt = 0
        
        try:
            while attempt < max_attempts:
                try:
                    response = self.session.get(
                        f"{API_BASE}/audio/status/{self.audio_id}",
                        timeout=15
                    )
                    
                    if response.status_code != 200:
                        print(f"❌ Status check failed with status: {response.status_code}")
                        return False
                    
                    data = response.json()
                    status = data.get('status')
                    progress = data.get('progress', 0)
                    message = data.get('message', '')
                    title = data.get('title', '')
                    
                    print(f"   Status: {status}, Progress: {progress}%, Title: {title}")
                    
                    if status == 'done':
                        print("✅ Job completed successfully")
                        print(f"   Final title: {title}")
                        print(f"   Duration: {data.get('duration_s')} seconds")
                        print(f"   MP3 file: {data.get('filepath_mp3')}")
                        
                        # Check if we have all expected data
                        if title and data.get('filepath_mp3'):
                            self.test_results['youtube_download'] = True
                            self.test_results['mp3_conversion'] = True
                            return True
                        else:
                            print("❌ Missing expected data in completed job")
                            return False
                            
                    elif status == 'error':
                        print(f"❌ Job failed with error: {message}")
                        return False
                    
                    elif status in ['queued', 'downloading', 'converting']:
                        # Job is still processing
                        time.sleep(3)  # Wait 3 seconds before next check
                        attempt += 1
                    else:
                        print(f"❌ Unknown status: {status}")
                        return False
                        
                except requests.exceptions.RequestException as e:
                    print(f"   Connection issue, retrying... ({str(e)})")
                    time.sleep(2)
                    attempt += 1
                    continue
            
            print("❌ Job did not complete within timeout period")
            return False
            
        except Exception as e:
            print(f"❌ Status polling failed: {str(e)}")
            return False
    
    def test_mp3_download(self):
        """Test downloading the converted MP3 file"""
        print("\n=== Testing MP3 File Download ===")
        
        if not self.audio_id:
            print("❌ No audio_id available for download")
            return False
        
        try:
            response = self.session.get(
                f"{API_BASE}/audio/download/{self.audio_id}",
                timeout=30
            )
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                print(f"✅ MP3 download successful")
                print(f"   Content-Type: {content_type}")
                print(f"   File size: {content_length} bytes")
                
                # Verify it's an MP3 file
                if 'audio/mpeg' in content_type and content_length > 1000:
                    print("✅ Downloaded file appears to be valid MP3")
                    self.test_results['file_download'] = True
                    return True
                else:
                    print(f"❌ Downloaded file may not be valid MP3")
                    print(f"   Expected audio/mpeg, got: {content_type}")
                    return False
                    
            else:
                print(f"❌ Download failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Download request failed: {str(e)}")
            return False
    
    def test_invalid_url_handling(self):
        """Test error handling with invalid URLs"""
        print("\n=== Testing Invalid URL Handling ===")
        
        invalid_urls = [
            "https://invalid-url.com/video",
            "not-a-url",
            "https://youtube.com/watch?v=nonexistent"
        ]
        
        for url in invalid_urls:
            try:
                payload = {"url": url}
                response = self.session.post(
                    f"{API_BASE}/audio/submit",
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    audio_id = data.get('audio_id')
                    
                    # Check if job eventually fails
                    if audio_id:
                        time.sleep(2)
                        status_response = self.session.get(
                            f"{API_BASE}/audio/status/{audio_id}",
                            timeout=10
                        )
                        
                        if status_response.status_code == 200:
                            status_data = status_response.json()
                            if status_data.get('status') == 'error':
                                print(f"✅ Invalid URL properly handled: {url}")
                                continue
                
                print(f"⚠️  Invalid URL not properly rejected: {url}")
                
            except Exception as e:
                print(f"⚠️  Error testing invalid URL {url}: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🎵 Starting Spotify Clone Backend Tests 🎵")
        print("=" * 50)
        
        # Test 1: Health check
        if not self.test_health_check():
            print("\n❌ Backend is not accessible. Stopping tests.")
            return self.generate_report()
        
        # Test 2: Submit YouTube URL
        if not self.test_submit_youtube_url():
            print("\n❌ Cannot submit YouTube URLs. Stopping tests.")
            return self.generate_report()
        
        self.test_results['api_endpoints'] = True
        
        # Test 3: Poll job status until completion
        if not self.test_job_status_polling():
            print("\n❌ Job processing failed. Stopping tests.")
            return self.generate_report()
        
        self.test_results['job_flow'] = True
        
        # Test 4: Download MP3 file
        if not self.test_mp3_download():
            print("\n❌ MP3 download failed.")
            return self.generate_report()
        
        # Test 5: Error handling (optional)
        self.test_invalid_url_handling()
        
        return self.generate_report()
    
    def generate_report(self):
        """Generate final test report"""
        print("\n" + "=" * 50)
        print("🎵 SPOTIFY CLONE TEST RESULTS 🎵")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, passed in self.test_results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Spotify clone backend is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    """Main test execution"""
    tester = SpotifyCloneTest()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Backend testing completed successfully!")
        exit(0)
    else:
        print("\n❌ Backend testing found issues!")
        exit(1)

if __name__ == "__main__":
    main()