// score.js - 分数系统

class Score {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.displayScore = 0; // 用于动画显示

        // 闪烁效果
        this.isFlashing = false;
        this.flashTimer = 0;
        this.flashDuration = 16; // 闪烁持续帧数
        this.flashInterval = 4;  // 闪烁间隔帧数
        this.lastMilestone = 0;

        // 分数递增速度
        this.scorePerFrame = 0.15;
    }

    update() {
        // 更新分数
        this.score += this.scorePerFrame;

        // 平滑显示
        if (this.displayScore < Math.floor(this.score)) {
            this.displayScore = Math.floor(this.score);
        }

        // 检查里程碑 (每100分)
        const milestone = Math.floor(this.score / 100) * 100;
        if (milestone > this.lastMilestone && milestone > 0) {
            this.lastMilestone = milestone;
            this.triggerFlash();
            return true; // 返回 true 表示达到里程碑，用于播放音效
        }

        // 更新闪烁
        if (this.isFlashing) {
            this.flashTimer++;
            if (this.flashTimer >= this.flashDuration) {
                this.isFlashing = false;
                this.flashTimer = 0;
            }
        }

        return false;
    }

    triggerFlash() {
        this.isFlashing = true;
        this.flashTimer = 0;
    }

    draw(ctx, x, y) {
        // 判断是否显示 (闪烁效果)
        const shouldShow = !this.isFlashing ||
            Math.floor(this.flashTimer / this.flashInterval) % 2 === 0;

        if (!shouldShow) return;

        ctx.fillStyle = Sprite.getColor('text');
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'right';

        // 格式化分数 (5位数，前面补0)
        const scoreText = String(Math.floor(this.displayScore)).padStart(5, '0');

        // 绘制当前分数
        ctx.fillText(scoreText, x, y);

        // 绘制最高分
        if (this.highScore > 0) {
            ctx.fillStyle = Sprite.getColor('text');
            ctx.globalAlpha = 0.7;
            ctx.fillText('HI ' + String(this.highScore).padStart(5, '0'), x - 80, y);
            ctx.globalAlpha = 1;
        }
    }

    getScore() {
        return Math.floor(this.score);
    }

    setHighScore() {
        const currentScore = Math.floor(this.score);
        if (currentScore > this.highScore) {
            this.highScore = currentScore;
            this.saveHighScore();
            return true;
        }
        return false;
    }

    loadHighScore() {
        try {
            const saved = localStorage.getItem('dinoHighScore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    saveHighScore() {
        try {
            localStorage.setItem('dinoHighScore', this.highScore.toString());
        } catch (e) {
            // localStorage 不可用时忽略
        }
    }

    reset() {
        this.score = 0;
        this.displayScore = 0;
        this.isFlashing = false;
        this.flashTimer = 0;
        this.lastMilestone = 0;
    }
}
