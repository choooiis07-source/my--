// ============================================
// 🔥 도파민 폭발 과일 자르기 게임
// ============================================

// 게임 설정
const CONFIG = {
    GRAVITY: 0.4,
    INITIAL_SPAWN_RATE: 800,
    MIN_SPAWN_RATE: 150,
    SPEED_INCREASE_RATE: 0.99,
    BOMB_CHANCE: 0.20,
    GOLDEN_FRUIT_CHANCE: 0.05,
    MAX_LIVES: 3,
    MAX_FRUITS: 20,
    MAX_PARTICLES: 200,
    FRUIT_SIZE: 60,
    BOMB_SIZE: 50,
    FEVER_THRESHOLD: 5,
    FEVER_DURATION: 5000,
    FEVER_MULTIPLIER: 2,
    LEVEL_UP_SCORE: 500,
    SCREEN_SHAKE_DECAY: 0.9,
    SLOW_MO_DURATION: 2000,
    CHAIN_BONUS_WINDOW: 500
};

// 과일 데이터
const FRUITS = [
    { name: '수박', emoji: '🍉', color: '#ff6b6b', glowColor: '#ff0000', points: 10, radius: 32 },
    { name: '사과', emoji: '🍎', color: '#ee5a5a', glowColor: '#ff3333', points: 10, radius: 22 },
    { name: '오렌지', emoji: '🍊', color: '#ffa502', glowColor: '#ff8800', points: 10, radius: 22 },
    { name: '바나나', emoji: '🍌', color: '#ffd700', glowColor: '#ffff00', points: 15, radius: 24 },
    { name: '포도', emoji: '🍇', color: '#9b59b6', glowColor: '#aa00ff', points: 15, radius: 22 },
    { name: '딸기', emoji: '🍓', color: '#ff4757', glowColor: '#ff0055', points: 20, radius: 20 },
    { name: '체리', emoji: '🍒', color: '#c0392b', glowColor: '#ff0000', points: 20, radius: 18 },
    { name: '키위', emoji: '🥝', color: '#2ed573', glowColor: '#00ff55', points: 15, radius: 20 },
    { name: '망고', emoji: '🥭', color: '#ffb142', glowColor: '#ffaa00', points: 25, radius: 24 },
    { name: '파인애플', emoji: '🍍', color: '#f9ca24', glowColor: '#ffdd00', points: 30, radius: 28 }
];

// 게임 상태
let gameState = {
    isRunning: false,
    score: 0,
    lives: CONFIG.MAX_LIVES,
    combo: 0,
    maxCombo: 0,
    fruitsCut: 0,
    nickname: '',
    spawnRate: CONFIG.INITIAL_SPAWN_RATE,
    lastSpawnTime: 0,
    elapsedTime: 0,
    level: 1,
    feverMode: false,
    feverTimer: 0,
    slowMotion: false,
    slowMotionTimer: 0,
    lastSliceTime: 0,
    chainCount: 0,
    screenShake: { x: 0, y: 0, intensity: 0 },
    backgroundHue: 0,
    comboColors: []
};

// 게임 객체들
let fruits = [];
let particles = [];
let slashTrail = [];
let scorePopups = [];
let shockwaves = [];
let bgStars = [];
let bgGradient = null;
let mousePos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let isMouseDown = false;
let mouseSpeed = 0;

// Canvas 설정
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

// DOM 요소
const nicknameScreen = document.getElementById('nickname-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const nicknameInput = document.getElementById('nickname-input');
const startBtn = document.getElementById('start-btn');
const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const feverFill = document.getElementById('fever-fill');
const feverText = document.getElementById('fever-text');
const finalName = document.getElementById('final-name');
const finalScore = document.getElementById('final-score');
const statFruits = document.getElementById('stat-fruits');
const statCombo = document.getElementById('stat-combo');
const statLevel = document.getElementById('stat-level');
const rankingList = document.getElementById('ranking-list');
const retryBtn = document.getElementById('retry-btn');
const homeBtn = document.getElementById('home-btn');

// 오디오 컨텍스트
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 사운드 효과
function playSound(type) {
    if (!audioCtx) return;
    
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        switch(type) {
            case 'slice':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
                break;
            case 'combo':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400 + gameState.combo * 60, now);
                osc.frequency.exponentialRampToValueAtTime(800 + gameState.combo * 80, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'fever':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'bomb':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'levelup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.1);
                osc.frequency.setValueAtTime(784, now + 0.2);
                osc.frequency.setValueAtTime(1047, now + 0.3);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'golden':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1000, now);
                osc.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'chain':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600 + gameState.chainCount * 100, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
                break;
        }
    } catch(e) {}
}

