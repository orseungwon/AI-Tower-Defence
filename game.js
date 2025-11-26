// ===========================
// game.js - 메인 게임 로직
// ===========================
//

// 캔버스 설정
const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');

// ===========================
// GameLoopManager 클래스 정의
// ===========================
class GameLoopManager {
  constructor() {
    this.lastUpdateTime = Date.now();
    this.gameLoopRunning = false;
    this.aiUsesResources = false;
  }

  start() {
    if (!this.gameLoopRunning) {
      this.gameLoopRunning = true;
      this.lastUpdateTime = Date.now();
      return true;
    }
    return false;
  }

  stop() {
    this.gameLoopRunning = false;
  }

  getDeltaTime() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    return deltaTime;
  }
}

// 전역 인스턴스
const gameLoopManager = new GameLoopManager();

// 기존 코드 호환을 위한 변수들
let lastUpdateTime = gameLoopManager.lastUpdateTime;
let gameLoopRunning = gameLoopManager.gameLoopRunning;
let aiUsesResources = gameLoopManager.aiUsesResources;

// ===========================
// SelectionManager 클래스 정의
// ===========================
class SelectionManager {
  constructor() {
    this.selectedStructure = null;
    this.selectedStructureType = null;
  }

  select(structure, type) {
    this.selectedStructure = structure;
    this.selectedStructureType = type;
  }

  deselect() {
    this.selectedStructure = null;
    this.selectedStructureType = null;
  }

  isSelected() {
    return this.selectedStructure !== null;
  }

  getSelected() {
    return {
      structure: this.selectedStructure,
      type: this.selectedStructureType
    };
  }
}

// 전역 인스턴스
const selectionManager = new SelectionManager();

// 기존 코드 호환을 위한 변수들 (프록시)
let selectedStructure = null;
let selectedStructureType = null;

// 선택 상태 동기화를 위한 getter/setter
Object.defineProperty(window, 'selectedStructure', {
  get() { return selectionManager.selectedStructure; },
  set(val) { selectionManager.selectedStructure = val; }
});

Object.defineProperty(window, 'selectedStructureType', {
  get() { return selectionManager.selectedStructureType; },
  set(val) { selectionManager.selectedStructureType = val; }
});

const structurePanel = document.getElementById('structure-panel');

// ===========================
// PlacementManager 클래스 정의
// ===========================
class PlacementManager {
  constructor() {
    this.active = false;
    this.structureType = null;
    this.cost = 0;
    this.previewX = -1;
    this.previewY = -1;
  }

  start(structureType, cost) {
    this.active = true;
    this.structureType = structureType;
    this.cost = cost;
    this.previewX = -1;
    this.previewY = -1;
  }

  cancel() {
    this.active = false;
    this.structureType = null;
    this.cost = 0;
    this.previewX = -1;
    this.previewY = -1;
  }

  updatePreview(gx, gy) {
    this.previewX = gx;
    this.previewY = gy;
  }

  isActive() {
    return this.active;
  }
}

// 전역 인스턴스
const placementManager = new PlacementManager();

// 기존 코드 호환을 위한 프록시
const placementMode = new Proxy(placementManager, {
  get(target, prop) {
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  }
});

// ===========================
// EffectManager 클래스 정의
// ===========================
class EffectManager {
  constructor() {
    this.laserEffects = [];
    this.magicEffects = [];
  }

  addLaser(fromX, fromY, toX, toY, duration = 200) {
    this.laserEffects.push({
      fromX, fromY, toX, toY,
      startTime: Date.now(),
      duration
    });
  }

  addMagic(fromX, fromY, toX, toY, flipX, duration = 300) {
    this.magicEffects.push({
      fromX, fromY, toX, toY, flipX,
      startTime: Date.now(),
      duration
    });
  }

  cleanup() {
    const currentTime = Date.now();
    this.laserEffects = this.laserEffects.filter(e => currentTime - e.startTime < e.duration);
    this.magicEffects = this.magicEffects.filter(e => currentTime - e.startTime < e.duration);
  }
}

// 전역 인스턴스
const effectManager = new EffectManager();

// 기존 코드 호환을 위한 변수들
let laserEffects = effectManager.laserEffects;
let magicEffects = effectManager.magicEffects;

