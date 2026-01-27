// dino.js - 恐龙角色类

class Dino {
    constructor(groundY) {
        this.x = 50;
        this.groundY = groundY;
        this.y = this.groundY;

        // 尺寸
        this.width = 50;
        this.height = 47;
        this.duckWidth = 60;
        this.duckHeight = 30;

        // 物理参数
        this.velocityY = 0;
        this.gravity = 0.6;
        this.jumpForce = -12;

        // 状态
        this.state = 'standing'; // standing, running, jumping, ducking, dead
        this.isOnGround = true;

        // 动画
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 6; // 帧数间隔

        // 碰撞盒 (相对于 x, y 的偏移)
        this.hitbox = {
            x: 10,
            y: 5,
            width: 35,
            height: 40
        };

        this.duckHitbox = {
            x: 5,
            y: 20,
            width: 50,
            height: 25
        };
    }

    jump() {
        if (this.isOnGround && this.state !== 'dead') {
            this.velocityY = this.jumpForce;
            this.isOnGround = false;
            this.state = 'jumping';
            return true; // 返回 true 表示成功跳跃，用于播放音效
        }
        return false;
    }

    duck(isDucking) {
        if (this.state === 'dead') return;

        if (isDucking && this.isOnGround) {
            this.state = 'ducking';
        } else if (!isDucking && this.state === 'ducking') {
            this.state = 'running';
        }

        // 如果在空中按下，加速下落
        if (isDucking && !this.isOnGround) {
            this.velocityY += 0.5;
        }
    }

    die() {
        this.state = 'dead';
    }

    reset() {
        this.y = this.groundY;
        this.velocityY = 0;
        this.state = 'standing';
        this.isOnGround = true;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    start() {
        if (this.state === 'standing') {
            this.state = 'running';
        }
    }

    update() {
        if (this.state === 'dead') return;

        // 重力
        if (!this.isOnGround) {
            this.velocityY += this.gravity;
            this.y += this.velocityY;

            // 落地检测
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.velocityY = 0;
                this.isOnGround = true;
                if (this.state === 'jumping') {
                    this.state = 'running';
                }
            }
        }

        // 更新动画
        if (this.state === 'running' || this.state === 'ducking') {
            this.animTimer++;
            if (this.animTimer >= this.animSpeed) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 2;
            }
        }
    }

    draw(ctx) {
        const drawX = this.x;
        const drawY = this.y;

        switch (this.state) {
            case 'standing':
                Sprite.drawDinoStand(ctx, drawX, drawY);
                break;
            case 'running':
                if (this.animFrame === 0) {
                    Sprite.drawDinoRun1(ctx, drawX, drawY);
                } else {
                    Sprite.drawDinoRun2(ctx, drawX, drawY);
                }
                break;
            case 'jumping':
                Sprite.drawDinoJump(ctx, drawX, drawY);
                break;
            case 'ducking':
                if (this.animFrame === 0) {
                    Sprite.drawDinoDuck1(ctx, drawX, drawY);
                } else {
                    Sprite.drawDinoDuck2(ctx, drawX, drawY);
                }
                break;
            case 'dead':
                Sprite.drawDinoDead(ctx, drawX, drawY);
                break;
        }
    }

    getHitbox() {
        if (this.state === 'ducking') {
            return {
                x: this.x + this.duckHitbox.x,
                y: this.y + this.duckHitbox.y,
                width: this.duckHitbox.width,
                height: this.duckHitbox.height
            };
        }
        return {
            x: this.x + this.hitbox.x,
            y: this.y + this.hitbox.y,
            width: this.hitbox.width,
            height: this.hitbox.height
        };
    }

    // 调试: 绘制碰撞盒
    drawHitbox(ctx) {
        const hb = this.getHitbox();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
    }
}
