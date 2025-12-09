/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║                         AI TOWER DEFENCE                                  ║
   ║                       UI.JS - 사용자 입력 처리                              ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */
   /*
    1. 마우스 / 키보드 입력 처리
    ├─ 1-1. 마우스 이동 이벤트
    ├─ 1-2. 마우스가 캔버스를 벗어났을 때
    ├─ 1-3. 캔버스 클릭 이벤트
    └─ 1-4. ESC 키 처리

    2. 유닛 생산
      ├─ 2-1. 유닛 생산 버튼 처리
      ├─ 2-2. 생산 큐 UI 렌더링
      ├─ 2-3. 슬롯 콘텐츠 생성
      └─ 2-4. 생산 대기열 슬롯 클릭 (유닛 취소/환불)

    3. 건설 메뉴 / 구조물 판매
      ├─ 3-1. 건설 메뉴 클릭
      └─ 3-2. 구조물 판매

    4. 라운드 컨트롤
      ├─ 4-1. 라운드 시작 버튼
      ├─ 4-2. 게임 초기화 버튼
      ├─ 4-3. 페이지 새로고침 버튼
      └─ 4-4. 라운드 경고 플래시

    5. Claude API 연동
      ├─ 5-1. API 키 관리
      ├─ 5-2. API 키 검증
      ├─ 5-3. API 키 모달 처리
      └─ 5-4. Claude API 호출

    6. 도움말 모달
      ├─ 6-1. 도움말 열기/닫기
      ├─ 6-2. 탭 전환
      └─ 6-3. 모달 바깥 클릭시 닫기
   */


/* ═══════════════════════════════════════════════════════════════════════════
   1. 마우스 / 키보드 입력 처리
   ═══════════════════════════════════════════════════════════════════════════ */

// 마우스가 가리키는 타일 좌표 (그리드 기준)
let mouseGridX = -1;
let mouseGridY = -1;

/* ─────────────────────────────────────────────────────────────────────────────
   1-1. 마우스 이동 이벤트
   ───────────────────────────────────────────────────────────────────────────── */