// 동기화를 위한 getter/setter
Object.defineProperty(window, 'laserEffects', {
  get() { return effectManager.laserEffects; },
  set(val) { effectManager.laserEffects = val; }
});

Object.defineProperty(window, 'magicEffects', {
  get() { return effectManager.magicEffects; },
  set(val) { effectManager.magicEffects = val; }
});

// 라운드 상태 (전역 변수로 선언 - 다른 파일에서도 접근)
var roundActive = false;

// ===========================
// 게임 초기화
// ===========================

function initGame() {
  console.log(`이미지 로딩 완료: ${loadedCount}/${totalImages}`);
  
  loadRoundState();
  initializeUI();
  
  renderMap();
  updateInfoPanel();

  if (!gameLoopRunning) {
    gameLoopRunning = true;
    lastUpdateTime  = Date.now();
    gameLoop();
    console.log('게임 루프 시작');
  }
  
  // 라운드 상태 초기화
  roundActive = false;
  
  // Start 버튼 활성화, Stop 버튼 비활성화
  document.getElementById('start-round-btn').disabled = false;
  document.getElementById('stop-round-btn').disabled  = true;
}

// UI 초기화
function initializeUI() {
  // 구조물 카드 초기화
  document.querySelectorAll('.item-card').forEach(card => {
    const structureId = card.dataset.id;
    const info        = structureInfo[structureId];
    
    if (info) {
      card.querySelector('.item-name').textContent        = info.name;
      card.querySelector('.item-description').textContent = info.description;
      card.querySelector('.item-cost').textContent        = `비용: ${info.cost}`;
      card.dataset.cost                                   = info.cost;
    }
  });
  
  // 유닛 버튼 초기화
  document.querySelectorAll('.unit-button').forEach(button => {
    const unitId = button.dataset.unit;
    const info   = unitInfo[unitId];
    
    if (info) {
      button.querySelector('.unit-button-name').textContent = info.name;
      button.querySelector('.unit-button-cost').textContent =
        `비용: ${info.cost} | 인구: ${info.population}`;
    }
  });
}

// ===========================
// 메인 게임 루프
// ===========================

// deltaTime 최대값 (100ms = 0.1초)
// 탭 최소화 후 복귀 시 유닛이 순간이동하는 것을 방지
const MAX_DELTA_TIME = 100;

function gameLoop() {
  if (!gameLoopRunning) return;

  const currentTime = Date.now();
  let deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;
  
  // deltaTime 상한선 적용 (탭 비활성화 후 복귀 시 큰 값 방지)
  if (deltaTime > MAX_DELTA_TIME) {
    deltaTime = MAX_DELTA_TIME;
  }
  
  updateAllProduction(deltaTime);
  
  // 라운드 종료 체크
  if (roundActive && checkRoundEnd()) {
    endRound();
  }
  
  renderMap();
  
  requestAnimationFrame(gameLoop);
}

// ===========================
// 라운드 관리
// ===========================

function startRound() {
  roundActive     = true;
  gameLoopRunning = true;
  document.querySelectorAll('.unit-button').forEach(b => {
    b.classList.remove('disabled');
  });
}

function stopRound() {
  roundActive = false;
  document.querySelectorAll('.unit-button').forEach(b => {
    b.classList.add('disabled');
  });
}

function checkRoundEnd() {
  // 1. 양쪽 자원 0인지 확인
  if (gameState.resource > 0 || gameState.ai.resource > 0) {
    return false;
  }
  
  // 2. 맵에 유닛이 있는지 확인
  if (window.activeUnits && window.activeUnits.length > 0) {
    return false;
  }
  
  // 3. 양쪽 병영에서 생산 중인지 확인
  const playerProducing = structures.player.barracks.some(b => 
    b.currentProduction || (b.productionQueue && b.productionQueue.length > 0)
  );
  
  const aiProducing = structures.ai.barracks.some(b => 
    b.currentProduction || (b.productionQueue && b.productionQueue.length > 0)
  );
  
  if (playerProducing || aiProducing) {
    return false;
  }
  
  return true;
}

