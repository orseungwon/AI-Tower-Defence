/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║                         AI TOWER DEFENCE                                  ║
   ║                        DATA.JS - 게임 데이터                                ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */
   /*
    1. 상수 정의
      - TILE, MAP_WIDTH, MAP_HEIGHT, MAX_STRUCTURES

    2. GameState 클래스
      - 유닛 스폰 기록
      - 오래된 기록 정리
      - 저장/복원
      - 초기화

    3. 맵 데이터
      ├─ 3-1. 타일 맵
      └─ 3-2. 영역 맵

    4. 병영 배치 위치
      ├─ 4-1. 플레이어 병영 배치 가능 위치
      ├─ 4-2. 플레이어 병영 스폰 포인트
      └─ 4-3. AI 병영 배치 가능 위치

    5. AI 구조물 배치 위치
      ├─ 5-1. AI 주거지 배치 위치
      ├─ 5-2. AI 포탑 배치 위치
      └─ 5-3. AI 자원생산소 배치 위치

    6. BaseManager 클래스

    7. StructureManager 클래스

    8. 구조물 / 유닛 스탯 정보
      ├─ 8-1. 구조물 정보
      └─ 8-2. 유닛 정보

    9. 이미지 리소스 로딩
      └─ 9-1. 이미지 경로 설정
   */


/* ═══════════════════════════════════════════════════════════════════════════
   1. 상수 정의
   ═══════════════════════════════════════════════════════════════════════════ */

const TILE          = 64;   // 한 타일의 픽셀 크기
const MAP_WIDTH     = 15;   // 맵 타일 개수 (가로)
const MAP_HEIGHT    = 10;   // 맵 타일 개수 (세로)
const MAX_STRUCTURES = 10;  // 최대 건물 수


/* ═══════════════════════════════════════════════════════════════════════════
   2. GameState 클래스
   ═══════════════════════════════════════════════════════════════════════════ */

class GameState {
  constructor() {
    this.round         = 1;
    this.resource      = 50;
    this.population    = 0;
    this.maxPopulation = 3;
    this.structureCount = 2;
    this.baseHp        = 100;

    this.ai = {
      resource:       50,
      population:     0,
      maxPopulation:  3,
      structureCount: 2,
      baseHp:         100
    };

    // 유닛 사용 기록
    this.playerUnitUsage = [];
    this.aiUnitUsage     = [];
  }

