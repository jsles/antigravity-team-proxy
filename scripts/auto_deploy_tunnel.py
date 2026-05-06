import os
import subprocess
import re
import sys
import time
import urllib.request
from pathlib import Path

DATA_DIR = Path.home() / ".antigravity_tools"
BIN_DIR = DATA_DIR / "bin"
CLOUDFLARED_EXE = BIN_DIR / "cloudflared.exe"

def download_cloudflared():
    """Cloudflared 바이너리 다운로드"""
    if not BIN_DIR.exists():
        BIN_DIR.mkdir(parents=True, exist_ok=True)
    
    if not CLOUDFLARED_EXE.exists():
        print("[INFO] Cloudflared 바이너리를 다운로드 중입니다...")
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        try:
            urllib.request.urlretrieve(url, CLOUDFLARED_EXE)
            print("[SUCCESS] Download complete.")
        except Exception as e:
            print(f"[ERROR] Download failed: {e}")
            sys.exit(1)

def run_tunnel():
    """터널 실행 및 URL 추출"""
    print("[INFO] 터널을 실행 중입니다. 잠시만 기다려 주세요...")
    # --url http://127.0.0.1:8045 를 사용하여 퀵 터널 실행
    cmd = [str(CLOUDFLARED_EXE), "tunnel", "--url", "http://127.0.0.1:8045"]
    
    # stderr에 URL 정보가 출력됨
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8')
    
    url = None
    start_time = time.time()
    
    # 최대 30초 동안 URL 탐색
    while time.time() - start_time < 30:
        line = process.stdout.readline()
        if not line:
            break
        
        # URL 패턴 찾기: https://*.trycloudflare.com
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            url = match.group(0)
            print(f"\n[DEPLOY SUCCESS]")
            print(f"Public URL: {url}")
            print(f"API Base: {url}/v1")
            with open("tunnel_url.txt", "w") as f:
                f.write(url)
            sys.stdout.flush()
            print("\n[INFO] Tunnel is active. Keeping script alive...")
            break
            
    if not url:
        print("[ERROR] URL을 생성하지 못했습니다. 로컬 프록시(8045)가 실행 중인지 확인하세요.")
        process.terminate()
    else:
        # URL을 찾은 후에도 프로세스를 유지 (사용자가 직접 종료할 때까지)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[INFO] 터널을 종료합니다.")
            process.terminate()

if __name__ == "__main__":
    download_cloudflared()
    run_tunnel()