// 프라이트 캐시
const fruitSprites = {};
const bombSprite = document.createElement('canvas');
const goldenSprite = document.createElement('canvas');

// 배경 별 초기화
function initBgStars() {
    bgStars = [];
    for (let i = 0; i < 80; i++) {
        bgStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.3 + 0.1,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}

// Canvas 크기 설정
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 80;
    bgGradient = null;
    initBgStars();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getBgGradient() {
    if (!bgGradient) {
        bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#0a0a1a');
        bgGradient.addColorStop(0.5, '#1a0a2e');
        bgGradient.addColorStop(1, '#0a1a3e');
    }
    return bgGradient;
}

// 스프라이트 생성
function createSprites() {
    FRUITS.forEach(fruit => {
        const size = fruit.radius * 2 + 20;
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const octx = offscreen.getContext('2d');
        
        octx.shadowColor = fruit.glowColor;
        octx.shadowBlur = 12;
        octx.font = `${fruit.radius * 2}px Arial`;
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillText(fruit.emoji, size / 2, size / 2);
        
        fruitSprites[fruit.name] = { canvas: offscreen, size: size };
    });

    // 폭탄
    const bombSize = CONFIG.BOMB_SIZE + 20;
    bombSprite.width = bombSize;
    bombSprite.height = bombSize;
    const bctx = bombSprite.getContext('2d');
    bctx.shadowColor = '#ff0000';
    bctx.shadowBlur = 10;
    bctx.font = `${CONFIG.BOMB_SIZE}px Arial`;
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('💣', bombSize / 2, bombSize / 2);
    
    // 황금과일
    const goldenSize = 70;
    goldenSprite.width = goldenSize;
    goldenSprite.height = goldenSize;
    const gctx = goldenSprite.getContext('2d');
    gctx.shadowColor = '#ffd700';
    gctx.shadowBlur = 20;
    gctx.font = '45px Arial';
    gctx.textAlign = 'center';
    gctx.textBaseline = 'middle';
    gctx.fillText('⭐', goldenSize / 2, goldenSize / 2);
}

createSprites();

// 이벤트 리스너
startBtn.addEventListener('click', () => { initAudio(); startGame(); });
retryBtn.addEventListener('click', () => { initAudio(); startGame(); });
homeBtn.addEventListener('click', goHome);
nicknameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { initAudio(); startGame(); } });

// 마우스 이벤트
canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    mousePos = { x: e.clientX, y: e.clientY - 80 };
    lastMousePos = { ...mousePos };
    slashTrail = [{ x: mousePos.x, y: mousePos.y, time: Date.now() }];
});

canvas.addEventListener('mousemove', (e) => {
    lastMousePos = { ...mousePos };
    mousePos = { x: e.clientX, y: e.clientY - 80 };
    mouseSpeed = Math.sqrt((mousePos.x - lastMousePos.x) ** 2 + (mousePos.y - lastMousePos.y) ** 2);
    
    if (isMouseDown) {
        slashTrail.push({ x: mousePos.x, y: mousePos.y, time: Date.now() });
        if (slashTrail.length > 15) slashTrail.shift();
        checkSlash();
    }
});

canvas.addEventListener('mouseup', () => { isMouseDown = false; slashTrail = []; });
canvas.addEventListener('mouseleave', () => { isMouseDown = false; slashTrail = []; });

