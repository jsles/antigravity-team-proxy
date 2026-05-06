import http.server
import socketserver
import urllib.request
import json
import os
import time
from datetime import datetime

PORT = 8045

# 통계 데이터
stats = {
    "total_requests": 0,
    "active_users": 0,
    "start_time": time.time(),
    "logs": [],
    "accounts": [
        {"id": "유료-계정-Tier-1", "status": "정상", "quota": "85%"},
        {"id": "무료-계정-Tier-2", "status": "대기", "quota": "100%"},
        {"id": "팀-공유-계정", "status": "정상", "quota": "92%"}
    ]
}

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global stats
        stats["total_requests"] += 1
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        auth_header = self.headers.get('Authorization', '')
        token = auth_header[7:].strip() if auth_header.startswith('Bearer ') else "unknown"
        username = token.split(':')[0] if ':' in token else token
        
        # 로그 추가 (사용자명 포함)
        log_entry = {
            "time": datetime.now().strftime("%H:%M:%S"),
            "method": "POST",
            "path": self.path,
            "user": username,
            "status": 200
        }
        stats["logs"].insert(0, log_entry)
        if len(stats["logs"]) > 10: stats["logs"].pop()

        # Render 서버로 전달 (업스트림)
        target_base = "https://antigravity-team-proxy.onrender.com"
        target_url = target_base + self.path
        
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ['host', 'content-length']}
        
        try:
            req = urllib.request.Request(target_url, data=post_data, headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                log_entry["status"] = response.status
                for k, v in response.getheaders():
                    self.send_header(k, v)
                self.end_headers()
                self.wfile.write(response.read())
        except Exception as e:
            self.send_response(500)
            log_entry["status"] = 500
            self.end_headers()
            self.wfile.write(str(e).encode())

    def do_GET(self):
        if self.path == "/stats":
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            uptime = int(time.time() - stats["start_time"])
            stats["uptime"] = f"{uptime // 3600}h {(uptime % 3600) // 60}m {uptime % 60}s"
            self.wfile.write(json.dumps(stats).encode())
        elif self.path == "/dashboard":
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            # dashboard.html 파일 내용 읽기
            html_path = "C:/Users/user/.gemini/antigravity/brain/ab8d49f3-7486-4828-b55e-f1b1db79c30f/proxy_dashboard.html"
            with open(html_path, "r", encoding="utf-8") as f:
                self.wfile.write(f.read().encode())
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write("Antigravity Proxy is Running. Visit /dashboard for monitoring.".encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"[INFO] Minimal Proxy Server running on port {PORT}")
        httpd.serve_forever()
