# 찬양 콘티 (worship-setlist)

교회 찬양팀이 콘티를 짜고, 악보를 보고, 팀원과 공유하는 웹앱입니다. 모바일 홈 화면 앱(PWA)으로도 쓸 수 있습니다.

## 주요 기능

- **곡 관리**: 곡 정보, 가사, 유튜브 링크, 키별 악보 파일, 기본 악보 지정
- **콘티**: 예배별 곡 순서 정하기(드래그), 곡별 키와 멘트, 콘티 완료 처리
- **찬양 모드**: 악보 넘겨 보기, 애플펜슬/손가락 필기, 확대
- **공유**: 카카오톡으로 콘티와 악보 보내기
- **알림**: 콘티 완료 시, 예배 하루 전 팀원에게 푸시 알림
- **교회별 분리**: 교회마다 데이터가 나뉘고, 역할(관리자 · 찬양팀 · 임원 · 성도)에 따라 권한이 달라짐. 최고 관리자는 전체 교회 관리

## 기술 스택

React 19 · TypeScript · Vite · TanStack Router · Tailwind CSS 4 · Supabase(인증, DB, 스토리지, Edge Functions) · Vercel 배포

## 로컬에서 실행하기

패키지 매니저는 **pnpm**을 씁니다.

```bash
pnpm install
pnpm dev
```

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 넣어 주세요.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...   # 푸시 알림용 (없으면 기본값 사용)
```

그 밖의 명령어:

```bash
pnpm build   # 타입 검사 + 프로덕션 빌드
pnpm lint    # ESLint
```

## Supabase

- `supabase/migrations/`: DB 변경 기록. 번호 순서대로 실행합니다.
- `supabase/functions/`: Edge Functions
  - `publish-setlist`: 콘티 완료 시 팀원에게 푸시 알림
  - `setlist-reminder`: 예배 하루 전 알림
- 처음 설정하는 방법은 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)를 참고하세요.

## 폴더 구조

```
src/
  routes/      화면 (TanStack Router 파일 기반 라우팅)
  components/  공통 컴포넌트 (악보 필기 캔버스, 모달 등)
  hooks/       Supabase 데이터 조회/수정 훅
  lib/         Supabase 클라이언트, 권한, 푸시, 키 계산
  contexts/    로그인 상태
```

디자인 기준은 [DESIGN_SPECIFICATION.md](DESIGN_SPECIFICATION.md)에 있습니다.