// 터치 이벤트
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    isMouseDown = true;
    const touch = e.touches[0];
    mousePos = { x: touch.clientX, y: touch.clientY - 80 };
    lastMousePos = { ...mousePos };
    slashTrail = [{ x: mousePos.x, y: mousePos.y, time: Date.now() }];
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    lastMousePos = { ...mousePos };
    mousePos = { x: touch.clientX, y: touch.clientY - 80 };
    mouseSpeed = Math.sqrt((mousePos.x - lastMousePos.x) ** 2 + (mousePos.y - lastMousePos.y) ** 2);
    
    if (isMouseDown) {
        slashTrail.push({ x: mousePos.x, y: mousePos.y, time: Date.now() });
        if (slashTrail.length > 15) slashTrail.shift();
        checkSlash();
    }
});

canvas.addEventListener('touchend', () => { isMouseDown = false; slashTrail = []; });

// 게임 시작
function startGame() {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
        nicknameInput.style.borderColor = '#ff6b6b';
        nicknameInput.placeholder = '닉네임을 입력해주세요!';
        return;
    }
    
    gameState = {
        isRunning: true,
        score: 0,
        lives: CONFIG.MAX_LIVES,
        combo: 0,
        maxCombo: 0,
        fruitsCut: 0,
        nickname: nickname,
        spawnRate: CONFIG.INITIAL_SPAWN_RATE,
        lastSpawnTime: 0,
        elapsedTime: 0,
        level: 1,
        feverMode: false,
        feverTimer: 0,
        slowMotion: false,
        slowMotionTimer: 0,
        lastSliceTime: 0,
        chainCount: 0,
        screenShake: { x: 0, y: 0, intensity: 0 },
        backgroundHue: 0,
        comboColors: []
    };
    
    fruits = [];
    particles = [];
    slashTrail = [];
    scorePopups = [];
    shockwaves = [];
    
    showScreen(gameScreen);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 80;
    bgGradient = null;
    initBgStars();
    
    updateUI();
    requestAnimationFrame(gameLoop);
}

function showScreen(screen) {
    nicknameScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    gameoverScreen.classList.remove('active');
    screen.classList.add('active');
}

function goHome() { showScreen(nicknameScreen); }

// 게임 루프
let lastTime = 0;

function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    if (deltaTime > 50) deltaTime = 50;
    
    // 슬로우 모션
    let effectiveDelta = deltaTime;
    if (gameState.slowMotion) {
        effectiveDelta = deltaTime * 0.4;
        gameState.slowMotionTimer -= deltaTime;
        if (gameState.slowMotionTimer <= 0) gameState.slowMotion = false;
    }
    
    gameState.elapsedTime += effectiveDelta;
    
    // 피버 모드 타이머
    if (gameState.feverMode) {
        gameState.feverTimer -= deltaTime;
        if (gameState.feverTimer <= 0) {
            gameState.feverMode = false;
            gameState.combo = 0;
            updateUI();
        }
    }
    
    gameState.backgroundHue = (gameState.backgroundHue + 0.1) % 360;
    
    // 속도 증가
    gameState.spawnRate = Math.max(
        CONFIG.MIN_SPAWN_RATE,
        CONFIG.INITIAL_SPAWN_RATE * Math.pow(CONFIG.SPEED_INCREASE_RATE, gameState.elapsedTime / 1000)
    );
    
    // 레벨 체크
    const newLevel = Math.floor(gameState.score / CONFIG.LEVEL_UP_SCORE) + 1;
    if (newLevel > gameState.level) levelUp(newLevel);
    
    // 과일 생성
    if (timestamp - gameState.lastSpawnTime > gameState.spawnRate && fruits.length < CONFIG.MAX_FRUITS) {
        spawnFruit();
        gameState.lastSpawnTime = timestamp;
    }
    
    // 업데이트
    updateFruits(effectiveDelta);
    updateParticles(effectiveDelta);
    updatePopups(effectiveDelta);
    updateShockwaves(effectiveDelta);
    updateScreenShake();
    updateBgStars(effectiveDelta);
    
    render();
    requestAnimationFrame(gameLoop);
}