function endRound() {
  roundActive = false;

cleanOldUnitRecords();
  
  // 기본 자원 지급
  gameState.resource   += 50;
  gameState.ai.resource += 50;
  
  // 자원 생산소 보너스 (20으로 수정)
  gameState.resource   += structures.player.resource.length * 20;
  gameState.ai.resource += structures.ai.resource.length * 20;
  
  // 라운드 증가
  gameState.round++;
  
  // ⭐ 5라운드마다 AI에게 주거지 부여 (1, 6, 11, 16...)
  if (gameState.round % 2 === 1) { //원래는 5로 나눔
    if (gameState.ai.structureCount < MAX_STRUCTURES) {
      // 다음 배치 가능한 주거지 위치 찾기
      const nextPos = getNextAvailablePosition('population');
      
      if (nextPos) {
        structures.ai.population.push({
          gx: nextPos.gx,
          gy: nextPos.gy,
          id: nextPos.id
        });
        gameState.ai.structureCount++;
        gameState.ai.maxPopulation += 3;
        
        console.log(`[라운드 ${gameState.round}] AI에게 주거지 부여 (ID: ${nextPos.id}, 위치: ${nextPos.gx},${nextPos.gy})`);
      } else {
        console.log(`[라운드 ${gameState.round}] AI 주거지 배치 위치 없음, 자원 +30`);
        gameState.ai.resource += 30;
      }
    } else {
      // 구조물 10개 초과시 자원 30 부여
      gameState.ai.resource += 30;
      console.log(`[라운드 ${gameState.round}] AI 구조물 한계, 자원 +30`);
    }
  }
  
  updateInfoPanel();
  
  // 버튼 상태 갱신
  document.getElementById('start-round-btn').disabled = false;
  document.getElementById('stop-round-btn').disabled  = true;
  
  // 라운드 종료 상태 저장
  saveRoundState();
  
  console.log(`라운드 ${gameState.round - 1} 종료!`);

}

// ===========================
// 게임 종료
// ===========================

function endGame(winner) {
  gameLoopRunning = false;
  roundActive     = false;
  
  const message = winner === 'player' ? '승리!' : '패배!';
  alert(message);
  
  // 버튼 비활성화
  document.getElementById('start-round-btn').disabled = true;
  document.getElementById('stop-round-btn').disabled  = true;
}

// ===========================
// 게임 상태 관리
// ===========================

function saveRoundState() {
  const data = {
    gameState:  gameState.toSaveData(),
    structures: structures.toSaveData()
  };
  localStorage.setItem('roundSave', JSON.stringify(data));
  console.log('라운드 저장 완료');
}

function loadRoundState() {
  const saved = localStorage.getItem('roundSave');
  if (!saved) {
    console.log('저장된 라운드 상태 없음 → 완전 새 게임 시작');
    return;
  }

  const data = JSON.parse(saved);
  
  // GameState 복원
  gameState.fromSaveData(data.gameState);
  
  // StructureManager 복원
  structures.fromSaveData(data.structures);

  // 유닛은 라운드 시작 시 없으므로 초기화
  window.activeUnits = [];

  console.log('라운드 저장 상태 복원 완료');
}

function resetGameState() {
  // GameState 클래스의 reset 메서드 사용
  gameState.reset();
  
  // 기지 HP 초기화 (BaseManager 사용)
  baseManager.resetHP();
  
  // 구조물 초기화 (StructureManager 사용)
  structures.initialize();

  // 필드에 떠 있는 유닛 전부 제거
  window.activeUnits = [];
}

// 호환성을 위해 유지 (StructureManager.initialize() 사용 권장)
function getInitialStructures() {
  return structures.toSaveData();
}

// ===========================
// UI 업데이트
// ===========================

function updateInfoPanel() {
  document.getElementById('round-value').textContent = gameState.round;
  document.getElementById('resource-value').textContent = gameState.resource;
  
  document.getElementById('population-value').textContent =
    `${gameState.population} / ${gameState.maxPopulation}`;
  
  document.getElementById('structure-count-value').textContent =
    `${gameState.structureCount} / ${MAX_STRUCTURES}`;
}

// ===========================
// 구조물 배치
// ===========================

