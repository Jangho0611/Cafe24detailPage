const PRODUCT_CATEGORY_GUIDES = [
  {
    name: '사이드핑거 집성판',
    keywords: ['사이드핑거', '사이드 핑거', 'side finger'],
    keyValue: '사이드핑거 라멜 집성 구조',
    structure: '원목 라멜을 집성하고 측면 접합부에 핑거조인트가 적용된 집성판',
    emphasisCandidates: ['측면 접합부', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '원목 라멜을 폭 방향으로 접합하고 측면 접합부에 핑거조인트가 적용된 집성 구조',
    infographicKeywords: ['라멜', '폭 접합', '측면 핑거조인트', '접착'],
    forbiddenKeywords: ['단판 적층', '3~13겹', 'Veneer Layer', '교차 적층', '표면 전체에 과한 톱니 패턴'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '탑핑거 집성판',
    keywords: ['탑핑거', '탑 핑거', 'top finger'],
    keyValue: '탑핑거 라멜 집성 구조',
    structure: '원목 라멜을 집성하고 상판 면에 핑거조인트가 보일 수 있는 집성판',
    emphasisCandidates: ['상판 접합부', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '원목 라멜을 집성하고 상판 면 또는 길이 방향 접합부에 핑거조인트가 보이는 집성 구조',
    infographicKeywords: ['라멜', '상판 핑거조인트', '길이 방향 접합', '접착'],
    forbiddenKeywords: ['단판 적층', '3~13겹', 'Veneer Layer', '교차 적층', '합판식 레이어 단면'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '핑거조인트 집성판',
    keywords: ['핑거', 'fj', 'finger'],
    keyValue: '핑거조인트 라멜 집성 구조',
    structure: '원목 라멜을 집성하고 접합부에 핑거조인트가 적용된 집성판',
    emphasisCandidates: ['접합부 상태', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '원목 라멜을 접합하고 일부 접합부에 핑거조인트가 적용된 집성 구조',
    infographicKeywords: ['라멜', '핑거조인트', '접착', '집성'],
    forbiddenKeywords: ['단판 적층', 'Veneer', '3~13겹', '교차 적층', '합판식 레이어 단면'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '솔리드 집성판',
    keywords: ['솔리드', 'solid'],
    keyValue: '라멜 집성 구조',
    structure: '원목 라멜을 접착하여 제작한 집성판',
    emphasisCandidates: ['접착 상태', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '원목 라멜을 폭 방향으로 접합한 솔리드 패널 구조',
    infographicKeywords: ['라멜', '폭 접합', '접착', '솔리드 패널'],
    forbiddenKeywords: ['핑거조인트', 'Finger Joint', '톱니형 접합', '길이 방향 접합', '단판 적층', '3~13겹', 'Veneer Layer', '교차 적층'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '집성목 / 집성판',
    keywords: ['집성', '집성목', '집성판'],
    keyValue: '솔리드 라멜 집성 구조',
    structure: '원목 라멜을 접착하여 제작한 집성판',
    emphasisCandidates: ['접착 상태', '표면 상태', '재단 치수'],
    useCandidates: ['가구 제작', '선반 제작', '계단재', '인테리어 마감'],
    infographicStructure: '원목 라멜을 폭 방향으로 접합한 집성 구조',
    infographicKeywords: ['Lamella', 'Edge Glued', 'Solid Panel'],
    forbiddenKeywords: ['핑거조인트', 'Finger Joint', '톱니형 접합', '단판 적층', 'Veneer', '3~13겹', '교차 적층'],
    priorityMetrics: ['함수율', '접착 방식']
  },
  {
    name: '합판',
    keywords: ['합판', 'plywood', '베니어', 'veneer'],
    keyValue: '단판 교차 적층 구조',
    structure: '원목 단판(Veneer)을 교차 적층한 판재',
    emphasisCandidates: ['재단 치수', '표면 상태', '마감 방향'],
    useCandidates: ['가구 심재', '벽체 바탕재', '인테리어 제작'],
    infographicStructure: '목재 단판(Veneer)을 교차 적층한 구조',
    infographicKeywords: ['단판', '교차 적층', '접착층', 'Veneer', 'Layer'],
    forbiddenKeywords: ['라멜', '집성', '핑거조인트'],
    priorityMetrics: ['접착등급', '방출등급', '함수율']
  },
  {
    name: 'MDF',
    keywords: ['mdf', '엠디에프'],
    keyValue: '목재 섬유 압축 구조',
    structure: '목재 섬유를 고온고압으로 성형한 판재',
    emphasisCandidates: ['표면 상태', '도장 조건', '재단 치수'],
    useCandidates: ['가구 문짝', '몰딩', '도장 마감', '필름 래핑'],
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
    emphasisCandidates: ['손상 방지', '마감재 접합'],
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
  }
];

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

  if (hasAny(category, ['집성목', '집성판'])) return findByName('집성목 / 집성판');

  const compareGuide = findByKeywords(compareTarget);
  if (compareGuide) return compareGuide;

  if (hasAny(productName, ['집성', '집성목', '집성판'])) return findByName('집성목 / 집성판');

  return findByKeywords(productName) || findByKeywords(category) || {
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
