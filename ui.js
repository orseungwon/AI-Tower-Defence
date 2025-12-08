// ========================
// 마우스 / 입력 처리
// ========================

// 마우스가 가리키는 타일 좌표 (그리드 기준)
let mouseGridX = -1;
let mouseGridY = -1;

// 마우스 이동 이벤트
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

// 마우스가 캔버스를 벗어났을 때
cv.addEventListener('mouseleave', () => {
  if (placementMode.active) {
    placementMode.previewX = -1;
    placementMode.previewY = -1;
    renderMap();
  }
});

// 캔버스 클릭 이벤트
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
    document.getElementById('structure-list').style.display   = 'block';
    //document.getElementById('round-controls').style.display   = 'block';
    document.getElementById('sidebar-header').textContent     = '건설 메뉴';
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
    document.getElementById('sidebar-header').textContent        = '구조물 상세';
    document.getElementById('structure-panel-header').textContent = info.name;
    document.getElementById('structure-name').textContent        = info.name;
    document.getElementById('structure-description').textContent = info.description;

    if (clickedType === 'barracks') {
      document.getElementById('unit-production').style.display           = 'block';
      document.getElementById('production-queue-container').style.display = 'block';
      updateProductionQueueUI();
    } else {
      document.getElementById('unit-production').style.display           = 'none';
      document.getElementById('production-queue-container').style.display = 'none';
    }

    renderMap();
  } else {
    showBuildMenu();
  }
});

// ESC 키 처리
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (placementMode.active) {
      placementMode.active       = false;
      placementMode.structureType = null;
      placementMode.previewX     = -1;
      placementMode.previewY     = -1;
      
      document.querySelectorAll('#structure-list .item-card').forEach(c => {
        c.classList.remove('selected');
      });
      
      renderMap();
      console.log('배치 모드 취소');
    }
  }
});


// ========================
// 유닛 생산 버튼 처리
// ========================

