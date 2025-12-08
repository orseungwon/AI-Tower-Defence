// ===========================
// gameFunctions.js - 헬퍼 함수들
// ===========================

// ===========================
// 렌더링 함수들
// ===========================

// 타일 그리기
// function drawTile(imageKey, dx, dy, alpha = 1) {
//   const img = images[imageKey];
//   if (img.complete) {
//     ctx.globalAlpha = alpha;
//     ctx.drawImage(img, dx, dy, TILE, TILE);
//     ctx.globalAlpha = 1;
//   }
// }
function drawTile(imageKey, dx, dy, alpha = 1, owner = null) {
  let key = imageKey;

  // AI용 구조물 이미지 자동 변환
  if (owner === 'ai') {
    key = `${imageKey}_ai`;
  }

  const img = images[key];
  if (img && img.complete) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, dx, dy, TILE, TILE);
    ctx.globalAlpha = 1;
  }
}


// 유닛 그리기
function drawUnit(unit) {
  const x = unit.x * TILE;
  const y = unit.y * TILE;

  // 사거리 내에 적 유닛이 있는지 확인
  const hasTarget = window.activeUnits.some(other => {
    if (other.owner === unit.owner) return false;
    const dist = Math.sqrt(
      Math.pow(other.x - unit.x, 2) +
      Math.pow(other.y - unit.y, 2)
    );
    return dist <= unit.range;
  });
  
  // 기지도 공격 대상인지 확인
  let hasBaseTarget = false;
  if (!hasTarget) {
    const enemyBase = bases.find(b => b.owner !== unit.owner);
    if (enemyBase) {
      const dist = Math.sqrt(
        Math.pow(enemyBase.gx - unit.x, 2) +
        Math.pow(enemyBase.gy - unit.y, 2)
      );
      hasBaseTarget = dist <= unit.range;
    }
  }
  
  // 현재 상태에 따라 이동/공격 스프라이트 선택
  //const action = (hasTarget || hasBaseTarget || unit.atGoal) ? 'attack' : 'move';
  //const img    = images[`unit_${unit.type}_${action}_${unit.animFrame}`];

  let key = `unit_${unit.type}_${(hasTarget || hasBaseTarget || unit.atGoal) ? "attack" : "move"}_${unit.animFrame}`;
  if (unit.owner === "ai") key += "_ai";

  const img = images[key];

  ctx.save();

  // 좌우 반전
  if (unit.flipX) {
    ctx.translate(x + TILE / 2, y + TILE / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(x + TILE / 2), -(y + TILE / 2));
  }

  // 유닛 스프라이트 렌더링
  ctx.drawImage(img, x, y, TILE, TILE);
  ctx.restore();

  // HP 바
  const barWidth  = TILE;
  const barHeight = 6;
  const hpRatio   = unit.hp / unit.maxHp;
  
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y - 10, barWidth, barHeight);
  
  ctx.fillStyle =
    hpRatio > 0.5 ? '#00ff00' :
    hpRatio > 0.2 ? '#faa61a' :
                    '#ff0000';

  ctx.fillRect(x, y - 10, barWidth * hpRatio, barHeight);
}

// 맵 렌더링
function renderMap() {
  // 캔버스 전체 지우기
  ctx.clearRect(0, 0, cv.width, cv.height);

  const tileMap = ['dark_grass', 'grass', 'road'];
  
  // 1. 기본 타일 레이어
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tileId = mapData[y][x];
      drawTile(tileMap[tileId], x * TILE, y * TILE);
    }
  }
  
  // 2. 기지 타일 오버레이 + HP 바
  bases.forEach(base => {
    //ctx.drawImage(images.base, base.gx * TILE, base.gy * TILE, TILE, TILE);
    const baseImg = base.owner === 'ai' ? images.base_ai : images.base;
    ctx.drawImage(baseImg, base.gx * TILE, base.gy * TILE, TILE, TILE);

    const barWidth  = TILE;
    const barHeight = 6;
    const hpRatio   = base.hp / base.maxHp;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(base.gx * TILE, base.gy * TILE - 10, barWidth, barHeight);
    
    ctx.fillStyle =
      hpRatio > 0.5 ? '#00ff00' :
      hpRatio > 0.2 ? '#faa61a' :
                      '#ff0000';

    ctx.fillRect(base.gx * TILE, base.gy * TILE - 10, barWidth * hpRatio, barHeight);
  });

  // 3. 구조물 오버레이 (플레이어)
  // Object.keys(structures.player).forEach(structureType => {
  //   structures.player[structureType].forEach(pos => {
  //     drawTile(structureType, pos.gx * TILE, pos.gy * TILE);
  //   });
  // });
  
  // // 3-2. 구조물 오버레이 (AI)
  // Object.keys(structures.ai).forEach(structureType => {
  //   structures.ai[structureType].forEach(pos => {
  //     drawTile(structureType, pos.gx * TILE, pos.gy * TILE);
  //   });
  // });
  // 플레이어 구조물
Object.keys(structures.player).forEach(structureType => {
  structures.player[structureType].forEach(pos => {
    drawTile(structureType, pos.gx * TILE, pos.gy * TILE, 1, 'player');
  });
});

// AI 구조물
Object.keys(structures.ai).forEach(structureType => {
  structures.ai[structureType].forEach(pos => {
    drawTile(structureType, pos.gx * TILE, pos.gy * TILE, 1, 'ai');
  });
});


  // 3.5. 유닛 렌더링
  if (window.activeUnits && window.activeUnits.length > 0) {
    window.activeUnits.forEach(unit => {
      drawUnit(unit);
    });
  }

  // 3.6. 레이저/마법 이펙트 렌더링
  renderLaserEffects();
  renderMagicEffects();
  
  // 4. 구조물 배치 미리보기
  if (placementMode.active && placementMode.previewX >= 0 && placementMode.previewY >= 0) {
    const canPlace = canPlaceStructure(placementMode.previewX, placementMode.previewY);
    
    ctx.fillStyle = canPlace
      ? 'rgba(0, 255, 0, 0.3)'
      : 'rgba(255, 0, 0, 0.3)';

    ctx.fillRect(
      placementMode.previewX * TILE,
      placementMode.previewY * TILE,
      TILE,
      TILE
    );
    
    drawTile(
      placementMode.structureType,
      placementMode.previewX * TILE,
      placementMode.previewY * TILE,
      0.6
    );
  }
  
  // 5. 스포닝 포인트 표시 (병영 선택 시)
  if (selectedStructure && selectedStructureType === 'barracks' && selectedStructure.spawnPoint) {
    const sp = selectedStructure.spawnPoint;

    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.fillRect(sp.gx * TILE, sp.gy * TILE, TILE, TILE);
    
    ctx.fillStyle   = '#ffd700';
    ctx.font        = 'bold 20px Arial';
    ctx.textAlign   = 'center';
    ctx.fillText(
      '🎯',
      sp.gx * TILE + TILE / 2,
      sp.gy * TILE + TILE / 2 + 7
    );
  }

  // 6. 포탑 사거리 표시
  if (selectedStructure && selectedStructureType === 'turret') {
    const cx    = selectedStructure.gx;
    const cy    = selectedStructure.gy;
    const range = 2;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;

        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) continue;

        if (mapData[ty][tx] === 2) {
          ctx.fillStyle = 'rgba(0, 191, 255, 0.35)';
          ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }

    ctx.strokeStyle = 'rgba(0, 191, 255, 0.9)';
    ctx.lineWidth   = 2;
    ctx.strokeRect(cx * TILE, cy * TILE, TILE, TILE);
  }
}