function placeStructure(gx, gy) {
  if (!canPlaceStructure(gx, gy)) return false;
  
  const structureData = { gx, gy };
  
  // 병영일 경우 spawnPoint, 생산 큐 정보 초기화
  if (placementMode.structureType === 'barracks') {
    const key = `${gx}-${gy}`;
    structureData.spawnPoint         = userBarracksSpawnPoints[key];
    structureData.productionQueue    = [];
    structureData.currentProduction  = null;
    structureData.productionProgress = 0;
  }
  
  structures.player[placementMode.structureType].push(structureData);
  gameState.resource      -= placementMode.cost;
  gameState.structureCount++;
  
  // 주거지(population) 구조물은 최대 인구 수 증가
  if (placementMode.structureType === 'population') {
    gameState.maxPopulation += 3;
  }
  
  // 배치 완료 후 자동으로 배치 모드 취소
  placementMode.active = false;
  placementMode.structureType = null;
  placementMode.cost = 0;
  placementMode.previewX = -1;
  placementMode.previewY = -1;
  
  // 선택된 구조물 카드 스타일 해제
  document.querySelectorAll('.item-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // UI 업데이트
  updateInfoPanel();
  
  return true;
}

// ===========================
// AI 유닛 생성
// ===========================
function generateAIUnits() {
  const round = gameState.round;
  const stage = Math.ceil(round / 2);  // 1,2,3,4,... //원래는 5

  // 기본 증가 폭 (라운드가 지날수록 증가)
  const base = stage;

  // 유닛 구성 비율
  const meleeCount = base * 2;
  const rangedCount = stage >= 2 ? base * 1 : 0;
  const tankCount = stage >= 3 ? Math.floor(base / 2) : 0;
  
  // AI 병영이 없으면 리턴
  const aiBarracks = structures.ai.barracks;
  if (aiBarracks.length === 0) return;
  
  // ⭐ 모든 병영의 productionQueue 초기화 확인
  aiBarracks.forEach(barracks => {
    if (!barracks.productionQueue) {
      barracks.productionQueue = [];
    }
  });
  
  // 방어 + 근접은 앞쪽 병영에
  for (let i = 0; i < tankCount + meleeCount; i++) {
    const barracks = aiBarracks[0];
    const type = i < tankCount ? 'tank' : 'melee';
    barracks.productionQueue.push({
      type: type,
      cost: 0,
      population: unitInfo[type].population
    });
  }
  
  // 원거리는 뒤쪽 병영에
  for (let i = 0; i < rangedCount; i++) {
    const barracks = aiBarracks[aiBarracks.length - 1];
    barracks.productionQueue.push({
      type: 'ranged',
      cost: 0,
      population: unitInfo.ranged.population
    });
  }
  
  console.log(`[라운드 ${round}] AI 자동 생성: 탱크 ${tankCount}, 근접 ${meleeCount}, 원거리 ${rangedCount}`);
}
// ===========================
// 이미지 로딩 관리
// ===========================

let loadedCount     = 0;
const totalImages   = Object.keys(images).length;

function startGameIfReady() {
  if (loadedCount >= totalImages) {
    console.log(`✅ 모든 이미지 로드 완료: ${loadedCount}/${totalImages}`);
    initGame();
  }
}

// 각 이미지에 onload / onerror 핸들러 등록
Object.entries(images).forEach(([key, img]) => {
  if (img.complete && img.naturalWidth > 0) {
    loadedCount++;
  } else {
    img.onload = () => {
      loadedCount++;
      console.log(`이미지 로드: ${loadedCount}/${totalImages} - ${key}`);
      startGameIfReady();
    };
    img.onerror = () => {
      console.error(`❌ 이미지 로드 실패: ${key} (${img.src})`);
      loadedCount++;
      startGameIfReady();
    };
  }
});

// 초기 체크
startGameIfReady();

// 타임아웃 (15초)
setTimeout(() => {
  if (loadedCount < totalImages) {
    console.warn(`⚠️ 타임아웃: ${loadedCount}/${totalImages}개만 로드됨. 강제 실행`);
    initGame();
  }
}, 15000);


// AI 전략 예시
const aiStrategyExample = {
  structures: {
    build: [
      { type: 'population', id: 3 },  // 주거지 ID 3번 위치에 건설
      { type: 'turret', id: 1 },      // 포탑 ID 1번 위치에 건설
      { type: 'resource', id: 1 }     // 자원채취 ID 1번 위치에 건설
    ],
    demolish: [
      { type: 'turret', id: 2 }       // 포탑 ID 2번 철거
    ]
  },
  units: {
    melee: 3,      // 근접 유닛 3개
    ranged: 2,     // 원거리 유닛 2개
    tank: 1        // 방어 유닛 1개
  }
};