// sound.js - 使用 Web Audio API 生成音效

class Sound {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // 恢复音频上下文 (需要用户交互后才能播放)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 跳跃音效 - 上升的短促音
    playJump() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 得分音效 - 两个连续的高音
    playScore() {
        if (!this.enabled || !this.audioContext) return;

        const playNote = (freq, delay) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + delay);

            gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.08);

            oscillator.start(this.audioContext.currentTime + delay);
            oscillator.stop(this.audioContext.currentTime + delay + 0.08);
        };

        playNote(523, 0);      // C5
        playNote(659, 0.1);    // E5
    }

    // 游戏结束音效 - 下降的低音
    playGameOver() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