// 레이저 이펙트 렌더링
// function renderLaserEffects() {
//   const currentTime = Date.now();
  
//   laserEffects = laserEffects.filter(laser => {
//     return currentTime - laser.startTime < laser.duration;
//   });
  
//   laserEffects.forEach(laser => {
//     const fromX = laser.fromX * TILE + TILE / 2;
//     const fromY = laser.fromY * TILE + TILE / 2;
//     const toX   = laser.toX   * TILE + TILE / 2;
//     const toY   = laser.toY   * TILE + TILE / 2;
    
//     const dx       = toX - fromX;
//     const dy       = toY - fromY;
//     const distance = Math.sqrt(dx * dx + dy * dy);
//     const angle    = Math.atan2(dy, dx);
    
//     ctx.save();
//     ctx.translate(fromX, fromY);
//     ctx.rotate(angle);
    
//     const laserImg = images.laser_turret;
//     if (laserImg.complete) {
//       ctx.drawImage(
//         laserImg,
//         0,
//         -12,
//         distance,
//         24
//       );
//     }
    
//     ctx.restore();
//   });
// }
function renderLaserEffects() {
  const currentTime = Date.now();
  
  laserEffects = laserEffects.filter(laser => {
    return currentTime - laser.startTime < laser.duration;
  });
  
  laserEffects.forEach(laser => {
    const fromX = laser.fromX * TILE + TILE / 2;
    const fromY = laser.fromY * TILE + TILE / 2;
    const toX   = laser.toX   * TILE + TILE / 2;
    const toY   = laser.toY   * TILE + TILE / 2;
    
    const dx       = toX - fromX;
    const dy       = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle    = Math.atan2(dy, dx);

    // === 🔥 turret owner에 따라 이미지 분리 ===
    // laser.owner는 updateTurretAttack()에서 넣어줘야 한다.
    const laserImgKey = (laser.owner === 'ai') ? 'laser_turret_ai' : 'laser_turret';
    const laserImg = images[laserImgKey];

    ctx.save();
    ctx.translate(fromX, fromY);
    ctx.rotate(angle);

    if (laserImg && laserImg.complete) {
      ctx.drawImage(laserImg, 0, -12, distance, 24);
       
    }

    ctx.restore();
  });
}


// 마법 이펙트 렌더링
// function renderMagicEffects() {
//   const currentTime = Date.now();
  
//   magicEffects = magicEffects.filter(magic => {
//     return currentTime - magic.startTime < magic.duration;
//   });
  
//   magicEffects.forEach(magic => {
//     const handOffsetX = magic.flipX ? -10 : 10;
    
//     const fromX = magic.fromX * TILE + TILE / 2 + handOffsetX;
//     const fromY = magic.fromY * TILE + TILE / 2;
//     const toX   = magic.toX   * TILE + TILE / 2;
//     const toY   = magic.toY   * TILE + TILE / 2;
    
//     const dx       = toX - fromX;
//     const dy       = toY - fromY;
//     const distance = Math.sqrt(dx * dx + dy * dy);
//     const angle    = Math.atan2(dy, dx);
    
//     const img = images.laser_ranged;
    
//     if (img.complete) {
//       ctx.save();
//       ctx.translate(fromX, fromY);
//       ctx.rotate(angle);
      
//       if (magic.flipX) {
//         ctx.scale(1, -1);
//       }
      
//       ctx.drawImage(img, 0, -12, distance, 24);
      
//       ctx.restore();
//     }
//   });
// }
function renderMagicEffects() {
  const currentTime = Date.now();
  
  magicEffects = magicEffects.filter(magic => {
    return currentTime - magic.startTime < magic.duration;
  });
  
  magicEffects.forEach(magic => {
    const handOffsetX = magic.flipX ? -10 : 10;
    
    const fromX = magic.fromX * TILE + TILE / 2 + handOffsetX;
    const fromY = magic.fromY * TILE + TILE / 2;
    const toX   = magic.toX   * TILE + TILE / 2;
    const toY   = magic.toY   * TILE + TILE / 2;

    const dx       = toX - fromX;
    const dy       = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle    = Math.atan2(dy, dx);

    // === ⭐ owner 기반 이미지 선택 ===
    const laserKey = magic.owner === 'ai' ? 'laser_ranged_ai' : 'laser_ranged';
    const img = images[laserKey];

    if (img && img.complete) {
      ctx.save();
      ctx.translate(fromX, fromY);
      ctx.rotate(angle);

      if (magic.flipX) {
        ctx.scale(1, -1);
      }

      ctx.drawImage(img, 0, -12, distance, 24);
      
      ctx.restore();
    }
  });
}


// ===========================
// 배치 가능 여부 체크
// ===========================

