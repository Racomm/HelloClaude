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
// Level Definitions  ── 前5关已加大难度；后2关保留高强度
// ============================================================
const LEVELS = [
  { id: 1, alcohol: '青岛啤酒',     icon: '🍺', price: 15,   spawnInterval: 65, fallSpeed: 3.0, bombChance: 0.12, multi: false },
  { id: 2, alcohol: '劲酒',         icon: '🥃', price: 35,   spawnInterval: 58, fallSpeed: 3.5, bombChance: 0.15, multi: false },
  { id: 3, alcohol: '老白干',       icon: '🍶', price: 60,   spawnInterval: 52, fallSpeed: 4.0, bombChance: 0.18, multi: true  },
  { id: 4, alcohol: '牛栏山二锅头', icon: '🥂', price: 100,  spawnInterval: 46, fallSpeed: 4.5, bombChance: 0.20, multi: true  },
  { id: 5, alcohol: '郎酒',         icon: '🍾', price: 200,  spawnInterval: 42, fallSpeed: 5.0, bombChance: 0.22, multi: true  },
  { id: 6, alcohol: '五粮液',       icon: '🏆', price: 400,  spawnInterval: 40, fallSpeed: 5.5, bombChance: 0.24, multi: true  },
  { id: 7, alcohol: '飞天茅台',     icon: '✨', price: 1000, spawnInterval: 36, fallSpeed: 6.0, bombChance: 0.27, multi: true  },
];

// ============================================================
// Item Definitions  ── 新增 ❤️ 血格道具
// ============================================================
const POS_ITEMS = [
  { label: '¥1',  value: 1,  r: 14, bg: '#DAA520', fg: '#5a3a00', weight: 33, isHeart: false },
  { label: '¥5',  value: 5,  r: 17, bg: '#FFA500', fg: '#7b3f00', weight: 23, isHeart: false },
  { label: '¥10', value: 10, r: 20, bg: '#FF8C00', fg: '#5c2d00', weight: 14, isHeart: false },
  { label: '💰',  value: 30, r: 22, bg: '#8B4513', fg: '#FFD700', weight: 8,  isHeart: false },
  { label: '🍀',  value: 50, r: 22, bg: '#228B22', fg: '#90EE90', weight: 4,  isHeart: false },
  { label: '❤️',  value: 0,  r: 20, bg: '#CC1144', fg: '#FFFFFF', weight: 3,  isHeart: true  },
];
const TOTAL_POS_WEIGHT = POS_ITEMS.reduce((s, d) => s + d.weight, 0);

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

function pickPosItem() {
  let r = Math.random() * TOTAL_POS_WEIGHT;
  for (const d of POS_ITEMS) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return POS_ITEMS[0];
}

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
// FallingItem
// ============================================================
class FallingItem {
  constructor(x, def, speed, isBomb) {
    this.x = x; this.y = -30;
    this.def = def;
    this.r = isBomb ? 20 : def.r;
    this.speed = speed + Math.random() * 1.5;
    this.isBomb = isBomb;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpd = (Math.random() - 0.5) * 0.08;
    this.driftX = (Math.random() - 0.5) * 1.2;
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
    if (this.isBomb)                       this._drawBomb(ctx);
    else if (this.def.label.startsWith('¥')) this._drawCoin(ctx);
    else                                   this._drawEmoji(ctx);
    ctx.restore();
  }

