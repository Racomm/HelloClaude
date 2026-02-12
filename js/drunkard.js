'use strict';

// ============================================================
// Constants
// ============================================================
const CW = 390;
const CH = 700;
const GROUND_H = 100;
const GROUND_Y = CH - GROUND_H;
const HUD_H = 82;

// ============================================================
// Level Definitions — 渐进式引入机制
// ============================================================
const LEVELS = [
  { id: 1, alcohol: '青岛啤酒',     icon: '🍺', price: 30,
    spawnInterval: 65, fallSpeed: 3.0, bombChance: 0, drunkChance: 0,
    heartEnabled: false, cloverEnabled: false,
    multi: false, drunkman: false,
    cheersChance: 0, bottleThrow: false, godModeChance: 0, hint: null },

  { id: 2, alcohol: '劲酒',         icon: '🥃', price: 50,
    spawnInterval: 58, fallSpeed: 3.5, bombChance: 0.18, drunkChance: 0.07,
    heartEnabled: true, cloverEnabled: true,
    multi: false, drunkman: false,
    cheersChance: 0, bottleThrow: false, godModeChance: 0, hint: '酒好喝，但不要贪杯！' },

  { id: 3, alcohol: '老白干',       icon: '🍶', price: 80,
    spawnInterval: 52, fallSpeed: 4.0, bombChance: 0.21, drunkChance: 0.08,
    heartEnabled: true, cloverEnabled: true,
    multi: true,  drunkman: true,  drunkmanInterval: 310, drunkmanSpeed: 1.75,
    cheersChance: 0, bottleThrow: false, godModeChance: 0, hint: '酒蒙子来啦，快躲开！' },

  { id: 4, alcohol: '牛栏山二锅头', icon: '🥂', price: 150,
    spawnInterval: 46, fallSpeed: 4.5, bombChance: 0.24, drunkChance: 0.09,
    heartEnabled: true, cloverEnabled: true,
    multi: true,  drunkman: true,  drunkmanInterval: 260, drunkmanSpeed: 1.75,
    cheersChance: 0.03, bottleThrow: false, godModeChance: 0, hint: '你有我有全都有哇！' },

  { id: 5, alcohol: '郎酒',         icon: '🍾', price: 300,
    spawnInterval: 42, fallSpeed: 5.0, bombChance: 0.27, drunkChance: 0.10,
    heartEnabled: true, cloverEnabled: true,
    multi: true,  drunkman: true,  drunkmanInterval: 210, drunkmanSpeed: 1.75,
    cheersChance: 0.03, bottleThrow: true,  godModeChance: 0, hint: '你瞅啥？？？' },

  { id: 6, alcohol: '五粮液',       icon: '🏆', price: 800,
    spawnInterval: 40, fallSpeed: 5.5, bombChance: 0.30, drunkChance: 0.10,
    heartEnabled: true, cloverEnabled: true,
    multi: true,  drunkman: true,  drunkmanInterval: 165, drunkmanSpeed: 1.75,
    cheersChance: 0.03, bottleThrow: true,  godModeChance: 0.02, hint: '世上无难事，只要肯喝酒！' },

  { id: 7, alcohol: '飞天茅台',     icon: '✨', price: 1499,
    spawnInterval: 36, fallSpeed: 6.0, bombChance: 0.32, drunkChance: 0.11,
    heartEnabled: true, cloverEnabled: true,
    multi: true,  drunkman: true,  drunkmanInterval: 130, drunkmanSpeed: 1.75,
    cheersChance: 0.04, bottleThrow: true,  godModeChance: 0.025, hint: null },
];

// ============================================================
// Item Definitions
// ============================================================
const POS_ITEMS = [
  { label: '¥1', value: 1,  r: 14, bg: '#DAA520', fg: '#5a3a00', weight: 30, isHeart: false, isClover: false },
  { label: '¥2', value: 2,  r: 17, bg: '#FFA500', fg: '#7b3f00', weight: 22, isHeart: false, isClover: false },
  { label: '¥4', value: 4,  r: 20, bg: '#FF8C00', fg: '#5c2d00', weight: 13, isHeart: false, isClover: false },
  { label: '💰', value: 12, r: 22, bg: '#8B4513', fg: '#FFD700', weight: 6,  isHeart: false, isClover: false },
  { label: '💰', value: 20, r: 24, bg: '#8B6914', fg: '#FFD700', weight: 3,  isHeart: false, isClover: true  },
  { label: '❤️', value: 0,  r: 20, bg: '#CC1144', fg: '#FFFFFF', weight: 6,  isHeart: true,  isClover: false },
];

// ============================================================
// Utility helpers
// ============================================================
function rRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function pickPosItem(lv) {
  const available = POS_ITEMS.filter(d => {
    if (d.isHeart && !lv.heartEnabled) return false;
    if (d.isClover && !lv.cloverEnabled) return false;
    return true;
  });
  const total = available.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of available) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return available[0];
}