function canPlaceStructure(gx, gy) {
  // 1) 맵 범위 체크
  if (gx < 0 || gx >= MAP_WIDTH || gy < 0 || gy >= MAP_HEIGHT) return false;
  
  // 2) 건물 개수 상한 체크
  if (gameState.structureCount >= MAX_STRUCTURES) {

    return false;
  }
  
  // 3) 플레이어 영토인지 확인
  if (territoryMap[gy][gx] !== 0) {
    return false;
  }
  
  // 4) 병영은 지정된 위치에만 배치 허용
  if (placementMode.structureType === 'barracks') {
    const isValidPosition = userBarracksPositions.some(
      pos => pos.gx === gx && pos.gy === gy
    );
    if (!isValidPosition) {
      return false;
    }
  }
  
  // 5) 길 위에는 배치 불가
  if (mapData[gy][gx] === 2) return false;
  
  // 6) 기지 위치에는 배치 불가
  if (bases.some(base => base.gx === gx && base.gy === gy)) return false;
  
  // 7) 이미 존재하는 구조물 체크 (플레이어)
  for (let structureType in structures.player) {
    if (structures.player[structureType].some(pos => pos.gx === gx && pos.gy === gy)) {
      return false;
    }
  }

  // 8) 이미 존재하는 구조물 체크 (AI)
  for (let structureType in structures.ai) {
    if (structures.ai[structureType].some(pos => pos.gx === gx && pos.gy === gy)) {
      return false;
    }
  }
  
  // 9) 자원이 충분한지 체크
  if (gameState.resource < placementMode.cost) return false;
  
  return true;
}

// ===========================
// 유닛 이동 및 전투
// ===========================

function updateUnitMovement(deltaTime) {
  if (!window.activeUnits) return;

  const currentTime = Date.now();

  window.activeUnits.forEach(unit => {
    
    // 1. 사거리 내 공격 대상 찾기
    let target     = null;
    let targetType = null;
    
    const enemyUnit = window.activeUnits.find(other => {
      if (other.owner === unit.owner) return false;
      const dist = Math.sqrt(
        Math.pow(other.x - unit.x, 2) +
        Math.pow(other.y - unit.y, 2)
      );
      return dist <= unit.range;
    });
    
    if (enemyUnit) {
      target     = enemyUnit;
      targetType = 'unit';
    } else {
      const enemyBase = bases.find(b => b.owner !== unit.owner);
      if (enemyBase) {
        const dist = Math.sqrt(
          Math.pow(enemyBase.gx - unit.x, 2) +
          Math.pow(enemyBase.gy - unit.y, 2)
        );
        if (dist <= unit.range) {
          target     = enemyBase;
          targetType = 'base';
        }
      }
    }
    
    // 2. 공격 대상이 있으면 공격 처리
    if (target) {
      unit.atGoal = false;
      
      const now    = currentTime;
      const period = unit.attackSpeed * 1000;
      const half   = period / 2;
      
      if (!unit.lastAttackTime) {
        unit.lastAttackTime = now;
      }
      
      const elapsed = now - unit.lastAttackTime;
      
      if (elapsed < half) {
        unit.animFrame = 1;
      } else if (elapsed < period) {
        if (unit.animFrame === 1) {
          unit.animFrame = 2;
          
          // 원거리 유닛이면 마법 이펙트 추가
          if (unit.type === 'ranged') {
            magicEffects.push({
              owner: unit.owner,
              fromX:     unit.x,
              fromY:     unit.y,
              toX:       targetType === 'unit' ? target.x  : target.gx,
              toY:       targetType === 'unit' ? target.y  : target.gy,
              flipX:     unit.flipX,
              startTime: now,
              duration:  300
            });
            soundManager.playMultiple('attack_ranged');
          } else if (unit.type === 'melee') {
            soundManager.playMultiple('attack_melee');
          } else if (unit.type === 'tank') {
            soundManager.playMultiple('attack_tank');
          }
          
          
          // 데미지 적용
          target.hp -= unit.attackPower;
          //console.log(`공격! 대상 HP: ${target.hp}`);
          
          // 대상이 사망/파괴되었는지 체크
          if (target.hp <= 0) {
            if (targetType === 'unit') {
              const index = window.activeUnits.indexOf(target);
              if (index > -1) {
                soundManager.playMultiple('remove_' + target.type);
                window.activeUnits.splice(index, 1);
                const state = target.owner === 'player' ? gameState : gameState.ai;
                state.population -= unitInfo[target.type].population;
                updateInfoPanel();
              }
            } else if (targetType === 'base') {
              target.hp = 0;
              endGame(unit.owner);
            }
          }
        } else {
          unit.animFrame = 2;
        }
      } else {
        unit.lastAttackTime = now;
        unit.animFrame      = 1;
      }
      
      return;
    }

    // 3. 공격 대상이 없으면 이동 처리
    if (unit.path && unit.path.length > 0) {
      const next = unit.path[unit.pathIndex];
      unit.targetX = next.x;
      unit.targetY = next.y;
    }

    const dx       = unit.targetX - unit.x;
    const dy       = unit.targetY - unit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 도착 판정
    if (distance < 0.1) {
      unit.x = unit.targetX;
      unit.y = unit.targetY;

      // flipPoint에 도달하면 좌우 반전
      if (flipPoints.some(p => p.x === unit.x && p.y === unit.y)) {
        unit.flipX = !unit.flipX;
      }

      unit.pathIndex++;
      if (unit.pathIndex >= unit.path.length) {
        unit.path   = [];
        unit.atGoal = true;
      }
      return;
    }

    // 이동 속도 계산
    const movePerSecond  = 1 / unit.moveSpeed;
    const moveThisFrame  = movePerSecond * (deltaTime / 1000);

    const mx = (dx / distance) * moveThisFrame;
    const my = (dy / distance) * moveThisFrame;

    unit.x += mx;
    unit.y += my;

    unit.position.gx = Math.round(unit.x);
    unit.position.gy = Math.round(unit.y);

   

    // 이동 중 애니메이션 프레임 토글
    if (currentTime - unit.lastAnimTime >= 1000) {
      unit.animFrame   = (unit.animFrame === 1 ? 2 : 1);
        // 프레임에 맞춰 발소리 번갈아 재생
      if (unit.animFrame === 1) {
        soundManager.playMultiple('unit_move_1');
      } else {
        soundManager.playMultiple('unit_move_2');
      }
      unit.lastAnimTime = currentTime;
    }
  });
}

// ===========================
// 포탑 업데이트
// ===========================

function updateTurrets(deltaTime) {
  const currentTime = Date.now();
  
  // 플레이어 포탑
  structures.player.turret.forEach(turret => {
    updateTurretAttack(turret, 'player', currentTime);
  });
  
  // AI 포탑
  structures.ai.turret.forEach(turret => {
    updateTurretAttack(turret, 'ai', currentTime);
  });
}

