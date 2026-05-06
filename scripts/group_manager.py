import json
import os
import requests
import sys
import time
from pathlib import Path

# 설정 경로 (README 및 소스 코드 기반)
HOME = Path.home()
DATA_DIR = HOME / ".antigravity_tools"
CONFIG_FILE = DATA_DIR / "gui_config.json"
MCP_CONFIG_FILE = DATA_DIR / "mcp_config.json"

def init_env():
    """데이터 디렉토리 초기화"""
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        print(f"[INFO] Created directory: {DATA_DIR}")

def generate_team_config(admin_password="admin-password-123"):
    """37인 팀을 위한 기본 gui_config.json 생성"""
    config = {
        "proxy": {
            "enabled": True,
            "allow_lan_access": True,  # 팀원 접속 허용
            "port": 8045,
            "api_key": "sk-antigravity-team-shared",  # 팀 공용 API Key
            "admin_password": admin_password,
            "auto_start": True,
            "request_timeout": 120,
            "enable_logging": True,
            "proxy_pool": {
                "enabled": True,
                "health_check_interval": 300,
                "auto_failover": True,
                "strategy": "priority",  # Tier 1/2 전략을 위해 우선순위 기반 선택
                "proxies": []
            }
        },
        "general": {
            "theme": "dark"
        }
    }
    
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=4, ensure_ascii=False)
    print(f"[INFO] Team config generated at {CONFIG_FILE}")

def setup_mcp_template():
    """팀 공용 MCP 설정 템플릿 생성"""
    mcp_config = {
        "mcpServers": {
            "team-knowledge": {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-memory"],
                "env": {
                    "MEMORY_FILE": str(DATA_DIR / "team_memory.json")
                }
            },
            "web-search": {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-google-search"],
                "env": {
                    "GOOGLE_API_KEY": "YOUR_GOOGLE_SEARCH_API_KEY",
                    "GOOGLE_CX": "YOUR_CX_ID"
                }
            }
        }
    }
    with open(MCP_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(mcp_config, f, indent=4, ensure_ascii=False)
    print(f"[INFO] MCP config template created at {MCP_CONFIG_FILE}")

def test_proxy_connectivity(api_key="sk-antigravity-team-shared"):
    """로컬 프록시 연결 및 계정 전환 로직 검증"""
    url = "http://127.0.0.1:8045/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gemini-3-flash",
        "messages": [{"role": "user", "content": "Hello, Antigravity!"}]
    }
    
    print(f"[TEST] Testing proxy at {url}...")
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            print("[SUCCESS] Proxy is responding correctly.")
            print(f"[DATA] Response: {response.json()['choices'][0]['message']['content'][:50]}...")
        else:
            print(f"[FAILED] Proxy returned status {response.status_code}")
            print(f"[ERROR] {response.text}")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")

def simulate_429_fallback():
    """429 에러 발생 시 폴백 로직 시뮬레이션 (로직 검증용)"""
    print("[SIMULATION] Testing 429 Fallback Strategy...")
    # 실제 서버가 429를 반환할 때 TokenManager가 다른 키로 교체하는지 로그를 확인해야 함
    print("[INFO] Please check 'gui_config.json' proxy_pool logic and logs for 'Dynamic-Model-Rewrite'")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Antigravity Manager Group Setup Tool")
    parser.add_argument("--init", action="store_true", help="Initialize environment and config")
    parser.add_argument("--test", action="store_true", help="Test local proxy connectivity")
    
    args = parser.parse_args()
    
    init_env()
    if args.init:
        generate_team_config()
        setup_mcp_template()
    if args.test:
        test_proxy_connectivity()
    
    if not any(vars(args).values()):
        parser.print_help()