// 레벨업
function levelUp(newLevel) {
    gameState.level = newLevel;
    playSound('levelup');
    gameState.screenShake.intensity = 15;
    
    scorePopups.push({
        x: canvas.width / 2, y: canvas.height / 2,
        points: 0, life: 1.5, vy: -1,
        isLevelUp: true, level: newLevel
    });
    
    for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 * i) / 40;
        const speed = 4 + Math.random() * 6;
        particles.push({
            x: canvas.width / 2, y: canvas.height / 2,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 8,
            color: `hsl(${Math.random() * 360}, 100%, 60%)`,
            life: 1.2, type: 'sparkle', gravity: 0.04
        });
    }
    
    shockwaves.push({
        x: canvas.width / 2, y: canvas.height / 2,
        radius: 0, maxRadius: 250, life: 1, color: '#ffd700'
    });
}

// 과일 생성
function spawnFruit() {
    const rand = Math.random();
    const isBomb = rand < CONFIG.BOMB_CHANCE;
    const isGolden = !isBomb && rand < CONFIG.BOMB_CHANCE + CONFIG.GOLDEN_FRUIT_CHANCE;
    
    const side = Math.floor(Math.random() * 3);
    let x, y, vx, vy;
    
    if (side === 0) {
        x = -50; y = canvas.height - 100;
        vx = 2 + Math.random() * 3; vy = -(8 + Math.random() * 4);
    } else if (side === 1) {
        x = canvas.width + 50; y = canvas.height - 100;
        vx = -(2 + Math.random() * 3); vy = -(8 + Math.random() * 4);
    } else {
        x = 100 + Math.random() * (canvas.width - 200); y = canvas.height + 50;
        vx = (Math.random() - 0.5) * 4; vy = -(10 + Math.random() * 4);
    }
    
    if (isBomb) {
        fruits.push({
            type: 'bomb', x, y, vx, vy,
            radius: CONFIG.BOMB_SIZE / 2,
            rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.1,
            isSliced: false, glowPhase: 0
        });
    } else if (isGolden) {
        fruits.push({
            type: 'golden', x, y, vx, vy,
            radius: 30, rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            isSliced: false, glowPhase: 0, points: 100
        });
    } else {
        const fruitData = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        fruits.push({
            type: 'fruit', data: fruitData,
            x, y, vx, vy, radius: fruitData.radius,
            rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.1,
            isSliced: false, glowPhase: Math.random() * Math.PI * 2
        });
    }
}

// 업데이트 함수들
function updateFruits(delta) {
    const ts = delta / 16.67;
    for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        f.x += f.vx * ts;
        f.y += f.vy * ts;
        f.vy += CONFIG.GRAVITY * ts;
        f.rotation += f.rotationSpeed * ts;
        f.glowPhase = (f.glowPhase || 0) + 0.05 * ts;
        
        if (f.y > canvas.height + 100) {
            if (f.type === 'fruit' && !f.isSliced) {
                gameState.combo = 0;
                gameState.feverMode = false;
                updateUI();
            }
            fruits.splice(i, 1);
        }
    }
}

function updateParticles(delta) {
    const ts = delta / 16.67;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * ts;
        p.y += p.vy * ts;
        p.vy += (p.gravity || 0.12) * ts;
        p.life -= 0.025 * ts;
        if (p.rotation !== undefined) p.rotation += (p.rotationSpeed || 0) * ts;
        if (p.life <= 0) particles.splice(i, 1);
    }
    while (particles.length > CONFIG.MAX_PARTICLES) particles.shift();
}

function updatePopups(delta) {
    const ts = delta / 16.67;
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.y += p.vy * ts;
        p.life -= 0.02 * ts;
        if (p.life <= 0) scorePopups.splice(i, 1);
    }
}

function updateShockwaves(delta) {
    const ts = delta / 16.67;
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 6 * ts;
        sw.life -= 0.025 * ts;
        if (sw.life <= 0) shockwaves.splice(i, 1);
    }
}