function updateTurretAttack(turret, owner, currentTime) {
  if (!window.activeUnits || window.activeUnits.length === 0) {
    return;
  }
  
  const attackPeriod = (1 / structureInfo.turret.attackSpeed) * 1000;
  
  if (!turret.lastAttackTime) {
    turret.lastAttackTime = currentTime;
  }
  
  const elapsed = currentTime - turret.lastAttackTime;
  if (elapsed < attackPeriod) {
    return;
  }
  
  const range = structureInfo.turret.range;

  // 사거리 내의 적 유닛 필터링
  const enemiesInRange = window.activeUnits.filter(unit => {
    if (unit.owner === owner) return false;
    
    const unitTileX = Math.round(unit.x);
    const unitTileY = Math.round(unit.y);

    if (mapData[unitTileY]?.[unitTileX] !== 2) return false;
    
    const dist = Math.sqrt(
      Math.pow(turret.gx - unit.x, 2) +
      Math.pow(turret.gy - unit.y, 2)
    );
    return dist <= range;
  });
  
  if (enemiesInRange.length === 0) return;
  
  // 경로 상으로 가장 앞선 유닛을 우선 타겟
  const target = enemiesInRange.reduce((closest, unit) => {
    if (!closest) return unit;
    return unit.pathIndex > closest.pathIndex ? unit : closest;
  }, null);
  
  if (target) {
    // 레이저 이펙트 추가
    laserEffects.push({
      owner: owner,
      fromX:     turret.gx,
      fromY:     turret.gy,
      toX:       target.x,
      toY:       target.y,
      startTime: currentTime,
      duration:  200
    });
     soundManager.playMultiple('attack_turret');
    
    // 공격 적용
    target.hp -= structureInfo.turret.attackPower;
    turret.lastAttackTime = currentTime;
    
    //console.log(`포탑 공격! 대상 HP: ${target.hp}`);
    
    // 대상이 사망하면 유닛 제거
    if (target.hp <= 0) {
      const index = window.activeUnits.indexOf(target);
      if (index > -1) {
        window.activeUnits.splice(index, 1);
        const state = target.owner === 'player' ? gameState : gameState.ai;
        state.population -= unitInfo[target.type].population;
        updateInfoPanel();
      }
    }
  }
}

// ===========================
// 생산 관리
// ===========================

function updateAllProduction(deltaTime) {
  // 플레이어 병영
  structures.player.barracks.forEach(barracks => {
    updateBarracksProduction(barracks, deltaTime, 'player');
  });
  
  // AI 병영
  structures.ai.barracks.forEach(barracks => {
    updateBarracksProduction(barracks, deltaTime, 'ai');
  });

  // 포탑 공격 및 유닛 이동 업데이트
  updateTurrets(deltaTime);
  updateUnitMovement(deltaTime);
}

function updateBarracksProduction(barracks, deltaTime, owner) {
  // roundActive가 false면 생산 안 함
  if (!roundActive) return;
  
  if (!barracks.productionQueue) {
    barracks.productionQueue    = [];
    barracks.currentProduction  = null;
    barracks.productionProgress = 0;
  }
  
  // 1. 현재 생산 중인 유닛이 없고, 큐에 대기 중인 유닛이 있다면 생산 시작
  if (!barracks.currentProduction && barracks.productionQueue.length > 0) {
    barracks.currentProduction   = barracks.productionQueue.shift();
    barracks.productionProgress  = 0;
    barracks.productionStartTime = Date.now();
    
    console.log(`[${owner}] 유닛 생산 시작:`, barracks.currentProduction.type);
  }
  
  // 2. 생산 중인 유닛이 있을 때, 진행도 갱신
  if (barracks.currentProduction) {
    const productionTime = unitInfo[barracks.currentProduction.type].productionTime;
    const elapsed        = Date.now() - barracks.productionStartTime;
    barracks.productionProgress = Math.min(elapsed / productionTime, 1);
    
    // 현재 선택된 병영이라면, 생산 대기열 UI 갱신
    if (selectedStructure === barracks && selectedStructureType === 'barracks') {
      updateProductionQueueUI();
    }
    
    // 3. 생산 완료 시 유닛 스폰
    if (barracks.productionProgress >= 1) {
      const state    = (owner === 'player' ? gameState : gameState.ai);
      const canSpawn =
        state.population + barracks.currentProduction.population
        <= state.maxPopulation;
      
      if (canSpawn) {
        spawnUnit(barracks, barracks.currentProduction, owner);
      } else {
        console.log('인구수 부족, 대기 중...');
        return;
      }
      
      barracks.currentProduction  = null;
      barracks.productionProgress = 0;

      // 선택된 병영이면 UI 즉시 갱신
      if (selectedStructure === barracks) {
        updateProductionQueueUI();
      }
    }
  }
}

// ===========================
// 유닛 스폰
// ===========================

// 플레이어 유닛 이동 경로
const playerPath = [
  {x: 2,  y: 7}, {x: 3,  y: 7}, {x: 3,  y: 6}, {x: 3,  y: 5},
  {x: 2,  y: 5}, {x: 1,  y: 5}, {x: 1,  y: 4}, {x: 1,  y: 3},
  {x: 1,  y: 2}, {x: 2,  y: 2}, {x: 3,  y: 2}, {x: 4,  y: 2},
  {x: 5,  y: 2}, {x: 6,  y: 2}, {x: 7,  y: 2}, {x: 7,  y: 3},
  {x: 7,  y: 4}, {x: 7,  y: 5}, {x: 7,  y: 6}, {x: 7,  y: 7},
  {x: 8,  y: 7}, {x: 9,  y: 7}, {x: 10, y: 7}, {x: 11, y: 7},
  {x: 12, y: 7}, {x: 13, y: 7}, {x: 13, y: 6}, {x: 13, y: 5},
  {x: 13, y: 4}, {x: 12, y: 4}, {x: 11, y: 4}, {x: 11, y: 3},
  {x: 11, y: 2}, {x: 12, y: 2}
];

// 방향 전환 포인트
const flipPoints = [
  {x: 3,  y: 7}, {x: 1,  y: 5},
  {x: 13, y: 7}, {x: 11, y: 4}
];

// AI 유닛 이동 경로
const aiPath = [...playerPath].reverse();

