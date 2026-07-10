/**
 * rng-shared.js — 揭示动画共享工具
 * 提供 Pt 粒子工厂、Canvas overlay 创建、音频 re-export
 * 所有揭示模块通过此文件共享基础能力
 */

export { playDrone, playImpact, playChime, playRipple, playHackBreach, silenceAll, resumeAudio, initAudio }
    from './rng-audio.js?v=260707n';
export { fmt, POOL, LUCK_LEVELS, SPIN_MS, FRAMES }
    from './rng-config.js?v=260708a';

/**
 * Canvas 2D 粒子工厂
 * @param {Function} stateFn — () => ({ W, H, CX, CY, ehR? }) 动态取当前画布尺寸
 */
export function createPtClass(stateFn) {
    return class Pt {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.vx = 0; this.vy = 0; this.size = 2;
            this.alpha = 0; this.life = 1; this.decay = 0;
            this.baseAlpha = 0; this.phase = Math.random() * Math.PI * 2;
            this.angle = 0; this.orbitR = 0; this.orbitSpeed = 0;
            this.color = '#8b5cf6';
            this.trail = []; this.maxTrail = 0;
            this.jetDir = 0; this.jetSpeed = 0;
        }

        update(elapsed) {
            if (this.decay) this.life = Math.max(0, this.life - this.decay);
            this.alpha = Math.max(0, this.life);
            const { W, H, CX, CY, ehR } = stateFn();

            switch (this.type) {
                case 'ambient':
                    this.x += this.vx; this.y += this.vy;
                    this.phase += 0.02;
                    this.alpha = this.baseAlpha * (0.5 + 0.5 * Math.sin(this.phase));
                    if (this.x < -10) this.x = W + 10;
                    if (this.x > W + 10) this.x = -10;
                    if (this.y < -10) this.y = H + 10;
                    if (this.y > H + 10) this.y = -10;
                    break;
                case 'cloud':
                    this.x += this.vx; this.y += this.vy;
                    if (this.x < -this.size * 2) this.x = W + this.size * 2;
                    if (this.x > W + this.size * 2) this.x = -this.size * 2;
                    if (this.y < -this.size * 2) this.y = H + this.size * 2;
                    if (this.y > H + this.size * 2) this.y = -this.size * 2;
                    break;
                case 'warped':
                case 'infall': {
                    const dx = CX - this.x, dy = CY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                    const force = this.type === 'infall'
                        ? 3.5 + Math.random() * 6
                        : 0.5 + Math.random() * 1.5;
                    this.vx += (dx / dist) * force * 0.016;
                    this.vy += (dy / dist) * force * 0.016;
                    // tangential drift for spiral
                    this.vx += (-dy / dist) * 0.4 * 0.016;
                    this.vy += (dx / dist) * 0.4 * 0.016;
                    this.x += this.vx; this.y += this.vy;
                    // trail
                    this.trail.push({ x: this.x, y: this.y });
                    if (this.trail.length > this.maxTrail) this.trail.shift();
                    // consumed by event horizon
                    if (ehR && dist < ehR) { this.life = 0; this.alpha = 0; }
                    break;
                }
                case 'accretion': {
                    this.angle += this.orbitSpeed;
                    const ey = 0.65;
                    this.x = CX + Math.cos(this.angle) * this.orbitR;
                    this.y = CY + Math.sin(this.angle) * this.orbitR * ey;
                    this.orbitR *= 0.9993;
                    if (this.orbitR < (ehR || 10) + 5) { this.life = 0; this.alpha = 0; }
                    break;
                }
                case 'jet':
                    this.y += this.jetDir * this.jetSpeed;
                    this.x += Math.sin(this.y * 0.02) * 0.5;
                    if (Math.abs(this.y - CY) > H) this.life = 0;
                    break;
                case 'hawking':
                    this.x += this.vx; this.y += this.vy;
                    break;
                case 'burst':
                    this.x += this.vx; this.y += this.vy;
                    this.vx *= 0.985; this.vy *= 0.985;
                    break;
                // converge, ripple, shard, dust, ember, etc. handled by custom code
                default:
                    this.x += this.vx; this.y += this.vy;
                    break;
            }
        }

        draw(ctx) {
            if (this.alpha <= 0.005) return;
            ctx.globalAlpha = this.alpha;
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            g.addColorStop(0, this.color);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            // trail
            if (this.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let t = 1; t < this.trail.length; t++) ctx.lineTo(this.trail[t].x, this.trail[t].y);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.size * 0.5;
                ctx.globalAlpha = this.alpha * 0.4;
                ctx.stroke();
            }
        }
    };
}

/** 创建全屏 Canvas overlay 并 append 到 body */
export function createCanvasOverlay(className, canvasId) {
    const ov = document.createElement('div');
    ov.className = className;
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;';
    document.body.appendChild(ov);

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    ov.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { ov, canvas, ctx, W, H, CX: W / 2, CY: H / 2 };
}

/** 安全定时器收集器 — 便于统一清理 */
export class TimerPool {
    constructor() { this.timers = []; this.intervals = []; this.rafIds = []; }
    timeout(fn, ms) { const id = setTimeout(fn, ms); this.timers.push(id); return id; }
    interval(fn, ms) { const id = setInterval(fn, ms); this.intervals.push(id); return id; }
    raf(fn) { const id = requestAnimationFrame(fn); this.rafIds.push(id); return id; }
    clearAll() {
        this.timers.forEach(clearTimeout);
        this.intervals.forEach(clearInterval);
        this.rafIds.forEach(cancelAnimationFrame);
        this.timers = []; this.intervals = []; this.rafIds = [];
    }
}