// ============================================================
// SoundEngine — Web Audio API 合成音效
// ============================================================
class SoundEngine {
  constructor() {
    this.ctx = null;    // AudioContext，延迟到首次用户交互时创建
    this.muted = false;
    this.volume = 0.5;
    this.masterGain = null;
    // BGM 相关
    this._bgmGain = null;
    this._bgmOscs = [];
    this._bgmPlaying = false;
    this._bgmInterval = null;
    this._bgmStep = 0;
  }

  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
    this._bgmGain = this.ctx.createGain();
    this._bgmGain.gain.value = 0.18;
    this._bgmGain.connect(this.masterGain);
  }

  toggle() {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
  }

  // -- 辅助：播放单音 ---
  _tone(freq, dur, type, vol, detune) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(vol || 0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.masterGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  // -- 辅助：噪音脉冲 ---
  _noise(dur, vol) {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const len = sr * dur;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(g); g.connect(this.masterGain);
    src.start(); src.stop(this.ctx.currentTime + dur);
  }

  // ===== 游戏音效 =====

  // 金币（音调随面值升高）
  coin(value) {
    this._init();
    const base = value <= 1 ? 880 : value <= 2 ? 1047 : value <= 4 ? 1175 : 1319;
    this._tone(base, 0.12, 'sine', 0.25);
    this._tone(base * 1.5, 0.08, 'sine', 0.15);
  }

  // 钱袋
  moneyBag() {
    this._init();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this._tone(1200 + i * 200, 0.08, 'sine', 0.18), i * 35);
    }
  }

  // 四叶草
  clover() {
    this._init();
    this._tone(1047, 0.15, 'sine', 0.25);
    setTimeout(() => this._tone(1319, 0.15, 'sine', 0.25), 60);
    setTimeout(() => this._tone(1568, 0.25, 'triangle', 0.2), 120);
  }

  // 血包
  heart() {
    this._init();
    this._tone(523, 0.12, 'sine', 0.2);
    setTimeout(() => this._tone(659, 0.15, 'sine', 0.22), 80);
    setTimeout(() => this._tone(784, 0.2, 'sine', 0.18), 160);
  }

  // 炸弹
  bomb() {
    this._init();
    this._tone(80, 0.35, 'sawtooth', 0.3);
    this._tone(60, 0.4, 'square', 0.15);
    this._noise(0.3, 0.35);
  }

  // 醉酒减速
  drunk() {
    this._init();
    this._tone(300, 0.15, 'sine', 0.2);
    setTimeout(() => this._tone(250, 0.15, 'sine', 0.2), 80);
    setTimeout(() => this._tone(200, 0.2, 'sine', 0.18), 160);
  }

  // 断片眩晕
  stun() {
    this._init();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(600, t);
    o.frequency.linearRampToValueAtTime(200, t + 0.5);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(this.masterGain);
    o.start(); o.stop(t + 0.5);
  }

  // 被醉汉撞
  drunkManHit() {
    this._init();
    this._tone(150, 0.15, 'sawtooth', 0.25);
    this._noise(0.15, 0.3);
    setTimeout(() => this._tone(100, 0.2, 'square', 0.15), 80);
  }

  // 酒瓶砸中（玻璃碎裂）
  bottleHit() {
    this._init();
    this._tone(2000, 0.06, 'square', 0.15);
    this._tone(3000, 0.04, 'square', 0.1);
    this._noise(0.2, 0.3);
  }

  // 干杯
  cheers() {
    this._init();
    // 碰杯叮
    this._tone(2200, 0.15, 'sine', 0.25);
    this._tone(3300, 0.1, 'sine', 0.15);
    // 连锁扫屏音
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this._tone(1600 + i * 150, 0.06, 'sine', 0.12), 80 + i * 40);
    }
  }

  // 酒神降临
  godMode() {
    this._init();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, 'sine', 0.22), i * 80);
      setTimeout(() => this._tone(f * 1.5, 0.15, 'triangle', 0.1), i * 80 + 30);
    });
  }

  // 酒神免疫弹开
  godImmune() {
    this._init();
    this._tone(1200, 0.08, 'sine', 0.18);
    this._tone(1600, 0.06, 'sine', 0.12);
  }

  // 酒神结束
  godEnd() {
    this._init();
    this._tone(784, 0.12, 'sine', 0.18);
    setTimeout(() => this._tone(659, 0.12, 'sine', 0.16), 80);
    setTimeout(() => this._tone(523, 0.2, 'sine', 0.14), 160);
  }

  // 跳跃
  jump() {
    this._init();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(350, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.1);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(this.masterGain);
    o.start(); o.stop(t + 0.1);
  }

  // 连击升级
  comboUp(mult) {
    this._init();
    const base = mult >= 10 ? 1568 : mult >= 5 ? 1319 : mult >= 3 ? 1175 : 1047;
    this._tone(base, 0.1, 'sine', 0.2);
    setTimeout(() => this._tone(base * 1.25, 0.1, 'sine', 0.2), 60);
    setTimeout(() => this._tone(base * 1.5, 0.15, 'triangle', 0.15), 120);
  }

  // 连击中断
  comboBreak() {
    this._init();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.25);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(this.masterGain);
    o.start(); o.stop(t + 0.25);
  }

  // 醉汉出场（打嗝）
  drunkManAppear() {
    this._init();
    this._tone(180, 0.08, 'square', 0.15);
    setTimeout(() => this._tone(220, 0.06, 'square', 0.12), 100);
    setTimeout(() => this._tone(160, 0.1, 'square', 0.1), 180);
  }

  // 醉汉扔酒瓶
  bottleThrow() {
    this._init();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(this.masterGain);
    o.start(); o.stop(t + 0.15);
  }

  // 按钮点击
  btnClick() {
    this._init();
    this._tone(800, 0.06, 'sine', 0.15);
  }

  // 关卡提示出现
  levelHint() {
    this._init();
    this._tone(660, 0.12, 'sine', 0.15);
    setTimeout(() => this._tone(880, 0.15, 'sine', 0.12), 80);
  }

  // 过关
  levelWin() {
    this._init();
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this._tone(f, 0.18, 'sine', 0.22);
        this._tone(f * 0.5, 0.15, 'triangle', 0.08);
      }, i * 100);
    });
  }

  // Game Over
  gameOver() {
    this._init();
    const notes = [440, 370, 330, 262];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.3, 'sine', 0.2), i * 180);
    });
  }

  // 通关（更长庆祝曲）
  ending() {
    this._init();
    const melody = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    melody.forEach((f, i) => {
      setTimeout(() => {
        this._tone(f, 0.2, 'sine', 0.2);
        this._tone(f * 0.75, 0.15, 'triangle', 0.08);
      }, i * 120);
    });
  }

  // 死亡（生命归零）
  death() {
    this._init();
    this._tone(200, 0.3, 'sawtooth', 0.2);
    this._tone(150, 0.4, 'sine', 0.15);
    this._noise(0.2, 0.15);
    setTimeout(() => this._tone(100, 0.5, 'sine', 0.12), 200);
  }

  // BGM — 简单的循环旋律
  startBGM() {
    this._init();
    if (this._bgmPlaying) return;
    this._bgmPlaying = true;
    this._bgmStep = 0;
    // 中国风五声音阶旋律（宫商角徵羽）
    const melody = [523, 587, 659, 784, 880, 784, 659, 587, 523, 659, 784, 880, 1047, 880, 784, 659];
    this._bgmInterval = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const freq = melody[this._bgmStep % melody.length];
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(this._bgmGain);
      o.start(); o.stop(t + 0.35);
      this._bgmStep++;
    }, 280);
  }

  stopBGM() {
    if (this._bgmInterval) { clearInterval(this._bgmInterval); this._bgmInterval = null; }
    this._bgmPlaying = false;
  }
}

const SFX = new SoundEngine();

