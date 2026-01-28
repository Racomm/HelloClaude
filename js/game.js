// game.js - 游戏主控制类

class Game {
    constructor() {
        // Canvas 设置
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 游戏尺寸 (增加视野范围)
        this.width = 1200;  // 从 800 增加到 1200
        this.height = 400;  // 从 200 增加到 400
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 地面位置
        this.groundY = this.height - 50;

        // 游戏状态
        this.state = 'waiting'; // waiting, running, gameOver
        this.debug = false; // 调试模式

        // 速度和难度 (单位: 像素/帧 at 60FPS)
        this.baseSpeed = 6;
        this.speed = this.baseSpeed;
        this.maxSpeed = 13;
        this.speedIncrement = 0.001;

        // 昼夜切换
        this.isNight = false;
        this.nightThreshold = 700; // 每700分切换一次
        this.lastNightToggle = 0;

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
            this.handleClick();
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
        // 响应式调整
        const maxWidth = Math.min(this.width, window.innerWidth - 20);
        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = (maxWidth * this.height / this.width) + 'px';
    }

    startGame() {
        this.state = 'running';
        this.dino.start();
    }

    restartGame() {
        this.state = 'running';
        this.speed = this.baseSpeed;
        this.isNight = false;
        this.lastNightToggle = 0;
        Sprite.isNight = false;
        document.body.classList.remove('night-mode');

        this.dino.reset();
        this.ground.reset();
        this.cloudManager.reset();
        this.obstacleManager.reset();
        this.score.reset();
        this.nightSky.reset();

        this.dino.start();
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

        // 更新游戏对象
        this.dino.update(timeFactor);
        this.ground.update(this.speed, timeFactor);
        this.cloudManager.update(this.speed, timeFactor);
        this.obstacleManager.update(this.speed, timeFactor, this.score.getScore());
        this.nightSky.update(this.speed, timeFactor);

        // 更新分数
        const milestone = this.score.update(timeFactor);
        if (milestone) {
            this.sound.playScore();
        }

        // 昼夜切换检查
        this.checkNightToggle();

        // 碰撞检测
        if (this.obstacleManager.checkCollision(this.dino.getHitbox())) {
            this.gameOver();
        }
    }

    checkNightToggle() {
        const currentScore = this.score.getScore();
        const toggleCount = Math.floor(currentScore / this.nightThreshold);

        if (toggleCount > this.lastNightToggle) {
            this.lastNightToggle = toggleCount;
            this.isNight = !this.isNight;
            Sprite.isNight = this.isNight;

            if (this.isNight) {
                document.body.classList.add('night-mode');
            } else {
                document.body.classList.remove('night-mode');
            }
        }
    }

    draw() {
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

        // 绘制恐龙
        this.dino.draw(this.ctx);

        // 绘制分数
        if (this.state !== 'waiting') {
            this.score.draw(this.ctx, this.width - 20, 30);
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
