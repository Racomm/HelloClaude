// obstacle.js - 障碍物类

// 障碍物类型定义
const ObstacleType = {
    CACTUS_SMALL: 'cactus_small',
    CACTUS_LARGE: 'cactus_large',
    CACTUS_GROUP: 'cactus_group',
    BIRD: 'bird'
};

// 飞鸟高度定义
const BirdHeight = {
    LOW: 'low',    // 需要跳跃
    MEDIUM: 'medium', // 可以跳跃或下蹲
    HIGH: 'high'   // 可以直接通过或下蹲
};

class Obstacle {
    constructor(type, x, groundY) {
        this.type = type;
        this.x = x;
        this.groundY = groundY;

        // 根据类型设置尺寸和位置
        this.setupByType();

        // 飞鸟动画
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 8;
    }

    setupByType() {
        switch (this.type) {
            case ObstacleType.CACTUS_SMALL:
                this.width = 20;
                this.height = 35;
                this.y = this.groundY - this.height + 2;
                this.hitbox = { x: 2, y: 0, width: 16, height: 35 };
                break;

            case ObstacleType.CACTUS_LARGE:
                this.width = 30;
                this.height = 50;
                this.y = this.groundY - this.height + 2;
                this.hitbox = { x: 3, y: 0, width: 24, height: 50 };
                break;

            case ObstacleType.CACTUS_GROUP:
                this.width = 55;
                this.height = 50;
                this.y = this.groundY - this.height + 2;
                this.hitbox = { x: 0, y: 0, width: 55, height: 50 };
                break;

            case ObstacleType.BIRD:
                this.width = 53;
                this.height = 40;
                this.birdHeight = this.getRandomBirdHeight();
                this.y = this.getBirdY();
                this.hitbox = { x: 5, y: 12, width: 43, height: 18 };
                break;
        }
    }

    getRandomBirdHeight() {
        const rand = Math.random();
        if (rand < 0.4) return BirdHeight.LOW;
        if (rand < 0.7) return BirdHeight.MEDIUM;
        return BirdHeight.HIGH;
    }

    getBirdY() {
        switch (this.birdHeight) {
            case BirdHeight.LOW:
                return this.groundY - 30; // 低飞 - 必须跳跃
            case BirdHeight.MEDIUM:
                return this.groundY - 55; // 中等 - 跳跃或下蹲
            case BirdHeight.HIGH:
                return this.groundY - 80; // 高飞 - 直接通过或下蹲
            default:
                return this.groundY - 30;
        }
    }

    update(speed, timeFactor) {
        this.x -= speed * timeFactor;

        // 飞鸟动画更新
        if (this.type === ObstacleType.BIRD) {
            this.animTimer += timeFactor;
            if (this.animTimer >= this.animSpeed) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 2;
            }
        }
    }

    draw(ctx) {
        switch (this.type) {
            case ObstacleType.CACTUS_SMALL:
                Sprite.drawCactusSmall(ctx, this.x, this.y);
                break;

            case ObstacleType.CACTUS_LARGE:
                Sprite.drawCactusLarge(ctx, this.x, this.y);
                break;

            case ObstacleType.CACTUS_GROUP:
                Sprite.drawCactusGroup(ctx, this.x, this.y);
                break;

            case ObstacleType.BIRD:
                if (this.animFrame === 0) {
                    Sprite.drawBirdUp(ctx, this.x, this.y);
                } else {
                    Sprite.drawBirdDown(ctx, this.x, this.y);
                }
                break;
        }
    }

    getHitbox() {
        return {
            x: this.x + this.hitbox.x,
            y: this.y + this.hitbox.y,
            width: this.hitbox.width,
            height: this.hitbox.height
        };
    }

    isOffScreen() {
        return this.x < -this.width - 10;
    }

    // 调试: 绘制碰撞盒
    drawHitbox(ctx) {
        const hb = this.getHitbox();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
    }
}

class ObstacleManager {
    constructor(canvasWidth, groundY) {
        this.canvasWidth = canvasWidth;
        this.groundY = groundY;
        this.obstacles = [];

        // 生成参数
        this.minGap = 300;
        this.maxGap = 600;
        this.lastObstacleX = canvasWidth;

        // 飞鸟出现的最低分数
        this.birdScoreThreshold = 200;
        this.currentScore = 0;
    }

    update(speed, timeFactor, score) {
        this.currentScore = score;

        // 更新所有障碍物
        this.obstacles.forEach(obs => obs.update(speed, timeFactor));

        // 移除屏幕外的障碍物
        this.obstacles = this.obstacles.filter(obs => !obs.isOffScreen());

        // 更新最后障碍物位置
        if (this.obstacles.length > 0) {
            this.lastObstacleX = Math.max(...this.obstacles.map(o => o.x));
        } else {
            this.lastObstacleX = 0;
        }

        // 生成新障碍物
        this.trySpawnObstacle(speed);
    }

