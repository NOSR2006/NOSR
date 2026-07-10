/**
 * sg-canvas.js — L3/L4 Canvas 粒子揭示
 * premiumL1Reveal (L3, 5s) + premiumL2Reveal (L4, 7s)
 *
 * 接收 ctx = { playChime, playDrone, playImpact, getLabel, fmt, fxState }
 * fxState.done() 替代直接写 __fxPlaying = false
 */

export function createPremiumL1(ctx) {
    const { playChime, getLabel, fmt } = ctx;

    return function premiumL1Reveal(prize) {
        const c = prize.color || '#8b5cf6';
        const [cr, cg, cb] = [
            parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];

        const ov = document.createElement('div');
        ov.style.cssText = `position:fixed;inset:0;z-index:9998;background:radial-gradient(ellipse at center,${c}14,rgba(13,17,23,0.94) 60%);overflow:hidden;`;
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        ov.appendChild(canvas);
        const center = document.createElement('div');
        center.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:1;';
        ov.appendChild(center);
        document.body.appendChild(ov);
        const cvCtx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let w, h, cx, cy;
        const resize = () => { w = innerWidth; h = innerHeight; cx = w/2; cy = h/2;
            canvas.width = w*dpr; canvas.height = h*dpr;
            canvas.style.width = w+'px'; canvas.style.height = h+'px';
            cvCtx.setTransform(dpr,0,0,dpr,0,0); };
        resize();

        const particles = [];
        class Pt {
            constructor(x, y, type) {
                this.x = x; this.y = y; this.type = type;
                this.vx = 0; this.vy = 0; this.size = 2;
                this.alpha = 0; this.life = 1; this.decay = 0;
                this.baseAlpha = 0; this.phase = Math.random() * Math.PI * 2;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.decay) this.life -= this.decay;
                this.alpha = Math.max(0, Math.min(1, this.life));
                if (this.type === 'ambient') {
                    this.phase += 0.02;
                    this.alpha = this.baseAlpha * (0.6 + 0.4 * Math.sin(this.phase));
                    if (this.x < -10) this.x = w + 10;
                    if (this.x > w + 10) this.x = -10;
                    if (this.y < -10) this.y = h + 10;
                    if (this.y > h + 10) this.y = -10;
                }
                if (this.type === 'burst') {
                    this.vx *= 0.985; this.vy *= 0.985;
                    if (Math.abs(this.vx)+Math.abs(this.vy) < 0.1) this.decay = 0.012;
                }
            }
            draw() {
                cvCtx.globalAlpha = this.alpha;
                cvCtx.fillStyle = `rgb(${cr},${cg},${cb})`;
                cvCtx.beginPath(); cvCtx.arc(this.x, this.y, this.size, 0, Math.PI*2); cvCtx.fill();
            }
        }

        // 60 ambient particles (slow drift + smooth twinkle)
        for (let i = 0; i < 60; i++) {
            const p = new Pt(Math.random()*w, Math.random()*h, 'ambient');
            p.size = 1 + Math.random()*1.5;
            p.baseAlpha = 0.1 + Math.random()*0.2;
            p.alpha = p.baseAlpha;
            p.vx = (Math.random()-0.5)*0.2;
            p.vy = (Math.random()-0.5)*0.2;
            particles.push(p);
        }

        let frame; let centerGlow = 0;
        const loop = () => {
            cvCtx.clearRect(0, 0, w, h);
            if (centerGlow > 0) {
                const g = cvCtx.createRadialGradient(cx, cy, 0, cx, cy, centerGlow);
                g.addColorStop(0, `rgba(${cr},${cg},${cb},0.3)`);
                g.addColorStop(1, 'transparent');
                cvCtx.fillStyle = g; cvCtx.fillRect(0, 0, w, h);
            }
            for (let i = particles.length-1; i >= 0; i--) {
                particles[i].update(); particles[i].draw();
                if (particles[i].alpha <= 0.005) particles.splice(i, 1);
            }
            cvCtx.globalAlpha = 1;
            frame = requestAnimationFrame(loop);
        };
        loop();

        // ── Audio: single chime ──
        setTimeout(() => { try { playChime([523, 659, 784], 2); } catch(e){} }, 2000);

        // ── 1.5s 中心光晕缓慢亮起 ──
        setTimeout(() => {
            const grow = () => { if (centerGlow < 120) { centerGlow += 2; requestAnimationFrame(grow); } };
            grow();
        }, 1500);

        // ── 2.0s 揭示 ──
        setTimeout(() => {
            const sym = document.createElement('div');
            sym.style.cssText = `font-size:7rem;opacity:0;filter:drop-shadow(0 0 25px ${c}66);`;
            sym.textContent = prize.symbol; center.appendChild(sym);
            const lbl = document.createElement('div');
            lbl.style.cssText = `font-size:2.5rem;font-weight:900;color:${c};margin-top:.5rem;font-family:var(--font-mono);letter-spacing:.2em;opacity:0;`;
            lbl.textContent = getLabel(prize); center.appendChild(lbl);
            const sub = document.createElement('div');
            sub.style.cssText = `font-size:.85rem;color:${c}99;margin-top:.3rem;font-family:var(--font-mono);opacity:0;`;
            sub.textContent = `1 / ${fmt(prize.denom)}`; center.appendChild(sub);
            if (window.gsap) {
                window.gsap.fromTo(sym, {opacity:0,scale:0,rotate:-10},
                    {opacity:1,scale:1,rotate:0,duration:.8,ease:'back.out(2)'});
                window.gsap.fromTo(lbl, {opacity:0,y:20},
                    {opacity:1,y:0,duration:.5,delay:.3,ease:'power3.out'});
                window.gsap.fromTo(sub, {opacity:0,y:10},
                    {opacity:1,y:0,duration:.4,delay:.5,ease:'power2.out'});
            }
            // 45 burst particles
            for (let i = 0; i < 45; i++) {
                const a = Math.random()*Math.PI*2, spd = 2+Math.random()*6;
                const p = new Pt(cx, cy, 'burst');
                p.vx = Math.cos(a)*spd; p.vy = Math.sin(a)*spd;
                p.size = 1+Math.random()*3; p.alpha = 0.9;
                particles.push(p);
            }
        }, 2000);

        // ── 3.5s 尾韵微粒 ──
        setTimeout(() => {
            for (let i = 0; i < 15; i++) {
                const a = Math.random()*Math.PI*2;
                const p = new Pt(cx, cy, 'burst');
                p.vx = Math.cos(a)*(0.3+Math.random()*1);
                p.vy = Math.sin(a)*(0.3+Math.random()*1);
                p.size = 1+Math.random()*1.5; p.alpha = 0.3; p.decay = 0.004;
                particles.push(p);
            }
        }, 3500);

        // ── 5s 淡出 ──
        setTimeout(() => { ov.style.transition = 'opacity .5s'; ov.style.opacity = '0'; }, 5000);
        setTimeout(() => { cancelAnimationFrame(frame); ov.remove(); ctx.fxState.done(); }, 5600);
    };
}

