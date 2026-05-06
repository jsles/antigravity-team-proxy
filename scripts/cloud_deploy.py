import os
import shutil
from pathlib import Path

# 경로 설정
PROJECT_ROOT = Path("c:/Antigravity_jsles/Antigravity_APIKEY_Manager_Git")
DEPLOY_DIR = PROJECT_ROOT / "deploy_cloud"

def prepare_huggingface_space():
    """Hugging Face Spaces 배포를 위한 파일 준비"""
    if not DEPLOY_DIR.exists():
        DEPLOY_DIR.mkdir()
    
    # 1. Dockerfile 복사 (docker 디렉토리의 기본 파일 사용)
    src_dockerfile = PROJECT_ROOT / "docker" / "Dockerfile"
    dest_dockerfile = DEPLOY_DIR / "Dockerfile"
    shutil.copy(src_dockerfile, dest_dockerfile)
    
    # 2. Hugging Face용 README.md 생성 (Metadata 포함)
    hf_metadata = """---
title: Antigravity Manager Proxy
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 8045
pinned: false
---

# Antigravity Manager Cloud Deployment

이 Space는 팀 공용 Antigravity-Manager 프록시 서버입니다.

### 설정 방법 (Settings -> Variables)
1. `API_KEY`: 팀원들이 사용할 `sk-antigravity-team-shared` 또는 고유 키
2. `WEB_PASSWORD`: 관리 대시보드 로그인 비밀번호
"""
    with open(DEPLOY_DIR / "README.md", "w", encoding="utf-8") as f:
        f.write(hf_metadata)
        
    print(f"[SUCCESS] Cloud deployment files prepared at: {DEPLOY_DIR}")
    print("\n[NEXT STEPS] Hugging Face Spaces 배포 방법:")
    print("1. Hugging Face(hf.co) 가입 및 새 'Space' 생성")
    print("2. SDK를 'Docker'로 선택")
    print(f"3. {DEPLOY_DIR} 폴더의 파일들을 업로드하세요.")
    print("4. Settings 탭에서 포트(8045)와 환경변수(API_KEY, WEB_PASSWORD)를 설정하세요.")

if __name__ == "__main__":
    prepare_huggingface_space()
