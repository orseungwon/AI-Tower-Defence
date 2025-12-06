// ===========================
// sound.js - BGM + 효과음 시스템
// ===========================

class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.masterVolume = 1.0;
    this.loaded = false;
    
    // BGM 관련
    this.bgmList = [];
    this.currentBgm = null;
    this.currentBgmIndex = 0;
    this.bgmVolume = 0.3;  // BGM 기본 볼륨
  }

  // 사운드 파일 초기화
  init() {
    // 효과음 정의
    const soundConfig = {
      // 라운드 관련
      round_start:    { path: 'sounds/round_start.mp3',     volume: 0.1 },
      round_end:      { path: 'sounds/round_end.mp3',       volume: 0.07 },
      
      // 유닛 공격
      attack_melee:   { path: 'sounds/attack_mellee.mp3',   volume: 0.07 },
      attack_ranged:  { path: 'sounds/attack_ranged.mp3',   volume: 0.07 },
      attack_tank:    { path: 'sounds/attack_tank.mp3',     volume: 0.03 },
      attack_turret:  { path: 'sounds/attack_turret.mp3',   volume: 0.1 },
      
      // 유닛 사망
      remove_melee:   { path: 'sounds/remove_mellee.mp3',   volume: 0.2 },
      remove_ranged:  { path: 'sounds/remove_ranged.mp3',   volume: 0.15 },
      remove_tank:    { path: 'sounds/remove_tank.mp3',     volume: 0.2 },
      
      // 자원/구조물
      money:          { path: 'sounds/money.mp3',           volume: 0.1 },
      resource_structure:          { path: 'sounds/resource_structure.mp3', volume: 0.2 },
      
      // 유닛 스폰/이동
      unit_move_1:     { path: 'sounds/unit_move.mp3',       volume: 0.3 },
      unit_move_2:      { path: 'sounds/unit_move2.mp3',      volume: 0.1 }
    };

    // 효과음 로드
    for (const [name, config] of Object.entries(soundConfig)) {
      this.sounds[name] = {
        audio: new Audio(config.path),
        volume: config.volume
      };
      this.sounds[name].audio.load();
    }

    // BGM 로드
    this.bgmList = [
      new Audio('sounds/bgm1.mp3'),
      new Audio('sounds/bgm2.mp3'),
      new Audio('sounds/bgm3.mp3'),
      new Audio('sounds/bgm4.mp3')
    ];
    
    // BGM 설정
    this.bgmList.forEach((bgm, index) => {
      bgm.loop = false;  // 개별 루프 끄고 순차 재생
      bgm.volume = this.bgmVolume * this.masterVolume;
      bgm.load();
      
      // 곡이 끝나면 다음 곡 재생
      bgm.addEventListener('ended', () => {
        this._playNextBgm();
      });
    });

    this.loaded = true;
    console.log('🔊 사운드 시스템 초기화 완료');
    console.log(`🎵 BGM ${this.bgmList.length}곡 로드됨`);
  }

  // ========== BGM 관련 ==========

 // BGM 재생 시작
playBgm() {
  if (!this.enabled || !this.loaded) return;
  if (this.bgmList.length === 0) return;
  
  // 이미 재생 중이면 무시
  if (this.currentBgm && !this.currentBgm.paused) return;
  
  // 랜덤으로 시작
  this.currentBgmIndex = Math.floor(Math.random() * this.bgmList.length);
  
  this.currentBgm = this.bgmList[this.currentBgmIndex];
  this.currentBgm.volume = this.bgmVolume * this.masterVolume;
  this.currentBgm.play().catch(() => {
    console.log('BGM 재생 대기 중... (사용자 상호작용 필요)');
  });
  
  console.log(`🎵 BGM ${this.currentBgmIndex + 1} 재생`);
}

  // 다음 BGM 재생
  _playNextBgm() {
    if (!this.enabled) return;
    
    this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmList.length;
    this.currentBgm = this.bgmList[this.currentBgmIndex];
    this.currentBgm.volume = this.bgmVolume * this.masterVolume;
    this.currentBgm.play().catch(() => {});
    
    console.log(`🎵 BGM ${this.currentBgmIndex + 1} 재생`);
  }

  // BGM 정지
  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
    }
  }

  // BGM 일시정지
  pauseBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
    }
  }

  // BGM 재개
  resumeBgm() {
    if (this.currentBgm && this.enabled) {
      this.currentBgm.play().catch(() => {});
    }
  }

  // BGM 볼륨 설정
  setBgmVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    this.bgmList.forEach(bgm => {
      bgm.volume = this.bgmVolume * this.masterVolume;
    });
  }

  // ========== 효과음 관련 ==========

  // 최종 볼륨 계산
  _getFinalVolume(name) {
    const sound = this.sounds[name];
    if (!sound) return 0;
    return sound.volume * this.masterVolume;
  }

  // 효과음 재생 (단일)
  play(name) {
    if (!this.enabled || !this.loaded) return;
    
    const sound = this.sounds[name];
    if (!sound) {
      console.warn(`사운드를 찾을 수 없음: ${name}`);
      return;
    }

    sound.audio.currentTime = 0;
    sound.audio.volume = this._getFinalVolume(name);
    sound.audio.play().catch(() => {});
  }

  // 효과음 재생 (동시 여러 번 가능)
  playMultiple(name) {
    if (!this.enabled || !this.loaded) return;
    
    const sound = this.sounds[name];
    if (!sound) return;

    const newAudio = new Audio(sound.audio.src);
    newAudio.volume = this._getFinalVolume(name);
    newAudio.play().catch(() => {});
  }

  // 특정 사운드 볼륨 설정
  setVolume(name, vol) {
    const sound = this.sounds[name];
    if (!sound) return;
    sound.volume = Math.max(0, Math.min(1, vol));
  }

  // 특정 사운드 볼륨 가져오기
  getVolume(name) {
    const sound = this.sounds[name];
    return sound ? sound.volume : 0;
  }

  // ========== 전체 제어 ==========

  // 전체 볼륨 설정
  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    // BGM 볼륨도 업데이트
    this.bgmList.forEach(bgm => {
      bgm.volume = this.bgmVolume * this.masterVolume;
    });
  }

  // 사운드 ON/OFF 토글
  toggle() {
    this.enabled = !this.enabled;
    
    if (this.enabled) {
      this.resumeBgm();
    } else {
      this.pauseBgm();
    }
    
    this._updateButtonUI();
    console.log(`사운드 ${this.enabled ? 'ON' : 'OFF'}`);
    return this.enabled;
  }

  enable() {
    this.enabled = true;
    this.resumeBgm();
    this._updateButtonUI();
  }

  disable() {
    this.enabled = false;
    this.pauseBgm();
    this._updateButtonUI();
  }

  // UI 버튼 상태 업데이트
  _updateButtonUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      btn.textContent = this.enabled ? '🔊 Sound' : '🔇 Sound';
      btn.classList.toggle('sound-off', !this.enabled);
    }
  }
}

// 전역 인스턴스 생성
const soundManager = new SoundManager();

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  soundManager.init();
  soundManager._updateButtonUI();
});

// 첫 클릭 시 BGM 자동 재생 시작
document.addEventListener('click', () => {
  if (soundManager.loaded && soundManager.enabled) {
    soundManager.playBgm();
  }
}, { once: true });