  _drawCoin(ctx) {
    const r = this.r;
    const grd = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6);
    grd.addColorStop(0, this.def.bg + '60');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.def.bg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.38, r * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.def.fg;
    ctx.font = `bold ${Math.round(r * 0.85)}px Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.def.label, 0, 0);
  }

  _drawEmoji(ctx) {
    const r = this.r;
    ctx.fillStyle = this.def.bg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.round(r * 1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.def.label, 0, 2);
  }

  _drawBomb(ctx) {
    const r = this.r;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(0, 3, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 3, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.1, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#A0A060'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(9, -r - 10, 5, -r - 20);
    ctx.stroke();
    if (this.sparkTimer % 6 < 3) {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(5, -r - 20, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.arc(5, -r - 20, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `${r * 1.1}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 3);
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
    this.HURT_DUR = 90;
    this.celebrating = false;
  }

  update(input) {
    const SPEED = 5.5, FRICTION = 0.72, JUMP = -13, GRAV = 0.55;
    if (input.left)       { this.vx = -SPEED; this.facing = -1; }
    else if (input.right) { this.vx = SPEED;  this.facing =  1; }
    else                    this.vx *= FRICTION;

    if (input.jump && !this.jumping) { this.vy = JUMP; this.jumping = true; }

    this.vy += GRAV;
    this.x  += this.vx;
    this.y  += this.vy;

    if (this.y >= this.groundY) { this.y = this.groundY; this.vy = 0; this.jumping = false; }
    if (this.x < -this.w) this.x = CW;
    if (this.x > CW)      this.x = -this.w;

    this.sway += 0.045;
    this.walkTick++;
    if (!this.jumping && Math.abs(this.vx) > 0.5) {
      if (this.walkTick % 9 === 0) this.walkFrame = (this.walkFrame + 1) % 4;
    } else { this.walkFrame = 0; }

    if (this.hurtFrames > 0) this.hurtFrames--;
  }

  hurt() {
    if (this.hurtFrames > 0) return false;
    this.hurtFrames = this.HURT_DUR;
    return true;
  }

  bounds() { return { x: this.x + 7, y: this.y + 4, w: this.w - 14, h: this.h - 4 }; }

  draw(ctx) {
    if (this.hurtFrames > 0 && Math.floor(this.hurtFrames / 6) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.15;
    } else { ctx.save(); }
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    ctx.rotate(Math.sin(this.sway) * 7 * Math.PI / 180);
    ctx.scale(this.facing, 1);
    this._drawBody(ctx);
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
const STATE = { MENU: 0, PLAYING: 1, LEVEL_WIN: 2, GAME_OVER: 3, ENDING: 4 };

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
    this.spawnTick = 0;
    this.stateTick = 0;
    this._lastTap  = { x: CW / 2, y: CH / 2 };

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

  // ----------------------------------------------------------
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
          this._lastTap = { x: CW / 4, y: CH / 2 }; // left side → NG+ on ending
          this._onAction();
        }
      }
      if (e.key === 'Enter') {
        this._lastTap = { x: CW / 4, y: CH / 2 };
        this._onAction();
      }
      if (e.key === 'Escape') {
        this._lastTap = { x: CW * 3 / 4, y: CH / 2 };
        this._onAction();
      }
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
      if (e.touches.length === 0) {
        this.input.left = false; this.input.right = false; this.input.jump = false;
      }
    };
    this.canvas.addEventListener('touchstart', onTouch, { passive: false });
    this.canvas.addEventListener('touchmove',  onTouch, { passive: false });
    this.canvas.addEventListener('touchend',   onTouch, { passive: false });
  }

  _onAction() {
    if (this.state === STATE.MENU) {
      this._startGame();
    } else if (this.state === STATE.LEVEL_WIN && this.stateTick > 70) {
      this._nextLevel();
    } else if (this.state === STATE.GAME_OVER && this.stateTick > 70) {
      this.state = STATE.MENU;
    } else if (this.state === STATE.ENDING && this.stateTick > 70) {
      // Left half = 二周目, Right half = 回主菜单
      if (this._lastTap.x < CW / 2) {
        this._startGame();
      } else {
        this.state = STATE.MENU;
        this.stateTick = 0;
      }
    }
  }

  // ----------------------------------------------------------
  _startGame() {
    this.levelIdx  = 0;
    this.lives     = 3;
    this.combo     = 0;
    this.fireworks = [];
    this.state     = STATE.PLAYING;
    this.stateTick = 0;
    this._initLevel();
  }

  _initLevel() {
    this.wealth    = 0;
    this.combo     = 0;
    this.items     = [];
    this.particles = [];
    this.spawnTick = 0;
    this.character = new Character();
    this.input = { left: false, right: false, jump: false };
  }

  // ── 每关结束恢复满血 ──
  _nextLevel() {
    this.lives = 3;
    this.levelIdx++;
    if (this.levelIdx >= LEVELS.length) {
      this.state     = STATE.ENDING;
      this.stateTick = 0;
      this.fireworks = [];
    } else {
      this.state     = STATE.PLAYING;
      this.stateTick = 0;
      this._initLevel();
    }
  }

  // ----------------------------------------------------------
  // COMBO 乘数: 5连=1.5x, 10连=2x, 20连=3x
  _comboMult() {
    if (this.combo >= 20) return 3;
    if (this.combo >= 10) return 2;
    if (this.combo >= 5)  return 1.5;
    return 1;
  }

  _spawnItem() {
    const lv = LEVELS[this.levelIdx];
    const margin = 28;
    const x = margin + Math.random() * (CW - margin * 2);
    if (Math.random() < lv.bombChance) {
      this.items.push(new FallingItem(x, null, lv.fallSpeed, true));
    } else {
      let def = pickPosItem();
      // 满血时重新抽一次，减少血格浪费
      if (def.isHeart && this.lives >= 3) def = pickPosItem();
      this.items.push(new FallingItem(x, def, lv.fallSpeed, false));
    }
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
    this.character.update(this.input);
    this.input.jump = false;

    this.spawnTick++;
    if (this.spawnTick >= lv.spawnInterval) {
      this.spawnTick = 0;
      this._spawnItem();
      if (lv.multi && Math.random() < 0.42) this._spawnItem();
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update();

      if (!item.collected && item.hits(this.character)) {
        item.collected = true;

        if (item.isBomb) {
          if (this.character.hurt()) {
            this.combo = 0; // 碰炸弹重置连击
            this.lives--;
            this.particles.push(new Particle(item.x, item.y - 20, '-1❤️  连击中断！', '#FF5555'));
            if (this.lives <= 0) { this.state = STATE.GAME_OVER; this.stateTick = 0; }
          }
        } else if (item.def.isHeart) {
          // ── 血格道具 ──
          this.combo++;
          if (this.lives < 3) {
            this.lives++;
            this.particles.push(new Particle(item.x, item.y - 20, '+1❤️  回血！', '#FF88AA'));
          } else {
            // 满血转化为¥10奖励
            this.wealth += 10;
            this.particles.push(new Particle(item.x, item.y - 20, '❤️满血 +¥10', '#FF88AA'));
            if (this.wealth >= lv.price) { this.state = STATE.LEVEL_WIN; this.stateTick = 0; this.character.celebrating = true; }
          }
        } else {
          // ── 普通收集：叠加COMBO乘数 ──
          this.combo++;
          const mult   = this._comboMult();
          const earned = Math.round(item.def.value * mult);
          this.wealth += earned;

          let txt, color;
          if (mult >= 3)        { txt = `+¥${earned} 🔥×3`;  color = '#FF4500'; }
          else if (mult >= 2)   { txt = `+¥${earned} ×2`;    color = '#FF8C00'; }
          else if (mult >= 1.5) { txt = `+¥${earned} ×1.5`;  color = '#FFA500'; }
          else                  { txt = `+¥${earned}`;        color = '#FFD700'; }
          this.particles.push(new Particle(item.x, item.y - 20, txt, color));

          if (this.wealth >= lv.price) { this.state = STATE.LEVEL_WIN; this.stateTick = 0; this.character.celebrating = true; }
        }
      }

      if (item.offScreen() || item.collected) this.items.splice(i, 1);
    }
  }

  _updateFireworks() {
    if (Math.random() < 0.14) {
      const fx = 40 + Math.random() * (CW - 80);
      const fy = 50 + Math.random() * CH * 0.45;
      const hue = Math.floor(Math.random() * 360);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const spd   = 1.5 + Math.random() * 2.5;
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
    if      (this.state === STATE.MENU)    this._drawMenu(ctx);
    else if (this.state === STATE.ENDING)  this._drawEnding(ctx);
    else {
      this._drawGame(ctx);
      if (this.state === STATE.LEVEL_WIN) this._drawLevelWin(ctx);
      if (this.state === STATE.GAME_OVER) this._drawGameOver(ctx);
    }
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

    ctx.fillStyle = '#FFFDE8';
    ctx.beginPath(); ctx.arc(CW * 0.84, 52, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111130';
    ctx.beginPath(); ctx.arc(CW * 0.84 - 9, 47, 24, 0, Math.PI * 2); ctx.fill();

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
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ----------------------------------------------------------
  _drawGame(ctx) {
    for (const item of this.items) item.draw(ctx);
    this.character.draw(ctx);
    for (const p of this.particles) p.draw(ctx);
    this._drawHUD(ctx);
    this._drawTouchHints(ctx);
  }

  _drawHUD(ctx) {
    const lv       = LEVELS[this.levelIdx];
    const hasCombo = this.combo >= 3;
    const hudH     = hasCombo ? HUD_H : HUD_H - 16;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, CW, hudH);

    // Row 1: level title
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`第 ${lv.id} 关  ·  目标: ${lv.alcohol} ${lv.icon}`, CW / 2, 16);

    // Row 2: progress bar
    ctx.fillStyle = '#333'; ctx.fillRect(10, 22, CW - 20, 14);
    const prog = Math.min(1, this.wealth / lv.price);
    if (prog > 0) {
      const g = ctx.createLinearGradient(10, 0, 10 + (CW - 20) * prog, 0);
      g.addColorStop(0, '#B8860B'); g.addColorStop(1, '#FFD700');
      ctx.fillStyle = g; ctx.fillRect(10, 22, (CW - 20) * prog, 14);
    }
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1; ctx.strokeRect(10, 22, CW - 20, 14);

    // Row 3: wealth / target / hearts
    ctx.font = 'bold 12px Arial, sans-serif'; ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';  ctx.fillText(`¥${this.wealth}`, 12, 50);
    ctx.textAlign = 'right'; ctx.fillText(`目标 ¥${lv.price}`, CW - 12, 50);
    ctx.textAlign = 'center'; ctx.font = '14px serif';
    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += (i < this.lives) ? '❤️' : '🖤';
    ctx.fillText(hearts, CW / 2, 64);

    // Row 4: combo (only when active)
    if (hasCombo) {
      const mult  = this._comboMult();
      const color = mult >= 3 ? '#FF4500' : mult >= 2 ? '#FF8C00' : '#FFA500';
      ctx.fillStyle = color;
      ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center';
      const multStr = mult > 1 ? `  ×${mult} 加成` : '';
      ctx.fillText(`🔥 ${this.combo} COMBO${multStr}`, CW / 2, hudH - 3);
    }
  }

  _drawTouchHints(ctx) {
    const y = CH - 50, h = 50;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y, CW / 3, h); ctx.fillRect(CW * 2 / 3, y, CW / 3, h);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(CW / 3, y, CW / 3, h);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '18px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('◀', CW / 6, CH - 18); ctx.fillText('▶', CW * 5 / 6, CH - 18); ctx.fillText('↑', CW / 2, CH - 18);
  }

  // ----------------------------------------------------------
  _drawMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, CW, CH);
    const cx = CW / 2;
    const cardX = 18, cardY = CH * 0.08, cardW = CW - 36, cardH = CH * 0.82;

    ctx.fillStyle = 'rgba(10,10,35,0.94)'; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 2; rRect(ctx, cardX, cardY, cardW, cardH, 18); ctx.stroke();

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 38px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('醉翁觅酒', cx, cardY + 52);
    ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif';
    ctx.fillText("The Drunkard's Quest", cx, cardY + 74);
    ctx.font = '60px serif'; ctx.fillText('🍺', cx, cardY + 148);

    const lines = [
      '你是一个爱酒如命的醉翁 🥴',
      '收集空中掉落的金币，凑够钱买酒！',
      '',
      '⚠️  小心炸弹 💣，碰到会受伤！',
      '❤️  掉落血格可以回复生命！',
      '🔥  连续收集触发 COMBO 乘数加成！',
      '      5连=×1.5  |  10连=×2  |  20连=×3',
      '✅  每关通关后自动恢复满血！',
    ];
    ctx.fillStyle = '#CCCCCC'; ctx.font = '13px Arial, sans-serif';
    lines.forEach((l, i) => ctx.fillText(l, cx, cardY + 190 + i * 23));

    ctx.fillStyle = '#888888'; ctx.font = '12px Arial, sans-serif';
    ctx.fillText('← → 移动  |  空格 / ↑  跳跃', cx, cardY + 398);
    ctx.fillText('触屏：左三分之一←  右三分之一→  中间↑', cx, cardY + 416);

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`共 ${LEVELS.length} 关，最终目标：飞天茅台 ✨`, cx, cardY + 444);

    const btnY = cardY + cardH - 52;
    ctx.fillStyle = '#DAA520'; rRect(ctx, cardX + 35, btnY, cardW - 70, 42, 21); ctx.fill();
    ctx.fillStyle = '#1a1a00'; ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('开始游戏  →', cx, btnY + 27);
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
      ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif'; ctx.fillText('下一目标：', cx, cardY + 218);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText(`${next.alcohol} ${next.icon}  ¥${next.price}`, cx, cardY + 240);
    } else {
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('🏆 这就是最后一关！', cx, cardY + 230);
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
      const btnY = cardY + cardH - 52;
      ctx.fillStyle = '#DAA520'; rRect(ctx, cardX + 35, btnY, cardW - 70, 40, 20); ctx.fill();
      ctx.fillStyle = '#1a1a00'; ctx.font = 'bold 16px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('重新开始', cx, btnY + 26);
    }
  }

  // ----------------------------------------------------------
  // 终极通关画面：畅饮茅台 + 二周目 / 主菜单选择
  _drawEnding(ctx) {
    const cx = CW / 2;

    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CW, CH);

    // Fireworks
    for (const f of this.fireworks) {
      ctx.save(); ctx.globalAlpha = f.life / f.maxLife;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Card
    const cardX = 14, cardY = CH * 0.05, cardW = CW - 28, cardH = CH * 0.90;
    ctx.fillStyle = 'rgba(8,8,28,0.97)'; rRect(ctx, cardX, cardY, cardW, cardH, 20); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5; rRect(ctx, cardX, cardY, cardW, cardH, 20); ctx.stroke();

    // Title
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 30px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏆 终极通关！', cx, cardY + 50);

    // Celebration emoji
    ctx.font = '50px serif'; ctx.fillText('✨🍾✨', cx, cardY + 112);

    // Scene: drunkard drinking Maotai
    ctx.font = '44px serif'; ctx.fillText('🥴🥂', cx, cardY + 168);

    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('飞天茅台！终于到手！', cx, cardY + 208);

    ctx.fillStyle = '#FFD700'; ctx.font = '14px Arial, sans-serif';
    ctx.fillText('醉翁仰天长啸，泪流满面', cx, cardY + 232);

    // Story quote
    ctx.fillStyle = 'rgba(255,215,0,0.25)';
    rRect(ctx, cardX + 20, cardY + 250, cardW - 40, 86, 10); ctx.fill();
    ctx.fillStyle = '#DDDDBB'; ctx.font = 'italic 13px Arial, sans-serif';
    const story = [
      '"从一瓶青岛，到飞天茅台，',
      '我这醉翁，没有白活！"',
      '',
      '  ——醉翁，仰天长啸，痛饮而尽',
    ];
    story.forEach((l, i) => ctx.fillText(l, cx, cardY + 270 + i * 20));

    // Divider
    ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cardX + 25, cardY + 352); ctx.lineTo(cardX + cardW - 25, cardY + 352); ctx.stroke();

    ctx.fillStyle = '#AAAAAA'; ctx.font = '13px Arial, sans-serif';
    ctx.fillText('继续你的传说，还是就此封瓶？', cx, cardY + 372);

    if (this.stateTick > 70) {
      const btnY = cardY + cardH - 118;
      const halfW = (cardW - 60) / 2;

      // 二周目 button (left half)
      ctx.fillStyle = '#B8860B';
      rRect(ctx, cardX + 20, btnY, halfW, 44, 14); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
      rRect(ctx, cardX + 20, btnY, halfW, 44, 14); ctx.stroke();
      ctx.fillStyle = '#1a1a00'; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('二周目 🥂', cardX + 20 + halfW / 2, btnY + 28);

      // 主菜单 button (right half)
      ctx.fillStyle = '#1e1e3e';
      rRect(ctx, cardX + 30 + halfW, btnY, halfW, 44, 14); ctx.fill();
      ctx.strokeStyle = '#6666AA'; ctx.lineWidth = 1.5;
      rRect(ctx, cardX + 30 + halfW, btnY, halfW, 44, 14); ctx.stroke();
      ctx.fillStyle = '#AAAACC'; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('回主菜单', cardX + 30 + halfW + halfW / 2, btnY + 28);

      // Hint
      ctx.fillStyle = '#555566'; ctx.font = '11px Arial, sans-serif';
      ctx.fillText('Enter / 点左 = 二周目  |  Esc / 点右 = 菜单', cx, btnY + 62);
    }
  }

  // ----------------------------------------------------------
  _loop() {
    this._update();
    this._draw();
    requestAnimationFrame(() => this._loop());
  }
}

// ============================================================
// Bootstrap
// ============================================================
window.addEventListener('DOMContentLoaded', () => new DrunkardGame());
