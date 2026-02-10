// game.js - 游戏主控制类

class Game {
    setCanvasSize() {
        // 为移动设备优化画布尺寸
        if (this.isMobile) {
            // 横屏模式 (推荐)
            if (window.innerWidth > window.innerHeight) {
                // 使用视口宽度，但留出边距
                this.width = Math.min(window.innerWidth - 40, 932);  // iPhone 15 Plus 横屏宽度
                // 增加高度以充分利用屏幕空间，留出少量边距给控制提示
                this.height = Math.min(window.innerHeight - 50, 430);  // 从 400 增加到 430
            } else {
                // 竖屏模式 (备选)
                this.width = Math.min(window.innerWidth - 20, 430);  // iPhone 15 Plus 竖屏宽度
                this.height = Math.min(window.innerHeight * 0.4, 300);
            }
        } else {
            // 桌面设备保持原尺寸
            this.width = 1200;
            this.height = 400;
        }
    }

    constructor() {
        // Canvas 设置
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 检测设备类型
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // 动态设置游戏尺寸以适配移动设备
        this.setCanvasSize();
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 设置 UI 缩放比例
        Sprite.setUIScale(this.width);

        // 地面位置
        this.groundY = this.height - 50;

        // 游戏状态
        this.state = 'waiting'; // waiting, running, gameOver
        this.debug = false; // 调试模式

        // 速度和难度 (单位: 像素/帧 at 60FPS)
        // 移动设备速度稍慢，以适应触控操作
        if (this.isMobile) {
            this.baseSpeed = 5;
            this.maxSpeed = 11;
            this.speedIncrement = 0.0008;
        } else {
            this.baseSpeed = 6;
            this.maxSpeed = 13;
            this.speedIncrement = 0.001;
        }
        this.speed = this.baseSpeed;

        // 生命值系统
        this.lives = 3;
        this.maxLives = 5;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 2000; // 碰撞后无敌时间 (ms)

        // 金币系统
        this.coins = 0;
        this.coinsForLife = 30;

        // 初始化游戏对象
        this.initGameObjects();

        // 初始化音效
        this.sound = new Sound();

        // 绑定事件
        this.bindEvents();

        // 开始游戏循环
        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    initGameObjects() {
        this.dino = new Dino(this.groundY - 47);
        this.ground = new Ground(this.width, this.groundY);
        this.cloudManager = new CloudManager(this.width, this.height);
        this.obstacleManager = new ObstacleManager(this.width, this.groundY);
        this.coinManager = new CoinManager(this.width, this.groundY);
        this.score = new Score();
        this.nightSky = new NightSky(this.width, this.height);
    }

    bindEvents() {
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // 鼠标/触摸事件
        this.canvas.addEventListener('click', () => this.handleClick());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouch(e);
        });