// ============================================================
// Particle
// ============================================================
class Particle {
  constructor(x, y, text, color) {
    this.x = x; this.y = y;
    this.text = text; this.color = color;
    this.vy = -1.8;
    this.life = 60; this.maxLife = 60;
  }
  update() { this.y += this.vy; this.vy *= 0.96; this.life--; }
  dead()   { return this.life <= 0; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ============================================================
// FallingItem  ── type: 'positive' | 'bomb' | 'drunk' | 'cheers' | 'godmode'
// ============================================================
class FallingItem {
  constructor(x, def, speed, type) {
    this.x = x; this.y = -30;
    this.def     = def;
    this.type    = type;
    this.isBomb  = type === 'bomb';
    this.isDrunk = type === 'drunk';
    this.r       = (type === 'positive') ? def.r : 22;
    this.speed   = speed + Math.random() * 1.5;
    this.rot     = Math.random() * Math.PI * 2;
    this.rotSpd  = (Math.random() - 0.5) * 0.08;
    this.driftX  = (Math.random() - 0.5) * 1.2;
    this.collected = false;
    this.sparkTimer = 0;
  }

  update() {
    this.y += this.speed;
    this.x += this.driftX;
    this.rot += this.rotSpd;
    this.sparkTimer++;
  }

  offScreen() { return this.y > CH + 60; }

  hits(char) {
    const b = char.bounds();
    return (
      this.x + this.r > b.x && this.x - this.r < b.x + b.w &&
      this.y + this.r > b.y && this.y - this.r < b.y + b.h
    );
  }

  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    if      (this.isBomb)              this._drawBomb(ctx);
    else if (this.isDrunk)             this._drawDrunk(ctx);
    else if (this.type === 'cheers')   this._drawCheers(ctx);
    else if (this.type === 'godmode')  this._drawGodMode(ctx);
    else if (this.def.label.startsWith('¥')) this._drawCoin(ctx);
    else                               this._drawEmoji(ctx);
    ctx.restore();
  }

  _drawCoin(ctx) {
    const r = this.r;
    const grd = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6);
    grd.addColorStop(0, this.def.bg + '60'); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.def.bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.38, r * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.def.fg;
    ctx.font = `bold ${Math.round(r * 0.85)}px Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.def.label, 0, 0);
  }

  _drawEmoji(ctx) {
    const r = this.r;
    ctx.fillStyle = this.def.bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.round(r * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.def.label, 0, 2);
  }

  _drawBomb(ctx) {
    const r = this.r;
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(0, 3, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 3, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.1, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#A0A060'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(9, -r - 10, 5, -r - 20); ctx.stroke();
    if (this.sparkTimer % 6 < 3) {
      ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(5, -r - 20, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF6600'; ctx.beginPath(); ctx.arc(5, -r - 20, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `${r * 1.1}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 3);
  }

  _drawDrunk(ctx) {
    const r = this.r;
    const grd = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.7);
    grd.addColorStop(0, 'rgba(148,0,211,0.55)'); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4B0082'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9B59B6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,150,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.3, r * 0.38, r * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${r * 1.1}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🤮', 0, 2);
  }

  _drawCheers(ctx) {
    const r = this.r;
    const pulse = 0.7 + 0.3 * Math.sin(this.sparkTimer * 0.15);
    const grd = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.0);
    grd.addColorStop(0, `rgba(255,215,0,${0.6 * pulse})`); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r * 2.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B8860B'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${Math.round(r * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍻', 0, 2);
  }

  _drawGodMode(ctx) {
    const r = this.r;
    const pulse = 0.6 + 0.4 * Math.sin(this.sparkTimer * 0.1);
    const grd = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2);
    grd.addColorStop(0, `rgba(255,215,0,${0.7 * pulse})`);
    grd.addColorStop(0.5, `rgba(255,100,0,${0.3 * pulse})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8B0000'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${Math.round(r * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('😈', 0, 2);
  }
}

// ============================================================
// Bottle  ── 醉汉扔出的酒瓶（第5关起）
// ============================================================
class Bottle {
  constructor(x, y, targetX, targetY) {
    this.x = x; this.y = y;
    this.r = 12;
    const dx = targetX - x, dy = targetY - y;
    const t = 55;
    this.vx = dx / t;
    this.vy = dy / t - 0.5 * 0.32 * t;
    this.gravity = 0.32;
    this.rot = 0;
    this.rotSpd = (Math.random() - 0.5) * 0.25;
    this.collected = false;
  }

  update() {
    this.x  += this.vx;
    this.vy += this.gravity;
    this.y  += this.vy;
    this.rot += this.rotSpd;
  }

  offScreen() { return this.y > CH + 30 || this.x < -30 || this.x > CW + 30; }

  hits(char) {
    if (this.collected) return false;
    const b = char.bounds();
    return (
      this.x + this.r > b.x && this.x - this.r < b.x + b.w &&
      this.y + this.r > b.y && this.y - this.r < b.y + b.h
    );
  }

  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍾', 0, 0);
    ctx.restore();
  }
}

// ============================================================
// DrunkMan  ── 从屏幕边缘冲入的醉汉（第3关起出现）
// ============================================================
class DrunkMan {
  constructor(fromLeft, speed) {
    this.w = 36; this.h = 54;
    this.dir   = fromLeft ? 1 : -1;
    this.x     = fromLeft ? -this.w - 10 : CW + 10;
    this.y     = GROUND_Y - this.h;
    this.speed = speed;
    this.sway  = Math.random() * Math.PI * 2;
    this.walkFrame = 0;
    this.walkTick  = 0;
    this.hit = false;
    this.hasThrown  = false;
    this.throwDelay = 60 + Math.floor(Math.random() * 90);
  }

  update() {
    this.x    += this.dir * this.speed;
    this.sway += 0.08;
    this.walkTick++;
    if (this.walkTick % 7 === 0) this.walkFrame = (this.walkFrame + 1) % 4;
  }

  offScreen() {
    return this.x > CW + 10 || this.x < -this.w - 10;
  }

  shouldThrow() {
    if (this.hasThrown) return false;
    if (this.walkTick >= this.throwDelay && this.x > 20 && this.x < CW - 20) {
      this.hasThrown = true;
      return true;
    }
    return false;
  }

  getHandPos() {
    const as = Math.sin(this.sway * 1.6) * 18;
    return {
      x: this.x + this.w / 2 + this.dir * 23,
      y: this.y + this.h * 0.38 + as
    };
  }

  hits(char) {
    if (this.hit) return false;
    const b = char.bounds();
    return (
      this.x + this.w > b.x && this.x < b.x + b.w &&
      this.y + this.h > b.y && this.y < b.y + b.h
    );
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    ctx.scale(this.dir, 1);
    ctx.rotate(Math.sin(this.sway) * 13 * Math.PI / 180);
    this._drawBody(ctx);
    ctx.restore();
  }

  _drawBody(ctx) {
    const H  = this.h;
    const lp = Math.sin(this.walkFrame * Math.PI / 2);
    ctx.fillStyle = '#1a0505';
    ctx.beginPath(); ctx.ellipse(-7, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 7, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a0808'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-6 + lp * 6, -H * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 6, -5); ctx.lineTo( 6 - lp * 6, -H * 0.35); ctx.stroke();
    ctx.fillStyle = '#8B1010';
    rRect(ctx, -13, -H * 0.62, 26, H * 0.29, 4); ctx.fill();
    ctx.fillStyle = '#5c2020'; ctx.fillRect(-13, -H * 0.33, 26, 7);
    const as = Math.sin(this.sway * 1.6) * 18;
    ctx.strokeStyle = '#8B1010'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-13, -H * 0.55); ctx.lineTo(-23, -H * 0.38 + as); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 13, -H * 0.55); ctx.lineTo( 23, -H * 0.38 - as); ctx.stroke();
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath(); ctx.arc(-23, -H * 0.38 + as, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(23, -H * 0.38 - as, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#117733';
    ctx.fillRect(21, -H * 0.38 - as - 15, 4, 12);
    ctx.fillStyle = '#229944';
    ctx.fillRect(21, -H * 0.38 - as - 19, 4, 5);
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath(); ctx.arc(0, -H * 0.79, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath(); ctx.arc(0, -H * 0.86, 12, Math.PI + 0.25, -0.25, false); ctx.fill();
    ctx.font = `${Math.round(H * 0.3)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🥴', 0, -H * 0.79);
    ctx.fillStyle = 'rgba(240,60,60,0.5)';
    ctx.beginPath(); ctx.ellipse(-9, -H * 0.74, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 9, -H * 0.74, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ============================================================
// Character
// ============================================================
class Character {
  constructor() {
    this.w = 40; this.h = 60;
    this.x = CW / 2 - this.w / 2;
    this.groundY = GROUND_Y - this.h;
    this.y = this.groundY;
    this.vx = 0; this.vy = 0;
    this.jumping = false;
    this.sway = 0;
    this.walkFrame = 0;
    this.walkTick = 0;
    this.facing = 1;
    this.hurtFrames = 0;
    this.HURT_DUR  = 90;
    this.slowFrames = 0;
    this.SLOW_DUR   = 300;
    this.stunFrames = 0;
    this.STUN_DUR   = 180;
    this.godFrames  = 0;
    this.GOD_DUR    = 300; // 5秒 @ 60fps
    this.celebrating = false;
  }

  update(input) {
    const GRAV = 0.55;

    if (this.stunFrames > 0) {
      this.vx  = 0;
      this.vy += GRAV;
      this.y  += this.vy;
      if (this.y >= this.groundY) { this.y = this.groundY; this.vy = 0; this.jumping = false; }
      this.sway += 0.09;
      this.stunFrames--;
      if (this.hurtFrames > 0) this.hurtFrames--;
      if (this.godFrames > 0) this.godFrames--;
      return;
    }

    const SLOW   = this.slowFrames > 0;
    const SPEED  = SLOW ? 2.0 : 5.5;
    const FRIC   = SLOW ? 0.55 : 0.72;
    const JUMP   = -13;

    if      (input.left && !input.right) { this.vx = -SPEED; this.facing = -1; }
    else if (input.right && !input.left) { this.vx = SPEED;  this.facing =  1; }
    else if (input.left && input.right)    this.vx = this.facing * SPEED;
    else                                   this.vx *= FRIC;

    if (input.jump && !this.jumping) { this.vy = JUMP; this.jumping = true; SFX.jump(); }

    this.vy += GRAV;
    this.x  += this.vx;
    this.y  += this.vy;

    if (this.y >= this.groundY) { this.y = this.groundY; this.vy = 0; this.jumping = false; }
    if (this.x < -this.w) this.x = CW;
    if (this.x > CW)      this.x = -this.w;

    this.sway += SLOW ? 0.09 : 0.045;

    this.walkTick++;
    if (!this.jumping && Math.abs(this.vx) > 0.5) {
      if (this.walkTick % 9 === 0) this.walkFrame = (this.walkFrame + 1) % 4;
    } else { this.walkFrame = 0; }

    if (this.hurtFrames > 0) this.hurtFrames--;
    if (this.slowFrames > 0) this.slowFrames--;
    if (this.godFrames > 0)  this.godFrames--;
  }

  hurt() {
    if (this.hurtFrames > 0) return false;
    this.hurtFrames = this.HURT_DUR;
    return true;
  }

  slowDown() { this.slowFrames = this.SLOW_DUR; }

  stun() {
    this.stunFrames = this.STUN_DUR;
    this.slowFrames = 0;
    this.vx = 0;
  }

  godMode() {
    this.godFrames  = this.GOD_DUR;
    this.slowFrames = 0;
    this.stunFrames = 0;
  }

  bounds() { return { x: this.x + 7, y: this.y + 4, w: this.w - 14, h: this.h - 4 }; }

  draw(ctx, comboMult) {
    if (this.stunFrames > 0) {
      const cx = this.x + this.w / 2;
      const gy = GROUND_Y - 16;
      ctx.save();
      ctx.translate(cx, gy);
      ctx.rotate(Math.PI / 2);
      this._drawBody(ctx);
      ctx.restore();
      ctx.save();
      ctx.font = '16px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const a = (this.sway * 2.5) + (i * Math.PI * 2 / 3);
        ctx.fillText('💫', cx + this.h * 0.82 + Math.cos(a) * 14, gy - 20 + Math.sin(a) * 14);
      }
      ctx.restore();
      return;
    }

    if (this.hurtFrames > 0 && Math.floor(this.hurtFrames / 6) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.15;
    } else { ctx.save(); }

    // 酒神金色光环
    if (this.godFrames > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.sway * 3);
      const glow = ctx.createRadialGradient(
        this.x + this.w / 2, this.y + this.h / 2, 5,
        this.x + this.w / 2, this.y + this.h / 2, 48
      );
      glow.addColorStop(0, `rgba(255,215,0,${0.45 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 48, 0, Math.PI * 2); ctx.fill();
    }
    // combo光环：5x银色 / 10x金色
    else if (comboMult >= 10) {
      const pulse = 0.5 + 0.5 * Math.sin(this.sway * 2.5);
      const glow = ctx.createRadialGradient(
        this.x + this.w / 2, this.y + this.h / 2, 5,
        this.x + this.w / 2, this.y + this.h / 2, 44
      );
      glow.addColorStop(0, `rgba(255,215,0,${0.4 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 44, 0, Math.PI * 2); ctx.fill();
    }
    else if (comboMult >= 5) {
      const pulse = 0.5 + 0.5 * Math.sin(this.sway * 2.5);
      const glow = ctx.createRadialGradient(
        this.x + this.w / 2, this.y + this.h / 2, 5,
        this.x + this.w / 2, this.y + this.h / 2, 42
      );
      glow.addColorStop(0, `rgba(192,192,192,${0.4 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 42, 0, Math.PI * 2); ctx.fill();
    }
    // 醉酒紫色光晕
    else if (this.slowFrames > 0) {
      const glow = ctx.createRadialGradient(
        this.x + this.w / 2, this.y + this.h / 2, 5,
        this.x + this.w / 2, this.y + this.h / 2, 38
      );
      glow.addColorStop(0, 'rgba(148,0,211,0.35)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 38, 0, Math.PI * 2); ctx.fill();
    }

    ctx.translate(this.x + this.w / 2, this.y + this.h);
    const swayDeg = this.slowFrames > 0 ? 14 : 7;
    ctx.rotate(Math.sin(this.sway) * swayDeg * Math.PI / 180);
    ctx.scale(this.facing, 1);
    this._drawBody(ctx);

    if (this.godFrames > 0) {
      ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('😈', 2, -this.h - 10);
    } else if (this.slowFrames > 0) {
      ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🌀', 2, -this.h - 10);
    }

    ctx.restore();
  }

  _drawBody(ctx) {
    const H = this.h;
    const lp = Math.sin(this.walkFrame * Math.PI / 2);
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath(); ctx.ellipse(-8, 0, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 0, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-7 + lp * 6, -H * 0.36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 7, -6); ctx.lineTo( 7 - lp * 6, -H * 0.36); ctx.stroke();
    ctx.fillStyle = '#3a6fa8';
    rRect(ctx, -14, -H * 0.63, 28, H * 0.3, 4); ctx.fill();
    ctx.fillStyle = '#5c3d11'; ctx.fillRect(-14, -H * 0.33, 28, 7);
    ctx.fillStyle = '#DAA520'; rRect(ctx, -5, -H * 0.345, 10, 9, 2); ctx.fill();
    const as = Math.sin(this.sway * 1.5) * 16;
    ctx.strokeStyle = '#3a6fa8'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-14, -H * 0.56); ctx.lineTo(-24, -H * 0.39 + as); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 14, -H * 0.56); ctx.lineTo( 24, -H * 0.39 - as); ctx.stroke();
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath(); ctx.arc(-24, -H * 0.39 + as, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 24, -H * 0.39 - as, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FDBCB4'; ctx.beginPath(); ctx.arc(0, -H * 0.8, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.arc(0, -H * 0.87, 13, Math.PI + 0.2, -0.2, false); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-6, -H * 0.82, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 6, -H * 0.82, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    const ew = Math.sin(this.sway * 2) * 2.5;
    ctx.fillStyle = '#8B0000';
    ctx.beginPath(); ctx.arc(-6 + ew, -H * 0.82, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 6 - ew, -H * 0.82, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(230,80,80,0.35)';
    ctx.beginPath(); ctx.ellipse(-10, -H * 0.76, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 10, -H * 0.76, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8B2020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -H * 0.75, 7, 0.25, Math.PI - 0.25); ctx.stroke();
    if (this.celebrating) {
      ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍾', 32, -H * 0.6);
    }
  }
}

// ============================================================
// Main Game
// ============================================================
const STATE = { MENU: 0, PLAYING: 1, LEVEL_WIN: 2, GAME_OVER: 3, ENDING: 4, LEVEL_SELECT: 5, INSTRUCTIONS: 6 };

class DrunkardGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.state     = STATE.MENU;
    this.levelIdx  = 0;
    this.wealth    = 0;
    this.lives     = 3;
    this.combo     = 0;
    this.items     = [];
    this.particles = [];
    this.fireworks = [];
    this.drunkMen  = [];
    this.bottles   = [];
    this.spawnTick = 0;
    this.stateTick = 0;
    this._lastTap  = { x: CW / 2, y: CH / 2 };
    this._menuBtns = [];
    this._levelSelectBtns = [];
    this._levelSelectBackBtn = null;

    this.input = { left: false, right: false, jump: false };
    this.stars     = this._genStars(75);
    this.buildings = this._genBuildings();
    this.character = new Character();

    this._bindInput();
    requestAnimationFrame(() => this._loop());
  }

  // ----------------------------------------------------------
  resize() {
    const ratio = CW / CH;
    let w = window.innerWidth, h = window.innerHeight;
    if (w / h > ratio) w = h * ratio; else h = w / ratio;
    this.canvas.style.width  = Math.floor(w) + 'px';
    this.canvas.style.height = Math.floor(h) + 'px';
    this.canvas.width  = CW;
    this.canvas.height = CH;
  }

  _genStars(n) {
    const arr = [];
    for (let i = 0; i < n; i++)
      arr.push({ x: Math.random() * CW, y: Math.random() * CH * 0.68,
                 r: Math.random() * 1.8 + 0.4, t: Math.random() * Math.PI * 2 });
    return arr;
  }

  _genBuildings() {
    const b = [];
    for (let i = 0; i < 7; i++) {
      const bw = 38 + Math.random() * 48, bh = 55 + Math.random() * 130;
      const bx = (i / 7) * CW + Math.random() * 20;
      const wins = [];
      for (let wy = 0; wy < Math.floor(bh / 22); wy++)
        for (let wx = 0; wx < Math.floor(bw / 18); wx++)
          wins.push({ ox: wx * 18 + 5, oy: wy * 22 + 5, lit: Math.random() < 0.45 });
      b.push({ x: bx, w: bw, h: bh, color: `hsl(220,25%,${9 + Math.random() * 12}%)`, wins });
    }
    return b;
  }

  // ----------------------------------------------------------
  _bindInput() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') this.input.left  = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (!this.input.jump) {
          this.input.jump = true;
          this._lastTap = { x: CW / 4, y: CH / 2 };
          this._onAction();
        }
      }
      if (e.key === 'Enter') { this._lastTap = { x: CW / 4, y: CH / 2 }; this._onAction(); }
      if (e.key === 'Escape') {
        if (this.state === STATE.LEVEL_SELECT || this.state === STATE.INSTRUCTIONS) {
          this.state = STATE.MENU; this.stateTick = 0; return;
        }
        this._lastTap = { x: CW * 3 / 4, y: CH / 2 }; this._onAction();
      }
      // 数字键在选关页面直接选关
      if (this.state === STATE.LEVEL_SELECT && e.key >= '1' && e.key <= '7') {
        this._startFromLevel(parseInt(e.key) - 1);
      }
      // M 键静音切换
      if (e.key === 'm' || e.key === 'M') SFX.toggle();
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') this.input.left  = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.input.jump = false;
    });

    const onTouch = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CW / rect.width, scaleY = CH / rect.height;

      // 静音按钮检测
      if (e.type === 'touchstart' && e.touches.length > 0) {
        const t0 = e.touches[0];
        const mx = (t0.clientX - rect.left) * scaleX, my = (t0.clientY - rect.top) * scaleY;
        if (this._hitMuteBtn(mx, my)) { SFX.toggle(); return; }
      }

      // 非游戏状态：只记录点击位置并触发 action
      if (this.state !== STATE.PLAYING) {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          this._lastTap = { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
          this._onAction();
        }
        return;
      }

      // 游戏中：方向控制
      this.input.left = false; this.input.right = false;
      for (const t of e.touches) {
        const tx = (t.clientX - rect.left) * scaleX;
        const ty = (t.clientY - rect.top)  * scaleY;
        this._lastTap = { x: tx, y: ty };
        if (ty > CH * 0.78) {
          if      (tx < CW / 3)     this.input.left  = true;
          else if (tx > CW * 2 / 3) this.input.right = true;
          else { this.input.jump = true; this._onAction(); }
        } else {
          this.input.jump = true;
          this._onAction();
        }
      }
      if (this.input.left && this.input.right) {
        this.input.jump = true;
        this._onAction();
      }
      if (e.touches.length === 0) {
        this.input.left = false; this.input.right = false; this.input.jump = false;
      }
    };
    this.canvas.addEventListener('touchstart', onTouch, { passive: false });
    this.canvas.addEventListener('touchmove',  onTouch, { passive: false });
    this.canvas.addEventListener('touchend',   onTouch, { passive: false });
  }

  _onAction() {
    const tap = this._lastTap;

    if (this.state === STATE.MENU) {
      for (const btn of this._menuBtns) {
        if (tap.x >= btn.x && tap.x <= btn.x + btn.w && tap.y >= btn.y && tap.y <= btn.y + btn.h) {
          SFX.btnClick();
          if      (btn.action === 'start')        this._startGame();
          else if (btn.action === 'levelSelect')  { this.state = STATE.LEVEL_SELECT; this.stateTick = 0; }
          else if (btn.action === 'instructions') { this.state = STATE.INSTRUCTIONS; this.stateTick = 0; }
          return;
        }
      }
      // 键盘 Enter 默认开始游戏
      this._startGame();
      return;
    }

    if (this.state === STATE.LEVEL_SELECT) {
      for (const btn of this._levelSelectBtns) {
        if (tap.x >= btn.x && tap.x <= btn.x + btn.w && tap.y >= btn.y && tap.y <= btn.y + btn.h) {
          SFX.btnClick();
          this._startFromLevel(btn.idx);
          return;
        }
      }
      const back = this._levelSelectBackBtn;
      if (back && tap.x >= back.x && tap.x <= back.x + back.w && tap.y >= back.y && tap.y <= back.y + back.h) {
        SFX.btnClick();
        this.state = STATE.MENU; this.stateTick = 0;
      }
      return;
    }

    if (this.state === STATE.INSTRUCTIONS) {
      SFX.btnClick();
      this.state = STATE.MENU; this.stateTick = 0;
      return;
    }

    if (this.state === STATE.LEVEL_WIN && this.stateTick > 70) { SFX.btnClick(); this._nextLevel(); }
    else if (this.state === STATE.GAME_OVER && this.stateTick > 70) {
      SFX.btnClick();
      if (tap.x < CW / 2) this._restartLevel();
      else { this.state = STATE.MENU; this.stateTick = 0; }
    }
    else if (this.state === STATE.ENDING && this.stateTick > 70) { SFX.btnClick(); this._startGame(); }
  }

  // ----------------------------------------------------------
  _startGame() {
    this.levelIdx = 0; this.lives = 3; this.combo = 0; this.fireworks = [];
    this.state = STATE.PLAYING; this.stateTick = 0;
    this._initLevel();
    SFX.startBGM();
  }

  _startFromLevel(idx) {
    this.levelIdx = idx; this.lives = 3; this.combo = 0; this.fireworks = [];
    this.state = STATE.PLAYING; this.stateTick = 0;
    this._initLevel();
    SFX.startBGM();
  }

  _initLevel() {
    this.wealth = 0; this.combo = 0;
    this.items = []; this.particles = []; this.spawnTick = 0;
    this.drunkMen = []; this.drunkmanTick = 0;
    this.bottles = [];
    this.character = new Character();
    this.input = { left: false, right: false, jump: false };
  }

  _restartLevel() {
    this.lives = 3;
    this.state = STATE.PLAYING; this.stateTick = 0;
    this._initLevel();
    SFX.startBGM();
  }

  _nextLevel() {
    this.lives = 3;
    this.levelIdx++;
    if (this.levelIdx >= LEVELS.length) {
      this.state = STATE.ENDING; this.stateTick = 0; this.fireworks = []; SFX.stopBGM(); SFX.ending();
    } else {
      this.state = STATE.PLAYING; this.stateTick = 0;
      this._initLevel();
      SFX.startBGM();
    }
  }

  // ----------------------------------------------------------
  _comboMult() {
    if (this.combo > 30)  return 10;
    if (this.combo >= 21) return 5;
    if (this.combo >= 11) return 3;
    if (this.combo >= 6)  return 2;
    return 1;
  }

  _spawnItem() {
    const lv = LEVELS[this.levelIdx];
    const x  = 28 + Math.random() * (CW - 56);
    const r  = Math.random();
    let threshold = 0;

    threshold += lv.bombChance;
    if (r < threshold) { this.items.push(new FallingItem(x, null, lv.fallSpeed, 'bomb')); return; }

    threshold += lv.drunkChance;
    if (r < threshold) { this.items.push(new FallingItem(x, null, lv.fallSpeed, 'drunk')); return; }

    threshold += lv.cheersChance;
    if (r < threshold) { this.items.push(new FallingItem(x, null, lv.fallSpeed, 'cheers')); return; }

    threshold += lv.godModeChance;
    if (r < threshold) { this.items.push(new FallingItem(x, null, lv.fallSpeed, 'godmode')); return; }

    let def = pickPosItem(lv);
    if (def.isHeart && this.lives >= 3) def = pickPosItem(lv);
    this.items.push(new FallingItem(x, def, lv.fallSpeed, 'positive'));
  }

  // ----------------------------------------------------------
  _update() {
    this.stateTick++;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].dead()) this.particles.splice(i, 1);
    }
    for (const s of this.stars) s.t += 0.03;

    if (this.state === STATE.ENDING) { this._updateFireworks(); return; }
    if (this.state !== STATE.PLAYING) return;

    const lv = LEVELS[this.levelIdx];

    // 关卡提示暂停（前120帧）
    if (lv.hint && this.stateTick <= 120) { if (this.stateTick === 1) SFX.levelHint(); return; }

    const wasGod = this.character.godFrames > 0;
    this.character.update(this.input);
    if (wasGod && this.character.godFrames <= 0) SFX.godEnd();
    this.input.jump = false;

    this.spawnTick++;
    if (this.spawnTick >= lv.spawnInterval) {
      this.spawnTick = 0;
      this._spawnItem();
      if (lv.multi && Math.random() < 0.42) this._spawnItem();
    }

    // 道具碰撞
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update();

      if (!item.collected && item.hits(this.character)) {
        item.collected = true;

        if (item.isBomb) {
          if (this.character.godFrames > 0) {
            const bv = 10; this.wealth += bv; this.combo++;
            this.particles.push(new Particle(item.x, item.y - 20, `+¥${bv}`, '#66FFFF'));
            SFX.godImmune();
          } else if (this.character.hurt()) {
            if (this.combo >= 6) SFX.comboBreak();
            this.combo = 0; this.lives--;
            this.particles.push(new Particle(item.x, item.y - 20, '-1❤️  连击中断！', '#FF5555'));
            SFX.bomb();
            if (this.lives <= 0) { this.state = STATE.GAME_OVER; this.stateTick = 0; SFX.death(); SFX.stopBGM(); }
          }
        } else if (item.isDrunk) {
          if (this.character.godFrames > 0) {
            const dv = 10; this.wealth += dv; this.combo++;
            this.particles.push(new Particle(item.x, item.y - 20, `+¥${dv}`, '#66FFFF'));
            SFX.godImmune();
          } else {
            if (this.combo >= 6) SFX.comboBreak();
            this.combo = 0;
            if (this.character.slowFrames > 0 || this.character.stunFrames > 0) {
              this.character.stun();
              this.particles.push(new Particle(item.x, item.y - 20, '💫 断片！眩晕3秒！', '#FF44FF'));
              SFX.stun();
            } else {
              this.character.slowDown();
              this.particles.push(new Particle(item.x, item.y - 20, '🤮 行动迟缓！连击↓0', '#BB66FF'));
              SFX.drunk();
            }
          }
        } else if (item.type === 'cheers') {
          // 干杯：清屏转金币
          let totalValue = 0, count = 0;
          for (const fi of this.items) {
            if (fi === item || fi.collected) continue;
            fi.collected = true; count++;
            if (fi.type === 'positive' && fi.def) {
              totalValue += fi.def.isHeart ? 8 : fi.def.value;
            } else if (fi.isBomb) {
              totalValue += 10;
            } else if (fi.isDrunk) {
              totalValue += 10;
            }
            this.particles.push(new Particle(fi.x, fi.y, '✨', '#FFD700'));
          }
          for (const dm of this.drunkMen) {
            dm.hit = true; totalValue += lv.bottleThrow ? 40 : 20; count++;
            this.particles.push(new Particle(dm.x + dm.w / 2, dm.y, '✨', '#FFD700'));
          }
          for (const b of this.bottles) { b.collected = true; totalValue += 10; count++; }
          this.wealth += totalValue;
          this.particles.push(new Particle(item.x, item.y - 20, `🍻干杯！+¥${totalValue}`, '#FF6600'));
          SFX.cheers();
          if (this.wealth >= lv.price) { this.state = STATE.LEVEL_WIN; this.stateTick = 0; this.character.celebrating = true; SFX.stopBGM(); SFX.levelWin(); }
        } else if (item.type === 'godmode') {
          this.character.godMode();
          this.particles.push(new Particle(item.x, item.y - 20, '😈 酒神降临！5秒无敌！', '#FFD700'));
          SFX.godMode();
        } else if (item.def.isHeart) {
          this.combo++;
          SFX.heart();
          if (this.lives < 3) {
            this.lives++;
            this.particles.push(new Particle(item.x, item.y - 20, '+1❤️  回血！', '#FF88AA'));
          } else {
            this.wealth += 8;
            this.particles.push(new Particle(item.x, item.y - 20, '❤️满血 +¥8', '#FF88AA'));
            if (this.wealth >= lv.price) { this.state = STATE.LEVEL_WIN; this.stateTick = 0; this.character.celebrating = true; SFX.stopBGM(); SFX.levelWin(); }
          }
        } else {
          const prevMult = this._comboMult();
          this.combo++;
          const mult   = this._comboMult();
          const earned = Math.round(item.def.value * mult);
          this.wealth += earned;
          let txt, color;
          if      (mult >= 5) { txt = `+¥${earned} 🔥×5`; color = '#FF2200'; }
          else if (mult >= 3) { txt = `+¥${earned} 🔥×3`; color = '#FF6600'; }
          else if (mult >= 2) { txt = `+¥${earned} ×2`;   color = '#FFA500'; }
          else                { txt = `+¥${earned}`;       color = '#FFD700'; }
          this.particles.push(new Particle(item.x, item.y - 20, txt, color));
          if (mult > prevMult) SFX.comboUp(mult); else if (item.def.isClover) SFX.moneyBag(); else if (item.def.label === '💰') SFX.moneyBag(); else SFX.coin(item.def.value);
          if (this.wealth >= lv.price) { this.state = STATE.LEVEL_WIN; this.stateTick = 0; this.character.celebrating = true; SFX.stopBGM(); SFX.levelWin(); }
        }
      }

      if (item.offScreen() || item.collected) this.items.splice(i, 1);
    }

    // 醉汉
    if (lv.drunkman && this.drunkMen.length === 0) {
      this.drunkmanTick++;
      if (this.drunkmanTick >= lv.drunkmanInterval) {
        this.drunkmanTick = 0;
        this.drunkMen.push(new DrunkMan(Math.random() < 0.5, lv.drunkmanSpeed));
        SFX.drunkManAppear();
      }
    }
    for (let i = this.drunkMen.length - 1; i >= 0; i--) {
      const dm = this.drunkMen[i];
      dm.update();

      // 酒瓶投掷
      if (lv.bottleThrow && dm.shouldThrow()) {
        const hand = dm.getHandPos();
        this.bottles.push(new Bottle(hand.x, hand.y,
          this.character.x + this.character.w / 2,
          this.character.y + this.character.h / 2));
        this.particles.push(new Particle(hand.x, hand.y - 10, '🍾', '#229944'));
        SFX.bottleThrow();
      }

      if (dm.hits(this.character)) {
        dm.hit = true;
        if (this.character.godFrames > 0) {
          const dmv = lv.bottleThrow ? 40 : 20; this.wealth += dmv; this.combo++;
          this.particles.push(new Particle(dm.x + dm.w / 2, dm.y, `+¥${dmv}`, '#66FFFF'));
          SFX.godImmune();
        } else if (this.character.hurt()) {
          if (this.combo >= 6) SFX.comboBreak();
          this.combo = 0; this.lives--;
          this.particles.push(new Particle(
            this.character.x + this.character.w / 2,
            this.character.y - 20, '🥴 被醉汉撞倒！', '#FF5555'));
          SFX.drunkManHit();
          if (this.lives <= 0) { this.state = STATE.GAME_OVER; this.stateTick = 0; SFX.death(); SFX.stopBGM(); }
        }
      }
      if (dm.offScreen() || dm.hit) this.drunkMen.splice(i, 1);
    }

    // 酒瓶
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i];
      b.update();
      if (!b.collected && b.hits(this.character)) {
        b.collected = true;
        if (this.character.godFrames > 0) {
          const btv = 10; this.wealth += btv; this.combo++;
          this.particles.push(new Particle(b.x, b.y - 20, `+¥${btv}`, '#66FFFF'));
          SFX.godImmune();
        } else if (this.character.hurt()) {
          if (this.combo >= 6) SFX.comboBreak();
          this.combo = 0; this.lives--;
          this.particles.push(new Particle(b.x, b.y - 20, '🍾 被砸中！-1❤️', '#FF5555'));
          SFX.bottleHit();
          if (this.lives <= 0) { this.state = STATE.GAME_OVER; this.stateTick = 0; SFX.death(); SFX.stopBGM(); }
        }
      }
      if (b.offScreen() || b.collected) this.bottles.splice(i, 1);
    }
  }

  _updateFireworks() {
    if (Math.random() < 0.14) {
      const fx = 40 + Math.random() * (CW - 80), fy = 50 + Math.random() * CH * 0.45;
      const hue = Math.floor(Math.random() * 360);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2, spd = 1.5 + Math.random() * 2.5;
        this.fireworks.push({ x: fx, y: fy, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          color: `hsl(${hue},100%,65%)`, life: 45, maxLife: 45 });
      }
    }
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      f.x += f.vx; f.y += f.vy; f.vy += 0.05; f.life--;
      if (f.life <= 0) this.fireworks.splice(i, 1);
    }
  }

  // ----------------------------------------------------------
  _draw() {
    const ctx = this.ctx;
    this._drawBg(ctx);
    if      (this.state === STATE.MENU)          this._drawMenu(ctx);
    else if (this.state === STATE.LEVEL_SELECT)  this._drawLevelSelect(ctx);
    else if (this.state === STATE.INSTRUCTIONS)  this._drawInstructions(ctx);
    else if (this.state === STATE.ENDING)        this._drawEnding(ctx);
    else {
      this._drawGame(ctx);
      if (this.state === STATE.LEVEL_WIN)  this._drawLevelWin(ctx);
      if (this.state === STATE.GAME_OVER)  this._drawGameOver(ctx);
    }
    // 静音按钮（右上角）
    this._drawMuteBtn(ctx);
  }

  _drawMuteBtn(ctx) {
    const bx = CW - 36, by = 4, bs = 28;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(bx + bs / 2, by + bs / 2, bs / 2, 0, Math.PI * 2); ctx.fill();
    ctx.font = '15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.85;
    ctx.fillText(SFX.muted ? '🔇' : '🔊', bx + bs / 2, by + bs / 2 + 1);
    ctx.restore();
  }

  _hitMuteBtn(x, y) {
    const cx = CW - 22, cy = 18;
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) < 196;
  }

  // ----------------------------------------------------------
  _drawBg(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, CH * 0.7);
    sky.addColorStop(0, '#060612'); sky.addColorStop(1, '#111130');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.t));
      ctx.fillStyle = `rgba(255,255,230,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#FFFDE8'; ctx.beginPath(); ctx.arc(CW * 0.84, 52, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111130'; ctx.beginPath(); ctx.arc(CW * 0.84 - 9, 47, 24, 0, Math.PI * 2); ctx.fill();
    for (const b of this.buildings) {
      const by = GROUND_Y - b.h;
      ctx.fillStyle = b.color; ctx.fillRect(b.x, by, b.w, b.h);
      for (const w of b.wins) {
        ctx.fillStyle = w.lit ? 'rgba(255,235,100,0.55)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(b.x + w.ox, by + w.oy, 8, 6);
      }
    }
    ctx.fillStyle = '#1e1e1e'; ctx.fillRect(0, GROUND_Y, CW, GROUND_H);
    ctx.fillStyle = '#2e2e2e'; ctx.fillRect(0, GROUND_Y, CW, 14);
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1;
    for (let x = 0; x < CW; x += 42) {
      ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x, GROUND_Y + 14); ctx.stroke();
    }
    ctx.fillStyle = '#282828'; ctx.fillRect(0, GROUND_Y + 14, CW, GROUND_H - 14);
    ctx.strokeStyle = 'rgba(255,210,0,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([28, 18]);
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 14 + (GROUND_H - 14) / 2);
    ctx.lineTo(CW, GROUND_Y + 14 + (GROUND_H - 14) / 2);
    ctx.stroke(); ctx.setLineDash([]);
  }

  // ----------------------------------------------------------
  _drawGame(ctx) {
    for (const item of this.items) item.draw(ctx);
    for (const dm of this.drunkMen) dm.draw(ctx);
    for (const b of this.bottles) b.draw(ctx);
    this.character.draw(ctx, this._comboMult());
    for (const p of this.particles) p.draw(ctx);
    this._drawHUD(ctx);
    this._drawTouchHints(ctx);

    // 关卡提示叠加层
    const lv = LEVELS[this.levelIdx];
    if (lv.hint && this.stateTick <= 120) this._drawLevelHint(ctx, lv);
  }

  _drawLevelHint(ctx, lv) {
    const alpha = this.stateTick < 15 ? this.stateTick / 15
                : this.stateTick > 90 ? (120 - this.stateTick) / 30
                : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, CW, CH);
    const cx = CW / 2, cy = CH * 0.38;
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`第 ${lv.id} 关`, cx, cy - 50);
    ctx.font = '48px serif'; ctx.fillText(lv.icon, cx, cy + 10);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText(lv.alcohol, cx, cy + 50);
    ctx.fillStyle = '#FFAA00'; ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText(lv.hint, cx, cy + 100);
    ctx.restore();
  }

  _drawHUD(ctx) {
    const lv       = LEVELS[this.levelIdx];
    const hasCombo = this.combo >= 3;
    const isSlow   = this.character.slowFrames > 0;
    const isStun   = this.character.stunFrames > 0;
    const isGod    = this.character.godFrames > 0;
    const hudH     = (hasCombo || isSlow || isStun || isGod) ? HUD_H : HUD_H - 16;

    ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(0, 0, CW, hudH);

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`第 ${lv.id} 关  ·  目标: ${lv.alcohol} ${lv.icon}`, CW / 2, 16);

    ctx.fillStyle = '#333'; ctx.fillRect(10, 22, CW - 20, 14);
    const prog = Math.min(1, this.wealth / lv.price);
    if (prog > 0) {
      const g = ctx.createLinearGradient(10, 0, 10 + (CW - 20) * prog, 0);
      g.addColorStop(0, '#B8860B'); g.addColorStop(1, '#FFD700');
      ctx.fillStyle = g; ctx.fillRect(10, 22, (CW - 20) * prog, 14);
    }
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1; ctx.strokeRect(10, 22, CW - 20, 14);

    ctx.font = 'bold 12px Arial, sans-serif'; ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';  ctx.fillText(`¥${this.wealth}`, 12, 50);
    ctx.textAlign = 'right'; ctx.fillText(`目标 ¥${lv.price}`, CW - 12, 50);
    ctx.textAlign = 'center'; ctx.font = '14px serif';
    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += (i < this.lives) ? '❤️' : '🖤';
    ctx.fillText(hearts, CW / 2, 64);

    // 状态行：酒神 > 断片 > 醉酒减速 > COMBO
    if (isGod) {
      const secLeft = Math.ceil(this.character.godFrames / 60);
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`😈 酒神模式  剩余 ${secLeft}s`, CW / 2, hudH - 3);
    } else if (isStun) {
      const secLeft = Math.ceil(this.character.stunFrames / 60);
      ctx.fillStyle = '#FF44FF'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`💫 断片眩晕  剩余 ${secLeft}s`, CW / 2, hudH - 3);
    } else if (isSlow) {
      const secLeft = Math.ceil(this.character.slowFrames / 60);
      ctx.fillStyle = '#BB66FF'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`🌀 醉酒减速  剩余 ${secLeft}s`, CW / 2, hudH - 3);
    } else if (hasCombo) {
      const mult  = this._comboMult();
      const color = mult >= 5 ? '#FF2200' : mult >= 3 ? '#FF6600' : '#FFA500';
      ctx.fillStyle = color; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center';
      const mStr = mult > 1 ? `  ×${mult} 加成` : '';
      ctx.fillText(`🔥 ${this.combo} COMBO${mStr}`, CW / 2, hudH - 3);
    }
  }

  _drawTouchHints(ctx) {
    const y = CH - 50;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y, CW / 3, 50); ctx.fillRect(CW * 2 / 3, y, CW / 3, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(CW / 3, y, CW / 3, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '18px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('◀', CW / 6, CH - 18); ctx.fillText('▶', CW * 5 / 6, CH - 18); ctx.fillText('↑', CW / 2, CH - 18);
  }

  // ----------------------------------------------------------
  _drawMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, CW, CH);
    const cx = CW / 2;
    const cardX = 30, cardY = CH * 0.10, cardW = CW - 60, cardH = CH * 0.75;

    ctx.fillStyle = 'rgba(10,10,35,0.95)'; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 2; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.stroke();

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 38px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('醉翁觅酒', cx, cardY + 60);
    ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif';
    ctx.fillText("The Drunkard's Quest", cx, cardY + 84);
    ctx.font = '60px serif'; ctx.fillText('🍺', cx, cardY + 160);

    ctx.fillStyle = '#CCCCCC'; ctx.font = '13px Arial, sans-serif';
    ctx.fillText('收集金币，凑够钱买酒！', cx, cardY + 200);

    // 三个按钮
    this._menuBtns = [];
    const btnW = cardW - 50, btnH = 46, btnGap = 18;
    const btnX = cardX + 25;
    const btn1Y = cardY + 232;

    const buttons = [
      { label: '开始游戏  →',  action: 'start',        bg: '#DAA520', fg: '#1a1a00' },
      { label: '选择关卡  📋', action: 'levelSelect',  bg: '#4a6a8a', fg: '#FFFFFF' },
      { label: '游戏说明  ❓', action: 'instructions', bg: '#555555', fg: '#FFFFFF' },
    ];

    buttons.forEach((btn, i) => {
      const by = btn1Y + i * (btnH + btnGap);
      this._menuBtns.push({ x: btnX, y: by, w: btnW, h: btnH, action: btn.action });
      ctx.fillStyle = btn.bg; rRect(ctx, btnX, by, btnW, btnH, 23); ctx.fill();
      ctx.fillStyle = btn.fg; ctx.font = 'bold 17px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(btn.label, cx, by + 29);
    });

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`共 ${LEVELS.length} 关，最终目标：飞天茅台 ✨`, cx, cardY + cardH - 24);
  }

  // ----------------------------------------------------------
  _drawLevelSelect(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, CW, CH);
    const cx = CW / 2;
    const cardX = 14, cardY = CH * 0.06, cardW = CW - 28, cardH = CH * 0.88;

    ctx.fillStyle = 'rgba(10,10,35,0.95)'; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 2; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.stroke();

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('选择关卡', cx, cardY + 40);

    this._levelSelectBtns = [];
    const cols = 3, bw = 96, bh = 84, gapX = 14, gapY = 14;
    const totalW = cols * bw + (cols - 1) * gapX;
    const startX = cx - totalW / 2;
    const startY = cardY + 65;

    LEVELS.forEach((lv, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const bx = startX + col * (bw + gapX);
      const by = startY + row * (bh + gapY);

      this._levelSelectBtns.push({ x: bx, y: by, w: bw, h: bh, idx });

      ctx.fillStyle = 'rgba(30,30,60,0.9)';
      rRect(ctx, bx, by, bw, bh, 10); ctx.fill();
      ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1;
      rRect(ctx, bx, by, bw, bh, 10); ctx.stroke();

      ctx.font = '28px serif'; ctx.textAlign = 'center';
      ctx.fillText(lv.icon, bx + bw / 2, by + 32);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(`第${lv.id}关`, bx + bw / 2, by + 52);
      ctx.fillStyle = '#DAA520'; ctx.font = '11px Arial, sans-serif';
      ctx.fillText(`¥${lv.price}`, bx + bw / 2, by + 70);
    });

    // 返回按钮
    const btnY = cardY + cardH - 52;
    const backBtn = { x: cardX + 35, y: btnY, w: cardW - 70, h: 40 };
    this._levelSelectBackBtn = backBtn;
    ctx.fillStyle = '#555555'; rRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 20); ctx.fill();
    ctx.strokeStyle = '#888888'; ctx.lineWidth = 1.5; rRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 20); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('← 返回', cx, backBtn.y + 26);
  }

  // ----------------------------------------------------------
  _drawInstructions(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, CW, CH);
    const cx = CW / 2;
    const cardX = 14, cardY = CH * 0.03, cardW = CW - 28, cardH = CH * 0.94;

    ctx.fillStyle = 'rgba(10,10,35,0.97)'; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 2; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.stroke();

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('游戏说明', cx, cardY + 38);

    let y = cardY + 64;
    const lh = 19;
    const section = (title) => {
      ctx.fillStyle = '#DAA520'; ctx.font = 'bold 13px Arial, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(title, cardX + 20, y); y += lh + 2;
    };
    const line = (text, color) => {
      ctx.fillStyle = color || '#CCCCCC'; ctx.font = '12px Arial, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(text, cardX + 24, y); y += lh;
    };

    section('— 基本玩法 —');
    line('收集空中掉落的金币，凑够钱买酒通关！');
    line('共7关，最终目标：飞天茅台 ✨');
    y += 4;

    section('— 操作方式 —');
    line('键盘：← → 移动 | 空格/↑ 跳跃');
    line('触屏：左侧←  右侧→  中间↑跳跃');
    y += 4;

    section('— 金币 —');
    line('¥1  ¥2  ¥4    基础金币');
    line('💰 ¥12  金袋    💰 ¥20  大钱袋（第2关起）');
    line('❤️ 回血：回复1命（满血时+¥8）（第2关起）');
    y += 4;

    section('— 危险道具 —');
    line('💣 炸弹：-1命，连击归零（第2关起）', '#FF6666');
    line('🤮 醉酒：减速5秒，再中→断片3秒（第2关起）', '#BB66FF');
    y += 4;

    section('— 特殊道具 —');
    line('🍻 干杯：清除屏幕所有物品转为金币（第4关起）', '#FFA500');
    line('😈 酒神：5秒无敌，撞到的一切都变金币（第6关起）', '#FFD700');
    y += 4;

    section('— 敌人 —');
    line('🥴 醉汉（第3关起）：横穿屏幕，撞到-1命', '#FF8888');
    line('🍾 飞瓶（第5关起）：醉汉扔瓶子，被砸-1命', '#FF8888');
    y += 4;

    section('— 连击系统 —');
    line('连续接住金币触发COMBO加成：');
    line('6连×2 | 11连×3 | 21连×5🪽 | 30连×10🔥', '#FFA500');
    y += 4;

    section('— 提示 —');
    line('通关后自动恢复满血 ❤️❤️❤️');

    // 返回提示
    ctx.fillStyle = '#666666'; ctx.font = '12px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('点击任意位置返回', cx, cardY + cardH - 18);
  }

  // ----------------------------------------------------------
  _drawLevelWin(ctx) {
    const lv = LEVELS[this.levelIdx];
    const t  = Math.min(1, this.stateTick / 25);
    ctx.fillStyle = `rgba(0,0,0,${t * 0.62})`; ctx.fillRect(0, 0, CW, CH);
    if (t < 1) return;

    const cx = CW / 2;
    const cardX = 18, cardY = CH * 0.15, cardW = CW - 36, cardH = CH * 0.65;
    ctx.fillStyle = 'rgba(5,30,5,0.96)'; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = '#90EE90'; ctx.lineWidth = 2; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.stroke();

    ctx.fillStyle = '#90EE90'; ctx.font = 'bold 28px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('✅ 关卡完成！', cx, cardY + 46);
    ctx.font = '50px serif'; ctx.fillText(lv.icon, cx, cardY + 108);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial, sans-serif'; ctx.fillText(lv.alcohol, cx, cardY + 140);
    ctx.fillStyle = '#FFD700'; ctx.font = '14px Arial, sans-serif'; ctx.fillText(`花费 ¥${lv.price}，到手啦！`, cx, cardY + 164);
    ctx.fillStyle = '#FF88AA'; ctx.font = '13px Arial, sans-serif'; ctx.fillText('❤️❤️❤️  生命已恢复满格', cx, cardY + 186);

    if (this.levelIdx + 1 < LEVELS.length) {
      const next = LEVELS[this.levelIdx + 1];
      ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif'; ctx.fillText('下一目标：', cx, cardY + 216);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText(`${next.alcohol} ${next.icon}  ¥${next.price}`, cx, cardY + 238);
    } else {
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('🏆 这就是最后一关！', cx, cardY + 228);
    }

    if (this.stateTick > 70) {
      const btnY = cardY + cardH - 50;
      ctx.fillStyle = '#FFD700'; rRect(ctx, cardX + 35, btnY, cardW - 70, 40, 20); ctx.fill();
      ctx.fillStyle = '#1a1a00'; ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText(this.levelIdx + 1 < LEVELS.length ? '下一关  →' : '最终庆祝  🎉', cx, btnY + 26);
    }
  }

  // ----------------------------------------------------------
  _drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.70)'; ctx.fillRect(0, 0, CW, CH);
    const cx = CW / 2;
    const cardX = 18, cardY = CH * 0.2, cardW = CW - 36, cardH = CH * 0.60;
    ctx.fillStyle = 'rgba(30,5,5,0.97)'; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 2; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.stroke();

    ctx.fillStyle = '#FF6666'; ctx.font = 'bold 28px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('醉翁倒下了…', cx, cardY + 52);
    ctx.font = '52px serif'; ctx.fillText('😵', cx, cardY + 116);

    const lv = LEVELS[this.levelIdx];
    ctx.fillStyle = '#CCCCCC'; ctx.font = '14px Arial, sans-serif';
    ctx.fillText(`到达第 ${lv.id} 关`, cx, cardY + 156);
    ctx.fillText(`还差 ¥${Math.max(0, lv.price - this.wealth)} 就能买到`, cx, cardY + 178);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(`${lv.alcohol} ${lv.icon}`, cx, cardY + 204);
    ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif';
    ctx.fillText('振作精神，再来一次！', cx, cardY + 230);

    if (this.stateTick > 70) {
      const btnY = cardY + cardH - 68, halfW = (cardW - 60) / 2;
      ctx.fillStyle = '#6B1010'; rRect(ctx, cardX + 20, btnY, halfW, 44, 14); ctx.fill();
      ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 1.5; rRect(ctx, cardX + 20, btnY, halfW, 44, 14); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('重玩本关 🔄', cardX + 20 + halfW / 2, btnY + 28);
      ctx.fillStyle = '#1e1e1e'; rRect(ctx, cardX + 30 + halfW, btnY, halfW, 44, 14); ctx.fill();
      ctx.strokeStyle = '#666666'; ctx.lineWidth = 1.5; rRect(ctx, cardX + 30 + halfW, btnY, halfW, 44, 14); ctx.stroke();
      ctx.fillStyle = '#AAAAAA'; ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillText('退出游戏', cardX + 30 + halfW + halfW / 2, btnY + 28);
      ctx.fillStyle = '#555555'; ctx.font = '11px Arial, sans-serif';
      ctx.fillText('Enter = 重玩  |  Esc = 退出', cx, btnY + 58);
    }
  }

  // ----------------------------------------------------------
  _drawEnding(ctx) {
    const cx = CW / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CW, CH);

    for (const f of this.fireworks) {
      ctx.save(); ctx.globalAlpha = f.life / f.maxLife;
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    const cardX = 14, cardY = CH * 0.05, cardW = CW - 28, cardH = CH * 0.90;
    ctx.fillStyle = 'rgba(8,8,28,0.97)'; rRect(ctx, cardX, cardY, cardW, cardH, 20); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5; rRect(ctx, cardX, cardY, cardW, cardH, 20); ctx.stroke();

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 30px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏆 终极通关！', cx, cardY + 50);
    ctx.font = '50px serif'; ctx.fillText('✨🍾✨', cx, cardY + 112);
    ctx.font = '44px serif'; ctx.fillText('🥴🥂', cx, cardY + 168);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('飞天茅台！终于到手！', cx, cardY + 208);
    ctx.fillStyle = '#FFD700'; ctx.font = '14px Arial, sans-serif';
    ctx.fillText('醉翁仰天长啸，泪流满面', cx, cardY + 232);

    ctx.fillStyle = 'rgba(255,215,0,0.22)';
    rRect(ctx, cardX + 20, cardY + 250, cardW - 40, 86, 10); ctx.fill();
    ctx.fillStyle = '#DDDDBB'; ctx.font = 'italic 13px Arial, sans-serif';
    ['"从一瓶青岛，到飞天茅台，', '我这醉翁，没有白活！"', '', '  ——醉翁，仰天长啸，痛饮而尽']
      .forEach((l, i) => ctx.fillText(l, cx, cardY + 270 + i * 20));

    ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cardX + 25, cardY + 352); ctx.lineTo(cardX + cardW - 25, cardY + 352); ctx.stroke();
    ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif';
    ctx.fillText('继续你的传说！', cx, cardY + 372);

    if (this.stateTick > 70) {
      const btnY = cardY + cardH - 118;
      ctx.fillStyle = '#B8860B'; rRect(ctx, cardX + 35, btnY, cardW - 70, 44, 22); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; rRect(ctx, cardX + 35, btnY, cardW - 70, 44, 22); ctx.stroke();
      ctx.fillStyle = '#1a1a00'; ctx.font = 'bold 16px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('二周目 🥂', cx, btnY + 28);
      ctx.fillStyle = '#555566'; ctx.font = '11px Arial, sans-serif';
      ctx.fillText('点击 / Enter = 再来一局', cx, btnY + 62);
    }
  }

  // ----------------------------------------------------------
  _loop() { this._update(); this._draw(); requestAnimationFrame(() => this._loop()); }
}

// ============================================================
// Bootstrap
// ============================================================
window.addEventListener('DOMContentLoaded', () => new DrunkardGame());
