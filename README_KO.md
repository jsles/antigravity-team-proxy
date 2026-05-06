# Antigravity Tools 팀 가이드 🚀

본 가이드는 팀 내 구축된 **Antigravity-Manager 프록시 서버**를 통해, 팀원들이 하나의 통합된 환경에서 Gemini API를 효율적으로 사용할 수 있도록 안내합니다.

## 🔑 1. 접속 정보 (공통)

팀원들이 각자의 도구(VS Code, Python 등)에 입력해야 할 설정값입니다.

*   **API Base URL**: `https://antigravity-team-proxy.onrender.com/v1`
*   **API Key**: `sk-antigravity-team-shared`
*   **지원 모델**: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-pro`

---

## 🛠️ 2. 도구별 설정 방법

### A. VS Code (Roo Code / Continue / Cline 등 활용 시)

가장 많이 사용하는 **Roo Code**(구 Roo Cline)를 기준으로 설명합니다.

1.  확장 프로그램 설정에서 **Provider**를 `OpenAI Compatible`로 선택합니다.
2.  **Base URL** 칸에 `https://antigravity-team-proxy.onrender.com/v1`를 입력합니다.
3.  **API Key** 칸에 `sk-antigravity-team-shared`를 입력합니다.
4.  **Model ID**에 `gemini-1.5-pro` 또는 `gemini-1.5-flash`를 입력합니다.

이제 안티그래비티 프록시를 통해 Gemini와 대화를 시작할 수 있습니다!

### B. Python SDK (개발자용)

코드 내에서 직접 호출할 때 사용하는 예시입니다.

```python
import openai

client = openai.OpenAI(
    api_key="sk-antigravity-team-shared",
    base_url="https://antigravity-team-proxy.onrender.com/v1"
)

response = client.chat.completions.create(
    model="gemini-1.5-pro",
    messages=[{"role": "user", "content": "안녕, 오늘 날씨 어때?"}]
)

print(response.choices[0].message.content)
```

---

## 💡 팁 및 주의사항

*   **모델 선택**: 복잡한 코딩이나 논리적 추론이 필요할 때는 `gemini-1.5-pro`를, 빠른 응답이나 간단한 질문에는 `gemini-1.5-flash`를 권장합니다.
*   **보안**: 공유 API Key(`sk-antigravity-team-shared`)는 팀 내부용이므로 외부에 유출되지 않도록 주의해 주세요.
*   **속도 제한**: 프록시 서버에서 자동으로 계정을 로테이션하며 속도 제한을 관리하지만, 과도한 연발 호출은 지연을 발생시킬 수 있습니다.

---

Copyright © 2026 **Antigravity Team**