    trySpawnObstacle(speed) {
        // 根据速度调整间隔
        const speedFactor = Math.max(0.7, 1 - (speed - 6) * 0.05);
        const minGap = this.minGap * speedFactor;
        const maxGap = this.maxGap * speedFactor;

        const gap = minGap + Math.random() * (maxGap - minGap);

        if (this.lastObstacleX < this.canvasWidth - gap) {
            this.spawnObstacle();
        }
    }

    spawnObstacle() {
        const type = this.getRandomType();
        const obstacle = new Obstacle(type, this.canvasWidth + 50, this.groundY);
        this.obstacles.push(obstacle);
        this.lastObstacleX = this.canvasWidth + 50;
    }

    getRandomType() {
        // 如果分数足够高，有机会出现飞鸟
        const canSpawnBird = this.currentScore >= this.birdScoreThreshold;

        const rand = Math.random();

        if (canSpawnBird && rand < 0.25) {
            return ObstacleType.BIRD;
        } else if (rand < 0.5) {
            return ObstacleType.CACTUS_SMALL;
        } else if (rand < 0.8) {
            return ObstacleType.CACTUS_LARGE;
        } else {
            return ObstacleType.CACTUS_GROUP;
        }
    }

    draw(ctx) {
        this.obstacles.forEach(obs => obs.draw(ctx));
    }

    // 碰撞检测
    checkCollision(dinoHitbox) {
        for (const obs of this.obstacles) {
            const obsHitbox = obs.getHitbox();
            if (this.isColliding(dinoHitbox, obsHitbox)) {
                return true;
            }
        }
        return false;
    }

    isColliding(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    reset() {
        this.obstacles = [];
        this.lastObstacleX = this.canvasWidth;
        this.currentScore = 0;
    }

    // 调试: 绘制所有碰撞盒
    drawHitboxes(ctx) {
        this.obstacles.forEach(obs => obs.drawHitbox(ctx));
    }
}

// ---- 金币系统 ----

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 16;
        this.collected = false;
        this.animTimer = 0;
    }

    update(speed, timeFactor) {
        this.x -= speed * timeFactor;
        this.animTimer += timeFactor;
    }

    draw(ctx) {
        if (this.collected) return;
        // 轻微上下漂浮
        const bob = Math.sin(this.animTimer * 0.12) * 3;
        Sprite.drawCoin(ctx, this.x, this.y + bob, this.size);
    }

    getHitbox() {
        return { x: this.x - 2, y: this.y - 4, width: this.size + 4, height: this.size + 8 };
    }

    isOffScreen() {
        return this.x < -this.size - 10;
    }
}

class CoinManager {
    constructor(canvasWidth, groundY) {
        this.canvasWidth = canvasWidth;
        this.groundY = groundY;
        this.coins = [];
        this.nextSpawnGap = 300;
        this.lastCoinX = 0;
        this.minGap = 180;
        this.maxGap = 350;
    }

    update(speed, timeFactor) {
        this.coins.forEach(c => c.update(speed, timeFactor));
        this.coins = this.coins.filter(c => !c.isOffScreen() && !c.collected);

        const lastX = this.coins.length > 0
            ? Math.max(...this.coins.map(c => c.x))
            : 0;

        if (lastX < this.canvasWidth - this.nextSpawnGap) {
            this.spawnCoin();
            this.nextSpawnGap = this.minGap + Math.random() * (this.maxGap - this.minGap);
        }
    }

    spawnCoin() {
        const rand = Math.random();
        let y;
        if (rand < 0.5) {
            y = this.groundY - 22;       // 地面层：奔跑即可收集
        } else if (rand < 0.8) {
            y = this.groundY - 58;       // 低空：小跳可收集
        } else {
            y = this.groundY - 92;       // 高空：需完整跳跃
        }
        this.coins.push(new Coin(this.canvasWidth + 30, y));
    }

    checkCollection(dinoHitbox) {
        let count = 0;
        for (const coin of this.coins) {
            if (coin.collected) continue;
            const ch = coin.getHitbox();
            if (dinoHitbox.x < ch.x + ch.width &&
                dinoHitbox.x + dinoHitbox.width > ch.x &&
                dinoHitbox.y < ch.y + ch.height &&
                dinoHitbox.y + dinoHitbox.height > ch.y) {
                coin.collected = true;
                count++;
            }
        }
        return count;
    }

    draw(ctx) {
        this.coins.forEach(c => c.draw(ctx));
    }

    reset() {
        this.coins = [];
        this.nextSpawnGap = 300;
    }

    drawHitboxes(ctx) {
        this.coins.forEach(c => {
            const h = c.getHitbox();
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 1;
            ctx.strokeRect(h.x, h.y, h.width, h.height);
        });
    }
}
