# Cafe24 상세페이지 자동화 프로젝트 Context

## 1. 프로젝트 목적
대산우드랜드 카페24 쇼핑몰 상품 상세설명(`{$product_detail}`) 영역에 삽입할 HTML과 보조 인포그래픽 이미지를 구글 시트 데이터를 기반으로 자동 생성 및 관리하는 시스템 구축.

## 2. 주요 문서 및 가이드라인
- **디자인 규칙서**: [상세_design.md](file:///Users/zart/Library/Mobile%20Documents/com~apple~CloudDocs/프로젝트/cafe24_detail_ver10/상세페이지/상세_design.md)
  - 클래스 prefix `ds-` 사용, 최대 너비 790px, 브랜드 전용 컬러 8종 한정, 버튼 호버 `opacity: 0.92` 등 상세 규칙 규정.
- **HTML 생성 프롬프터**: [상세_프롬프터.md](file:///Users/zart/Library/Mobile%20Documents/com~apple~CloudDocs/프로젝트/cafe24_detail_ver10/상세페이지/상세_프롬프터.md)
  - 구글 시트 데이터를 결합하여 GPT-4o를 통해 상세 HTML을 일관된 구조로 생성하기 위한 프롬프트 가이드.
- **인포그래픽 사양서 (Type A/B/C)**:
  - [인포_타입A.md](file:///Users/zart/Library/Mobile%20Documents/com~apple~CloudDocs/프로젝트/cafe24_detail_ver10/상세페이지/인포_타입A.md): 수치형 비교 및 핵심 스펙 강조용.
  - [인포_타입B.md](file:///Users/zart/Library/Mobile%20Documents/com~apple~CloudDocs/프로젝트/cafe24_detail_ver10/상세페이지/인포_타입B.md): 내부 적층 및 단면/결합 구조 도해용.
  - [인포_타입C.md](file:///Users/zart/Library/Mobile%20Documents/com~apple~CloudDocs/프로젝트/cafe24_detail_ver10/상세페이지/인포_타입C.md): 표면 질감, 무늬, 마감 특성 중심 시각화용 (신규).

## 3. 구글 스프레드시트 연동 및 자동화
- **연동 대상 시트**: `https://docs.google.com/spreadsheets/d/1N11hwkpsc2T9ix4CBbqpkrZKko6RvRreSz4N8Ix2mME` (시트4)
- **개발된 스크립트**: [gas/auto_pdp_generator.gs](file:///Users/zart/Library/Mobile%20Documents/com~apple~CloudDocs/프로젝트/cafe24_detail_ver10/gas/auto_pdp_generator.gs)
  - **`onEdit(e)` 트리거**: 시트 19열(S: 인포생성) 혹은 20열(T: HTML생성) 체크박스 체크 시 해당 줄의 데이터를 읽어 생성 로직 자동 가동.
  - **수동/테스트 지원**: `testRow13()`, `testRow13HTML()` 함수를 제공하여 에디터상에서 개별 테스트 가능 및 이벤트 객체 미전달 시 '시트4' 자동 바인딩 방어 로직 적용.
- **배포 방식 (clasp)**:
  - `/gas` 디렉토리 내에 `.clasp.json` 및 `appsscript.json`이 구성되어 있어 `clasp push`를 통해 스프레드시트로 즉시 빌드 및 배포가 가능함.

## 4. 최근 변경 및 진행 상태
- MDF 상세페이지 테스트 HTML(`상세페이지/mdf_pdp_v10.html`) 수정본 생성 및 검증 완료. (카페24 전용 이미지 URL 지정 및 alt 수정, 호버 불투명도 및 모바일 테이블 반응형 처리 완료)
- 인포그래픽 Type C 사양 문서 신규 생성 및 적용.
- Google Apps Script 수동 실행 방어 코드 및 시트 강제 바인딩 보강 후 스프레드시트 업로드 완료.