  /* ─────────────────────────────────────────────────────────────────────────
     유닛 스폰 기록
     ───────────────────────────────────────────────────────────────────────── */
  recordUnitSpawn(owner, unitType) {
    const record = {
      type:  unitType,
      time:  Date.now(),
      round: this.round
    };
    
    if (owner === 'player') {
      this.playerUnitUsage.push(record);
    } else {
      this.aiUnitUsage.push(record);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     오래된 유닛 기록 정리
     ───────────────────────────────────────────────────────────────────────── */
  cleanOldUnitRecords() {
    const keepRounds  = 5;
    const cutoffRound = this.round - keepRounds;
    
    this.playerUnitUsage = this.playerUnitUsage.filter(u => u.round > cutoffRound);
    this.aiUnitUsage     = this.aiUnitUsage.filter(u => u.round > cutoffRound);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     저장용 데이터 반환
     ───────────────────────────────────────────────────────────────────────── */
  toSaveData() {
    return {
      round:          this.round,
      resource:       this.resource,
      population:     this.population,
      maxPopulation:  this.maxPopulation,
      structureCount: this.structureCount,
      baseHp:         this.baseHp,
      ai: {
        resource:       this.ai.resource,
        population:     this.ai.population,
        maxPopulation:  this.ai.maxPopulation,
        structureCount: this.ai.structureCount,
        baseHp:         this.ai.baseHp
      }
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     저장 데이터에서 복원
     ───────────────────────────────────────────────────────────────────────── */
  fromSaveData(data) {
    this.round          = data.round          ?? this.round;
    this.resource       = data.resource       ?? this.resource;
    this.population     = data.population     ?? this.population;
    this.maxPopulation  = data.maxPopulation  ?? this.maxPopulation;
    this.structureCount = data.structureCount ?? this.structureCount;
    this.baseHp         = data.baseHp         ?? this.baseHp;

    // ai 블록 안전하게 복원
    if (!this.ai) this.ai = {};

    const ai = data.ai ?? {};
    this.ai.resource       = ai.resource       ?? this.ai.resource;
    this.ai.population     = ai.population     ?? this.ai.population;
    this.ai.maxPopulation  = ai.maxPopulation  ?? this.ai.maxPopulation;
    this.ai.structureCount = ai.structureCount ?? this.ai.structureCount;
    this.ai.baseHp         = ai.baseHp         ?? this.ai.baseHp;
    
    bases.find(b => b.owner === 'player').hp = this.baseHp;
    bases.find(b => b.owner === 'ai').hp     = this.ai.baseHp;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     초기화
     ───────────────────────────────────────────────────────────────────────── */
  reset() {
    this.round          = 1;
    this.resource       = 50;
    this.population     = 0;
    this.maxPopulation  = 3;
    this.structureCount = 2;
    
    this.ai.resource       = 50;
    this.ai.population     = 0;
    this.ai.maxPopulation  = 3;
    this.ai.structureCount = 2;
    this.ai.baseHp         = 100;
    
    this.playerUnitUsage = [];
    this.aiUnitUsage     = [];
  }
}

// 전역 인스턴스
const gameState = new GameState();


/* ═══════════════════════════════════════════════════════════════════════════
   3. 맵 데이터
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   3-1. 타일 맵
   - 0: 진한 잔디, 1: 일반 잔디, 2: 길(road)
   - 인덱스 [y][x] = 타일 좌표 (gx, gy)
   ───────────────────────────────────────────────────────────────────────────── */
const mapData = [
  [0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0],
  [1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1],
  [0,  2,  2,  2,  2,  2,  2,  2,  0,  1,  0,  2,  2,  1,  0],
  [1,  2,  1,  0,  1,  0,  1,  2,  1,  0,  1,  2,  1,  0,  1],
  [0,  2,  0,  1,  0,  1,  0,  2,  0,  1,  0,  2,  2,  2,  0],
  [1,  2,  2,  2,  1,  0,  1,  2,  1,  0,  1,  0,  1,  2,  1],
  [0,  1,  0,  2,  0,  1,  0,  2,  0,  1,  0,  1,  0,  2,  0],
  [1,  0,  2,  2,  1,  0,  1,  2,  2,  2,  2,  2,  2,  2,  1],
  [0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0],
  [1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1],
];

/* ─────────────────────────────────────────────────────────────────────────────
   3-2. 영역 맵
   - 0: 플레이어, 1: AI, -1: 중립(길)
   - 구조물 배치 시 영역 체크에 사용
   ───────────────────────────────────────────────────────────────────────────── */
const territoryMap = [
  [0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1],
  [0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1],
  [0, -1, -1, -1, -1, -1, -1, -1,  1,  1,  1, -1, -1, -1,  1],
  [0, -1,  0,  0,  0,  0,  0, -1,  1,  1,  1, -1,  1,  1,  1],
  [0, -1,  0,  0,  0,  0,  0, -1,  1,  1,  1, -1, -1, -1,  1],
  [0, -1, -1, -1,  0,  0,  0, -1,  1,  1,  1,  1,  1, -1,  1],
  [0,  0,  0, -1,  0,  0,  0, -1,  1,  1,  1,  1,  1, -1,  1],
  [0, -1, -1, -1,  0,  0,  0, -1, -1, -1, -1, -1, -1, -1,  1],
  [0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1],
  [0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1],
];


/* ═══════════════════════════════════════════════════════════════════════════
   4. 병영 배치 위치
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   4-1. 플레이어 병영 배치 가능 위치
   ───────────────────────────────────────────────────────────────────────────── */
const userBarracksPositions = [
  // 1번 줄 (y: 1)
  {gx: 1, gy: 1}, {gx: 2, gy: 1}, {gx: 3, gy: 1}, {gx: 4, gy: 1}, {gx: 5, gy: 1}, {gx: 6, gy: 1},
  // 2번 줄 (y: 2)
  {gx: 0, gy: 2},
  // 3번 줄 (y: 3)
  {gx: 0, gy: 3},
  {gx: 3, gy: 3}, {gx: 4, gy: 3}, {gx: 5, gy: 3},
  // 4번 줄 (y: 4)
  {gx: 0, gy: 4},
  {gx: 3, gy: 4},
  // 5번 줄 (y: 5)
  {gx: 0, gy: 5},
  {gx: 4, gy: 5},
  // 6번 줄 (y: 6)
  {gx: 4, gy: 6},
  // 7번 줄 (y: 7)
  {gx: 4, gy: 7},
  // 8번 줄 (y: 8)
  {gx: 2, gy: 8}, {gx: 3, gy: 8}
];

/* ─────────────────────────────────────────────────────────────────────────────
   4-2. 플레이어 병영 스폰 포인트
   - key: "gx-gy" 문자열 (병영 위치)
   - value: 유닛 등장 타일 위치
   ───────────────────────────────────────────────────────────────────────────── */
const userBarracksSpawnPoints = {
  // 1번 줄
  '1-1': {gx: 1, gy: 2}, '2-1': {gx: 2, gy: 2}, '3-1': {gx: 3, gy: 2},
  '4-1': {gx: 4, gy: 2}, '5-1': {gx: 5, gy: 2}, '6-1': {gx: 6, gy: 2},
  // 2번 줄
  '0-2': {gx: 1, gy: 2},
  // 3번 줄
  '0-3': {gx: 1, gy: 3},
  '3-3': {gx: 3, gy: 2}, '4-3': {gx: 4, gy: 2}, '5-3': {gx: 5, gy: 2},
  // 4번 줄
  '0-4': {gx: 1, gy: 4},
  '3-4': {gx: 3, gy: 5},
  // 5번 줄
  '0-5': {gx: 1, gy: 5},
  '4-5': {gx: 3, gy: 5},
  // 6번 줄
  '4-6': {gx: 3, gy: 6},
  // 7번 줄
  '4-7': {gx: 3, gy: 7},
  // 8번 줄
  '2-8': {gx: 2, gy: 7}, '3-8': {gx: 3, gy: 7}
};

/* ─────────────────────────────────────────────────────────────────────────────
   4-3. AI 병영 배치 가능 위치
   ───────────────────────────────────────────────────────────────────────────── */
const aiBarracksPositions = [
  {id: 1, gx: 12, gy: 1,  spawnPoint: {gx: 12, gy: 2}},
  {id: 8, gx: 10, gy: 8,  spawnPoint: {gx: 10, gy: 7}},
  {id: 5, gx: 14, gy: 6,  spawnPoint: {gx: 13, gy: 6}},
  {id: 2, gx: 11, gy: 1,  spawnPoint: {gx: 11, gy: 2}},
  {id: 3, gx: 10, gy: 3,  spawnPoint: {gx: 11, gy: 3}},
  {id: 4, gx: 14, gy: 5,  spawnPoint: {gx: 13, gy: 5}},
  {id: 6, gx: 12, gy: 8,  spawnPoint: {gx: 12, gy: 7}},
  {id: 7, gx: 10, gy: 6,  spawnPoint: {gx: 10, gy: 7}},
  {id: 9, gx: 8,  gy: 8,  spawnPoint: {gx: 8,  gy: 7}}
];


/* ═══════════════════════════════════════════════════════════════════════════
   5. AI 구조물 배치 위치
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   5-1. AI 주거지 배치 위치
   ───────────────────────────────────────────────────────────────────────────── */
const aiPopulationPositions = [
  {id: 1, gx: 14, gy: 0},
  {id: 2, gx: 13, gy: 0},
  {id: 3, gx: 12, gy: 0},
  {id: 4, gx: 11, gy: 0},
  {id: 5, gx: 10, gy: 0},
  {id: 6, gx: 9,  gy: 0},
  {id: 7, gx: 8,  gy: 0},
  {id: 8, gx: 8,  gy: 1},
  {id: 9, gx: 9,  gy: 1},
];

/* ─────────────────────────────────────────────────────────────────────────────
   5-2. AI 포탑 배치 위치
   ───────────────────────────────────────────────────────────────────────────── */
const aiTurretPositions = [
  {id: 1, gx: 12, gy: 5},
  {id: 2, gx: 8,  gy: 4},
  {id: 3, gx: 12, gy: 3},
  {id: 4, gx: 9,  gy: 6},
  {id: 5, gx: 11, gy: 5},
  {id: 6, gx: 11, gy: 6},
  {id: 7, gx: 8,  gy: 5},
  {id: 8, gx: 12, gy: 6},
  {id: 9, gx: 8,  gy: 6},
];

/* ─────────────────────────────────────────────────────────────────────────────
   5-3. AI 자원생산소 배치 위치
   ───────────────────────────────────────────────────────────────────────────── */
const aiResourcePositions = [
  {id: 1, gx: 14, gy: 9},
  {id: 2, gx: 13, gy: 9},
  {id: 3, gx: 12, gy: 9},
  {id: 4, gx: 11, gy: 9},
  {id: 5, gx: 10, gy: 9},
  {id: 6, gx: 9,  gy: 9},
  {id: 7, gx: 8,  gy: 9},
  {id: 8, gx: 9,  gy: 8},
  {id: 9, gx: 8,  gy: 8},
];


/* ═══════════════════════════════════════════════════════════════════════════
   6. BaseManager 클래스
   ═══════════════════════════════════════════════════════════════════════════ */

class BaseManager {
  constructor() {
    this._bases = [];
  }

  initialize() {
    this._bases = [
      { gx: 1,  gy: 7, owner: 'player', hp: 100, maxHp: 100 },
      { gx: 13, gy: 2, owner: 'ai',     hp: 100, maxHp: 100 }
    ];
  }

  // Array-like 접근을 위한 메서드들
  get length() { return this._bases.length; }
  
  forEach(callback) { return this._bases.forEach(callback); }
  find(callback)    { return this._bases.find(callback); }
  some(callback)    { return this._bases.some(callback); }
  filter(callback)  { return this._bases.filter(callback); }
  
  get(index) { return this._bases[index]; }

  getBase(owner)      { return this._bases.find(b => b.owner === owner); }
  getEnemyBase(owner) { return this._bases.find(b => b.owner !== owner); }

  resetHP() {
    this._bases.forEach(base => {
      base.hp = base.maxHp;
    });
  }

  hasBaseAt(gx, gy) {
    return this._bases.some(base => base.gx === gx && base.gy === gy);
  }
}

// 전역 인스턴스 생성
const baseManager = new BaseManager();
baseManager.initialize();

// 기존 코드 호환을 위한 프록시
const bases = new Proxy(baseManager, {
  get(target, prop) {
    // 숫자 인덱스 접근
    if (!isNaN(prop)) {
      return target._bases[prop];
    }
    // 배열 메서드 접근
    if (prop === 'length')          return target._bases.length;
    if (prop === 'forEach')         return target._bases.forEach.bind(target._bases);
    if (prop === 'find')            return target._bases.find.bind(target._bases);
    if (prop === 'some')            return target._bases.some.bind(target._bases);
    if (prop === 'filter')          return target._bases.filter.bind(target._bases);
    if (prop === Symbol.iterator)   return target._bases[Symbol.iterator].bind(target._bases);
    // 클래스 메서드 접근
    if (typeof target[prop] === 'function') {
      return target[prop].bind(target);
    }
    return target[prop];
  }
});


/* ═══════════════════════════════════════════════════════════════════════════
   7. StructureManager 클래스
   ═══════════════════════════════════════════════════════════════════════════ */

class StructureManager {
  constructor() {
    this.player = {
      population: [],
      barracks:   [],
      turret:     [],
      resource:   []
    };
    this.ai = {
      population: [],
      barracks:   [],
      turret:     [],
      resource:   []
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     초기화
     ───────────────────────────────────────────────────────────────────────── */
  initialize() {
    this.player = {
      population: [{ gx: 0, gy: 9 }],
      barracks: [{
        gx: 2,
        gy: 8,
        spawnPoint: { gx: 2, gy: 7 },
        productionQueue:    [],
        currentProduction:  null,
        productionProgress: 0
      }],
      turret:   [],
      resource: []
    };

    this.ai = {
      population: [{ gx: 14, gy: 0 }],
      barracks: [{
        gx: 12,
        gy: 1,
        spawnPoint: { gx: 12, gy: 2 },
        productionQueue:    [],
        currentProduction:  null,
        productionProgress: 0
      }],
      turret:   [],
      resource: []
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     구조물 추가 / 제거
     ───────────────────────────────────────────────────────────────────────── */
  addStructure(owner, type, data) {
    this[owner][type].push(data);
  }

  removeStructure(owner, type, gx, gy) {
    const arr   = this[owner][type];
    const index = arr.findIndex(s => s.gx === gx && s.gy === gy);
    if (index > -1) {
      arr.splice(index, 1);
      return true;
    }
    return false;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     구조물 검색
     ───────────────────────────────────────────────────────────────────────── */
  getStructureAt(gx, gy) {
    for (const owner of ['player', 'ai']) {
      for (const type of Object.keys(this[owner])) {
        const structure = this[owner][type].find(s => s.gx === gx && s.gy === gy);
        if (structure) {
          return { structure, owner, type };
        }
      }
    }
    return null;
  }

  getCount(owner, type = null) {
    if (type) return this[owner][type].length;
    return Object.values(this[owner]).reduce((sum, arr) => sum + arr.length, 0);
  }

  getRandomBarracks(owner) {
    const barracks = this[owner].barracks;
    if (!barracks || barracks.length === 0) return null;
    return barracks[Math.floor(Math.random() * barracks.length)];
  }

  /* ─────────────────────────────────────────────────────────────────────────
     저장 / 복원
     ───────────────────────────────────────────────────────────────────────── */
  toSaveData() {
    return {
      player: JSON.parse(JSON.stringify(this.player)),
      ai:     JSON.parse(JSON.stringify(this.ai))
    };
  }

  fromSaveData(data) {
    this.player = JSON.parse(JSON.stringify(data.player));
    this.ai     = JSON.parse(JSON.stringify(data.ai));
  }
}

// 전역 인스턴스
const structures = new StructureManager();
structures.initialize();


/* ═══════════════════════════════════════════════════════════════════════════
   8. 구조물 / 유닛 스탯 정보
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   8-1. 구조물 정보
   ───────────────────────────────────────────────────────────────────────────── */
const structureInfo = {
  barracks: {
    name:        '병영',
    cost:        20,
    description: '근접, 원거리, 탱크 유닛을 생산합니다'
  },
  population: {
    name:               '주거지',
    cost:               20,
    description:        '최대 인구수를 증가시킵니다 (+3)',
    populationIncrease: 3
  },
  turret: {
    name:        '포탑',
    cost:        20, 
    description: '자동으로 적을 공격하는 방어 구조물',
    attackSpeed: 1.5,
    attackPower: 3,
    range:       3
  },
  resource: {
    name:             '자원 생산소',
    cost:             30,
    description:      '라운드당 자원을 생산합니다',
    resourcePerRound: 20
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   8-2. 유닛 정보
   ───────────────────────────────────────────────────────────────────────────── */
const unitInfo = {
  melee: {
    name:           '근접 유닛',
    cost:           5,
    population:     1,
    description:    '높은 체력과 근거리 공격력을 가진 전사',
    health:         20,
    attackPower:    4,
    attackSpeed:    1.1,
    moveSpeed:      0.7,
    range:          1,
    productionTime: 2000,
  },
  ranged: {
    name:           '원거리 유닛',
    cost:           5,
    population:     1,
    description:    '멀리서 적을 공격하는 궁수',
    health:         13,
    attackPower:    6,
    attackSpeed:    0.8,
    moveSpeed:      1.1,
    range:          2.3,
    productionTime: 3000,
  },
  tank: {
    name:           '탱크 유닛',
    cost:           10,
    population:     1,
    description:    '매우 높은 방어력을 가진 중장갑 유닛',
    health:         60,
    attackPower:    2,
    attackSpeed:    1,
    moveSpeed:      0.8,
    range:          1,
    productionTime: 4000,
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   9. 이미지 리소스 로딩
   ═══════════════════════════════════════════════════════════════════════════ */

const images = {
  // 타일
  dark_grass: new Image(),
  grass:      new Image(),
  road:       new Image(),
  base:       new Image(),
  base_ai:    new Image(),

  // 구조물 (플레이어)
  population: new Image(),
  barracks:   new Image(),
  turret:     new Image(),
  resource:   new Image(),

  // 구조물 (AI)
  population_ai: new Image(),
  barracks_ai:   new Image(),
  turret_ai:     new Image(),
  resource_ai:   new Image(),

  // 유닛 - 이동 (플레이어)
  unit_melee_move_1:  new Image(),
  unit_melee_move_2:  new Image(),
  unit_ranged_move_1: new Image(),
  unit_ranged_move_2: new Image(),
  unit_tank_move_1:   new Image(),
  unit_tank_move_2:   new Image(),

  // 유닛 - 공격 (플레이어)
  unit_melee_attack_1:  new Image(),
  unit_melee_attack_2:  new Image(),
  unit_ranged_attack_1: new Image(),
  unit_ranged_attack_2: new Image(),
  unit_tank_attack_1:   new Image(),
  unit_tank_attack_2:   new Image(),

  // 유닛 - 이동 (AI)
  unit_melee_move_1_ai:  new Image(),
  unit_melee_move_2_ai:  new Image(),
  unit_ranged_move_1_ai: new Image(),
  unit_ranged_move_2_ai: new Image(),
  unit_tank_move_1_ai:   new Image(),
  unit_tank_move_2_ai:   new Image(),

  // 유닛 - 공격 (AI)
  unit_melee_attack_1_ai:  new Image(),
  unit_melee_attack_2_ai:  new Image(),
  unit_ranged_attack_1_ai: new Image(),
  unit_ranged_attack_2_ai: new Image(),
  unit_tank_attack_1_ai:   new Image(),
  unit_tank_attack_2_ai:   new Image(),

  // 효과
  laser_turret:     new Image(),
  laser_ranged:     new Image(),
  laser_turret_ai:  new Image(),
  laser_ranged_ai:  new Image(),
};

/* ─────────────────────────────────────────────────────────────────────────────
   9-1. 이미지 경로 설정
   ───────────────────────────────────────────────────────────────────────────── */

// 타일
images.dark_grass.src = 'images/map_dark_grass.png';
images.grass.src      = 'images/map_grass.png';
images.road.src       = 'images/map_road.png';
images.base.src       = 'images/map_base.png';
images.base_ai.src    = 'images/map_base_ai.png';

// 구조물 (플레이어)
images.population.src = 'images/structure_population.png';
images.barracks.src   = 'images/structure_barracks.png';
images.turret.src     = 'images/structure_turret.png';
images.resource.src   = 'images/structure_resource.png';

// 구조물 (AI)
images.population_ai.src = 'images/structure_population_ai.png';
images.barracks_ai.src   = 'images/structure_barracks_ai.png';
images.turret_ai.src     = 'images/structure_turret_ai.png';
images.resource_ai.src   = 'images/structure_resource_ai.png';

// 유닛 - 이동 (플레이어)
images.unit_melee_move_1.src  = 'images/unit_melee_move_1.png';
images.unit_melee_move_2.src  = 'images/unit_melee_move_2.png';
images.unit_ranged_move_1.src = 'images/unit_ranged_move_1.png';
images.unit_ranged_move_2.src = 'images/unit_ranged_move_2.png';
images.unit_tank_move_1.src   = 'images/unit_tank_move_1.png';
images.unit_tank_move_2.src   = 'images/unit_tank_move_2.png';

// 유닛 - 공격 (플레이어)
images.unit_melee_attack_1.src  = 'images/unit_melee_attack_1.png';
images.unit_melee_attack_2.src  = 'images/unit_melee_attack_2.png';
images.unit_ranged_attack_1.src = 'images/unit_ranged_attack_1.png';
images.unit_ranged_attack_2.src = 'images/unit_ranged_attack_2.png';
images.unit_tank_attack_1.src   = 'images/unit_tank_attack_1.png';
images.unit_tank_attack_2.src   = 'images/unit_tank_attack_2.png';

// 유닛 - 이동 (AI)
images.unit_melee_move_1_ai.src  = 'images/unit_melee_move_1_ai.png';
images.unit_melee_move_2_ai.src  = 'images/unit_melee_move_2_ai.png';
images.unit_ranged_move_1_ai.src = 'images/unit_ranged_move_1_ai.png';
images.unit_ranged_move_2_ai.src = 'images/unit_ranged_move_2_ai.png';
images.unit_tank_move_1_ai.src   = 'images/unit_tank_move_1_ai.png';
images.unit_tank_move_2_ai.src   = 'images/unit_tank_move_2_ai.png';

// 유닛 - 공격 (AI)
images.unit_melee_attack_1_ai.src  = 'images/unit_melee_attack_1_ai.png';
images.unit_melee_attack_2_ai.src  = 'images/unit_melee_attack_2_ai.png';
images.unit_ranged_attack_1_ai.src = 'images/unit_ranged_attack_1_ai.png';
images.unit_ranged_attack_2_ai.src = 'images/unit_ranged_attack_2_ai.png';
images.unit_tank_attack_1_ai.src   = 'images/unit_tank_attack_1_ai.png';
images.unit_tank_attack_2_ai.src   = 'images/unit_tank_attack_2_ai.png';

// 효과
images.laser_turret.src     = 'images/laser_turret.png';
images.laser_ranged.src     = 'images/laser_ranged.png';
images.laser_turret_ai.src  = 'images/laser_turret_ai.png';
images.laser_ranged_ai.src  = 'images/laser_ranged_ai.png';