function spawnUnit(barracks, unitData, owner) {
  const targetGameState = owner === 'player' ? gameState : gameState.ai;

  // 인구수 증가
  targetGameState.population += unitData.population;

    recordUnitSpawn(owner, unitData.type);

  const spawn = barracks.spawnPoint;
  const path = owner === 'player' ? playerPath : aiPath;

  // 경로에서 스폰 위치 인덱스 찾기
  let idx = path.findIndex(p => p.x === spawn.gx && p.y === spawn.gy);
  if (idx < 0) idx = 0;

  // 시작 방향 결정
  let flipX;
  if (owner === 'ai') {
    if (spawnGx === 13) {
    flipX = false;
  } else {
    flipX = true;
  }
    flipX = true;
  } else {
    let passedFlips = 0;
    for (let i = 0; i <= idx; i++) {
      const p = path[i];
      if (flipPoints.some(fp => fp.x === p.x && fp.y === p.y)) {
        passedFlips++;
      }
    }
    flipX = (passedFlips % 2 === 1);
  }

  // 다음 이동 목표 타일 결정
  let targetX = spawn.gx;
  let targetY = spawn.gy;

  if (path[idx + 1]) {
    targetX = path[idx + 1].x;
    targetY = path[idx + 1].y;
  }

  // 유닛 객체 생성
  const unit = {
    type:   unitData.type,
    owner:  owner,
    x:      spawn.gx,
    y:      spawn.gy,
    position: { gx: spawn.gx, gy: spawn.gy },
    targetX: targetX,
    targetY: targetY,
    path:    path,
    pathIndex: idx + 1,
    flipX:  flipX,

    hp:        unitInfo[unitData.type].health,
    maxHp:     unitInfo[unitData.type].health,
    attackPower: unitInfo[unitData.type].attackPower,
    attackSpeed: unitInfo[unitData.type].attackSpeed,
    moveSpeed:   unitInfo[unitData.type].moveSpeed,
    range:       unitInfo[unitData.type].range,
    animFrame:   1,
    lastAnimTime: Date.now(),

    atGoal:          false,
    isAttacking:     false,
    lastAttackTime:  Date.now(),
    lastAttackSwingTime: 0,
  };

  // 전역 유닛 리스트에 등록
  if (!window.activeUnits) window.activeUnits = [];
  window.activeUnits.push(unit);

  // 인구수 변화 반영
  updateInfoPanel();
}

// ===========================
// AI 구조물 배치 헬퍼
// ===========================

// 다음 배치 가능한 위치 찾기
function getNextAvailablePosition(structureType) {
  let positions;
  let existingStructures;
  
  switch(structureType) {
    case 'population':
      positions = aiPopulationPositions;
      existingStructures = structures.ai.population;
      break;
    case 'turret':
      positions = aiTurretPositions;
      existingStructures = structures.ai.turret;
      break;
    case 'resource':
      positions = aiResourcePositions;
      existingStructures = structures.ai.resource;
      break;
    case 'barracks':
  positions = aiBarracksPositions;
  existingStructures = structures.ai.barracks;
  break;
    default:
      return null;
  }
  
  // 이미 배치된 위치들 확인
  const occupiedPositions = existingStructures.map(s => `${s.gx}-${s.gy}`);
  
  // ID 순서대로 비어있는 첫 번째 위치 찾기
  for (let pos of positions) {
    const key = `${pos.gx}-${pos.gy}`;
    if (!occupiedPositions.includes(key)) {
      return pos;
    }
  }
  
  return null; // 모든 위치가 찼을 때
}

// 특정 ID 위치에 구조물 배치 (AI 전략 응답용)
function placeAIStructureById(structureType, id) {
  let positions;
  
  switch(structureType) {
    case 'population':
      positions = aiPopulationPositions;
      break;
    case 'turret':
      positions = aiTurretPositions;
      break;
    case 'resource':
      positions = aiResourcePositions;
      break;
    default:
      return false;
  }
  
  const position = positions.find(p => p.id === id);
  if (!position) return false;
  
  // 이미 해당 위치에 구조물이 있는지 확인
  const existingStructures = structures.ai[structureType];
  const alreadyExists = existingStructures.some(
    s => s.gx === position.gx && s.gy === position.gy
  );
  
  if (alreadyExists) return false;
  
  // 구조물 배치
  const structureData = { 
    gx: position.gx, 
    gy: position.gy,
    id: id  // ID도 저장
  };
  
  structures.ai[structureType].push(structureData);
  gameState.ai.structureCount++;
  
  // 주거지면 인구수 증가
  if (structureType === 'population') {
    gameState.ai.maxPopulation += 3;
  }
  
  return true;
}


// ===========================
// 게임 상태 수집 및 출력
// ===========================

// 유닛 생성 시 기록 추가 (GameState 클래스 메서드 사용)
function recordUnitSpawn(owner, unitType) {
  gameState.recordUnitSpawn(owner, unitType);
}

