const PRODUCT_CATEGORY_GUIDES = [
  {
    name: '사이드핑거 집성판',
    keywords: ['사이드핑거', '사이드 핑거', 'side finger'],
    keyValue: '사이드핑거 집성 구조',
    structure: '폭 방향으로 접합한 목재의 측면 접합부에 핑거조인트가 적용된 집성판',
    emphasisCandidates: ['측면 접합부', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '폭 방향으로 접합한 목재의 측면 접합부에 핑거조인트가 적용된 집성 구조',
    infographicKeywords: ['집성 목재', '집성 접합부', '측면 핑거조인트', '목재 결 방향'],
    forbiddenKeywords: ['단판 적층', '3~13겹', 'Veneer Layer', '교차 적층', '표면 전체에 과한 톱니 패턴'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '탑핑거 집성판',
    keywords: ['탑핑거', '탑 핑거', 'top finger'],
    keyValue: '탑핑거 집성 구조',
    structure: '집성 목재의 상판 면에 핑거조인트가 보일 수 있는 집성판',
    emphasisCandidates: ['상판 접합부', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '집성 목재의 상판 면 또는 길이 방향 접합부에 핑거조인트가 보이는 집성 구조',
    infographicKeywords: ['집성 목재', '상판 핑거조인트', '집성 접합부', '목재 결 방향'],
    forbiddenKeywords: ['단판 적층', '3~13겹', 'Veneer Layer', '교차 적층', '합판식 레이어 단면'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '핑거조인트 집성판',
    keywords: ['핑거', 'fj', 'finger'],
    keyValue: '핑거조인트 집성 구조',
    structure: '집성 목재의 접합부에 핑거조인트가 적용된 집성판',
    emphasisCandidates: ['접합부 상태', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '폭 방향으로 접합한 목재의 일부 접합부에 핑거조인트가 적용된 집성 구조',
    infographicKeywords: ['집성 목재', '핑거조인트', '집성 접합부', '목재 결 방향'],
    forbiddenKeywords: ['단판 적층', 'Veneer', '3~13겹', '교차 적층', '합판식 레이어 단면'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '솔리드 집성판',
    keywords: ['솔리드', 'solid'],
    keyValue: '집성 목재 구조',
    structure: '폭 방향으로 접합한 목재로 제작한 집성판',
    emphasisCandidates: ['접착 상태', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '폭 방향으로 접합한 목재로 제작한 솔리드 집성 구조',
    infographicKeywords: ['집성 목재', '집성 접합부', '목재 결 방향', '집성 구조'],
    forbiddenKeywords: ['핑거조인트', 'Finger Joint', '톱니형 접합', '길이 방향 접합', '단판 적층', '3~13겹', 'Veneer Layer', '교차 적층'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '집성목 / 집성판',
    keywords: ['집성', '집성목', '집성판'],
    keyValue: '집성 목재 구조',
    structure: '폭 방향으로 접합한 목재로 제작한 집성판',
    emphasisCandidates: ['접착 상태', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '폭 방향으로 접합한 목재로 제작한 집성 구조',
    infographicKeywords: ['집성 목재', '집성 접합부', '목재 결 방향', '집성 구조'],
    forbiddenKeywords: ['핑거조인트', 'Finger Joint', '톱니형 접합', '단판 적층', 'Veneer', '3~13겹', '교차 적층'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '자작합판',
    keywords: ['자작합판', '자작 합판', '자작나무합판', '자작나무 합판', 'birch plywood', 'birch ply'],
    keyValue: '앞면·뒷면 표면 상태를 확인하는 자작합판',
    structure: '얇은 목재 단판을 결 방향이 교차하도록 여러 겹 적층한 판재',
    emphasisCandidates: ['앞·뒷면 등급', '패치·필러 상태', '노출면', '재단 방향'],
    useCandidates: ['가구 제작', '캐비닛 제작', '인테리어 노출 패널 제작'],
    infographicStructure: '얇은 단판의 여러 겹 교차 적층과 앞면·뒷면 표면을 보여주는 구조',
    infographicKeywords: ['단판', '교차 적층', '앞면', '뒷면', '측면 적층 단면'],
    forbiddenKeywords: ['접착제', '접착층', '접착부', 'Glue Line', '본드층', '접착선 확대', '등급별 강도 비교', '패치 개수 생성', '전층 자작 단정'],
    priorityMetrics: ['앞·뒷면 표면 등급', '표면 상태', '두께', '규격']
  },
  {
    name: '합판',
    keywords: ['합판', 'plywood', '베니어', 'veneer'],
    keyValue: '단판 교차 적층 구조',
    structure: '원목 단판(Veneer)을 교차 적층한 판재',
    emphasisCandidates: ['재단 치수', '표면 상태', '마감 방향'],
    useCandidates: ['가구 심재', '벽체 바탕재', '인테리어 제작'],
    infographicStructure: '목재 단판(Veneer)을 교차 적층한 구조',
    infographicKeywords: ['단판', '교차 적층', '앞면', '뒷면', '측면 적층 단면', 'Veneer', 'Layer'],
    forbiddenKeywords: ['라멜', '집성', '핑거조인트', '접착제', '접착층', '접착부', 'Glue Line', '본드층', '접착선 확대'],
    priorityMetrics: ['앞·뒷면 표면 상태', '두께', '규격', '방출등급']
  },
  {
    name: 'MDF',
    keywords: ['mdf', '엠디에프'],
    keyValue: '목재 섬유 압축 구조',
    structure: '목재 섬유를 고온고압으로 성형한 판재',
    emphasisCandidates: ['표면 상태', '도장 조건', '재단 치수'],
    useCandidates: ['가구 문짝', '몰딩', '도장 마감', '가구 문짝 필름 래핑 작업'],
    infographicStructure: '목재 섬유 압축 성형 구조',
    infographicKeywords: ['목재섬유', '고밀도 압축', '균일 구조'],
    forbiddenKeywords: ['단판 적층', '라멜 집성'],
    priorityMetrics: ['E0/E1', '밀도']
  },
  {
    name: 'PB / 파티클보드',
    keywords: ['pb', '파티클', 'particle'],
    keyValue: '우드칩 압축 구조',
    structure: '우드칩과 접착제를 압축 성형한 판재',
    emphasisCandidates: ['절단면', '표면 마감', '체결 위치'],
    useCandidates: ['가구 심재', '선반', '실내 제작'],
    infographicStructure: '우드칩과 접착제를 압축 성형한 구조',
    infographicKeywords: ['Wood Chip', 'Resin', 'Pressed Core'],
    forbiddenKeywords: ['단판 적층', '라멜 집성', '석고 코어'],
    priorityMetrics: ['E0/E1', '밀도']
  },
  {
    name: '석고보드',
    keywords: ['석고', 'gypsum'],
    keyValue: '석고 코어 구조',
    structure: '석고 코어 양면에 원지를 결합한 판재',
    emphasisCandidates: ['이음부 처리', '고정 방식', '퍼티 마감'],
    useCandidates: ['벽체 시공', '천장 시공', '칸막이 시공'],
    infographicStructure: '석고 코어 양면에 원지를 결합한 구조',
    infographicKeywords: ['원지', '석고 코어', '원지'],
    forbiddenKeywords: ['단판 적층', '라멜 집성', '목재 섬유 압축'],
    priorityMetrics: ['KS', '방화', '방수', '차음']
  },
  {
    name: 'CRC / 시멘트보드 / 섬유시멘트보드',
    keywords: ['crc', '시멘트보드', '시멘트 보드', '섬유시멘트', 'fiber cement'],
    keyValue: '시멘트계 보드 구조',
    structure: '시멘트계 원료와 섬유질 원료를 압축 성형한 보드',
    emphasisCandidates: ['절단면 처리', '고정 방식', '마감 조건'],
    useCandidates: ['실내 벽체 바탕재', '천장 바탕재', '외장 바탕재'],
    infographicStructure: '시멘트계 원료와 섬유질 원료를 압축 성형한 구조',
    infographicKeywords: ['Cement Matrix', 'Fiber Reinforcement', 'Pressed Board'],
    forbiddenKeywords: ['단판 적층', '라멜 집성', '석고 코어'],
    priorityMetrics: ['불연성', '밀도', '휨강도', '흡수율']
  },
  {
    name: 'PF보드',
    keywords: ['pf', '피에프', '페놀', 'phenol'],
    keyValue: '페놀폼 복합 구조',
    structure: '페놀폼 코어와 면재를 복합한 단열재',
    emphasisCandidates: ['단열 연속성', '이음부 처리', '마감 조건'],
    useCandidates: ['외벽 단열', '천장 단열', '지붕 단열'],
    infographicStructure: '페놀수지 발포 단열재 코어에 면재를 복합한 구조',
    infographicKeywords: ['Facing', 'PF Foam Core', 'Facing'],
    forbiddenKeywords: ['단판 적층', '라멜 집성', '석고 코어'],
    priorityMetrics: ['열전도율', '준불연', '밀도', '두께']
  },
  {
    name: 'XPS',
    keywords: ['xps', '아이소핑크', '압출법', '압출 단열'],
    keyValue: '폐쇄셀 압출 단열재',
    structure: '압출법 폴리스티렌 폐쇄셀 구조',
    emphasisCandidates: ['이음부', '압축 하중', '시공 방향'],
    useCandidates: ['바닥 단열', '외벽 단열', '기초 단열'],
    infographicStructure: '폴리스티렌 수지를 압출 발포한 폐쇄 셀 구조',
    infographicKeywords: ['Closed Cell Foam', 'Extruded Polystyrene', 'Uniform Foam Core'],
    forbiddenKeywords: ['PF Core', 'Glass Wool Fiber', '단판 적층', '라멜 집성'],
    priorityMetrics: ['열전도율', '압축강도', '밀도']
  },
  {
    name: 'EPS',
    keywords: ['eps', '스티로폼', '비드법', '비드 단열'],
    keyValue: '비드 발포 단열재',
    structure: '비드 발포 폴리스티렌 구조',
    emphasisCandidates: ['손상 방지', '마감재 접합', '이음부 처리'],
    useCandidates: ['외단열', '충전 단열'],
    infographicStructure: '폴리스티렌 비드를 발포 성형한 단열재',
    infographicKeywords: ['Expanded Bead', 'EPS Foam', 'Bead Structure'],
    forbiddenKeywords: ['압출 발포 구조', 'PF Core', 'Glass Wool Fiber', '단판 적층'],
    priorityMetrics: ['열전도율', '밀도', '난연 등급']
  },
  {
    name: '글라스울',
    keywords: ['글라스울', 'glass wool'],
    keyValue: '유리섬유 단열재',
    structure: '유리섬유 매트 구조',
    emphasisCandidates: ['방습층', '보호구 착용', '충진 상태'],
    useCandidates: ['천장 단열', '흡음 시공', '벽체 충진'],
    infographicStructure: '유리섬유를 솜 형태로 집합한 섬유계 단열재',
    infographicKeywords: ['Glass Fiber', 'Fiber Mat', 'Air Layer'],
    forbiddenKeywords: ['발포 코어', '단판 적층', '라멜 집성'],
    priorityMetrics: ['밀도', '열전도율', '흡음률', '불연성']
  },
  {
    name: '미네랄울 / 암면',
    keywords: ['미네랄울', '암면', 'mineral wool', 'rock wool'],
    keyValue: '광물섬유 단열재',
    structure: '광물섬유 매트 구조',
    emphasisCandidates: ['밀착 시공', '이음부', '방습층'],
    useCandidates: ['내화 시공', '흡음 시공', '외벽 단열'],
    infographicStructure: '광물 섬유를 매트 또는 보드 형태로 성형한 단열재',
    infographicKeywords: ['Mineral Fiber', 'Fiber Mat', 'Board Form'],
    forbiddenKeywords: ['발포 코어', '단판 적층', '라멜 집성'],
    priorityMetrics: ['밀도', '열전도율', '내화', '불연성']
  },
  {
    name: 'PIR / 우레탄폼',
    keywords: ['pir', '우레탄', 'urethane'],
    keyValue: 'PIR 복합 단열 구조',
    structure: 'PIR 또는 우레탄 발포 코어와 면재를 복합한 단열재',
    emphasisCandidates: ['단열 연속성', '이음부 처리', '마감 조건'],
    useCandidates: ['외벽 단열', '지붕 단열', '냉동창고 단열'],
    infographicStructure: '우레탄 또는 PIR 발포 단열재 코어에 면재를 결합한 구조',
    infographicKeywords: ['Facing', 'Urethane/PIR Foam Core', 'Facing'],
    forbiddenKeywords: ['PF Core로 단정', 'Glass Wool Fiber', '단판 적층'],
    priorityMetrics: ['열전도율', '난연', '준불연', '밀도']
  },
  {
    name: '열반사 단열재',
    keywords: ['열반사', '반사 단열', '알루미늄 필름'],
    keyValue: '반사층 복합 구조',
    structure: '반사 필름과 공기층을 이용한 복합 단열 구조',
    emphasisCandidates: ['공기층 확보', '시공 방향', '이음부 처리'],
    useCandidates: ['지붕 단열', '천장 단열', '배관 보온'],
    infographicStructure: '반사 필름과 공기층 또는 완충재를 결합한 구조',
    infographicKeywords: ['Reflective Film', 'Air Layer', 'Cushion Layer'],
    forbiddenKeywords: ['발포 코어 단정', '단판 적층', '라멜 집성'],
    priorityMetrics: ['반사율', '방사율', '두께']
  },
  {
    name: '데크재',
    keywords: ['데크재', 'deck', '멀바우', '모말라', '방킬라이', '이페', '캠파스', '큐링'],
    keyValue: '실외 바닥용 목재 데크재',
    structure: '실외 바닥이나 테라스 시공에 사용하는 장척 목재 자재',
    emphasisCandidates: ['수종', '표면 상태', '고정 방식', '시공 간격'],
    useCandidates: ['테라스 바닥 시공', '외부 데크 시공', '조경 바닥 마감'],
    infographicStructure: '노출 상판, 길이 방향 목재 결, 측면 단면, 피스 고정 위치와 데크 간격을 보여주는 구조',
    infographicKeywords: ['노출 상판', '길이 방향 목재 결', '측면 단면', '피스 고정 위치', '데크 간격'],
    forbiddenKeywords: ['단판 적층', 'MDF 압축 코어', 'PB 우드칩 코어', '석고 코어', '단열재 코어', '방부 등급 수치 생성'],
    priorityMetrics: ['수종', '폭', '두께', '길이', '표면 상태', '고정 방식', '시공 간격']
  },
  {
    name: '각재',
    keywords: ['각재', 'kd'],
    keyValue: '목재 각재 구조',
    structure: '목재를 사각 단면으로 제재하거나 건조 가공한 자재',
    emphasisCandidates: ['단면 치수', '건조 상태', '절단 길이'],
    useCandidates: ['실내 목공 골조 작업', '벽체 보강틀 시공', '가구 프레임 제작'],
    infographicStructure: '사각 단면 목재를 길이 방향으로 제재한 구조',
    infographicKeywords: ['Square Section', 'Wood Grain', 'Cut Length'],
    forbiddenKeywords: ['단판 적층', '발포 코어', '석고 코어'],
    priorityMetrics: ['수종', '함수율', '단면 치수']
  },
  {
    name: '구조재',
    keywords: ['구조재', '구조목'],
    keyValue: '목조 구조용 목재',
    structure: '목재를 구조용 단면으로 제재하거나 건조 가공한 자재',
    emphasisCandidates: ['단면 치수', '건조 상태', '사용 부위'],
    useCandidates: ['목조 골조 시공', '벽체 하지틀 작업', '지붕 구조 보강 작업'],
    infographicStructure: '구조용 목재 단면과 길이 방향 결을 보여주는 구조',
    infographicKeywords: ['Structural Lumber', 'Wood Grain', 'Framing'],
    forbiddenKeywords: ['단판 적층', '발포 코어', '석고 코어'],
    priorityMetrics: ['수종', '건조 상태', '단면 치수']
  },
  {
    name: '방부목',
    keywords: ['방부목', '방부 목재', 'treated wood'],
    keyValue: '방부 처리 목재',
    structure: '목재에 방부 처리를 적용한 실외용 목재 자재',
    emphasisCandidates: ['사용 환경', '절단면 처리', '고정 방식'],
    useCandidates: ['데크 하지틀 시공', '외부 목재 구조 작업', '조경 시설물 제작'],
    infographicStructure: '목재 단면과 방부 처리층을 구분해 보여주는 구조',
    infographicKeywords: ['Treated Wood', 'Wood Grain', 'Cut Edge'],
    forbiddenKeywords: ['단판 적층', '발포 코어', '석고 코어'],
    priorityMetrics: ['방부 처리', '수종', '사용 환경']
  },
  {
    name: '이보드',
    keywords: ['이보드', 'e보드', 'e-board'],
    keyValue: '복합 단열 보드',
    structure: '단열 코어와 표면 마감층을 결합한 복합 보드',
    emphasisCandidates: ['이음부 처리', '고정 방식', '마감 조건'],
    useCandidates: ['실내 벽체 단열 시공', '결로 보완 단열 작업', '벽면 마감 하지 작업'],
    infographicStructure: '단열 코어와 표면 마감층을 결합한 복합 단열 보드 구조',
    infographicKeywords: ['Insulation Core', 'Facing Layer', 'Board Joint'],
    forbiddenKeywords: ['단판 적층', '라멜 집성', '석고 코어 단정'],
    priorityMetrics: ['두께', '단열 성능', '마감층']
  },
  {
    name: 'GCS보드',
    keywords: ['gcs', 'gcs보드', 'gcs 보드'],
    keyValue: '복합 단열 보드',
    structure: '단열 코어와 보드형 면재를 결합한 복합 단열재',
    emphasisCandidates: ['이음부 처리', '고정 방식', '마감 조건'],
    useCandidates: ['실내 벽체 단열 시공', '천장 단열 보강 작업', '벽면 마감 하지 작업'],
    infographicStructure: '단열 코어와 보드형 면재를 결합한 복합 단열 구조',
    infographicKeywords: ['Insulation Core', 'Board Facing', 'Joint'],
    forbiddenKeywords: ['단판 적층', '라멜 집성', '석고 코어 단정'],
    priorityMetrics: ['두께', '단열 성능', '면재']
  }
];

const WOOD_SPECIES_KNOWLEDGE = [
  { id: 'RED_PINE_TRADE', standardName: '레드파인', aliases: ['레드파인', 'red pine'], scientificName: '', identificationLevel: 'TRADE_NAME_UNVERIFIED', appearance: null, referenceUses: ['제재목', '가구 및 인테리어 목공', '포장용 목재'], verifiedProductUses: [], purchaseChecks: ['실제 수종 또는 원산지 표시', '유절·무절 구분', '옹이와 표면 상태'], variationNotice: '실제 수종과 표면 상태는 개별 제품 정보를 확인합니다.' },
  { id: 'RADIATA_PINE', standardName: '라디에타파인', aliases: ['라디에타파인', '라디아타파인', 'radiata pine', 'monterey pine'], scientificName: 'Pinus radiata', identificationLevel: 'EXACT', appearance: '밝은 색감과 소나무 결이 나타날 수 있습니다.', referenceUses: ['가구', '몰딩', '패널', '인테리어 목공'], verifiedProductUses: [], purchaseChecks: ['유절·무절 구분', '옹이와 송진 흔적', '표면 상태'], variationNotice: '색감과 결, 옹이 상태는 개별 제품마다 다를 수 있습니다.' },
  { id: 'LAUAN_MERANTI_GROUP', standardName: '라왕', aliases: ['라왕', 'lauan', 'meranti', 'philippine mahogany'], scientificName: 'Shorea spp. 등', identificationLevel: 'GROUP', appearance: '밝은 색부터 황갈색·적갈색까지 다양한 색감과 결이 나타날 수 있습니다.', referenceUses: ['가구', '캐비닛', '몰딩', '인테리어 목공'], verifiedProductUses: [], purchaseChecks: ['세부 수종 또는 수종 그룹', '표면 색상과 무늬', '옹이와 보수 상태'], variationNotice: '라왕은 여러 수종을 포함하며 세부 수종과 제품에 따라 외관이 달라질 수 있습니다.' },
  { id: 'BIRCH_GROUP', standardName: '자작나무', aliases: ['자작나무', '자작', 'birch'], scientificName: 'Betula spp.', identificationLevel: 'GROUP', appearance: '밝은 색감과 비교적 곱고 잔잔한 결이 나타날 수 있습니다.', referenceUses: ['가구', '캐비닛', '도어', '인테리어 목공'], verifiedProductUses: [], purchaseChecks: ['세부 자작 수종', '색상 편차', '옹이와 보수 흔적'], variationNotice: '세부 수종과 선별 상태에 따라 색감과 표면 특징이 달라질 수 있습니다.' },
  { id: 'ASH_GROUP', standardName: '애쉬', aliases: ['애쉬', '물푸레나무', 'ash'], scientificName: 'Fraxinus spp.', identificationLevel: 'GROUP', appearance: '밝은 갈색 바탕과 굵은 나뭇결이 나타날 수 있습니다.', referenceUses: ['가구', '캐비닛', '실내 목공'], verifiedProductUses: [], purchaseChecks: ['세부 애쉬 수종', '집성 스트립 색상 편차', '결 방향과 옹이 상태'], variationNotice: '세부 수종과 집성 스트립 구성에 따라 색감과 결이 달라질 수 있습니다.' },
  { id: 'HINOKI', standardName: '편백', aliases: ['히노끼', '히노키', '편백', 'hinoki', 'japanese cypress'], scientificName: 'Chamaecyparis obtusa', identificationLevel: 'EXACT', appearance: '밝은 색감과 고운 결이 나타날 수 있습니다.', referenceUses: ['건축 내장재', '가구', '생활 목제품', '인테리어 목공'], verifiedProductUses: [], purchaseChecks: ['유절·무절 구분', '옹이와 색상 편차', '표면 마감'], variationNotice: '색감과 결, 옹이와 향의 정도는 개별 제품마다 다를 수 있습니다.' },
  { id: 'OAK_GROUP', standardName: '오크', aliases: ['오크', 'oak', '참나무류'], scientificName: 'Quercus spp.', identificationLevel: 'GROUP', appearance: '황갈색 계열의 바탕과 굵은 결, 방사조직 무늬가 나타날 수 있습니다.', referenceUses: ['가구', '캐비닛', '도어', '상판', '인테리어 목공'], verifiedProductUses: [], purchaseChecks: ['세부 오크 수종', '결과 무늬 방향', '색상 편차와 옹이 상태'], variationNotice: '세부 수종과 제재 방향에 따라 색감과 무늬가 달라질 수 있습니다.' }
];

const VERIFIED_GLUED_WOOD_PRODUCT_USES = {
  '레드파인 집성판 솔리드': { use1: '가구 제작 및 선반 제작', use2: '계단재 및 인테리어 마감' },
  '라디에타파인 솔리드': { use1: '가구 제작 및 실내 인테리어', use2: '선반 제작 및 계단재' },
  '라왕 집성판 사이드핑거': { use1: '가구 제작 및 선반 시공', use2: '계단재 및 인테리어 마감 작업' },
  '자작나무 집성판 사이드핑거': { use1: '가구 제작 및 인테리어 마감', use2: '선반 제작 및 계단재' },
  '애쉬 집성판 사이드핑거': { use1: '가구 및 선반 제작', use2: '계단재 및 인테리어 마감' },
  '히노끼(편백) 집성판 사이드핑거(유절/무절)': { use1: '가구 제작 및 인테리어 마감', use2: '선반 제작 및 계단재' },
  '히노끼(편백) 집성판 솔리드(유절/무절)': { use1: '가구 제작 시공', use2: '인테리어 마감재 작업' }
};

const APPROVED_GLUED_WOOD_TYPE_C_COPY = {
  '고무나무 집성판 탑핑거': {
    title: '고무나무 집성판 탑핑거',
    heroCopy: '밝은 황갈색과 차분한 나뭇결이 이어지는 고무나무 집성판',
    appearance: { color: ['밝은 황갈색과 연한 베이지 색감'], grain: ['차분하고 고르게 이어지는 나뭇결'], knots: [], texture: ['비교적 고른 표면 인상'], scent: [], workability: [] },
    surfaceOptions: [],
    jointType: 'TOP_FINGER',
    jointTitle: '탑핑거 집성',
    jointCaption: '목재 스트립의 길이를 연장하기 위해 상판 길이 이음부를 핑거조인트로 연결한 방식',
    identificationLevel: 'TRADE_NAME_UNVERIFIED',
    restrictions: ['건강·성능·품질 우열 생성 금지', '승인되지 않은 수종 특징 생성 금지', 'H/K 원문 출력 금지']
  },
  '레드파인 집성판 솔리드': {
    title: '레드파인 집성판 솔리드',
    heroCopy: '따뜻한 색감과 자연스러운 옹이가 어우러진 레드파인',
    appearance: { color: ['따뜻한 밝은 색감', '은은한 붉은 기'], grain: [], knots: ['자연스러운 옹이'], texture: ['유절 목재 표면'], scent: ['은은한 천연 나무 향'], workability: [] },
    surfaceOptions: [{ title: '유절', caption: '옹이가 드러나는 표면 옵션' }],
    jointType: 'SOLID',
    jointTitle: '솔리드 집성',
    jointCaption: '긴 목재 스트립을 나란히 배치한 폭 방향 접합'
  },
  '라디에타파인 솔리드': {
    title: '라디에타파인 솔리드',
    heroCopy: '밝은 색감과 자연스러운 나뭇결이 돋보이는 라디에타파인',
    appearance: { color: ['밝은 색감'], grain: ['자연스럽게 이어지는 나뭇결'], knots: ['옵션에 따라 달라지는 옹이 노출'], texture: [], scent: [], workability: ['비교적 가볍고 재단과 가공을 고려하기 좋은 목재'] },
    surfaceOptions: [
      { title: '양면유절', caption: '양쪽 면에 옹이가 드러나는 표면 옵션' },
      { title: '양면무절', caption: '양쪽 면을 무절로 구분한 표면 옵션' },
      { title: '일면무절', caption: '한쪽 면을 무절로 구분한 표면 옵션' }
    ],
    jointType: 'SOLID',
    jointTitle: '솔리드 집성',
    jointCaption: '긴 목재 스트립을 나란히 배치한 폭 방향 접합'
  },
  '라왕 집성판 사이드핑거': {
    title: '라왕 집성판 사이드핑거',
    heroCopy: '제품마다 다른 색감과 무늬를 살린 라왕 계열 집성판',
    appearance: { color: ['제품에 따라 보이는 붉은 기'], grain: ['자연스러운 무늬결'], knots: [], texture: ['제품별로 달라지는 표면 인상'], scent: [], workability: ['가구 제작과 가공 작업에 쓰는 목재'] },
    surfaceOptions: [],
    jointType: 'SIDE_FINGER',
    jointTitle: '사이드핑거 집성',
    jointCaption: '목재 스트립의 길이 이음부를 긴 측면에서 보여주는 핑거조인트 방식'
  },
  '자작나무 집성판 사이드핑거': {
    title: '자작나무 집성판 사이드핑거',
    heroCopy: '밝은 색감과 곱고 선명한 결이 돋보이는 자작나무',
    appearance: { color: ['맑고 밝은 색감'], grain: ['곱고 선명한 나뭇결'], knots: [], texture: ['화사한 표면 인상'], scent: [], workability: [] },
    surfaceOptions: [],
    jointType: 'SIDE_FINGER',
    jointTitle: '사이드핑거 집성',
    jointCaption: '목재 스트립의 길이 이음부를 긴 측면에서 보여주는 핑거조인트 방식'
  },
  '애쉬 집성판 사이드핑거': {
    title: '애쉬 집성판 사이드핑거',
    heroCopy: '밝은 톤과 선명한 나뭇결을 살린 애쉬 집성판',
    appearance: { color: ['자연스럽고 밝은 목재 톤'], grain: ['곧게 이어지는 선명한 나뭇결'], knots: [], texture: ['결이 분명하게 드러나는 표면'], scent: [], workability: ['가구 제작과 가공 작업에 많이 쓰는 목재'] },
    surfaceOptions: [],
    jointType: 'SIDE_FINGER',
    jointTitle: '사이드핑거 집성',
    jointCaption: '목재 스트립의 길이 이음부를 긴 측면에서 보여주는 핑거조인트 방식'
  },
  '히노끼(편백) 집성판 사이드핑거(유절/무절)': {
    title: '히노끼(편백) 집성판 사이드핑거',
    heroCopy: '유절과 무절 표면을 함께 고를 수 있는 히노끼 집성판',
    appearance: { color: [], grain: [], knots: ['유절의 자연스러운 옹이', '무절의 정돈된 표면'], texture: ['유절과 무절의 표면 차이'], scent: [], workability: [] },
    surfaceOptions: [
      { title: '유절', caption: '옹이가 드러나는 표면 옵션' },
      { title: '무절', caption: '무절로 구분한 표면 옵션' }
    ],
    jointType: 'SIDE_FINGER',
    jointTitle: '사이드핑거 집성',
    jointCaption: '목재 스트립의 길이 이음부를 긴 측면에서 보여주는 핑거조인트 방식'
  },
  '히노끼(편백) 집성판 솔리드(유절/무절)': {
    title: '히노끼(편백) 집성판 솔리드',
    heroCopy: '유절과 무절의 표면 차이를 살린 히노끼 솔리드',
    appearance: { color: [], grain: [], knots: ['유절의 자연스러운 옹이', '무절의 정돈된 표면'], texture: ['유절과 무절의 표면 차이'], scent: [], workability: [] },
    surfaceOptions: [
      { title: '유절', caption: '옹이가 드러나는 표면 옵션' },
      { title: '무절', caption: '무절로 구분한 표면 옵션' }
    ],
    jointType: 'SOLID',
    jointTitle: '솔리드 집성',
    jointCaption: '길게 이어진 목재 스트립의 폭 방향 접합'
  }
};

const GLUED_WOOD_JOINT_VISUAL_RULES = {
  SOLID: {
    imageRole: 'wood_strips_and_widthwise_joint_closeup',
    positive: ['UNIFORM_STRIP_WIDTH', 'PARALLEL_LENGTHWISE_STRIPS', 'EVEN_WIDTHWISE_JOINT_SPACING', 'SAME_STRIP_LAYOUT_MAIN_AND_CLOSEUP', 'WIDTHWISE_JOINT_CLOSEUP', 'ZERO_FINGER_JOINTS_ALL_FACES'],
    forbidden: ['FINGER_JOINT_ANY_FACE', 'TOOTHED_JOINT', 'UNEVEN_STRIP_WIDTH', 'SHORT_BLOCK_PATTERN', 'RANDOM_BLOCK_LAYOUT', 'PLYWOOD_LAYERS', 'PROCEDURAL_CG_PATTERN']
  },
  SIDE_FINGER: {
    imageRole: 'long_side_local_finger_joint_same_point_closeup',
    positive: ['THREE_FACE_COORDINATE_LOCK', 'TOP_SURFACE_NO_FINGER', 'LONG_SIDE_ONE_LOCAL_FINGER_JOINT', 'SAME_LONG_SIDE_AND_SAME_POINT_MAIN_AND_CLOSEUP', 'SHORT_END_STRIP_CROSS_SECTIONS', 'SAME_STRIP_WIDTH_ACROSS_SPLICE', 'GRAIN_COLOR_THICKNESS_CONTINUITY', 'NO_CORNER_TEETH'],
    forbidden: ['TOP_SURFACE_FINGER', 'SHORT_END_FINGER', 'CORNER_FINGER', 'EDGE_LINE_TEETH', 'FULL_HEIGHT_TEETH', 'FULL_WIDTH_TEETH', 'FULL_SIDE_ZIPPER', 'MISMATCHED_MAIN_CLOSEUP', 'MATERIAL_COLOR_CHANGE_AT_JOINT', 'STRIP_WIDTH_CHANGE_AT_JOINT', 'LAYERED_TEETH']
  },
  TOP_FINGER: {
    imageRole: 'top_surface_local_finger_joint_same_point_closeup',
    positive: ['TOP_SURFACE_ONE_LOCAL_LENGTH_SPLICE', 'SAME_POINT_MAIN_AND_CLOSEUP', 'SAME_STRIP_WIDTH_ACROSS_SPLICE', 'GRAIN_COLOR_STRIP_CONTINUITY', 'LONG_SIDE_NO_FINGER', 'SHORT_END_STRIP_CROSS_SECTIONS', 'TOP_SURFACE_ONLY_FINGER'],
    forbidden: ['LONG_SIDE_FINGER', 'SHORT_END_FINGER', 'FULL_END_TEETH', 'REPEATED_JOINT_LINES', 'DETACHED_CLOSEUP_JOINT', 'STRIP_WIDTH_CHANGE_AT_JOINT', 'SHORT_BLOCK_CHAIN', 'PLYWOOD_LAYER_PATTERN', 'ZIPPER_PATTERN', 'COMB_PATTERN', 'STITCH_PATTERN']
  },
  UNKNOWN: {
    imageRole: 'full_product_only',
    positive: ['FULL_PRODUCT_PHOTO'],
    forbidden: ['INFERRED_FINGER_POSITION', 'INFERRED_JOINT_TYPE']
  }
};

const GLUED_WOOD_PRODUCT_IDENTITY_RULES = [
  'SAME_PRODUCT_IDENTITY_STRICT',
  'JOINT_LOCATION_MATCH',
  'STRIP_WIDTH_CONSISTENCY',
  'GRAIN_CONTINUITY',
  'COLOR_CONTINUITY'
];

function resolveVerifiedGluedWoodProductUses(data) {
  const productName = String(data && data.productName || '').trim();
  const uses = VERIFIED_GLUED_WOOD_PRODUCT_USES[productName];
  return uses ? { use1: uses.use1, use2: uses.use2 } : null;
}

function getUnknownWoodSpeciesKnowledge() {
  return { id: 'UNKNOWN', standardName: '', aliases: [], scientificName: '', identificationLevel: 'UNKNOWN', appearance: null, referenceUses: [], verifiedProductUses: [], purchaseChecks: ['수종명', '표면 상태', '규격과 두께'], variationNotice: '등록되지 않은 수종으로 수종별 특징을 임의 생성하지 않습니다.' };
}

function resolveWoodSpeciesKnowledge(data) {
  const productName = String(data && data.productName || '').toLowerCase();
  const candidates = WOOD_SPECIES_KNOWLEDGE.slice().sort(function (left, right) {
    const leftLength = Math.max.apply(null, left.aliases.map(function (alias) { return alias.length; }));
    const rightLength = Math.max.apply(null, right.aliases.map(function (alias) { return alias.length; }));
    return rightLength - leftLength;
  });
  return candidates.find(function (species) {
    return species.aliases.some(function (alias) { return productName.indexOf(String(alias).toLowerCase()) !== -1; });
  }) || getUnknownWoodSpeciesKnowledge();
}

function resolveGluedWoodProductKnowledge(data) {
  const label = [data && data.category, data && data.productName].map(function (value) { return String(value || '').toLowerCase(); }).join(' ');
  if (label.indexOf('집성판') === -1 && label.indexOf('집성목') === -1) return null;
  const joint = buildProductCategoryGuide(data);
  return {
    isGluedWood: true,
    species: resolveWoodSpeciesKnowledge(data),
    joint: { name: joint.name, keyValue: joint.keyValue, structure: joint.structure, checks: (joint.emphasisCandidates || []).slice() }
  };
}

function buildProductCategoryGuide(data) {
  const productName = String(data && data.productName || '').toLowerCase();
  const category = String(data && data.category || '').toLowerCase();
  const compareTarget = String(data && data.compareTarget || '').toLowerCase();

  function findByName(name) {
    return PRODUCT_CATEGORY_GUIDES.find(function (guide) {
      return guide.name === name;
    });
  }

  function hasAny(text, keywords) {
    return keywords.some(function (keyword) {
      return text.indexOf(String(keyword).toLowerCase()) !== -1;
    });
  }

  function findByKeywords(text) {
    return PRODUCT_CATEGORY_GUIDES.find(function (guide) {
      return hasAny(text, guide.keywords);
    });
  }

  const explicitSolidKeywords = ['솔리드'];
  const explicitSideFingerKeywords = ['사이드핑거', '사이드 핑거'];
  const explicitTopFingerKeywords = ['탑핑거', '탑 핑거'];
  const explicitFingerKeywords = ['finger', 'fj'];
  const productNameKeywords = ['edge glued', 'eg panel', 'finger joint', 'solid panel'];

  if (hasAny(productName, explicitSideFingerKeywords)) return findByName('사이드핑거 집성판');
  if (hasAny(productName, explicitTopFingerKeywords)) return findByName('탑핑거 집성판');
  if (hasAny(productName, explicitFingerKeywords)) return findByName('핑거조인트 집성판');
  if (hasAny(productName, explicitSolidKeywords)) return findByName('솔리드 집성판');

  if (hasAny(productName, ['finger joint'])) return findByName('핑거조인트 집성판');
  if (hasAny(productName, ['edge glued', 'eg panel', 'solid panel'])) return findByName('솔리드 집성판');
  if (hasAny(productName, productNameKeywords)) return findByKeywords(productName);

  if (hasAny(productName, ['집성', '집성목', '집성판'])) return findByName('집성목 / 집성판');

  if (hasAny(category, ['집성목', '집성판'])) return findByName('집성목 / 집성판');

  const productGuide = findByKeywords(productName);
  if (productGuide) return productGuide;

  const categoryGuide = findByKeywords(category);
  if (categoryGuide) return categoryGuide;

  const compareGuide = findByKeywords(compareTarget);
  if (compareGuide) return compareGuide;

  return {
    name: '일치 제품군 없음',
    keyValue: '',
    structure: '',
    emphasisCandidates: [],
    useCandidates: [],
    infographicStructure: '',
    infographicKeywords: [],
    forbiddenKeywords: ['다른 제품군 구조 혼용', '제품명 반복', '구조 추정', '근거 없는 인증/성능/수치 생성', '제품군과 맞지 않는 용도 생성'],
    priorityMetrics: []
  };
}