document.querySelectorAll('.unit-button').forEach(button => {
  button.addEventListener('click', () => {
    if (!roundActive) return;

    const unitType = button.dataset.unit;
    const info     = unitInfo[unitType];

    if (!selectedStructure.productionQueue) {
      selectedStructure.productionQueue   = [];
      selectedStructure.currentProduction = null;
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


// ========================
// 생산 큐 UI 렌더링
// ========================

function updateProductionQueueUI() {
  if (!selectedStructure || selectedStructureType !== 'barracks') return;
  
  if (!selectedStructure.productionQueue) {
    selectedStructure.productionQueue   = [];
    selectedStructure.currentProduction = null;
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


// ========================
// 건설 메뉴 / 구조물 판매 / 라운드 컨트롤
// ========================

document.getElementById('structure-list').addEventListener('click', (e) => {
  const card = e.target.closest('.item-card');
  if (!card) return;

  const structureId = card.dataset.id;
  const cost        = parseInt(card.dataset.cost);
  if (placementMode.active && placementMode.structureType === structureId) {
    placementMode.active = false;
    placementMode.structureType = null;
    placementMode.previewX = -1;
    placementMode.previewY = -1;
    card.classList.remove('selected');
    renderMap();
    console.log('배치 모드 취소');
    return;
  }
  
  document.querySelectorAll('#structure-list .item-card').forEach(c => {
    c.classList.remove('selected');
  });
  
  card.classList.add('selected');
  
  placementMode.active       = true;
  placementMode.structureType = structureId;
  placementMode.cost         = cost;
  placementMode.previewX     = mouseGridX;
  placementMode.previewY     = mouseGridY;
  
  structurePanel.classList.remove('active');
  selectedStructure     = null;
  selectedStructureType = null;
  
  console.log('배치 모드 활성화:', structureId, '비용:', cost);
  renderMap();
});

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
  gameState.resource      += refund;
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

// 라운드 시작 버튼 - async 함수로 정의
document.getElementById('start-round-btn').addEventListener('click', async () => {
  roundActive = true;
  document.getElementById('start-round-btn').disabled = true;
  //document.getElementById('stop-round-btn').disabled  = false;

  // Claude AI 전략 요청 (없으면 기본 AI)
  saveRoundState();

  await requestAIStrategy();
  
  
  startRound();

  console.log('라운드 시작!');
});

// 라운드 정지 버튼
// document.getElementById('stop-round-btn').addEventListener('click', () => {
//   roundActive = false;
//   document.getElementById('start-round-btn').disabled = false;
//   document.getElementById('stop-round-btn').disabled  = true;
  
//   console.log('라운드 중지!');
// });

// 게임 초기화 버튼
document.getElementById('reset-game-btn').addEventListener('click', () => {
  resetGameState();
  localStorage.removeItem('roundSave');

  structurePanel.classList.remove('active');
  document.getElementById('structure-list').style.display   = 'block';
  //document.getElementById('round-controls').style.display   = 'block';
  document.getElementById('sidebar-header').textContent     = '건설 메뉴';
  selectedStructure     = null;
  selectedStructureType = null;
  
  renderMap();
  updateInfoPanel();
  
  console.log('게임 초기화 완료');
});


// ========================
// Claude API 직접 호출 (브라우저)
// ========================

// API 키 저장/불러오기
function getApiKey() {
  return localStorage.getItem('claude_api_key') || '';
}

// function setApiKey(key) {
//   if (!key || key.trim() === "") {
//     localStorage.removeItem('claude_api_key');
//   } else {
//     localStorage.setItem('claude_api_key', key.trim());
//   }
//   updateApiStatus();
// }

function setApiKey(key) {
  const trimmed = key.trim();

  if (!trimmed) {
    // 공백 또는 빈 문자열 → 키 삭제
    localStorage.removeItem('claude_api_key');
    console.log("API 키 삭제됨");
  } else {
    // 정상적인 키 저장
    localStorage.setItem('claude_api_key', trimmed);
    console.log("API 키 저장됨:", trimmed);
  }

  updateApiStatus(); // UI 즉시 업데이트
}




function updateApiStatus() {
  const status = document.getElementById('api-status');
  if (!status) return;
  
  if (getApiKey()) {
    status.textContent = 'AI ON';
    status.className = 'connected';
  } else {
    status.textContent = 'AI OFF';
    status.className = 'disconnected';
  }
}

// API 키 모달 처리 - 페이지 로드 후 실행
// window.addEventListener('DOMContentLoaded', () => {
//   const saveBtn = document.getElementById('save-api-key-btn');
//   const skipBtn = document.getElementById('skip-api-key-btn');
//   const changeBtn = document.getElementById('change-api-key-btn');
//   const modal = document.getElementById('api-key-modal');
//   const input = document.getElementById('api-key-input');

//   if (saveBtn) {
//     saveBtn.addEventListener('click', () => {
//       const key = input.value.trim();
//       setApiKey(key);
//       if (modal) modal.classList.add('hidden');
//       console.log('API 키 저장됨');
//     });
//   }

//   if (skipBtn) {
//     skipBtn.addEventListener('click', () => {
//       if (modal) modal.classList.add('hidden');
//       console.log('API 키 건너뜀 - 기본 AI 사용');
//     });
//   }

//   if (changeBtn) {
//     changeBtn.addEventListener('click', () => {
//       if (input) input.value = getApiKey();
//       if (modal) modal.classList.remove('hidden');
//     });
//   }

//   // 초기 상태 설정
//   updateApiStatus();
  
//   // 이미 API 키가 있으면 모달 숨기기
//   if (getApiKey() && modal) {
//     modal.classList.add('hidden');
//   }
// });

window.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('save-api-key-btn');
  const skipBtn = document.getElementById('skip-api-key-btn');
  const changeBtn = document.getElementById('change-api-key-btn');
  const modal = document.getElementById('api-key-modal');
  const input = document.getElementById('api-key-input');

  // 👉 수정된 save 버튼 (API 키 검증)
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const key = input.value.trim();
       // 🔥 validate 실행
  const valid = await validateApiKey(key);

  if (!valid) {
    alert("API 키가 유효하지 않습니다! 기본 AI로 전환됩니다.");
    localStorage.removeItem("claude_api_key");
    updateApiStatus();
    modal.classList.add("hidden");
    return;
  }

  // 🔥 정상적인 키일 때만 저장
  setApiKey(key);
  modal.classList.add("hidden");
  console.log("API 키 검증 완료 → 저장됨");
});
  }

  // 기존 skip 버튼
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      console.log('API 키 건너뜀 - 기본 AI 사용');
    });
  }

  // 기존 change 버튼 
  if (changeBtn) { changeBtn.addEventListener('click', () => {
     input.value = getApiKey();
     modal.classList.remove('hidden');
     });
     }



  // 초기 상태 설정
  updateApiStatus();

  if (getApiKey()) modal.classList.add('hidden');
});


// Claude API 호출
async function requestAIStrategy() {
  const apiKey = getApiKey();
  
  // API 키가 없으면 기본 AI 사용
  if (!apiKey) {
    console.log('API 키 없음 - 기본 AI 사용');
    generateAIUnits();
    console.log('기본 ai 유닛 생성');
    return applyAIStrategy(applyDefaultAIStrategy());

    
  }

  const state = collectGameState();
  
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
    const raw = data.content[0].text.trim();
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

    return response.ok; // 200~299이면 true
  } catch (e) {
    return false;
  }
}


// ========================
// 도움말 모달 처리
// ========================

document.getElementById('help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').classList.remove('hidden');
});

document.getElementById('close-help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').classList.add('hidden');
});

// 탭 전환
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

// 모달 바깥 클릭시 닫기
document.getElementById('help-modal').addEventListener('click', (e) => {
  if (e.target.id === 'help-modal') {
    document.getElementById('help-modal').classList.add('hidden');
  }
});