function updateScreenShake() {
    if (gameState.screenShake.intensity > 0.5) {
        gameState.screenShake.x = (Math.random() - 0.5) * gameState.screenShake.intensity;
        gameState.screenShake.y = (Math.random() - 0.5) * gameState.screenShake.intensity;
        gameState.screenShake.intensity *= CONFIG.SCREEN_SHAKE_DECAY;
    } else {
        gameState.screenShake.x = 0;
        gameState.screenShake.y = 0;
        gameState.screenShake.intensity = 0;
    }
}

function updateBgStars(delta) {
    const ts = delta / 16.67;
    for (let s of bgStars) {
        s.twinkle += 0.02 * ts;
        s.y += s.speed * ts;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    }
}

// 자르기 체크
function checkSlash() {
    if (slashTrail.length < 2) return;
    
    const p1 = slashTrail[slashTrail.length - 2];
    const p2 = slashTrail[slashTrail.length - 1];
    
    for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        if (fruit.isSliced) continue;
        
        if (lineCircleIntersect(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, fruit.radius)) {
            fruit.isSliced = true;
            
            if (fruit.type === 'bomb') handleBombSlice(fruit);
            else if (fruit.type === 'golden') handleGoldenSlice(fruit);
            else handleFruitSlice(fruit);
            
            fruits.splice(i, 1);
            updateUI();
        }
    }
}

function handleFruitSlice(fruit) {
    const now = Date.now();
    
    if (now - gameState.lastSliceTime < CONFIG.CHAIN_BONUS_WINDOW) {
        gameState.chainCount++;
        if (gameState.chainCount > 1) playSound('chain');
    } else {
        gameState.chainCount = 1;
    }
    gameState.lastSliceTime = now;
    
    gameState.combo++;
    gameState.fruitsCut++;
    if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
    
    if (gameState.combo >= CONFIG.FEVER_THRESHOLD && !gameState.feverMode) activateFeverMode();
    
    const comboMultiplier = Math.min(gameState.combo, 10);
    const chainBonus = gameState.chainCount > 1 ? gameState.chainCount * 5 : 0;
    const feverMultiplier = gameState.feverMode ? CONFIG.FEVER_MULTIPLIER : 1;
    const points = (fruit.data.points * comboMultiplier + chainBonus) * feverMultiplier;
    gameState.score += points;
    
    gameState.combo > 1 ? playSound('combo') : playSound('slice');
    gameState.screenShake.intensity = Math.min(3 + gameState.combo * 0.5, 10);
    
    createFruitSlices(fruit.x, fruit.y, fruit.data, gameState.combo);
    
    scorePopups.push({
        x: fruit.x, y: fruit.y, points, life: 1.2,
        vy: -2 - gameState.combo * 0.2,
        combo: gameState.combo,
        isChain: gameState.chainCount > 1,
        chainCount: gameState.chainCount
    });
    
    if (gameState.combo >= 3) {
        shockwaves.push({
            x: fruit.x, y: fruit.y,
            radius: 0, maxRadius: 40 + gameState.combo * 8,
            life: 0.7, color: fruit.data.glowColor
        });
    }
    
    gameState.comboColors.push(fruit.data.glowColor);
    if (gameState.comboColors.length > 8) gameState.comboColors.shift();
}

function handleBombSlice(fruit) {
    gameState.lives--;
    gameState.combo = 0;
    gameState.feverMode = false;
    gameState.chainCount = 0;
    
    playSound('bomb');
    gameState.screenShake.intensity = 20;
    createExplosion(fruit.x, fruit.y);
    
    shockwaves.push({
        x: fruit.x, y: fruit.y,
        radius: 0, maxRadius: 180, life: 1, color: '#ff0000'
    });
    
    // lives damage 애니메이션
    livesDisplay.classList.add('damage');
    setTimeout(() => livesDisplay.classList.remove('damage'), 500);
    
    if (gameState.lives <= 0) endGame();
}

