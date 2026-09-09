# RPA Restart

사용자에게 할당된 RPA 과제만 보여주고 Power Automate 흐름 실행을 요청하는 Azure App Service용 포털 초안입니다.

## 로컬 실행

1. `.env`에 PostgreSQL 연결 정보를 입력합니다.
2. `db/schema.sql`을 `rpa_db`에 적용해 `rpa_restart` 스키마와 테이블을 생성합니다.
3. 초기 화면만 확인하려면 `USE_DEMO_DATA=true`를 유지합니다. 실제 DB를 확인할 때는 `false`로 변경합니다.
4. `npm install`, `npm run dev`를 실행합니다.

로컬 로그인 사용자는 `DEV_USER_EMAIL`로 지정합니다. 운영 환경에서는 이 값이 사용되지 않습니다.
현재 온프레미스 PostgreSQL처럼 SSL을 지원하지 않는 서버는 `PGSSLMODE=disable`을 사용합니다.

애플리케이션 계정에는 최소한 다음 권한이 필요합니다.

```sql
GRANT USAGE ON SCHEMA rpa_restart TO "<앱 계정>";
GRANT SELECT, INSERT, UPDATE ON rpa_restart.app_user TO "<앱 계정>";
GRANT SELECT, INSERT ON rpa_restart.user_rpa_access TO "<앱 계정>";
GRANT SELECT, INSERT ON rpa_restart.rpa_task TO "<앱 계정>";
GRANT SELECT, INSERT, UPDATE ON rpa_restart.flow_run TO "<앱 계정>";

RPA 수정 기능을 사용할 때는 다음 권한도 필요합니다.

```sql
GRANT UPDATE ON rpa_restart.rpa_task TO "<앱 계정>";
GRANT DELETE ON rpa_restart.user_rpa_access TO "<앱 계정>";
```
```

기존 DB에 관리자 기능을 추가할 때는 관리자 계정으로
`db/migrations/001_add_admin_role.sql`을 적용합니다. 이 마이그레이션은
`hyebin.park@changshininc.com`, `rpa100@changshininc.com`을 관리자로 등록합니다.

## Azure 배포 구성

- Azure App Service: Node.js 22 LTS, 시작 명령 `npm run start`
- 인증: App Service Authentication에서 Microsoft Entra ID를 활성화하고 미인증 요청은 HTTP 401로 차단
- 네트워크: App Service VNet Integration과 온프레미스 VPN/ExpressRoute, PostgreSQL 방화벽을 구성
- 앱 설정: `.env.example`의 DB 값을 App Service 환경 변수로 등록 (`USE_DEMO_DATA=false`)
- Health check: `/api/health`

앱은 Azure의 `X-MS-CLIENT-PRINCIPAL` 헤더에서 이메일을 읽습니다. 브라우저가 보낸 일반 이메일 값은 신뢰하지 않으며, 각 목록/실행 요청에서 DB 권한을 다시 확인합니다.

## Power Automate 연결

각 `rpa_task.flow_webhook_url` 또는 공통 `POWER_AUTOMATE_WEBHOOK_URL`에 HTTP 트리거 URL을 저장하면 실행 요청이 POST됩니다. 현재 UI 미리보기 모드에서는 실제 흐름을 호출하지 않습니다.