export function createPremiumL2(ctx) {
    const { playDrone, playImpact, playChime, getLabel, fmt } = ctx;

    return function premiumL2Reveal(prize) {
        const c = prize.color || '#6366f1';
        const [cr, cg, cb] = [
            parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
        const dur = 7000;

        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;overflow:hidden;';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        ov.appendChild(canvas);
        const center = document.createElement('div');
        center.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:1;';
        ov.appendChild(center);
        document.body.appendChild(ov);
        const cvCtx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let w, h, cx, cy;
        const resize = () => { w = innerWidth; h = innerHeight; cx = w/2; cy = h/2;
            canvas.width = w*dpr; canvas.height = h*dpr;
            canvas.style.width = w+'px'; canvas.style.height = h+'px';
            cvCtx.setTransform(dpr,0,0,dpr,0,0); };
        resize();

        const particles = [];
        class Pt {
            constructor(x, y, type) {
                this.x = x; this.y = y; this.type = type;
                this.vx = 0; this.vy = 0; this.size = 2;
                this.alpha = 0; this.life = 1; this.decay = 0;
                this.baseAlpha = 0; this.phase = Math.random() * Math.PI * 2;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.decay) this.life -= this.decay;
                this.alpha = Math.max(0, Math.min(1, this.life));
                if (this.type === 'ambient') {
                    this.phase += 0.02;
                    this.alpha = this.baseAlpha * (0.6 + 0.4 * Math.sin(this.phase));
                    if (this.x < -10) this.x = w + 10;
                    if (this.x > w + 10) this.x = -10;
                    if (this.y < -10) this.y = h + 10;
                    if (this.y > h + 10) this.y = -10;
                }
                if (this.type === 'converge') {
                    const dx = cx-this.x, dy = cy-this.y, d = Math.hypot(dx,dy);
                    if (d > 30) {
                        this.vx += dx/d * 0.25; this.vy += dy/d * 0.25;
                    } else {
                        this.life -= 0.03;
                    }
                    this.vx *= 0.96; this.vy *= 0.96;
                }
                if (this.type === 'burst') {
                    this.vx *= 0.985; this.vy *= 0.985;
                    if (Math.abs(this.vx)+Math.abs(this.vy) < 0.1) this.decay = 0.012;
                }
                if (this.type === 'ripple') {
                    this.size += 3; this.vx = 0; this.vy = 0;
                }
            }
            draw() {
                cvCtx.globalAlpha = this.alpha;
                cvCtx.fillStyle = `rgb(${cr},${cg},${cb})`;
                cvCtx.beginPath(); cvCtx.arc(this.x, this.y, this.size, 0, Math.PI*2); cvCtx.fill();
            }
        }

        // 80 ambient particles (slow drift + smooth twinkle)
        for (let i = 0; i < 80; i++) {
            const p = new Pt(Math.random()*w, Math.random()*h, 'ambient');
            p.size = 1 + Math.random()*2;
            p.baseAlpha = 0.15 + Math.random()*0.25;
            p.alpha = p.baseAlpha;
            p.vx = (Math.random()-0.5)*0.3;
            p.vy = (Math.random()-0.5)*0.3;
            particles.push(p);
        }

        let frame; let centerGlow = 0;
        const loop = () => {
            cvCtx.clearRect(0, 0, w, h);
            if (centerGlow > 0) {
                const g = cvCtx.createRadialGradient(cx, cy, 0, cx, cy, centerGlow);
                g.addColorStop(0, `rgba(${cr},${cg},${cb},0.5)`);
                g.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.12)`);
                g.addColorStop(1, 'transparent');
                cvCtx.fillStyle = g; cvCtx.fillRect(0, 0, w, h);
            }
            for (let i = particles.length-1; i >= 0; i--) {
                particles[i].update(); particles[i].draw();
                if (particles[i].alpha <= 0.005) particles.splice(i, 1);
            }
            cvCtx.globalAlpha = 1;
            frame = requestAnimationFrame(loop);
        };
        loop();

        // ── Audio ──
        playDrone(2000, 45, 0.3);
        setTimeout(() => playImpact(55), 3000);
        setTimeout(() => playChime([392, 523, 659, 784], 3), 3500);

        // ── 0.1s 白闪 ──
        setTimeout(() => {
            const f = document.createElement('div');
            f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:10000;pointer-events:none;transition:opacity .4s;';
            ov.appendChild(f);
            requestAnimationFrame(() => { f.style.opacity = '0'; setTimeout(() => f.remove(), 500); });
        }, 100);

        // ── 2.0s 汇聚 + 中心光晕 ──
        setTimeout(() => {
            centerGlow = 10;
            const grow = () => { if (centerGlow < 250) { centerGlow += 4; requestAnimationFrame(grow); } };
            grow();
            for (let i = 0; i < 35; i++) {
                const a = Math.random()*Math.PI*2, d = 200+Math.random()*400;
                const p = new Pt(cx+Math.cos(a)*d, cy+Math.sin(a)*d, 'converge');
                p.size = 2+Math.random()*3; p.alpha = 0.6+Math.random()*0.4;
                particles.push(p);
            }
        }, 2000);

        // ── 3.0s 揭示 ──
        setTimeout(() => {
            const sym = document.createElement('div');
            sym.style.cssText = `font-size:8rem;opacity:0;filter:drop-shadow(0 0 60px ${c});`;
            sym.textContent = prize.symbol; center.appendChild(sym);
            const lbl = document.createElement('div');
            lbl.style.cssText = `font-size:2.5rem;font-weight:900;color:${c};margin-top:.5rem;font-family:var(--font-mono);letter-spacing:.2em;opacity:0;`;
            lbl.textContent = getLabel(prize); center.appendChild(lbl);
            const sub = document.createElement('div');
            sub.style.cssText = `font-size:.85rem;color:${c}99;margin-top:.3rem;font-family:var(--font-mono);opacity:0;`;
            sub.textContent = `1 / ${fmt(prize.denom)}`; center.appendChild(sub);
            if (window.gsap) {
                window.gsap.fromTo(sym, {opacity:0,scale:3,rotate:-20},
                    {opacity:1,scale:1,rotate:0,duration:1,ease:'elastic.out(1,0.5)'});
                window.gsap.fromTo(lbl, {opacity:0,y:30},
                    {opacity:1,y:0,duration:.6,delay:.5,ease:'power3.out'});
                window.gsap.fromTo(sub, {opacity:0,y:15},
                    {opacity:1,y:0,duration:.5,delay:.8,ease:'power2.out'});
            }
            // burst
            for (let i = 0; i < 55; i++) {
                const a = Math.random()*Math.PI*2, spd = 3+Math.random()*9;
                const p = new Pt(cx, cy, 'burst');
                p.vx = Math.cos(a)*spd; p.vy = Math.sin(a)*spd;
                p.size = 1+Math.random()*5; p.alpha = 1;
                particles.push(p);
            }
            for (let i = 0; i < 5; i++) {
                const p = new Pt(cx, cy, 'ripple');
                p.size = 5+i*15; p.alpha = 0.7-i*0.1; p.decay = 0.006;
                particles.push(p);
            }
            centerGlow = 350;
            document.body.style.animation = 'rngShake 0.5s ease-out';
            setTimeout(() => document.body.style.animation = '', 500);
        }, 3000);

        // ── 4.5s 余韵微粒 ──
        setTimeout(() => {
            for (let i = 0; i < 20; i++) {
                const a = Math.random()*Math.PI*2, d = 30+Math.random()*150;
                const p = new Pt(cx+Math.cos(a)*d, cy+Math.sin(a)*d, 'burst');
                p.vx = Math.cos(a)*(0.5+Math.random()*1.5);
                p.vy = Math.sin(a)*(0.5+Math.random()*1.5);
                p.size = 1+Math.random()*2; p.alpha = 0.4; p.decay = 0.003;
                particles.push(p);
            }
        }, 4500);

        // ── 淡出 ──
        setTimeout(() => { ov.style.transition = 'opacity .6s'; ov.style.opacity = '0'; }, dur);
        setTimeout(() => { cancelAnimationFrame(frame); ov.remove(); ctx.fxState.done(); }, dur+700);
    };
}