function handleGoldenSlice(fruit) {
    gameState.combo++;
    gameState.fruitsCut++;
    if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
    
    playSound('golden');
    gameState.screenShake.intensity = 8;
    
    const feverMultiplier = gameState.feverMode ? CONFIG.FEVER_MULTIPLIER : 1;
    const points = fruit.points * feverMultiplier;
    gameState.score += points;
    
    createGoldenExplosion(fruit.x, fruit.y);
    
    shockwaves.push({
        x: fruit.x, y: fruit.y,
        radius: 0, maxRadius: 120, life: 1, color: '#ffd700'
    });
    
    gameState.slowMotion = true;
    gameState.slowMotionTimer = CONFIG.SLOW_MO_DURATION;
    
    scorePopups.push({
        x: fruit.x, y: fruit.y,
        points, life: 1.5, vy: -2, isGolden: true
    });
}

function activateFeverMode() {
    gameState.feverMode = true;
    gameState.feverTimer = CONFIG.FEVER_DURATION;
    
    playSound('fever');
    gameState.screenShake.intensity = 10;
    
    for (let i = 0; i < 25; i++) {
        const angle = (Math.PI * 2 * i) / 25;
        const speed = 3 + Math.random() * 4;
        particles.push({
            x: canvas.width / 2, y: canvas.height / 2,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 6 + Math.random() * 10,
            color: `hsl(${Math.random() * 60 + 10}, 100%, 60%)`,
            life: 1.3, type: 'sparkle', gravity: 0.02
        });
    }
    
    shockwaves.push({
        x: canvas.width / 2, y: canvas.height / 2,
        radius: 0, maxRadius: 300, life: 1, color: '#ff6600'
    });
}

function lineCircleIntersect(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1, dy = y2 - y1;
    const fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

// 파티클 생성
function createFruitSlices(x, y, fruitData, combo) {
    const count = Math.min(5 + combo, 12);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 3 + Math.random() * 3 + combo * 0.2;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 8 + Math.random() * 12,
            color: fruitData.color,
            glowColor: fruitData.glowColor,
            life: 1, type: 'fruit',
            emoji: fruitData.emoji,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            gravity: 0.1
        });
    }
    for (let i = 0; i < combo * 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 2 + Math.random() * 4,
            color: fruitData.glowColor,
            life: 0.7, type: 'sparkle', gravity: 0.04
        });
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 4 + Math.random() * 6;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6 + Math.random() * 10,
            color: i % 2 === 0 ? '#ff4444' : '#ff8800',
            life: 1, type: 'explosion', gravity: 0.06
        });
    }
}

function createGoldenExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 3 + Math.random() * 5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 10,
            color: i % 2 === 0 ? '#ffd700' : '#fff',
            life: 1.2, type: 'sparkle', gravity: 0.04
        });
    }
}

// UI 업데이트
function updateUI() {
    scoreDisplay.textContent = gameState.score;
    
    // 점수 bump 애니메이션
    scoreDisplay.classList.add('bump');
    setTimeout(() => scoreDisplay.classList.remove('bump'), 100);
    
    if (gameState.combo > 1) {
        comboDisplay.textContent = `${gameState.combo}x COMBO!`;
        comboDisplay.style.transform = `scale(${1 + gameState.combo * 0.05})`;
    } else {
        comboDisplay.textContent = '';
        comboDisplay.style.transform = 'scale(1)';
    }
    
    let hearts = '';
    for (let i = 0; i < gameState.lives; i++) hearts += '❤️';
    for (let i = gameState.lives; i < CONFIG.MAX_LIVES; i++) hearts += '🖤';
    livesDisplay.textContent = hearts;
    
    levelDisplay.textContent = gameState.level;
    
    // 피버 바
    if (gameState.feverMode) {
        feverFill.classList.add('active');
        feverFill.style.width = '100%';
        feverText.textContent = '🔥 FEVER!';
    } else {
        feverFill.classList.remove('active');
        const progress = Math.min((gameState.combo / CONFIG.FEVER_THRESHOLD) * 100, 100);
        feverFill.style.width = progress + '%';
        feverText.textContent = gameState.combo > 0 ? `${gameState.combo}/${CONFIG.FEVER_THRESHOLD}` : '';
    }
}