cv.addEventListener('mousemove', (e) => {
  const rect   = cv.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  mouseGridX = Math.floor(mouseX / TILE);
  mouseGridY = Math.floor(mouseY / TILE);
  
  if (placementMode.active) {
    placementMode.previewX = mouseGridX;
    placementMode.previewY = mouseGridY;
    renderMap();
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   1-2. 마우스가 캔버스를 벗어났을 때
   ───────────────────────────────────────────────────────────────────────────── */
cv.addEventListener('mouseleave', () => {
  if (placementMode.active) {
    placementMode.previewX = -1;
    placementMode.previewY = -1;
    renderMap();
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   1-3. 캔버스 클릭 이벤트
   ───────────────────────────────────────────────────────────────────────────── */
cv.addEventListener('click', (e) => {
  const rect   = cv.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  const gridX = Math.floor(clickX / TILE);
  const gridY = Math.floor(clickY / TILE);
  
  // 1) 배치 모드인 경우
  if (placementMode.active) {
    if (placeStructure(gridX, gridY)) {
      renderMap();
      console.log(`구조물 배치 완료:`, { gx: gridX, gy: gridY });
    } else {
      console.log('배치 불가능한 위치입니다!');
    }
    return;
  }

  // 2) 배치 모드가 아닌 경우
  function showBuildMenu() {
    structurePanel.classList.remove('active');
    document.getElementById('structure-list').style.display = 'block';
    document.getElementById('sidebar-header').textContent   = '건설 메뉴';
    selectedStructure     = null;
    selectedStructureType = null;
    renderMap();
  }

  let clickedStructure = null;
  let clickedType      = null;
  
  for (let type in structures.player) {
    const found = structures.player[type].find(s => s.gx === gridX && s.gy === gridY);
    if (found) {
      clickedStructure = found;
      clickedType      = type;
      break;
    }
  }
  
  if (clickedStructure) {
    selectedStructure     = clickedStructure;
    selectedStructureType = clickedType;

    document.getElementById('structure-list').style.display = 'none';
    structurePanel.classList.add('active');

    const info = structureInfo[clickedType];
    document.getElementById('sidebar-header').textContent         = '구조물 상세';
    document.getElementById('structure-panel-header').textContent = info.name;
    document.getElementById('structure-name').textContent         = info.name;
    document.getElementById('structure-description').textContent  = info.description;

    if (clickedType === 'barracks') {
      document.getElementById('unit-production').style.display            = 'block';
      document.getElementById('production-queue-container').style.display = 'block';
      updateProductionQueueUI();
    } else {
      document.getElementById('unit-production').style.display            = 'none';
      document.getElementById('production-queue-container').style.display = 'none';
    }

    renderMap();
  } else {
    showBuildMenu();
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   1-4. ESC 키 처리
   ───────────────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (placementMode.active) {
      placementMode.active        = false;
      placementMode.structureType = null;
      placementMode.previewX      = -1;
      placementMode.previewY      = -1;
      
      document.querySelectorAll('#structure-list .item-card').forEach(c => {
        c.classList.remove('selected');
      });
      
      renderMap();
      console.log('배치 모드 취소');
    }
  }
});


/* ═══════════════════════════════════════════════════════════════════════════
   2. 유닛 생산
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   2-1. 유닛 생산 버튼 처리
   ───────────────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.unit-button').forEach(button => {
  button.addEventListener('click', () => {
    if (!roundActive) {
      flashRoundWarning(2800);
      return;
    }
    
    const unitType = button.dataset.unit;
    const info     = unitInfo[unitType];

    if (!selectedStructure.productionQueue) {
      selectedStructure.productionQueue    = [];
      selectedStructure.currentProduction  = null;
      selectedStructure.productionProgress = 0;
    }
    
    if (gameState.resource < info.cost) return;
    if (gameState.population + info.population > gameState.maxPopulation) return;
    if (selectedStructure.productionQueue.length >= 2) return;

    soundManager.play('money');
    
    gameState.resource -= info.cost;
    selectedStructure.productionQueue.push({
      type:       unitType,
      cost:       info.cost,
      population: info.population,
      addedAt:    Date.now()
    });
    
    updateInfoPanel();
    updateProductionQueueUI();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   2-2. 생산 큐 UI 렌더링
   ───────────────────────────────────────────────────────────────────────────── */
function updateProductionQueueUI() {
  if (!selectedStructure || selectedStructureType !== 'barracks') return;
  
  if (!selectedStructure.productionQueue) {
    selectedStructure.productionQueue    = [];
    selectedStructure.currentProduction  = null;
    selectedStructure.productionProgress = 0;
  }
  
  const slots = document.querySelectorAll('.production-slot');
  
  slots.forEach((slot, index) => {
    slot.className = 'production-slot';
    slot.innerHTML = `<div class="slot-empty">${index + 1}</div>`;
  });
  
  if (selectedStructure.currentProduction) {
    const slot     = slots[0];
    const unit     = selectedStructure.currentProduction;
    const progress = selectedStructure.productionProgress || 0;
    
    slot.classList.add('producing');
    slot.innerHTML = createSlotContent(unit.type, progress);
  }
  
  selectedStructure.productionQueue.forEach((unit, index) => {
    if (index < 2) {
      const slot = slots[index + 1];
      slot.classList.add('waiting');
      slot.innerHTML = createSlotContent(unit.type, 0);
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   2-3. 슬롯 콘텐츠 생성
   ───────────────────────────────────────────────────────────────────────────── */
function createSlotContent(unitType, progress) {
  const circumference = 2 * Math.PI * 31;
  const offset        = circumference * (1 - progress);
  
  return `
    <img src="images/unit_${unitType}_move_1.png" alt="${unitType}">
    <svg>
      <circle class="progress-bg" cx="35" cy="35" r="31"/>
      <circle 
        class="progress-active" 
        cx="35" 
        cy="35" 
        r="31"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
      />
    </svg>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────────
   2-4. 생산 대기열 슬롯 클릭 (유닛 취소/환불)
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('production-queue-container').addEventListener('click', (e) => {
  const slot = e.target.closest('.production-slot');
  if (!slot) return;
  if (!selectedStructure || selectedStructureType !== 'barracks') return;

  const barracks  = selectedStructure;
  const slotIndex = parseInt(slot.dataset.slot, 10);

  if (!barracks.productionQueue) {
    barracks.productionQueue = [];
  }

  // 0번 슬롯: 현재 생산 중인 유닛 취소
  if (slotIndex === 0) {
    if (barracks.currentProduction) {
      const item   = barracks.currentProduction;
      const refund = (item.cost != null) ? item.cost : unitInfo[item.type].cost;
      gameState.resource += refund;
      soundManager.play('resource_structure');

      barracks.currentProduction  = null;
      barracks.productionProgress = 0;
      console.log('유닛 생산 취소');

      // 대기열이 있으면 바로 다음 유닛 생산 시작
      if (barracks.productionQueue.length > 0) {
        barracks.currentProduction   = barracks.productionQueue.shift();
        barracks.productionStartTime = Date.now();
        barracks.productionProgress  = 0;
      }

      updateInfoPanel();
      updateProductionQueueUI();
    }
    return;
  }

  // 1~2번 슬롯: 대기열 유닛 제거
  const qIndex = slotIndex - 1;
  if (barracks.productionQueue[qIndex]) {
    const item   = barracks.productionQueue.splice(qIndex, 1)[0];
    const refund = (item.cost != null) ? item.cost : unitInfo[item.type].cost;
    gameState.resource += refund;
    soundManager.play('money');

    updateInfoPanel();
    updateProductionQueueUI();
  }
});


/* ═══════════════════════════════════════════════════════════════════════════
   3. 건설 메뉴 / 구조물 판매
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   3-1. 건설 메뉴 클릭
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('structure-list').addEventListener('click', (e) => {
  const card = e.target.closest('.item-card');
  if (!card) return;

  const structureId = card.dataset.id;
  const cost        = parseInt(card.dataset.cost);
  
  // 같은 카드 다시 클릭하면 배치 모드 취소
  if (placementMode.active && placementMode.structureType === structureId) {
    placementMode.active        = false;
    placementMode.structureType = null;
    placementMode.previewX      = -1;
    placementMode.previewY      = -1;
    card.classList.remove('selected');
    renderMap();
    console.log('배치 모드 취소');
    return;
  }
  
  document.querySelectorAll('#structure-list .item-card').forEach(c => {
    c.classList.remove('selected');
  });
  
  card.classList.add('selected');
  
  placementMode.active        = true;
  placementMode.structureType = structureId;
  placementMode.cost          = cost;
  placementMode.previewX      = mouseGridX;
  placementMode.previewY      = mouseGridY;
  
  structurePanel.classList.remove('active');
  selectedStructure     = null;
  selectedStructureType = null;
  
  console.log('배치 모드 활성화:', structureId, '비용:', cost);
  renderMap();
});

/* ─────────────────────────────────────────────────────────────────────────────
   3-2. 구조물 판매
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('sell-structure').addEventListener('click', () => {
  if (!selectedStructure || !selectedStructureType) return;
  
  soundManager.play('resource_structure');
  
  const targetGx = selectedStructure.gx;
  const targetGy = selectedStructure.gy;
  
  const index = structures.player[selectedStructureType].findIndex(
    s => s.gx === targetGx && s.gy === targetGy
  );
  
  if (index === -1) {
    console.error('구조물을 찾을 수 없음!');
    return;
  }
  
  structures.player[selectedStructureType].splice(index, 1);
  
  const refund = Math.floor(structureInfo[selectedStructureType].cost * 0.5);
  gameState.resource       += refund;
  gameState.structureCount--;
  
  if (selectedStructureType === 'population') {
    gameState.maxPopulation -= 3;
  }
  
  structurePanel.classList.remove('active');
  selectedStructure     = null;
  selectedStructureType = null;
  
  updateInfoPanel();
  ctx.clearRect(0, 0, cv.width, cv.height);
  renderMap();
});


/* ═══════════════════════════════════════════════════════════════════════════
   4. 라운드 컨트롤
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   4-1. 라운드 시작 버튼
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('start-round-btn').addEventListener('click', async () => {
  roundActive = true;
  document.getElementById('start-round-btn').disabled = true;

  saveRoundState();
  await requestAIStrategy();
  startRound();

  console.log('라운드 시작!');
});

/* ─────────────────────────────────────────────────────────────────────────────
   4-2. 게임 초기화 버튼
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('reset-game-btn').addEventListener('click', () => {
  resetGameState();
  localStorage.removeItem('roundSave');

  structurePanel.classList.remove('active');
  document.getElementById('structure-list').style.display = 'block';
  document.getElementById('sidebar-header').textContent   = '건설 메뉴';
  selectedStructure     = null;
  selectedStructureType = null;
  
  renderMap();
  updateInfoPanel();
  
  console.log('게임 초기화 완료');
  location.reload(true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   4-3. 페이지 새로고침 버튼
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById("refresh-btn").addEventListener("click", () => {
  location.reload(true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   4-4. 라운드 경고 플래시
   ───────────────────────────────────────────────────────────────────────────── */
function flashRoundWarning(ms = 1800) {
  const roundValueEl = document.getElementById('round-value');
  if (!roundValueEl) return;
  
  roundValueEl.classList.add('round-warning');
  soundManager.play('remove_melee');
  
  setTimeout(() => roundValueEl.classList.remove('round-warning'), ms);
}


/* ═══════════════════════════════════════════════════════════════════════════
   5. Claude API 연동
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   5-1. API 키 관리
   ───────────────────────────────────────────────────────────────────────────── */
function getApiKey() {
  return localStorage.getItem('claude_api_key') || '';
}

function setApiKey(key) {
  const trimmed = key.trim();

  if (!trimmed) {
    localStorage.removeItem('claude_api_key');
    console.log("API 키 삭제됨");
  } else {
    localStorage.setItem('claude_api_key', trimmed);
    console.log("API 키 저장됨:", trimmed);
  }

  updateApiStatus();
}

function updateApiStatus() {
  const status = document.getElementById('api-status');
  if (!status) return;
  
  if (getApiKey()) {
    status.textContent = 'AI ON';
    status.className   = 'connected';
  } else {
    status.textContent = 'AI OFF';
    status.className   = 'disconnected';
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   5-2. API 키 검증
   ───────────────────────────────────────────────────────────────────────────── */
async function validateApiKey(key) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5,
        messages: [{ role: "user", content: "ping" }]
      })
    });

    return response.ok;
  } catch (e) {
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   5-3. API 키 모달 처리
   ───────────────────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const saveBtn   = document.getElementById('save-api-key-btn');
  const skipBtn   = document.getElementById('skip-api-key-btn');
  const changeBtn = document.getElementById('change-api-key-btn');
  const modal     = document.getElementById('api-key-modal');
  const input     = document.getElementById('api-key-input');

  // 저장 버튼 (API 키 검증 후 저장)
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const key   = input.value.trim();
      const valid = await validateApiKey(key);

      if (!valid) {
        alert("API 키가 유효하지 않습니다! 기본 AI로 전환됩니다.");
        localStorage.removeItem("claude_api_key");
        updateApiStatus();
        modal.classList.add("hidden");
        return;
      }

      setApiKey(key);
      modal.classList.add("hidden");
      console.log("API 키 검증 완료 → 저장됨");
    });
  }

  // 건너뛰기 버튼
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      console.log('API 키 건너뜀 - 기본 AI 사용');
    });
  }

  // API 설정 변경 버튼
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      input.value = getApiKey();
      modal.classList.remove('hidden');
    });
  }

  // 초기 상태 설정
  updateApiStatus();
  if (getApiKey()) modal.classList.add('hidden');
});

/* ─────────────────────────────────────────────────────────────────────────────
   5-4. Claude API 호출 (AI 전략 요청)
   ───────────────────────────────────────────────────────────────────────────── */
async function requestAIStrategy() {
  const apiKey = getApiKey();
  
  // API 키가 없으면 기본 AI 사용
  if (!apiKey) {
    console.log('API 키 없음 - 기본 AI 사용');
    generateAIUnits();
    console.log('기본 ai 유닛 생성');
    return applyAIStrategy(applyDefaultAIStrategy());
  }

  const state  = collectGameState();
  const prompt = buildAIPrompt(state);
  
  try {
    console.log('📡 Claude API 호출 중...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API 오류:', error);
      console.log('기본 AI로 대체');
      generateAIUnits();
      return applyAIStrategy(applyDefaultAIStrategy());
    }

    const data = await response.json();
    const raw  = data.content[0].text.trim();
    console.log('Claude 응답:', raw);

    try {
      const strategy = JSON.parse(raw);
      console.log('AI 전략:', strategy);
      applyAIStrategy(strategy);
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      generateAIUnits();
      return applyAIStrategy(applyDefaultAIStrategy());
    }

  } catch (err) {
    console.error('❌ API 호출 실패:', err);
    generateAIUnits();
    return applyAIStrategy(applyDefaultAIStrategy());
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   6. 도움말 모달
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   6-1. 도움말 열기/닫기
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').classList.remove('hidden');
});

document.getElementById('close-help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').classList.add('hidden');
});

/* ─────────────────────────────────────────────────────────────────────────────
   6-2. 탭 전환
   ───────────────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.help-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    // 탭 버튼 활성화
    document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // 섹션 전환
    document.querySelectorAll('.help-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`.help-section[data-section="${tabName}"]`).classList.add('active');
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   6-3. 모달 바깥 클릭시 닫기
   ───────────────────────────────────────────────────────────────────────────── */
document.getElementById('help-modal').addEventListener('click', (e) => {
  if (e.target.id === 'help-modal') {
    document.getElementById('help-modal').classList.add('hidden');
  }
});