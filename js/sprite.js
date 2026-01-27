// sprite.js - 使用 Canvas 绘制所有游戏精灵

const Sprite = {
    // 颜色配置
    colors: {
        day: {
            dino: '#535353',
            cactus: '#535353',
            bird: '#535353',
            ground: '#535353',
            cloud: '#c4c4c4',
            text: '#535353',
            background: '#ffffff'
        },
        night: {
            dino: '#c4c4c4',
            cactus: '#c4c4c4',
            bird: '#c4c4c4',
            ground: '#c4c4c4',
            cloud: '#555555',
            text: '#c4c4c4',
            background: '#1a1a1a'
        }
    },

    isNight: false,

    getColor(type) {
        return this.isNight ? this.colors.night[type] : this.colors.day[type];
    },

    // 绘制恐龙 - 站立状态
    drawDinoStand(ctx, x, y) {
        const color = this.getColor('dino');
        ctx.fillStyle = color;

        // 身体
        ctx.fillRect(x + 15, y + 10, 25, 25);

        // 头部
        ctx.fillRect(x + 25, y, 20, 15);

        // 眼睛 (白色)
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 37, y + 4, 5, 5);

        ctx.fillStyle = color;

        // 腿
        ctx.fillRect(x + 18, y + 35, 6, 12);
        ctx.fillRect(x + 30, y + 35, 6, 12);

        // 手臂
        ctx.fillRect(x + 10, y + 15, 8, 5);

        // 尾巴
        ctx.fillRect(x, y + 15, 15, 8);
        ctx.fillRect(x - 5, y + 18, 8, 5);
    },

    // 绘制恐龙 - 奔跑动画帧1
    drawDinoRun1(ctx, x, y) {
        const color = this.getColor('dino');
        ctx.fillStyle = color;

        // 身体
        ctx.fillRect(x + 15, y + 10, 25, 25);

        // 头部
        ctx.fillRect(x + 25, y, 20, 15);

        // 眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 37, y + 4, 5, 5);

        ctx.fillStyle = color;

        // 腿 - 动画帧1 (左腿前右腿后)
        ctx.fillRect(x + 18, y + 35, 6, 12);
        ctx.fillRect(x + 33, y + 35, 6, 8);

        // 手臂
        ctx.fillRect(x + 10, y + 15, 8, 5);

        // 尾巴
        ctx.fillRect(x, y + 15, 15, 8);
        ctx.fillRect(x - 5, y + 18, 8, 5);
    },

    // 绘制恐龙 - 奔跑动画帧2
    drawDinoRun2(ctx, x, y) {
        const color = this.getColor('dino');
        ctx.fillStyle = color;

        // 身体
        ctx.fillRect(x + 15, y + 10, 25, 25);

        // 头部
        ctx.fillRect(x + 25, y, 20, 15);

        // 眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 37, y + 4, 5, 5);

        ctx.fillStyle = color;

        // 腿 - 动画帧2 (右腿前左腿后)
        ctx.fillRect(x + 18, y + 35, 6, 8);
        ctx.fillRect(x + 33, y + 35, 6, 12);

        // 手臂
        ctx.fillRect(x + 10, y + 15, 8, 5);

        // 尾巴
        ctx.fillRect(x, y + 15, 15, 8);
        ctx.fillRect(x - 5, y + 18, 8, 5);
    },

    // 绘制恐龙 - 跳跃状态
    drawDinoJump(ctx, x, y) {
        this.drawDinoStand(ctx, x, y);
    },

    // 绘制恐龙 - 下蹲动画帧1
    drawDinoDuck1(ctx, x, y) {
        const color = this.getColor('dino');
        ctx.fillStyle = color;

        // 扁平身体
        ctx.fillRect(x, y + 25, 50, 15);

        // 头部
        ctx.fillRect(x + 35, y + 17, 20, 12);

        // 眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 47, y + 21, 5, 5);

        ctx.fillStyle = color;

        // 腿
        ctx.fillRect(x + 10, y + 40, 6, 7);
        ctx.fillRect(x + 35, y + 40, 6, 4);

        // 尾巴
        ctx.fillRect(x - 10, y + 28, 12, 6);
    },

    // 绘制恐龙 - 下蹲动画帧2
    drawDinoDuck2(ctx, x, y) {
        const color = this.getColor('dino');
        ctx.fillStyle = color;

        // 扁平身体
        ctx.fillRect(x, y + 25, 50, 15);

        // 头部
        ctx.fillRect(x + 35, y + 17, 20, 12);

        // 眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 47, y + 21, 5, 5);

        ctx.fillStyle = color;

        // 腿
        ctx.fillRect(x + 10, y + 40, 6, 4);
        ctx.fillRect(x + 35, y + 40, 6, 7);

        // 尾巴
        ctx.fillRect(x - 10, y + 28, 12, 6);
    },

    // 绘制恐龙 - 死亡状态
    drawDinoDead(ctx, x, y) {
        const color = this.getColor('dino');
        ctx.fillStyle = color;

        // 身体
        ctx.fillRect(x + 15, y + 10, 25, 25);

        // 头部
        ctx.fillRect(x + 25, y, 20, 15);

        // X眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 37, y + 4, 5, 5);
        ctx.fillStyle = color;
        ctx.fillRect(x + 38, y + 5, 1, 3);
        ctx.fillRect(x + 40, y + 5, 1, 3);
        ctx.fillRect(x + 37, y + 6, 5, 1);

        // 腿
        ctx.fillRect(x + 18, y + 35, 6, 12);
        ctx.fillRect(x + 30, y + 35, 6, 12);

        // 手臂
        ctx.fillRect(x + 10, y + 15, 8, 5);

        // 尾巴
        ctx.fillRect(x, y + 15, 15, 8);
        ctx.fillRect(x - 5, y + 18, 8, 5);
    },

    // 绘制小仙人掌
    drawCactusSmall(ctx, x, y) {
        const color = this.getColor('cactus');
        ctx.fillStyle = color;

        // 主干
        ctx.fillRect(x + 5, y, 10, 35);

        // 左枝
        ctx.fillRect(x, y + 10, 5, 15);
        ctx.fillRect(x, y + 5, 5, 5);

        // 右枝
        ctx.fillRect(x + 15, y + 15, 5, 12);
        ctx.fillRect(x + 15, y + 10, 5, 5);
    },

    // 绘制大仙人掌
    drawCactusLarge(ctx, x, y) {
        const color = this.getColor('cactus');
        ctx.fillStyle = color;

        // 主干
        ctx.fillRect(x + 8, y, 14, 50);

        // 左枝
        ctx.fillRect(x, y + 15, 8, 20);
        ctx.fillRect(x, y + 5, 8, 10);

        // 右枝
        ctx.fillRect(x + 22, y + 20, 8, 18);
        ctx.fillRect(x + 22, y + 12, 8, 8);
    },

    // 绘制组合仙人掌 (2个)
    drawCactusGroup(ctx, x, y) {
        this.drawCactusSmall(ctx, x, y + 15);
        this.drawCactusLarge(ctx, x + 25, y);
    },

    // 绘制飞鸟 - 翅膀向上
    drawBirdUp(ctx, x, y) {
        const color = this.getColor('bird');
        ctx.fillStyle = color;

        // 身体
        ctx.fillRect(x + 5, y + 15, 35, 10);

        // 头部
        ctx.fillRect(x + 35, y + 12, 10, 12);

        // 嘴
        ctx.fillRect(x + 45, y + 17, 8, 4);

        // 眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 40, y + 14, 3, 3);

        ctx.fillStyle = color;

        // 尾巴
        ctx.fillRect(x, y + 13, 8, 5);
        ctx.fillRect(x - 3, y + 11, 5, 3);

        // 翅膀向上
        ctx.fillRect(x + 15, y, 15, 15);
        ctx.fillRect(x + 18, y - 5, 10, 5);
    },

    // 绘制飞鸟 - 翅膀向下
    drawBirdDown(ctx, x, y) {
        const color = this.getColor('bird');
        ctx.fillStyle = color;

        // 身体
        ctx.fillRect(x + 5, y + 15, 35, 10);

        // 头部
        ctx.fillRect(x + 35, y + 12, 10, 12);

        // 嘴
        ctx.fillRect(x + 45, y + 17, 8, 4);

        // 眼睛
        ctx.fillStyle = this.isNight ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(x + 40, y + 14, 3, 3);

        ctx.fillStyle = color;

        // 尾巴
        ctx.fillRect(x, y + 13, 8, 5);
        ctx.fillRect(x - 3, y + 11, 5, 3);

        // 翅膀向下
        ctx.fillRect(x + 15, y + 25, 15, 12);
        ctx.fillRect(x + 18, y + 37, 10, 5);
    },

    // 绘制云朵
    drawCloud(ctx, x, y) {
        const color = this.getColor('cloud');
        ctx.fillStyle = color;

        ctx.fillRect(x, y + 5, 45, 10);
        ctx.fillRect(x + 5, y, 15, 5);
        ctx.fillRect(x + 25, y + 2, 12, 3);
    },

    // 绘制地面
    drawGround(ctx, x, y, width) {
        const color = this.getColor('ground');
        ctx.fillStyle = color;

        // 主线
        ctx.fillRect(x, y, width, 2);

        // 随机小石子
        const seed = Math.floor(x / 3);
        for (let i = 0; i < width; i += 15) {
            const rand = ((seed + i) * 9301 + 49297) % 233280;
            const h = (rand / 233280) * 4;
            if (h > 2) {
                ctx.fillRect(x + i, y + 4 + Math.floor(h), 2, 2);
            }
            if (h > 1 && h < 3) {
                ctx.fillRect(x + i + 7, y + 6, 1, 1);
            }
        }
    },

    // 绘制星星 (夜间模式)
    drawStar(ctx, x, y, size) {
        if (!this.isNight) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, size, size);
    },

    // 绘制月亮 (夜间模式)
    drawMoon(ctx, x, y) {
        if (!this.isNight) return;
        ctx.fillStyle = '#ffffff';

        // 月亮主体
        ctx.beginPath();
        ctx.arc(x + 15, y + 15, 15, 0, Math.PI * 2);
        ctx.fill();

        // 月球坑
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 20, y + 18, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, y + 22, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    // 绘制 "GAME OVER" 文字
    drawGameOver(ctx, x, y) {
        ctx.fillStyle = this.getColor('text');
        ctx.font = 'bold 24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', x, y);
    },

    // 绘制重新开始按钮
    drawRestartButton(ctx, x, y) {
        const color = this.getColor('text');
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // 圆形箭头
        ctx.beginPath();
        ctx.arc(x, y, 15, 0.5, Math.PI * 1.7);
        ctx.stroke();

        // 箭头尖
        ctx.beginPath();
        ctx.moveTo(x + 10, y - 12);
        ctx.lineTo(x + 15, y - 5);
        ctx.lineTo(x + 5, y - 5);
        ctx.closePath();
        ctx.fill();
    },

    // 绘制 "Press Space to Start" 提示
    drawStartHint(ctx, x, y) {
        ctx.fillStyle = this.getColor('text');
        ctx.font = '16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE or Click to Start', x, y);
    }
};
