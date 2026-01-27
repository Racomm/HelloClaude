// ground.js - 地面和云朵类

class Ground {
    constructor(canvasWidth, y) {
        this.canvasWidth = canvasWidth;
        this.y = y;
        this.x = 0;
        this.speed = 6;
    }

    update(speed) {
        this.speed = speed;
        this.x -= this.speed;

        // 循环地面
        if (this.x <= -this.canvasWidth) {
            this.x = 0;
        }
    }

    draw(ctx) {
        // 绘制两段地面实现无缝循环
        Sprite.drawGround(ctx, this.x, this.y, this.canvasWidth + 20);
        Sprite.drawGround(ctx, this.x + this.canvasWidth, this.y, this.canvasWidth + 20);
    }

    reset() {
        this.x = 0;
    }
}

class Cloud {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 1; // 云朵移动较慢
    }

    update(gameSpeed) {
        // 云朵以游戏速度的 1/6 移动
        this.x -= this.speed + gameSpeed * 0.15;
    }

    draw(ctx) {
        Sprite.drawCloud(ctx, this.x, this.y);
    }

    isOffScreen() {
        return this.x < -50;
    }
}

class CloudManager {
    constructor(canvasWidth) {
        this.canvasWidth = canvasWidth;
        this.clouds = [];
        this.minGap = 200;
        this.maxGap = 400;
        this.nextCloudX = 100;
    }

    update(gameSpeed) {
        // 更新所有云朵
        this.clouds.forEach(cloud => cloud.update(gameSpeed));

        // 移除屏幕外的云朵
        this.clouds = this.clouds.filter(cloud => !cloud.isOffScreen());

        // 生成新云朵
        if (this.clouds.length === 0 ||
            this.clouds[this.clouds.length - 1].x < this.canvasWidth - this.nextCloudX) {
            this.spawnCloud();
            this.nextCloudX = this.minGap + Math.random() * (this.maxGap - this.minGap);
        }
    }

    spawnCloud() {
        const y = 20 + Math.random() * 60; // 随机高度
        const cloud = new Cloud(this.canvasWidth + 50, y);
        this.clouds.push(cloud);
    }

    draw(ctx) {
        this.clouds.forEach(cloud => cloud.draw(ctx));
    }

    reset() {
        this.clouds = [];
        this.nextCloudX = 100;
    }
}

// 夜间模式装饰 - 星星和月亮
class NightSky {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.stars = [];
        this.moonX = canvasWidth - 80;
        this.moonY = 30;

        // 生成随机星星
        this.generateStars();
    }

    generateStars() {
        this.stars = [];
        const numStars = 15 + Math.floor(Math.random() * 10);

        for (let i = 0; i < numStars; i++) {
            this.stars.push({
                x: Math.random() * this.canvasWidth,
                y: 10 + Math.random() * 80,
                size: 1 + Math.floor(Math.random() * 2),
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    update(gameSpeed) {
        // 星星和月亮缓慢移动
        this.moonX -= gameSpeed * 0.05;
        if (this.moonX < -40) {
            this.moonX = this.canvasWidth + 40;
        }

        this.stars.forEach(star => {
            star.x -= gameSpeed * 0.03;
            star.twinkle += 0.1;
            if (star.x < -5) {
                star.x = this.canvasWidth + 5;
            }
        });
    }

    draw(ctx) {
        // 绘制月亮
        Sprite.drawMoon(ctx, this.moonX, this.moonY);

        // 绘制星星 (带闪烁效果)
        this.stars.forEach(star => {
            const alpha = 0.5 + 0.5 * Math.sin(star.twinkle);
            ctx.globalAlpha = alpha;
            Sprite.drawStar(ctx, star.x, star.y, star.size);
        });
        ctx.globalAlpha = 1;
    }

    reset() {
        this.moonX = this.canvasWidth - 80;
        this.generateStars();
    }
}