        // 触摸结束事件：释放下蹲
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.state === 'running') {
                this.dino.duck(false);
            }
        });

        // 窗口大小调整
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    handleKeyDown(e) {
        // 阻止空格键滚动页面
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            e.preventDefault();
        }

        switch (e.code) {
            case 'Space':
            case 'ArrowUp':
                this.handleJump();
                break;
            case 'ArrowDown':
                if (this.state === 'running') {
                    this.dino.duck(true);
                }
                break;
        }
    }

    handleKeyUp(e) {
        if (e.code === 'ArrowDown') {
            this.dino.duck(false);
        }
    }

    handleClick() {
        this.handleJump();
    }

    handleTouch(e) {
        // 初始化音效
        this.sound.init();
        this.sound.resume();

        if (this.state !== 'running') {
            this.handleJump();
            return;
        }

        // 获取触摸位置
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const canvasDisplayWidth = rect.width;

        // 左侧下蹲，右侧跳跃（减少误操作）
        if (touchX < canvasDisplayWidth * 0.5) {
            this.dino.duck(true);
        } else {
            if (this.dino.jump()) {
                this.sound.playJump();
            }
        }
    }

    handleJump() {
        // 初始化音效 (需要用户交互)
        this.sound.init();
        this.sound.resume();

        if (this.state === 'waiting') {
            this.startGame();
        } else if (this.state === 'running') {
            if (this.dino.jump()) {
                this.sound.playJump();
            }
        } else if (this.state === 'gameOver') {
            this.restartGame();
        }
    }

    handleResize() {
        // 更新画布尺寸
        if (this.isMobile) {
            const oldWidth = this.width;
            const oldHeight = this.height;

            this.setCanvasSize();

            // 如果尺寸变化，重新初始化画布
            if (oldWidth !== this.width || oldHeight !== this.height) {
                this.canvas.width = this.width;
                this.canvas.height = this.height;
                this.groundY = this.height - 50;

                // 更新 UI 缩放比例
                Sprite.setUIScale(this.width);

                // 重新初始化游戏对象（如果游戏已开始）
                if (this.dino) {
                    this.initGameObjects();
                }
            }
        }

        // 响应式调整显示大小
        const maxWidth = Math.min(this.width, window.innerWidth - 20);
        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = (maxWidth * this.height / this.width) + 'px';

        // 检查屏幕方向
        this.checkOrientation();
    }

    checkOrientation() {
        if (!this.isMobile) return;

        const isLandscape = window.innerWidth > window.innerHeight;
        const orientationWarning = document.getElementById('orientation-warning');

        if (!isLandscape && orientationWarning) {
            orientationWarning.style.display = 'flex';
        } else if (orientationWarning) {
            orientationWarning.style.display = 'none';
        }
    }

    startGame() {
        this.state = 'running';
        this.dino.start();
    }

    restartGame() {
        this.state = 'running';
        this.speed = this.baseSpeed;
        this.lives = 3;
        this.coins = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        Sprite.isNight = false;
        document.body.classList.remove('night-mode');

        this.dino.reset();
        this.ground.reset();
        this.cloudManager.reset();
        this.obstacleManager.reset();
        this.coinManager.reset();
        this.score.reset();
        this.nightSky.reset();

        this.dino.start();
    }

    hitObstacle() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // 剩余生命时进入无敌状态
            this.isInvincible = true;
            this.invincibleTimer = 0;
            this.sound.playGameOver();
        }
    }

    gameOver() {
        this.state = 'gameOver';
        this.dino.die();
        this.score.setHighScore();
        this.sound.playGameOver();
    }

    update(deltaTime) {
        if (this.state !== 'running') return;

        // 计算时间因子 (标准化到60FPS)
        const timeFactor = deltaTime / (1000 / 60);

        // 更新速度
        if (this.speed < this.maxSpeed) {
            this.speed += this.speedIncrement * timeFactor;
        }

        // 更新无敌计时器
        if (this.isInvincible) {
            this.invincibleTimer += deltaTime;
            if (this.invincibleTimer >= this.invincibleDuration) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }

        // 更新游戏对象
        this.dino.update(timeFactor);
        this.ground.update(this.speed, timeFactor);
        this.cloudManager.update(this.speed, timeFactor);
        this.obstacleManager.update(this.speed, timeFactor, this.score.getScore());
        this.coinManager.update(this.speed, timeFactor);

        // 更新天体（日月运动）并响应昼夜切换
        const nightToggled = this.nightSky.update(this.speed, timeFactor);
        if (nightToggled) {
            if (Sprite.isNight) {
                document.body.classList.add('night-mode');
            } else {
                document.body.classList.remove('night-mode');
            }
        }

        // 更新分数
        const milestone = this.score.update(timeFactor);
        if (milestone) {
            this.sound.playScore();
        }

        // 金币收集检测
        const collected = this.coinManager.checkCollection(this.dino.getHitbox());
        if (collected > 0) {
            this.sound.playCoin();
            this.coins += collected;
            if (this.coins >= this.coinsForLife) {
                this.coins -= this.coinsForLife;
                if (this.lives < this.maxLives) {
                    // 未满血：加一条命
                    this.lives++;
                    this.sound.playExtraLife();
                } else {
                    // 满血：奖励5秒无敌（timer从负值开始，走完5000ms）
                    this.isInvincible = true;
                    this.invincibleTimer = this.invincibleDuration - 5000; // -3000ms → 倒数5秒
                    this.sound.playExtraLife();
                }
            }
        }

        // 碰撞检测（无敌期间跳过）
        if (!this.isInvincible && this.obstacleManager.checkCollision(this.dino.getHitbox())) {
            this.hitObstacle();
        }
    }

    draw() {
        const scale = Sprite.uiScale;

        // 绘制天空渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, Sprite.getColor('skyTop'));
        gradient.addColorStop(1, Sprite.getColor('skyBottom'));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制天空装饰 (太阳/月亮/星星)
        this.nightSky.draw(this.ctx);

        // 绘制云朵
        this.cloudManager.draw(this.ctx);

        // 绘制地面
        this.ground.draw(this.ctx);

        // 绘制障碍物
        this.obstacleManager.draw(this.ctx);

        // 绘制金币
        this.coinManager.draw(this.ctx);

        // 绘制恐龙（无敌时闪烁）
        if (this.isInvincible) {
            const flashOn = Math.floor(this.invincibleTimer / 150) % 2 === 0;
            this.ctx.globalAlpha = flashOn ? 1.0 : 0.25;
        }
        this.dino.draw(this.ctx);
        this.ctx.globalAlpha = 1.0;

        // 绘制分数
        if (this.state !== 'waiting') {
            this.score.draw(this.ctx, this.width - 20, 30);
        }

        // 绘制生命值和金币 UI（等待阶段隐藏）
        if (this.state !== 'waiting') {
            const heartSize = Math.floor(14 * scale);
            const heartGap = Math.floor(4 * scale);

            // 生命值（爱心）
            for (let i = 0; i < this.maxLives; i++) {
                Sprite.drawHeart(this.ctx, 15 + i * (heartSize + heartGap), 10, heartSize, i < this.lives);
            }

            // 金币计数
            const coinSize = Math.floor(12 * scale);
            const coinUIY = 10 + heartSize + 6;
            Sprite.drawCoin(this.ctx, 15, coinUIY, coinSize);
            this.ctx.fillStyle = Sprite.getColor('text');
            const coinFontSize = Math.floor(13 * scale);
            this.ctx.font = `bold ${coinFontSize}px Courier New`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${this.coins}/${this.coinsForLife}`, 15 + coinSize + 4, coinUIY + coinSize - 1);
        }

        // 绘制状态相关 UI
        if (this.state === 'waiting') {
            Sprite.drawStartHint(this.ctx, this.width / 2, this.height / 2 + 20);
        } else if (this.state === 'gameOver') {
            Sprite.drawGameOver(this.ctx, this.width / 2, this.height / 2 - 20);
            Sprite.drawRestartButton(this.ctx, this.width / 2, this.height / 2 + 20);
        }

        // 调试模式: 绘制碰撞盒
        if (this.debug) {
            this.dino.drawHitbox(this.ctx);
            this.obstacleManager.drawHitboxes(this.ctx);
            if (this.coinManager.drawHitboxes) this.coinManager.drawHitboxes(this.ctx);
        }
    }

    gameLoop(timestamp) {
        // 计算 delta time (毫秒)
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // 限制 deltaTime 避免极端情况 (例如标签页切换)
        const clampedDeltaTime = Math.min(deltaTime, 100);

        this.update(clampedDeltaTime);
        this.draw();

        requestAnimationFrame(this.gameLoop);
    }

    // 切换调试模式
    toggleDebug() {
        this.debug = !this.debug;
        console.log('Debug mode:', this.debug);
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    // 暴露到全局用于调试
    window.game = game;

    // 按 D 键切换调试模式
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyD' && e.shiftKey) {
            game.toggleDebug();
        }
    });
});