// 렌더링
function render() {
    ctx.save();
    ctx.translate(gameState.screenShake.x, gameState.screenShake.y);
    
    // 배경
    ctx.fillStyle = getBgGradient();
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    
    // 배경 별
    for (let star of bgStars) {
        const alpha = 0.3 + Math.sin(star.twinkle) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 피버 모드 배경 효과
    if (gameState.feverMode) {
        ctx.fillStyle = `rgba(255, 100, 0, ${0.05 + Math.sin(Date.now() / 100) * 0.03})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 슬로우 모션 효과
    if (gameState.slowMotion) {
        ctx.fillStyle = `rgba(255, 215, 0, ${0.03 + Math.sin(Date.now() / 200) * 0.02})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 쇼크웨이브
    for (let sw of shockwaves) {
        ctx.save();
        ctx.globalAlpha = sw.life;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    // 과일 렌더링
    for (let fruit of fruits) {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        
        // 글로우 효과
        const glowIntensity = 0.5 + Math.sin(fruit.glowPhase || 0) * 0.3;
        ctx.shadowBlur = 15 * glowIntensity;
        
        if (fruit.type === 'bomb') {
            ctx.shadowColor = '#ff0000';
            ctx.drawImage(bombSprite, -bombSprite.width / 2, -bombSprite.height / 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        } else if (fruit.type === 'golden') {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 25;
            ctx.drawImage(goldenSprite, -goldenSprite.width / 2, -goldenSprite.height / 2);
            // 회전하는 링
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(Date.now() / 150) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius + 8, Date.now() / 500, Date.now() / 500 + Math.PI);
            ctx.stroke();
        } else {
            const sprite = fruitSprites[fruit.data.name];
            if (sprite) {
                ctx.shadowColor = fruit.data.glowColor;
                ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2);
            }
        }
        ctx.restore();
    }
    
    // 파티클
    for (let p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        
        if (p.type === 'fruit') {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.shadowColor = p.glowColor || p.color;
            ctx.shadowBlur = 8;
            ctx.font = `${p.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, 0, 0);
        } else if (p.type === 'sparkle') {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            // 별 모양
            const spikes = 4;
            const outerRadius = p.size;
            const innerRadius = p.size / 2;
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI * i) / spikes + (p.rotation || 0);
                const x = p.x + Math.cos(angle) * radius;
                const y = p.y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    
    // 점수 팝업
    for (let popup of scorePopups) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, popup.life);
        
        if (popup.isLevelUp) {
            const scale = 1 + (1.5 - popup.life) * 0.5;
            ctx.font = `bold ${40 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00ff88';
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 20;
            ctx.fillText(`LEVEL ${popup.level}!`, popup.x, popup.y);
        } else if (popup.isGolden) {
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.fillText(`+${popup.points}`, popup.x, popup.y);
            ctx.font = '20px Arial';
            ctx.fillText('⭐ SLOW MO! ⭐', popup.x, popup.y - 30);
        } else {
            const size = 20 + Math.min(popup.combo || 1, 10) * 2;
            ctx.font = `bold ${size}px Arial`;
            ctx.textAlign = 'center';
            
            // 그라데이션 텍스트
            const gradient = ctx.createLinearGradient(popup.x - 30, popup.y, popup.x + 30, popup.y);
            if (popup.isChain) {
                gradient.addColorStop(0, '#00ffff');
                gradient.addColorStop(1, '#00ff88');
            } else {
                gradient.addColorStop(0, '#ffd700');
                gradient.addColorStop(1, '#ff6b35');
            }
            
            ctx.fillStyle = gradient;
            ctx.shadowColor = popup.isChain ? '#00ffff' : '#ffd700';
            ctx.shadowBlur = 10;
            ctx.fillText(`+${popup.points}`, popup.x, popup.y);
            
            if (popup.isChain && popup.chainCount > 1) {
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#00ffff';
                ctx.fillText(`${popup.chainCount}x CHAIN!`, popup.x, popup.y - 25);
            }
        }
        ctx.restore();
    }
    
    // 마우스 궤적
    if (isMouseDown && slashTrail.length > 1) {
        ctx.save();
        
        // 네온 트레일
        for (let i = 1; i < slashTrail.length; i++) {
            const progress = i / slashTrail.length;
            const alpha = progress;
            const width = 2 + progress * 4;
            
            // 색상 (콤보에 따라 변경)
            let color;
            if (gameState.feverMode) {
                color = `hsla(${(Date.now() / 5 + i * 20) % 360}, 100%, 60%, ${alpha})`;
            } else if (gameState.comboColors.length > 0) {
                const idx = Math.floor((i / slashTrail.length) * gameState.comboColors.length);
                color = gameState.comboColors[Math.min(idx, gameState.comboColors.length - 1)];
                ctx.globalAlpha = alpha;
            } else {
                color = `rgba(255, 255, 255, ${alpha})`;
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(slashTrail[i - 1].x, slashTrail[i - 1].y);
            ctx.lineTo(slashTrail[i].x, slashTrail[i].y);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    // 커서
    ctx.save();
    const cursorPulse = 1 + Math.sin(Date.now() / 200) * 0.2;
    ctx.strokeStyle = gameState.feverMode ? 
        `hsl(${(Date.now() / 5) % 360}, 100%, 60%)` : 
        'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 12 * cursorPulse, 0, Math.PI * 2);
    ctx.stroke();
    
    // 커서 십자
    ctx.beginPath();
    ctx.moveTo(mousePos.x - 6, mousePos.y);
    ctx.lineTo(mousePos.x + 6, mousePos.y);
    ctx.moveTo(mousePos.x, mousePos.y - 6);
    ctx.lineTo(mousePos.x, mousePos.y + 6);
    ctx.stroke();
    ctx.restore();
    
    ctx.restore(); // screenShake transform 끝
}

// 게임 오버
function endGame() {
    gameState.isRunning = false;
    saveScore(gameState.nickname, gameState.score);
    
    finalName.textContent = gameState.nickname;
    finalScore.textContent = gameState.score;
    statFruits.textContent = gameState.fruitsCut;
    statCombo.textContent = gameState.maxCombo;
    statLevel.textContent = gameState.level;
    
    renderRanking();
    showScreen(gameoverScreen);
}

function saveScore(nickname, score) {
    let rankings = JSON.parse(localStorage.getItem('fruitSlashRankings')) || [];
    rankings.push({ name: nickname, score, date: new Date().toLocaleDateString(), level: gameState.level });
    rankings.sort((a, b) => b.score - a.score);
    rankings = rankings.slice(0, 10);
    localStorage.setItem('fruitSlashRankings', JSON.stringify(rankings));
}

function renderRanking() {
    const rankings = JSON.parse(localStorage.getItem('fruitSlashRankings')) || [];
    rankingList.innerHTML = '';
    
    if (rankings.length === 0) {
        rankingList.innerHTML = '<p style="color: #999; text-align: center;">아직 기록이 없습니다</p>';
        return;
    }
    
    rankings.forEach((ranking, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'ranking-item';
        
        if (index === 0) rankItem.classList.add('gold');
        else if (index === 1) rankItem.classList.add('silver');
        else if (index === 2) rankItem.classList.add('bronze');
        
        if (ranking.name === gameState.nickname && ranking.score === gameState.score) {
            rankItem.classList.add('current');
        }
        
        let positionIcon = `${index + 1}`;
        if (index === 0) positionIcon = '🥇';
        else if (index === 1) positionIcon = '🥈';
        else if (index === 2) positionIcon = '🥉';
        
        rankItem.innerHTML = `
            <span class="ranking-position">${positionIcon}</span>
            <span class="ranking-name">${ranking.name}</span>
            <span class="ranking-score">${ranking.score}점 (Lv.${ranking.level || 1})</span>
        `;
        rankingList.appendChild(rankItem);
    });
}