// 게임 상태 수집 및 콘솔 출력
function showGameState() {
  console.clear();
  console.log('='.repeat(60));
  console.log(' 현재 게임 상태');
  console.log('='.repeat(60));
  
  // 라운드 정보
  console.log(`\n 현재 라운드: ${gameState.round}`);
  
  // 플레이어 정보
  console.log('\n 플레이어:');
  console.log(`   자원: ${gameState.resource}`);
  console.log(`   인구수: ${gameState.population} / ${gameState.maxPopulation}`);
  console.log(`   기지 체력: ${bases.find(b => b.owner === 'player').hp} / ${bases.find(b => b.owner === 'player').maxHp}`);
  
  console.log('\n    구조물:');
  console.log(`    - 주거지: ${structures.player.population.length}개`);
  console.log(`    - 병영: ${structures.player.barracks.length}개`);
  console.log(`    - 포탑: ${structures.player.turret.length}개`);
  console.log(`    - 자원채취: ${structures.player.resource.length}개`);
  console.log(`    - 총 구조물: ${gameState.structureCount} / ${MAX_STRUCTURES}`);
  
  // ⭐ 플레이어 유닛 사용 (이전 라운드) - GameState 클래스 사용
  const prevRound = gameState.round - 1;
  const playerUnitsLastRound = gameState.playerUnitUsage.filter(u => u.round === prevRound);
  const playerMelee = playerUnitsLastRound.filter(u => u.type === 'melee').length;
  const playerRanged = playerUnitsLastRound.filter(u => u.type === 'ranged').length;
  const playerTank = playerUnitsLastRound.filter(u => u.type === 'tank').length;
  
  console.log(`\n    이전 라운드(${prevRound}) 생성한 유닛:`);
  console.log(`    - 근접: ${playerMelee}개`);
  console.log(`    - 원거리: ${playerRanged}개`);
  console.log(`    - 방어: ${playerTank}개`);
  console.log(`    - 총: ${playerUnitsLastRound.length}개`);
  
  // AI 정보
  console.log('\n AI:');
  console.log(`   자원: ${gameState.ai.resource}`);
  console.log(`   인구수: ${gameState.ai.population} / ${gameState.ai.maxPopulation}`);
  console.log(`   기지 체력: ${bases.find(b => b.owner === 'ai').hp} / ${bases.find(b => b.owner === 'ai').maxHp}`);
  
  console.log('\n    구조물:');
  console.log(`    - 주거지: ${structures.ai.population.length}개`);
  console.log(`    - 병영: ${structures.ai.barracks.length}개`);
  console.log(`    - 포탑: ${structures.ai.turret.length}개`);
  console.log(`    - 자원채취: ${structures.ai.resource.length}개`);
  console.log(`    - 총 구조물: ${gameState.ai.structureCount} / ${MAX_STRUCTURES}`);
  
  // ⭐ AI 유닛 사용 (이전 라운드) - GameState 클래스 사용
  const aiUnitsLastRound = gameState.aiUnitUsage.filter(u => u.round === prevRound);
  const aiMelee = aiUnitsLastRound.filter(u => u.type === 'melee').length;
  const aiRanged = aiUnitsLastRound.filter(u => u.type === 'ranged').length;
  const aiTank = aiUnitsLastRound.filter(u => u.type === 'tank').length;
  
  console.log(`\n    이전 라운드(${prevRound}) 생성한 유닛:`);
  console.log(`    - 근접: ${aiMelee}개`);
  console.log(`    - 원거리: ${aiRanged}개`);
  console.log(`    - 방어: ${aiTank}개`);
  console.log(`    - 총: ${aiUnitsLastRound.length}개`);
  
  // 구조물 상세 위치 정보
  console.log('\n 플레이어 구조물 위치:');
  structures.player.population.forEach((s, i) => {
    console.log(`  주거지 ${i+1}: (${s.gx}, ${s.gy})`);
  });
  structures.player.turret.forEach((s, i) => {
    console.log(`  포탑 ${i+1}: (${s.gx}, ${s.gy})`);
  });
  structures.player.resource.forEach((s, i) => {
    console.log(`  자원채취 ${i+1}: (${s.gx}, ${s.gy})`);
  });
  
  console.log('\n AI 구조물 위치:');
  structures.ai.population.forEach((s, i) => {
    console.log(`  주거지 ${i+1}: (${s.gx}, ${s.gy})${s.id ? ` [ID: ${s.id}]` : ''}`);
  });
  structures.ai.turret.forEach((s, i) => {
    console.log(`  포탑 ${i+1}: (${s.gx}, ${s.gy})${s.id ? ` [ID: ${s.id}]` : ''}`);
  });
  structures.ai.resource.forEach((s, i) => {
    console.log(`  자원채취 ${i+1}: (${s.gx}, ${s.gy})${s.id ? ` [ID: ${s.id}]` : ''}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

// ⭐ 라운드 종료 시 오래된 유닛 기록 정리 (GameState 클래스 메서드 사용)
function cleanOldUnitRecords() {
  gameState.cleanOldUnitRecords();
}


// ===========================
// AI 전략 적용
// ===========================
// ===========================
// AI 전략 적용
// ===========================

// 구조물 철거 (가장 큰 ID부터)
function demolishAIStructureAuto(structureType, count) {
  const existingStructures = structures.ai[structureType];
  
  if (existingStructures.length === 0) {
    console.warn(`철거 실패: ${structureType} 구조물이 없음`);
    return 0;
  }
  
  // ID 기준 내림차순 정렬 (큰 ID부터)
  const sorted = [...existingStructures].sort((a, b) => (b.id || 0) - (a.id || 0));
  
  let demolished = 0;
  const actualCount = Math.min(count, sorted.length);
  
  for (let i = 0; i < actualCount; i++) {
    const target = sorted[i];
    const index = existingStructures.indexOf(target);
    
    if (index > -1) {
      existingStructures.splice(index, 1);
      
      // 자원 50% 환불
      const refund = Math.floor(structureInfo[structureType].cost * 0.5);
      gameState.ai.resource += refund;
      gameState.ai.structureCount--;
      
      // 주거지면 인구수 감소
      if (structureType === 'population') {
        gameState.ai.maxPopulation -= 3;
      }
      
      demolished++;
      console.log(` ${structureType}${target.id ? ` ID ${target.id}` : ''} 철거 (환불: ${refund})`);
    }
  }
  
  return demolished;
}

// 구조물 건설 (가장 작은 ID부터)
function buildAIStructureAuto(structureType, count) {
  let positions;
  
  switch(structureType) {
    case 'population':
      positions = aiPopulationPositions;
      break;
    case 'turret':
      positions = aiTurretPositions;
      break;
    case 'resource':
      positions = aiResourcePositions;
      break;
       case 'barracks':
      positions = aiBarracksPositions;
      break;
    default:
      console.warn(`알 수 없는 구조물 타입: ${structureType}`);
      return 0;
  }
  
  // 이미 배치된 위치들
  const existingStructures = structures.ai[structureType];
  const occupiedPositions = existingStructures.map(s => `${s.gx}-${s.gy}`);
  
  let built = 0;
  const cost = structureInfo[structureType].cost;
  
  // ID 오름차순으로 비어있는 위치 찾기
  for (let pos of positions) {
    if (built >= count) break;
    
    const key = `${pos.gx}-${pos.gy}`;
    
    // 이미 배치되어 있으면 건너뛰기
    if (occupiedPositions.includes(key)) continue;
    
    // 자원 체크
    if (gameState.ai.resource < cost) {
      console.warn(` 자원 부족: ${structureType} 건설 중단 (필요: ${cost}, 보유: ${gameState.ai.resource})`);
      break;
    }
    
    // 구조물 개수 체크
    if (gameState.ai.structureCount >= MAX_STRUCTURES) {
      console.warn(` 구조물 한계: 최대 ${MAX_STRUCTURES}개`);
      break;
    }
    
    // 건설
    structures.ai[structureType].push({
      gx: pos.gx,
      gy: pos.gy,
      id: pos.id,
      spawnPoint: pos.spawnPoint   
    });
    
    gameState.ai.resource -= cost;
    gameState.ai.structureCount++;
    
    // 주거지면 인구수 증가
    if (structureType === 'population') {
      gameState.ai.maxPopulation += 3;
    }
    
    built++;
    console.log(` ${structureType} ID ${pos.id} 건설 (비용: ${cost})`);
  }
  
  return built;
}


function getRandomBarracks(barracksList) {
  if (!barracksList || barracksList.length === 0) return null;
  const index = Math.floor(Math.random() * barracksList.length);
  return barracksList[index];
}



function applyAIStrategy(strategy) {
  console.log('\n AI 전략 적용 시작...');
  console.log('전략:', strategy);

  let totalCost = 0;
  let actionsLog = [];

  // ----------------------------------------
  // 1. 구조물 철거
  // ----------------------------------------
  if (strategy.structures?.demolish) {
    console.log('\n 구조물 철거:');

    for (let [type, count] of Object.entries(strategy.structures.demolish)) {
      if (count > 0) {
        const demolished = demolishAIStructureAuto(type, count);
        if (demolished > 0) {
          actionsLog.push(`철거: ${type} ${demolished}개`);
        }
      }
    }
  }

  // ----------------------------------------
  // 2. 구조물 건설
  // ----------------------------------------
  if (strategy.structures?.build) {
  console.log('\n 구조물 건설:');

  // ⭐ 1) turret을 가장 먼저 처리하도록 정렬
  const buildOrder = Object.entries(strategy.structures.build)
    .sort((a, b) => {
      const priority = { turret: 0, barracks: 1, resource: 2, population: 3 };
      return priority[a[0]] - priority[b[0]];
    });

  // ⭐ 2) 정렬된 순서대로 건설
  for (let [type, count] of buildOrder) {
    if (count > 0) {
      const built = buildAIStructureAuto(type, count);
      if (built > 0) {
        const consumed = structureInfo[type].cost * built;
        totalCost += consumed;
        actionsLog.push(`건설: ${type} ${built}개 (비용 ${consumed})`);
      }
    }
  }
}

  // ----------------------------------------
  // 3. 유닛 생산 (랜덤 병영)
  // ----------------------------------------
  if (strategy.units) {
    console.log('\n 유닛 생산:');
    const aiBarracks = structures.ai.barracks;

    if (aiBarracks.length === 0) {
      console.warn(' 병영이 없어 유닛 생산 불가');
    } else {
      aiBarracks.forEach(b => {
        if (!b.productionQueue) b.productionQueue = [];
      });

      let unitsProduced = { tank: 0, melee: 0, ranged: 0 };

      // 유닛 생산 헬퍼
      const produceUnit = (type, count) => {
        for (let i = 0; i < count; i++) {
          const cost = unitInfo[type].cost;
          if (gameState.ai.resource < cost) break;

          const b = getRandomBarracks(aiBarracks);
          b.productionQueue.push({
            type: type,
            cost: cost,
            population: unitInfo[type].population
          });

          gameState.ai.resource -= cost;
          totalCost += cost;
          unitsProduced[type]++;
        }
      };

      produceUnit('tank', strategy.units.tank || 0);
      produceUnit('melee', strategy.units.melee || 0);
      produceUnit('ranged', strategy.units.ranged || 0);

      if (unitsProduced.tank + unitsProduced.melee + unitsProduced.ranged > 0) {
        actionsLog.push(
          `생산: 방어 ${unitsProduced.tank}개, 근접 ${unitsProduced.melee}개, 원거리 ${unitsProduced.ranged}개`
        );
      }
    }
  }

  // ----------------------------------------
  // 4. 남은 자원으로 추가 근접 유닛 생산 (랜덤 병영)
  // ----------------------------------------
  console.log(`\n 남은 자원: ${gameState.ai.resource}`);
  const meleeCost = unitInfo.melee.cost;

  if (structures.ai.barracks.length > 0) {
    let extra = 0;

    while (gameState.ai.resource >= meleeCost) {
      const b = getRandomBarracks(structures.ai.barracks);
      b.productionQueue.push({
        type: 'melee',
        cost: meleeCost,
        population: unitInfo.melee.population
      });

      gameState.ai.resource -= meleeCost;
      totalCost += meleeCost;
      extra++;
    }

    if (extra > 0) {
      actionsLog.push(`추가 생산: 근접 ${extra}개`);
      console.log(` 남은 자원 활용 → 추가 근접 ${extra}개 생산`);
    }
  }

  // ----------------------------------------
  // 5. 로그 출력 + UI 갱신
  // ----------------------------------------
  console.log('\n AI 전략 적용 완료');
  console.log(`총 소비 자원: ${totalCost}`);
  console.log('실행된 액션:');
  actionsLog.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));

  updateInfoPanel();
  renderMap();
}



function applyDefaultAIStrategy() {
  console.log('defaultaistrategy 시작');
  return {
    structures: {
      build: { barracks: 0, population: 0, resource: 0, turret: 0 },
      demolish: { barracks: 0, population: 0, resource: 0, turret: 0 }
    },
    units: {
      tank: 0,
      melee: 0,
      ranged: 0
    }
  };
}




// // 테스트용 하드코딩된 전략들 (단순화된 포맷)
// const testStrategies = {
//   defensive: {
//      structures: {
//       demolish: {
//         turret: 0,  // 포탑 1개 철거 (가장 큰 ID부터)
//         resource: 0,
//         population: 0,
//         barracks: 0,
//       },
//       build: {
//         turret: 1,
//         population: 1,
//         resource: 1,
//         barracks: 2,
//       }
//     },
//     units: {
//       melee: 0,
//       ranged: 1,
//       tank: 2
//     }
//   },
  
//   aggressive: {
//      structures: {
//       demolish: {
//         turret: 0,  // 포탑 1개 철거 (가장 큰 ID부터)
//         resource: 0,
//         population: 0,
//         barracks: 0,
//       },
//       build: {
//         turret: 1,
//         population: 1,
//         resource: 1,
//         barracks: 2,
//       }
//     },
//     units: {
//       melee: 5,
//       ranged: 2,
//       tank: 0
//     }
//   },
  
//   balanced: {
//     structures: {
//       demolish: {
//         turret: 0,  // 포탑 1개 철거 (가장 큰 ID부터)
//         resource: 0,
//         population: 0,
//         barracks: 0,
//       },
//       build: {
//         turret: 1,
//         population: 1,
//         resource: 1,
//         barracks: 2,
//       }
//     },
//     units: {
//       melee: 2,
//       ranged: 2,
//       tank: 1
//     }
//   }
// };

// gamefunction.js
function collectGameState() {
  const units = window.activeUnits || [];
  
  const playerBase = bases.find(b => b.owner === 'player');
  const aiBase = bases.find(b => b.owner === 'ai');
  
  // 이전 라운드 유닛 생산 기록
  const prevRound = gameState.round - 1;
  
  const aiUnitsLastRound = gameState.aiUnitUsage.filter(u => u.round === prevRound);
  const playerUnitsLastRound = gameState.playerUnitUsage.filter(u => u.round === prevRound);

  return {
    // 라운드 정보
    round: gameState.round,
    
    // === AI 정보 ===
    aiResource: gameState.ai.resource,
    aiBaseHp: aiBase.hp,
    aiMaxPopulation: gameState.ai.maxPopulation,
    aiStructureCount: gameState.ai.structureCount,
    aiStructures: {
      barracks: structures.ai.barracks.length,
      population: structures.ai.population.length,
      resource: structures.ai.resource.length,
      turret: structures.ai.turret.length,
    },
    // 현재 맵 위 AI 유닛
    aiUnits: {
      melee: units.filter(u => u.owner === 'ai' && u.type === 'melee').length,
      ranged: units.filter(u => u.owner === 'ai' && u.type === 'ranged').length,
      tank: units.filter(u => u.owner === 'ai' && u.type === 'tank').length,
    },
    // ⭐ 이전 라운드 AI 유닛 생산 기록
    aiUnitsLastRound: {
      melee: aiUnitsLastRound.filter(u => u.type === 'melee').length,
      ranged: aiUnitsLastRound.filter(u => u.type === 'ranged').length,
      tank: aiUnitsLastRound.filter(u => u.type === 'tank').length,
      total: aiUnitsLastRound.length,
    },
    
    // === 적(플레이어) 정보 ===
    enemyBaseHp: playerBase.hp,
    enemyMaxPopulation: gameState.maxPopulation,
    enemyStructureCount: gameState.structureCount,
    enemyStructures: {
      barracks: structures.player.barracks.length,
      population: structures.player.population.length,
      resource: structures.player.resource.length,
      turret: structures.player.turret.length,
    },
    // 현재 맵 위 적 유닛
    enemyUnits: {
      melee: units.filter(u => u.owner === 'player' && u.type === 'melee').length,
      ranged: units.filter(u => u.owner === 'player' && u.type === 'ranged').length,
      tank: units.filter(u => u.owner === 'player' && u.type === 'tank').length,
    },
    // ⭐ 이전 라운드 적 유닛 생산 기록
    enemyUnitsLastRound: {
      melee: playerUnitsLastRound.filter(u => u.type === 'melee').length,
      ranged: playerUnitsLastRound.filter(u => u.type === 'ranged').length,
      tank: playerUnitsLastRound.filter(u => u.type === 'tank').length,
      total: playerUnitsLastRound.length,
    },
  };
}

function buildGameRuleJSON() {
  return {
    system: {
      maxStructures: MAX_STRUCTURES,
      baseRoundReward: 50,
      resourceRewardPerStructure: structureInfo.resource.resourcePerRound
    },
    
    structures: Object.fromEntries(
      Object.entries(structureInfo).map(([key, s]) => [
        key,
        {
          cost: s.cost,
          description: s.description,
          attackPower: s.attackPower ?? null,
          attackSpeed: s.attackSpeed ?? null,
          range: s.range ?? null,
          resourcePerRound: s.resourcePerRound ?? null,
          populationIncrease: s.populationIncrease ?? null
        }
      ])
    ),

    units: Object.fromEntries(
      Object.entries(unitInfo).map(([key, u]) => [
        key,
        {
          cost: u.cost,
          population: u.population,
          health: u.health,
          attackPower: u.attackPower,
          attackSpeed: u.attackSpeed,
          range: u.range,
          moveSpeed: u.moveSpeed,
          productionTime: u.productionTime,
          description: u.description
        }
      ])
    )
  };
}

// ===========================
// AI 프롬프트 생성
// ===========================

function buildAIPrompt(state) {
    const rules = buildGameRuleJSON();
  return `당신은 타워 디펜스 게임의 AI 플레이어입니다.
상대 기지를 파괴하면 승리합니다.

=== 게임 규칙 ===
${JSON.stringify(rules, null, 2)}



=== 현재 상황 (라운드 ${state.round}) ===

[ 나(AI) ]
- 자원: ${state.aiResource}
- 기지 HP: ${state.aiBaseHp} / 100
- 최대 인구: ${state.aiMaxPopulation}
- 구조물 (${state.aiStructureCount}/10): 병영 ${state.aiStructures.barracks}, 주거지 ${state.aiStructures.population}, 자원 ${state.aiStructures.resource}, 포탑 ${state.aiStructures.turret}
- 지난 라운드 생산: 근접 ${state.aiUnitsLastRound.melee}, 원거리 ${state.aiUnitsLastRound.ranged}, 탱크 ${state.aiUnitsLastRound.tank}

[ 적(플레이어) ]
- 기지 HP: ${state.enemyBaseHp} / 100
- 최대 인구: ${state.enemyMaxPopulation}
- 구조물 (${state.enemyStructureCount}/10): 병영 ${state.enemyStructures.barracks}, 주거지 ${state.enemyStructures.population}, 자원 ${state.enemyStructures.resource}, 포탑 ${state.enemyStructures.turret}
- 지난 라운드 생산: 근접 ${state.enemyUnitsLastRound.melee}, 원거리 ${state.enemyUnitsLastRound.ranged}, 탱크 ${state.enemyUnitsLastRound.tank}

=== 전략 가이드 예시 ===
- 초반(1-3라운드): 1라운드 포탑건설은 필수, 이후 자원생산소 확보
- 중반(4-7라운드): 인구수 확보, 병영 추가 확보
- 후반(8+라운드): 대규모 공세, tank 앞세우고 melee/ranged 조합

상황별 대응:
- 적이 지난 라운드에 유닛을 많이 생산했으면 → 방어 강화 (포탑)
- 적이 지난 라운드에 유닛을 적게 생산했으면 → 자원확보
- 적 포탑 많으면 → tank로 버티면서 물량 공세
- 적 원거리 많으면 → tank로 보호하며 진격
- 적 근접 많으면 → 근접유닛으로 전력교환
- 적 자원생산소 많으면 → 빠른 공세로 경제 성장 전에 압박
- 내 기지가 적보다 HP 낮으면 → 유닛생산으로 승부

=== 응답 형식 ===
반드시 아래 JSON만 출력하세요. 다른 텍스트 금지.

{
  "strategy_reason": "간단한 전략 이유 (한 문장)",
  "structures": {
    "build": {"barracks": 0, "population": 0, "resource": 0, "turret": 0},
    "demolish": {"barracks": 0, "population": 0, "resource": 0, "turret": 0}
  },
  "units": {"tank": 0, "melee": 0, "ranged": 0}
}`;
}