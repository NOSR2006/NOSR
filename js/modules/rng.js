/**
 * rng.js — RNG Lottery 引擎
 * 配置在 rng-config.js，特效在下方 EFFECTS 对象
 */

import {
    POOL, LUCK_LEVELS, SPIN_MS, FRAMES, fmt,
    PARTICLES, BURST_SETS, TIER_COLORS,
} from './rng-config.js?v=260709w';

import { playDrone, playImpact, playChime, playRipple, initAudio } from './rng-audio.js?v=260709w';

// ============== 概率引擎 ==============

function buildThresholds(mult) {
    if (mult <= 1) {
        const w = POOL.map(p => 1 / p.denom);
        const tw = w.reduce((a, b) => a + b, 0);
        return { thresh: w.reduce((a, x, i) => { a.push((a[i-1]||0) + x/tw); return a; }, []),
                 probs: w.map(x => x / tw * 100) };
    }
    // Lucky 模型：floor 过滤低级池 → 重算权重 → 顶部加磅
    const floor = mult;
    const kept = POOL.map((p, i) => ({ p, i })).filter(x => x.p.denom >= floor);
    // 极端情况兜底：全部被滤掉 → 保留所有
    const pool = kept.length > 0 ? kept : POOL.map((p, i) => ({ p, i }));
    const boosts = [1.4, 1.25, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const w = pool.map((x, j) => (1 / x.p.denom) * (boosts[j] || 1));
    const tw = w.reduce((a, b) => a + b, 0);
    // 构建全尺寸 probs/thresh（被过滤项 = 0）
    const probs = POOL.map((p, i) => {
        const k = pool.findIndex(x => x.i === i);
        return k >= 0 ? w[k] / tw * 100 : 0;
    });
    const thresh = [];
    let cum = 0;
    for (let i = 0; i < POOL.length; i++) {
        cum += probs[i] / 100;
        thresh.push(cum);
    }
    return { thresh, probs };
}

const normal  = buildThresholds(1);
const luckMap = Object.fromEntries(
    LUCK_LEVELS.map(l => [l.name.toLowerCase(), buildThresholds(l.mult)])
);

const delays = (() => {
    const raw = Array.from({length: FRAMES}, (_, i) => {
        const t = i / (FRAMES - 1);
        return 30 + 220 * Math.pow(t, 2.5);
    });
    const s = raw.reduce((a, b) => a + b, 0);
    return raw.map(d => d * SPIN_MS / s);
})();

function getLuck(total) {
    for (let i = LUCK_LEVELS.length - 1; i >= 0; i--) {
        const l = LUCK_LEVELS[i];
        if (l.every > 0 && total % l.every === 0) return l;
    }
    return null;
}

// ============== 特效函数（可在此注册新的） ==============

// ===== Wave 海洋过场（10s，GSAP timeline） =====
function waveReveal() {
    const ov = document.createElement('div');
    ov.className = 'rng-wave';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;overflow:hidden;';
    ov.innerHTML = `
        <div class="rng-wave-bg"></div>
        <div class="rng-wave-shock"></div>
        <div class="rng-wave-ripple"></div>
        <div class="rng-wave-lightbeams"></div>
        <div class="rng-wave-vignette"></div>
        <div class="rng-wave-waves">
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path class="rng-wave-path p1" d="M0,160 C240,80 480,240 720,160 C960,80 1200,240 1440,160 L1440,320 L0,320 Z"/>
                <path class="rng-wave-path p2" d="M0,200 C300,260 600,120 900,200 C1100,260 1300,140 1440,200 L1440,320 L0,320 Z"/>
                <path class="rng-wave-path p3" d="M0,240 C200,160 500,280 800,240 C1050,200 1250,260 1440,240 L1440,320 L0,320 Z"/>
            </svg>
        </div>
        <div class="rng-wave-center">
            <span class="rng-wave-symbol">🌊</span>
            <span class="rng-wave-text">W A V E</span>
            <span class="rng-wave-sub">1 / 3,333,333</span>
        </div>
    `;
    document.body.appendChild(ov);

    const tl = gsap.timeline({ onComplete: () => { __fxPlaying = false; ov.remove(); } });

    // ── 音效 ──
    playDrone(2000, 40, 0.3);
    tl.call(() => playImpact(55), null, 2);
    tl.call(() => playRipple(330, 6), null, 2.5);

    // 海洋生物 — 立刻开始，9s 内完成
    const seaLife = ['🐠','🐟','🐡','🦈','🐋','🐳','🐬','🦭','🐙','🦑','🦀','🦞'];
    for (let i = 0; i < 22; i++) {
        const f = document.createElement('span'); f.className = 'rng-wave-fish';
        f.textContent = seaLife[Math.floor(Math.random()*seaLife.length)];
        f.style.top = (5+Math.random()*72)+'%';
        f.style.fontSize = (1+Math.random()*2.5)+'rem';
        ov.appendChild(f);
        tl.fromTo(f,
            { x: 0, y: 0, scaleX: -1, rotate: 2 },
            { x: '110vw', y: 0, duration: 5+Math.random()*5, ease: 'none' },
            Math.random() * 1.5
        );
    }

    // 气泡 — 两波
    for (let i = 0; i < 40; i++) {
        const b = document.createElement('span'); b.className = 'rng-wave-bubble';
        b.style.left = Math.random()*100+'%';
        b.style.width = b.style.height = (3+Math.random()*12)+'px';
        ov.appendChild(b);
        tl.fromTo(b,
            { y: 0, x: 0, scale: 1, opacity: 0.5 },
            { y: '-110vh', x: (Math.random()-0.5)*30, scale: 0.2, opacity: 0, duration: 4+Math.random()*5, ease: 'none' },
            Math.random() * 6
        );
    }

    // 浮游光点
    for (let i = 0; i < 50; i++) {
        const s = document.createElement('span'); s.className = 'rng-wave-spark';
        s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
        ov.appendChild(s);
        tl.fromTo(s,
            { opacity: 0, scale: 0.5 },
            { opacity: 0.9, scale: 1.5, duration: 1.5, yoyo: true, repeat: 3, ease: 'power1.inOut' },
            Math.random() * 5
        );
    }

    // 冲击波 2s
    const shock = ov.querySelector('.rng-wave-shock');
    tl.fromTo(shock, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 2);
    tl.to(shock, { opacity: 0, scale: 1.5, duration: 1, ease: 'power2.in' }, 2.5);

    // 波浪层渐入 2s
    const waves = ov.querySelector('.rng-wave-waves');
    tl.to(waves, { opacity: 1, duration: 0.8 }, 2);

    // 中心揭示 2.5s
    const center = ov.querySelector('.rng-wave-center');
    tl.fromTo(center, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.5)' }, 2.5);

    // 全场淡出 10s
    tl.to(ov, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 10);
}
}

// ===== NOSR 科技风 15s 过场 — Web/AI 主题 =====
function nosrReveal() {
    const ov = document.createElement('div');
    ov.className = 'rng-nosr-tech';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;overflow:hidden;';
    ov.innerHTML = `
        <canvas class="rng-nt-canvas" id="rngNtCanvas"></canvas>
        <div class="rng-nt-bg"></div>
        <div class="rng-nt-grid"></div>
        <!-- 神经网络 SVG -->
        <svg class="rng-nt-neural" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <!-- 连接线 -->
            <g class="rng-nt-links" fill="none" stroke-width="0.8">
                ${(()=>{ let s=''; for(let i=0;i<18;i++){ const ax=100+Math.random()*1000,ay=100+Math.random()*600,bx=100+Math.random()*1000,by=100+Math.random()*600; s+=`<path class="rng-nt-link" d="M${ax},${ay} L${bx},${by}"/>`; } return s; })()}
            </g>
            <!-- 神经网络节点 -->
            <g class="rng-nt-nodes">${(()=>{ let s=''; for(let i=0;i<16;i++){ s+=`<circle class="rng-nt-nn" cx="${100+Math.random()*1000}" cy="${100+Math.random()*600}" r="${2+Math.random()*4}"/>`; } return s; })()}</g>
        </svg>
        <!-- 扫描线 -->
        <div class="rng-nt-scan"></div>
        <div class="rng-nt-scan rng-nt-scan-rev"></div>
        <div class="rng-nt-star"><svg viewBox="0 0 200 200"><rect x="35" y="35" width="130" height="130" transform="rotate(0,100,100)"/><rect x="35" y="35" width="130" height="130" transform="rotate(45,100,100)"/></svg></div>
        <!-- 终端碎片 -->
        <div class="rng-nt-terminal" id="rngNtTerm"></div>
        <!-- 光环 -->
        <div class="rng-nt-rings">
            <div class="rng-nt-ring r1"></div>
            <div class="rng-nt-ring r2"></div>
            <div class="rng-nt-ring r3"></div>
        </div>
        <div class="rng-nt-core"></div>
        <div class="rng-nt-center">
            <span class="rng-nt-symbol">&lt;/&gt;</span>
            <span class="rng-nt-text">N O S R</span>
            <span class="rng-nt-sub">1 / 7,777,777</span>
        </div>
    `;
    document.body.appendChild(ov);

    // ── 音效 ──
    playDrone(6000, 30, 0.35);                                // 深空嗡鸣 0-6s
    setTimeout(() => { playImpact(40); playChime([196,247,294,392,587], 3.5); }, 6000); // 冲击+谐波 6s

    // ===== 统一资源追踪（防泄漏） =====
    const resources = [];
    const track = (type, id) => { resources.push({ type, id }); return id; };
    const doCleanup = () => {
        for (const r of resources) {
            if (r.type === 'raf') cancelAnimationFrame(r.id);
            else if (r.type === 'timer') clearTimeout(r.id);
            else if (r.type === 'interval') clearInterval(r.id);
            else if (r.type === 'listener') window.removeEventListener('resize', r.id);
        }
        resources.length = 0;
    };
    const sched = (fn, ms) => track('timer', setTimeout(fn, ms));
    const schedI = (fn, ms) => track('interval', setInterval(fn, ms));
    // 劫持 ov.remove → 自动 cleanup
    const _remove = ov.remove.bind(ov);
    ov.remove = () => { doCleanup(); _remove(); };

    // Canvas 诊断数据流（点阵 + 横扫 + 随机闪烁）
    const canvas = ov.querySelector('#rngNtCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let animId, trail = 0.12;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        track('listener', resize);
        window.addEventListener('resize', resize);
        // 随机散布粒子
        const particles = Array.from({length: 200}, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random()-0.5)*0.6, vy: (Math.random()-0.5)*0.6,
            c: ['0','1','.',':','*','#','%','$','@'][Math.floor(Math.random()*9)],
            life: Math.random(), age: 0
        }));
        // 横扫线
        const sweeps = Array.from({length: 3}, () => ({
            y: Math.random() * canvas.height, speed: 0.3+Math.random()*0.7, dir: Math.random()>0.5?1:-1
        }));
        const draw = () => {
            if (!canvas.parentElement) return; // 已销毁
            ctx.fillStyle = `rgba(0,0,0,${trail})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '12px "Fira Code",Consolas,monospace';
            ctx.shadowBlur = 0;

            // 粒子
            for (const p of particles) {
                p.x += p.vx; p.y += p.vy; p.age++;
                if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
                if (p.age > 300) { p.age = 0; p.x = Math.random()*canvas.width; p.y = Math.random()*canvas.height; }
                const alpha = 0.1 + 0.3 * Math.sin(p.age * 0.05 + p.life * 10);
                ctx.fillStyle = p.c === '1' || p.c === '0' 
                    ? `rgba(47,129,247,${alpha})`
                    : `rgba(47,129,247,${alpha*0.4})`;
                ctx.fillText(p.c, p.x, p.y);
            }

            // 横扫线
            for (const s of sweeps) {
                s.y += s.speed * s.dir;
                if (s.y < -10) { s.y = canvas.height + 10; s.speed = 0.3+Math.random()*0.7; }
                if (s.y > canvas.height + 10) { s.y = -10; s.speed = 0.3+Math.random()*0.7; }
                ctx.strokeStyle = 'rgba(47,129,247,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(canvas.width, s.y); ctx.stroke();
                // 偶尔高亮
                if (Math.random() > 0.97) {
                    ctx.shadowBlur = 20; ctx.shadowColor = '#2f81f7';
                    ctx.strokeStyle = 'rgba(47,129,247,0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(canvas.width, s.y); ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            animId = track('raf', requestAnimationFrame(draw));
        };
        draw();
        // 13s 起 trail 递增 → 渐淡
        sched(() => {
            const tUp = schedI(() => { trail = Math.min(0.35, trail + 0.008); }, 200);
            sched(() => { clearInterval(tUp); }, 2000);
        }, 13000);
    }

    // ===== 神经网络呼吸 =====
    const neural = ov.querySelector('.rng-nt-neural');
    if (neural) {
        const nnodes = neural.querySelectorAll('.rng-nt-nn');
        const stored = Array.from(nnodes).map(n => ({
            el: n, cx: +n.getAttribute('cx'), cy: +n.getAttribute('cy')
        }));
        schedI(() => {
            for (const s of stored) {
                s.el.setAttribute('cx', s.cx + (Math.random() - 0.5) * 40);
                s.el.setAttribute('cy', s.cy + (Math.random() - 0.5) * 25);
            }
        }, 2500);
    }

    // 浮游光点
    for (let i = 0; i < 80; i++) {
        const s = document.createElement('span'); s.className = 'rng-nt-spark';
        s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
        s.style.animationDuration = (2+Math.random()*5)+'s'; s.style.animationDelay = (1+Math.random()*10)+'s';
        ov.appendChild(s);
    }

    // 网络/API 粒子
    const webIcons = ['⬡','⬢','⬣','{ }','[ ]','<>','</>','#','*','🔗','📡','🌐','💻','⚡','🔌'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('span'); p.className = 'rng-nt-particle';
        p.textContent = webIcons[Math.floor(Math.random()*webIcons.length)];
        const a = Math.random()*Math.PI*2, d = 80+Math.random()*500;
        p.style.setProperty('--dx', Math.cos(a)*d+'px'); p.style.setProperty('--dy', Math.sin(a)*d+'px');
        p.style.animationDuration = (1+Math.random()*4)+'s';
        p.style.animationDelay = (3+Math.random()*5)+'s';
        p.style.fontSize = (0.5+Math.random()*1.2)+'rem';
        ov.appendChild(p);
    }

    // ===== 打字机终端 =====
    const term = ov.querySelector('#rngNtTerm');
    const termLines = [
        { t:"$ curl -s https://api.nosr.top/v1/inference \\", c:'',   d:4.0 },
        { t:'  -H "Authorization: Bearer ****" \\',         c:'',   d:4.3 },
        { t:'  -H "Content-Type: application/json" \\',     c:'',   d:4.6 },
        { t:"  -d '{\"model\":\"nosr-7b\",\"temp\":0.7}'",  c:'',   d:4.9 },
        { t:'HTTP/2 200  {"tier":"NOSR","prob":"1/7,777,777"}', c:'c2', d:5.3 },
        { t:'X-Request-ID: nosr-7777777-abcdef',             c:'c2', d:5.6 },
        { t:'$ ssh -p 7777 nosr@core.nosr.top',              c:'c3', d:6.0 },
        { t:'nosr@core:~$ npx wrangler deploy --env prod',   c:'c3', d:6.3 },
        { t:'▲ Deploying to Cloudflare Global Network...',   c:'c3', d:6.6 },
        { t:'▲ [nosr] 7,777,777 nodes · 330 edge locations', c:'c3', d:6.9 },
        { t:'✓ Deployed in 7.7s — nosr.top is live',         c:'c4', d:7.3 },
        { t:'══════════════════════════════════════',         c:'c4', d:7.7 },
        // 升级入侵（填充死区 7.7→13s）
        { t:'$ breach core.nosr.top',                         c:'c2', d:8.8 },
        { t:'Analyzing target architecture...',               c:'c2', d:9.4 },
        { t:'Firewall bypassed · [████████] 100%',             c:'c2', d:10.0 },
        { t:'Kernel hooks injected · [████████] OK',           c:'c3', d:10.6 },
        { t:'ACCESS GRANTED — initiating breach sequence',     c:'c4', d:11.2 },
    ];
    const lineEls = termLines.map(l => {
        const el = document.createElement('div');
        el.className = 'rng-nt-codeline' + (l.c ? ' ' + l.c : '');
        term.appendChild(el);
        return { el, text: l.t, delay: l.d * 1000 };
    });
    lineEls.forEach(({el, text, delay}) => {
        let i = 0;
        const type = () => {
            if (!el.parentElement) return; // 已销毁
            if (i <= text.length) {
                el.textContent = text.slice(0, i) + (i < text.length ? '▌' : '');
                i++;
                track('timer', setTimeout(type, 20 + Math.random() * 40));
            } else {
                el.textContent = text;
            }
        };
        track('timer', setTimeout(type, delay));
    });

    // 终端完成后闪烁光标 → 骇入前悬疑
    sched(() => {
        const prompt = document.createElement('div');
        prompt.className = 'rng-nt-codeline c4';
        prompt.innerHTML = '$ <span class="rng-nt-cursor">▌</span>';
        term.appendChild(prompt);
    }, 12800);

    // ===== 骇入收尾 =====
    sched(() => {
        const xo = document.createElement('div');
        xo.className = 'rng-nt-hack';
        xo.innerHTML = `
            <div class="rng-nt-hack-bars"></div>
            <div class="rng-nt-hack-overlay"></div>
            <div class="rng-nt-hack-text">
                <div class="rng-nt-hack-line l1">[!] UNAUTHORIZED ACCESS DETECTED</div>
                <div class="rng-nt-hack-line l2">[!] FIREWALL BYPASSED — NOSR://ROOT</div>
                <div class="rng-nt-hack-line l3">[>] INJECTING PAYLOAD... ████████████ 100%</div>
                <div class="rng-nt-hack-line l4">[✓] SYSTEM COMPROMISED — 7,777,777 NODES BREACHED</div>
            </div>
            <div class="rng-nt-hack-glitch"></div>
        `;
        xo.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;';
        ov.appendChild(xo);

        // 屏幕撕裂
        sched(() => { xo.classList.add('tear'); }, 200);
        // 红色闪烁
        sched(() => { xo.classList.add('redflash'); }, 600);
        // 文字逐行出现
        sched(() => { xo.classList.add('reveal'); }, 800);
        // 最终黑屏
        sched(() => { xo.classList.add('fadeout'); }, 1800);
    }, 13000);

    sched(() => ov.classList.add('out'), 15000);
    sched(() => { __fxPlaying = false; ov.remove(); }, 15800);
}


// ============== 统一动画引擎 ==============

function fxLevel(denom) {
    if (denom >= 7777777) return 4;   // NOSR 15s 定制
    if (denom >= 1000000) return 3;   // 百万级 10s 定制
    if (denom >= 100000)  return 2;   // 十万级 7s 全屏模板
    if (denom >= 10000)   return 1;   // 万级   5s 非遮罩
    if (denom >= 1000)    return 0;   // 千级   3s 出框   (守门员: 1,000)
    return -1;
}

// 配置表：level → { color, particles, 装饰元素, 时长, 模式 }
const FX_TPL = {
    L0: { color: '#f0f0f0', bg: 'rgba(255,255,255,0.08)', p: 40, ring: 1, flash: 1,                       dur: 3000 },
    L1: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  p:100, ring: 1, orb: 1, rays: 1, flash: 1,        dur: 5000 },
    L2: { color: '#6366f1', bg: '#000', p:180, flash:1, ring:1, shock:1, pulse:1, scan:1, streak:1, rays:1, cross:1, vignette:1, shake:1, full:1, dur:8000 },
};

// 通用渲染
function genericReveal(prize, tpl) {
    const ov = document.createElement('div');
    ov.className = 'rng-fx' + (tpl.full ? ' rng-fx-full' : '');
    ov.style.setProperty('--c', tpl.color);
    ov.style.setProperty('--bg', tpl.bg);

    const parts = [];
    if (!tpl.full) parts.push('<div class="rng-fx-bg"></div>');
    if (tpl.ring)  parts.push('<div class="rng-fx-ring"></div>');
    if (tpl.flash) parts.push('<div class="rng-fx-flash"></div>');
    if (tpl.orb)   parts.push('<div class="rng-fx-orb"></div>');
    if (tpl.pulse) parts.push('<div class="rng-fx-pulse"></div>');
    if (tpl.shock) parts.push('<div class="rng-fx-shock"></div>');
    if (tpl.scan)  parts.push('<div class="rng-fx-scan"></div>');
    if (tpl.cross) parts.push('<div class="rng-fx-cross"></div>');
    if (tpl.vignette) parts.push('<div class="rng-fx-vignette"></div>');
    parts.push(`<span class="rng-fx-symbol${tpl.full?' rng-fx-symbol-lg':''}">${prize.symbol}</span>`);
    parts.push(`<span class="rng-fx-label${tpl.full?' rng-fx-label-lg':''}"${tpl.labelColor?` style="color:${tpl.labelColor}"`:''}>${prize.label}</span>`);
    parts.push(`<span class="rng-fx-sub">1 / ${fmt(prize.denom)}</span>`);
    ov.innerHTML = parts.join('');

    document.body.appendChild(ov);
    if (tpl.shake) { document.body.style.animation = 'rngShake 0.4s ease-out'; setTimeout(() => document.body.style.animation = '', 400); }

    const icons = BURST_SETS[prize.tier] || ['✨','🌟','💎','⭐','🎉'];
    for (let i = 0; i < tpl.p; i++) {
        const p = document.createElement('span'); p.className = 'rng-fx-p';
        p.textContent = icons[Math.floor(Math.random()*icons.length)];
        const a = Math.random()*Math.PI*2, d = 80+Math.random()*400;
        p.style.setProperty('--dx', Math.cos(a)*d+'px'); p.style.setProperty('--dy', Math.sin(a)*d+'px');
        p.style.animationDuration = (0.8+Math.random()*2.5)+'s'; ov.appendChild(p);
    }
    if (tpl.rays) {
        const rc = tpl.full ? 24 : 24;
        for (let i = 0; i < rc; i++) {
            const r = document.createElement('span'); r.className = 'rng-fx-ray';
            r.style.left = Math.random()*100+'%'; r.style.animationDuration = (1+Math.random()*2)+'s';
            r.style.animationDelay = Math.random()*2+'s'; ov.appendChild(r);
        }
    }
    if (tpl.streak) {
        for (let i = 0; i < 18; i++) {
            const s = document.createElement('span'); s.className = 'rng-fx-streak';
            s.style.top = (5+Math.random()*90)+'%';
            s.style.animationDuration = (0.8+Math.random()*1.2)+'s';
            s.style.animationDelay = Math.random()*5+'s'; ov.appendChild(s);
        }
    }
    setTimeout(() => ov.classList.add('out'), tpl.dur);
    setTimeout(() => ov.remove(), tpl.dur + 600);
    return ov;
}

// ===== Genesis 创世纪 v3 — 三纪元生成 =====
function genesisReveal() {
    const ov = document.createElement('div');
    ov.className = 'rng-genesis';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 0%,#02030a 0%,#000 60%,#000 100%);';
    ov.innerHTML = `
        <div class="rng-gs-void"></div>
        <div class="rng-gs-gravity">
            <div class="rng-gs-grav-ring"></div><div class="rng-gs-grav-ring r2"></div><div class="rng-gs-grav-ring r3"></div>
        </div>
        <div class="rng-gs-crack"></div>
        <div class="rng-gs-beam">
            <div class="rng-gs-beam-core"></div>
        </div>
        <div class="rng-gs-branches"></div>
        <div class="rng-gs-shockwaves">
            <div class="rng-gs-shock s1"></div><div class="rng-gs-shock s2"></div><div class="rng-gs-shock s3"></div>
            <div class="rng-gs-shock s4"></div><div class="rng-gs-shock s5"></div>
        </div>
        <div class="rng-gs-orbits">
            <div class="rng-gs-orbit o1"></div><div class="rng-gs-orbit o2"></div><div class="rng-gs-orbit o3"></div>
        </div>
        <div class="rng-gs-crown"></div>
        <div class="rng-gs-pillars">
            <div class="rng-gs-pillar pl"></div><div class="rng-gs-pillar pr"></div>
        </div>
        <div class="rng-gs-center">
            <span class="rng-gs-symbol">✦</span>
            <span class="rng-gs-text">G E N E S I S</span>
            <span class="rng-gs-sub">1 / 1,000,000</span>
        </div>
        <canvas class="rng-gs-canvas" id="rngGsCanvas"></canvas>
    `;
    document.body.appendChild(ov);

    // ── 音效 ──
    playDrone(2300, 55);                              // 混沌嗡鸣 0-2.3s
    setTimeout(() => playImpact(50), 2300);           // 天裂冲击 2.3s
    setTimeout(() => playChime([523,659,784,1047], 3), 5500); // 神圣泛音 5.5s

    const T = { ACTIVATE: 2500, SHAKE: 2300, FADE: 9000, REMOVE: 11000 };

    // ==================== Canvas 三层深度空间 ====================
    const canvas = ov.querySelector('#rngGsCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let w, h, cx;
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            w = window.innerWidth; h = window.innerHeight; cx = w / 2;
            canvas.width = w * dpr; canvas.height = h * dpr;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resizeCanvas();
        const onResize = () => resizeCanvas();
        window.addEventListener('resize', onResize);

        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const m = isMobile ? 0.35 : 1;

        // L1 远景：星云大粒子 — 极慢、极模糊、极大
        const farClouds = [];
        for (let i = 0; i < Math.round(30 * m); i++) {
            farClouds.push({
                x: Math.random() * w, y: Math.random() * h,
                r: 40 + Math.random() * 120,
                vx: (Math.random() - 0.5) * 0.08,
                vy: (Math.random() - 0.5) * 0.05,
                alpha: 0.015 + Math.random() * 0.04,
            });
        }

        // L2 中景：光束周围尘埃（原有粒子）
        const dustPC = Math.round((isMobile ? 120 : 300) * m);
        const dust = [];
        for (let i = 0; i < dustPC; i++) {
            dust.push({
                x: cx + (Math.random() - 0.5) * 300,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.3 - 0.2,
                r: 0.3 + Math.random() * 2.5,
                alpha: 0.15 + Math.random() * 0.6,
                life: 1,
                decay: 0.003 + Math.random() * 0.008,
                cooldown: Math.floor(Math.random() * 25),
            });
        }

        let running = true, beamBase = 1, alpha = 0;
        const startTs = performance.now();
        const draw = () => {
            if (!running) return;
            const elapsed = (performance.now() - startTs) / 1000;

            // 混沌期(0-2.3s): 仅远景星云
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(0, 0, w, h);

            // L1 远景星云 — 全时段可见
            for (const c of farClouds) {
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
                const glow = c.alpha * (elapsed > 2.5 ? 0.5 : 1);
                ctx.fillStyle = `rgba(160,180,220,${glow})`;
                ctx.fill();
                c.x += c.vx; c.y += c.vy;
                if (c.x < -c.r) c.x = w + c.r;
                if (c.x > w + c.r) c.x = -c.r;
                if (c.y < -c.r) c.y = h + c.r;
                if (c.y > h + c.r) c.y = -c.r;
            }

            if (elapsed > 2.5) {
                // 有机呼吸: 试探→爆发→稳定
                const tBeam = Math.min(1, (elapsed - 2.5) / 1.5);
                const t = tBeam;
                const organic = 0.5 + 0.5 * Math.sin(t * Math.PI);
                const flicker = 1 + 0.15 * Math.sin(elapsed * 22) * (1 - t) + 0.05 * Math.sin(elapsed * 7);
                beamBase = (1 + t * 59) * flicker;

                if (alpha < 0.75) alpha = Math.min(0.75, alpha + 0.02);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.globalCompositeOperation = 'lighter';

                for (const p of dust) {
                    const spread = beamBase * 6;
                    const distFromCenter = Math.abs(p.x - cx);
                    if (distFromCenter > spread * 3 && p.cooldown <= 0) {
                        p.x = cx + (Math.random() - 0.5) * spread * 2;
                        p.y = Math.random() * h;
                        p.life = 1;
                        p.cooldown = 8 + Math.random() * 20;
                    }
                    if (p.cooldown > 0) p.cooldown--;

                    const closeness = 1 - Math.min(1, distFromCenter / (spread * 1.5));
                    const glow = p.alpha * p.life * (0.3 + closeness * 0.7);

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r * 1.6, 0, Math.PI*2);
                    ctx.fillStyle = `rgba(200,220,255,${glow * 0.35})`;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI*2);
                    ctx.fillStyle = `rgba(255,255,255,${glow * 0.7})`;
                    ctx.fill();

                    p.x += p.vx + (Math.random() - 0.5) * 0.4;
                    p.y += p.vy + (Math.random() - 0.5) * 0.25;
                    p.life -= p.decay;
                    if (p.life <= 0 || p.y < -20 || p.y > h + 20) {
                        if (p.cooldown <= 0) {
                            p.x = cx + (Math.random() - 0.5) * spread * 1.5;
                            p.y = Math.random() * h;
                            p.life = 0.8 + Math.random() * 0.2;
                            p.cooldown = 6 + Math.random() * 15;
                        }
                    }
                }
                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }

            if (elapsed > 9) {
                alpha = Math.max(0, alpha - 0.025);
                if (alpha <= 0) { running = false; cancelAnimationFrame(animId); return; }
            }
            animId = requestAnimationFrame(draw);
        };
        let animId = requestAnimationFrame(draw);

        setTimeout(() => {
            running = false;
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
        }, T.REMOVE);
    }

    // 地震
    setTimeout(() => { ov.classList.add('shaken'); }, T.SHAKE);

    // 深空星野
    const fragStar = document.createDocumentFragment();
    for (let i = 0; i < 120; i++) {
        const s = document.createElement('span'); s.className = 'rng-gs-star';
        s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
        s.style.setProperty('--sop', (0.15+Math.random()*0.55).toFixed(2));
        s.style.setProperty('--ssc', (0.7+Math.random()*1.6).toFixed(2));
        s.style.animationDuration = (2+Math.random()*5)+'s';
        s.style.animationDelay = Math.random()*3+'s';
        fragStar.appendChild(s);
    }
    ov.appendChild(fragStar);

    // 远景微尘
    const frag1 = document.createDocumentFragment();
    for (let i = 0; i < 80; i++) {
        const s = document.createElement('span'); s.className = 'rng-gs-spark';
        s.style.left = (5+Math.random()*90)+'%'; s.style.top = (5+Math.random()*90)+'%';
        s.style.animationDuration = (3+Math.random()*5)+'s';
        s.style.animationDelay = Math.random()*2+'s'; frag1.appendChild(s);
    }
    ov.appendChild(frag1);

    // ✦ 粒子爆发
    const frag2 = document.createDocumentFragment();
    const icons = ['✦','💫','✨','⚡','🌟','🎉','🏆','👑','💎','🔥'];
    for (let i = 0; i < 80; i++) {
        const p = document.createElement('span'); p.className = 'rng-gs-particle';
        p.textContent = icons[Math.floor(Math.random()*icons.length)];
        const a = Math.random()*Math.PI*2, d = 80+Math.random()*600;
        p.style.setProperty('--dx', Math.cos(a)*d+'px'); p.style.setProperty('--dy', Math.sin(a)*d+'px');
        p.style.animationDuration = (1.5+Math.random()*4)+'s';
        p.style.animationDelay = (5+Math.random()*3.5)+'s'; frag2.appendChild(p);
    }
    ov.appendChild(frag2);

    // 近景光碎片
    const fragShard = document.createDocumentFragment();
    for (let i = 0; i < 20; i++) {
        const s = document.createElement('span'); s.className = 'rng-gs-shard';
        s.style.left = (40+Math.random()*20)+'%'; s.style.top = (30+Math.random()*40)+'%';
        s.style.width = (2+Math.random()*6)+'px'; s.style.height = (10+Math.random()*40)+'px';
        const a = Math.random()*Math.PI*2, d = 50+Math.random()*300;
        s.style.setProperty('--dx', Math.cos(a)*d+'px'); s.style.setProperty('--dy', Math.sin(a)*d+'px');
        s.style.setProperty('--dr', (Math.random()*360)+'deg');
        s.style.animationDuration = (2+Math.random()*4)+'s';
        s.style.animationDelay = (5+Math.random()*3)+'s'; fragShard.appendChild(s);
    }
    ov.appendChild(fragShard);

    // 余烬
    const frag3 = document.createDocumentFragment();
    for (let i = 0; i < 60; i++) {
        const e = document.createElement('span'); e.className = 'rng-gs-ember';
        e.style.left = (30+Math.random()*40)+'%'; e.style.top = (40+Math.random()*55)+'%';
        e.style.width = e.style.height = (2+Math.random()*4)+'px';
        e.style.animationDuration = (3+Math.random()*6)+'s';
        e.style.animationDelay = (5+Math.random()*4)+'s'; frag3.appendChild(e);
    }
    ov.appendChild(frag3);

    setTimeout(() => ov.classList.add('out'), 10000);
    setTimeout(() => { __fxPlaying = false; ov.remove(); }, 11000);
}
let __fxPlaying = false;
const CUSTOM_FX = {
    wave: waveReveal,
    genesis: genesisReveal,
    nosr: nosrReveal,
};

function runFx(prize) {
    const level = fxLevel(prize.denom);
    if (level >= 3) {
        if (CUSTOM_FX[prize.tier]) {
            if (__fxPlaying) return;
            __fxPlaying = true;
            CUSTOM_FX[prize.tier]();
            return;
        }
    }
    const baseTpl = FX_TPL['L' + Math.min(level, 2)];
    if (!baseTpl) return;
    // L0: 名字动态色，装饰固定金；L1+: 全动态色
    const tpl = level >= 1
        ? { ...baseTpl, color: TIER_COLORS[prize.tier] || baseTpl.color }
        : { ...baseTpl, labelColor: TIER_COLORS[prize.tier] || '#e6b422' };
    genericReveal(prize, tpl);
}

function flashDisplay(el, color) {
    el.style.boxShadow = `0 0 50px 12px ${color}`;
    el.style.borderColor = color;
    setTimeout(() => { el.style.boxShadow = ''; el.style.borderColor = ''; }, 1200);
}
function flashScreen(color) {
    const f = document.createElement('div');
    f.style.cssText = `position:fixed;inset:0;z-index:9998;background:${color};pointer-events:none;animation:rngFsIn 0.3s ease-out forwards reverse`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 600);
}

// ============== 主模块 ==============

export async function initRNG() {
    const g = id => document.getElementById(id);
    const d = g('rngDisplay'), sym = g('rngSymbol'), lbl = g('rngLabel');
    const rar = g('rngRarity'), btn = g('rngRollBtn');
    const gallery = g('rngGallery'), stat = g('rngStats'), autoCb = g('rngAutoCb');

    if (!d || !sym || !btn) return;

    let busy = false, total = 0;
    const hits = {};
    POOL.forEach(p => hits[p.tier] = 0); const showPool = POOL.filter(p => !p.hidden);

    const drawGallery = () => {
        gallery.innerHTML = POOL.filter(p => !p.hidden).map(p => {
            const unlocked = hits[p.tier] > 0;
            return `<div class="rng-gallery-item${unlocked?' unlocked':''}" data-tier="${p.tier}">
                <span class="rng-gallery-sym">${p.symbol}</span>
                <span class="rng-gallery-name">${p.label}</span>
                <span class="rng-gallery-denom">1/${fmt(p.denom)}</span>
                <span class="rng-gallery-hit">${unlocked ? hits[p.tier] : ''}</span>
            </div>`;
        }).join('');
    };

    // 图鉴点击
    const replayFx = (tier) => {
        const prize = POOL.find(p => p.tier === tier);
        if (!prize) return;
        if (busy) return;
        busy = true;
        d.classList.remove('rng-bar-mega'); d.querySelectorAll('.rng-bar-beam').forEach(el => el.remove());
        // 快速模拟抽选动画（1s）
        sym.className = 'rng-symbol';
        rar.classList.remove('show');
        d.removeAttribute('data-tier');
        d.classList.remove('rng-bar-mega');
        d.classList.add('spinning');
        let frame = 0, spinFrames = 12;
        const tick = () => {
            if (frame >= spinFrames) {
                sym.className = 'rng-symbol landed';
                d.classList.remove('spinning');
                sym.textContent = prize.symbol;
                lbl.textContent = prize.label;
                rar.textContent = `1/${fmt(prize.denom)}`;
                rar.classList.add('show');
                d.setAttribute('data-tier', prize.tier);
                if (prize.denom >= 1000000) {
                    const clr = { genesis:'#fafafa', wave:'#0ea5e9', nosr:'#2f81f7' }[prize.tier] || '#fff';
                    d.style.boxShadow = `0 0 40px 10px ${clr}66, 0 0 80px 20px ${clr}26`;
                }
                if (prize.denom >= 1000000) d.classList.add('rng-bar-mega');
                const shake = prize.denom >= 100000 ? 'heavy' : prize.denom >= 10000 ? 'medium' : 'light';
                d.setAttribute('data-tier-shake', shake);
                setTimeout(() => {
                    d.removeAttribute('data-tier-shake');
                    sym.className = 'rng-symbol idle';
                    if (prize.denom >= 1000000) {
                        d.classList.add('rng-bar-mega');
                        d.querySelectorAll('.rng-bar-beam').forEach(el => el.remove());
                        const beam = document.createElement('div');
                        beam.className = 'rng-bar-beam';
                        d.appendChild(beam);
                setTimeout(() => beam.remove(), 3600);
            }
        }, 600);
                if (prize.denom >= 1000) { runFx(prize); burst(prize, null); }
                else { const c = TIER_COLORS[prize.tier] || '#fff'; d.style.boxShadow = `0 0 20px ${c}66`; setTimeout(() => d.style.boxShadow = '', 800); }
                busy = false;
                return;
            }
            sym.textContent = showPool[frame % showPool.length].symbol;
            sym.classList.remove('tick'); void sym.offsetWidth; sym.classList.add('tick');
            setTimeout(tick, 50 + frame * 10); frame++;
        };
        tick();
    };

    gallery.addEventListener('click', (e) => {
        const item = e.target.closest('.rng-gallery-item');
        if (!item) return;
        const tier = item.dataset.tier;
        if (!tier) return;
        // NOSR 解锁后任意点击 → 强行抽
        if (document.body.classList.contains('nosr-unlocked')) {
            if (window.rngForce) window.rngForce(tier);
            return;
        }
        // 已解锁 → 重播动画
        if (hits[tier] > 0) {
            replayFx(tier);
            return;
        }
        // 未解锁 → 摇晃拒绝
        item.classList.add('shake');
        setTimeout(() => item.classList.remove('shake'), 500);
    });

    const drawStats = () => {
        const parts = [`<span class="rng-stat-total">Total <strong>${total}</strong></span>`];
        LUCK_LEVELS.filter(l => l.every > 0).forEach(l => {
            const drawn = total % l.every;
            const now = drawn === 0;
            parts.push(now
                ? `<span class="rng-lucky-now">${l.label} ${l.name}!</span>`
                : `<span class="rng-lucky-count">${drawn}/${l.every} ${l.label}</span>`);
        });
        const show = POOL.filter(p => !p.hidden && (hits[p.tier] > 0 || p.denom >= 180));
        parts.push('<span class="rng-stat-hits">' +
            show.map(p => `<span class="rng-stat-hit">${p.symbol}<b class="${hits[p.tier]>0?'rng-stat-high':''}">${hits[p.tier]}</b></span>`).join('') +
            '</span>');
        if (!total) parts.push('<span></span>');
        stat.innerHTML = parts.join('');
    };

    const burst = (prize, luck) => {
        let list = BURST_SETS[prize.tier] || ['✨'];
        if (luck) list = [...list, ...Array(luck.mult > 5 ? 8 : 3).fill(luck.label)];
        let n = PARTICLES[prize.tier] || 3;
        if (luck) n = luck.mult > 5 ? n * 2 : Math.floor(n * 1.5);
        for (let i = 0; i < n; i++) {
            const p = document.createElement('span'); p.className = 'rng-particle';
            p.textContent = list[Math.floor(Math.random()*list.length)];
            p.style.left = `${20+Math.random()*60}%`; p.style.top = `${20+Math.random()*60}%`;
            p.style.setProperty('--px', `${(Math.random()-0.5)*180}px`);
            p.style.setProperty('--py', `${-30-Math.random()*100}px`);
            p.style.animationDuration = `${0.4+Math.random()*0.8}s`;
            p.style.fontSize = `${0.7+Math.random()*0.8}rem`;
            d.appendChild(p); setTimeout(() => p.remove(), 1300);
        }
    };

    const finish = (prize, luck) => {
        sym.className = 'rng-symbol landed';
        d.classList.remove('spinning');
        sym.textContent = prize.symbol;
        lbl.textContent = luck ? `${luck.label} ${prize.label}` : prize.label;
        const idx = POOL.findIndex(p => p.tier === prize.tier);
        rar.textContent = `1/${fmt(prize.denom)} · ${normal.probs[idx].toFixed(1)}%`;
        rar.classList.add('show');
        d.setAttribute('data-tier', prize.tier);

        // inline 保底辉光
        if (prize.denom >= 1000000) {
            const clr = { genesis:'#fafafa', wave:'#0ea5e9', nosr:'#2f81f7' }[prize.tier] || '#fff';
            d.style.boxShadow = `0 0 40px 10px ${clr}66, 0 0 80px 20px ${clr}26`;
        }

        // 按稀有度分级震动
        const shake = prize.denom >= 100000 ? 'heavy' : prize.denom >= 10000 ? 'medium' : 'light';
        d.setAttribute('data-tier-shake', shake);
        setTimeout(() => d.removeAttribute('data-tier-shake'), 600);

        // 落定后切换为悬浮呼吸
        setTimeout(() => {
            sym.className = 'rng-symbol idle';
            if (prize.denom >= 1000000) {
                d.classList.add('rng-bar-mega');
            }
        }, 600);

        hits[prize.tier]++;

        // NOSR 彩蛋永久效果
        if (prize.tier === 'nosr') {
            document.body.classList.add('nosr-unlocked');
        }

        burst(prize, luck);
        runFx(prize);
        if (luck) {
            if (luck.mult >= 1000) { flashScreen('rgba(255,215,0,0.25)'); flashDisplay(d, '#ffd700'); }
            else if (luck.mult >= 10) { flashScreen('rgba(248,81,73,0.2)'); flashDisplay(d, '#f85149'); }
            else if (luck.mult >= 3) flashDisplay(d, '#e6b422');
        }

        drawGallery(); drawStats();
        busy = false; btn.disabled = false;
    };

    const roll = (forceLuck = null) => {
        if (busy) return;
        busy = true; total++;
        d.classList.remove('rng-bar-mega'); d.querySelectorAll('.rng-bar-beam').forEach(el => el.remove());
        const luck = forceLuck || getLuck(total);
        btn.disabled = true; d.removeAttribute('data-tier');
        d.classList.add('spinning'); sym.className = 'rng-symbol'; rar.classList.remove('show');

        const r = Math.random();
        const data = luck ? (luckMap[luck.name.toLowerCase()] || normal) : normal;
        let idx = data.thresh.findIndex(t => r <= t);
        if (idx < 0) idx = POOL.length - 1;

        let frame = 0;
        const tick = () => {
            if (frame >= FRAMES) { finish(POOL[idx], luck); return; }
            sym.textContent = showPool[frame % showPool.length].symbol;
            sym.classList.remove('tick'); void sym.offsetWidth; sym.classList.add('tick');
            setTimeout(tick, delays[frame]); frame++;
        };
        tick();
    };

    btn.addEventListener('click', () => { initAudio(); roll(); });

    let autoTimer = null;
    autoCb.addEventListener('change', () => {
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
        if (autoCb.checked) {
            const loop = () => { if (!autoCb.checked) return; roll(); autoTimer = setTimeout(loop, 3800); };
            loop();
        }
    });

    drawGallery(); drawStats();

    // F12 调试
    const luckNames = {};
    LUCK_LEVELS.forEach(l => luckNames[l.name.toLowerCase()] = l);

    window.rngForce = (tier, luckName) => {
        const p = tier ? POOL.find(x => x.tier === tier) : null;
        let luck = null;
        if (typeof luckName === 'number') {
            luck = { every: 0, mult: luckName, label: '🧪', name: `${luckName}x` };
        } else if (luckName) {
            luck = luckNames[luckName.toLowerCase()] || null;
            if (!luck) { console.log('Unknown:', luckName, '| Use:', Object.keys(luckNames).join(', ')); return; }
        }
        if (p) { forceRoll(p, luck); return; }
        if (luck) { roll(luck); return; }
        roll();
    };

    window.rngList = (luckName) => {
        const data = luckName && luckMap[luckName.toLowerCase()] ? luckMap[luckName.toLowerCase()] : normal;
        const title = luckName ? `${luckName} (${luckNames[luckName.toLowerCase()]?.mult||'?'}x)` : 'Normal';
        console.group(`RNG Pool — ${title}`);
        console.table(POOL.filter(p=>!p.hidden).map((p, i) => ({
            tier: p.tier, denom: p.denom,
            prob: data.probs[i].toFixed(2)+'%',
            '1 in': Math.round(100/data.probs[i])||'∞',
        })));
        console.groupEnd();
        if (!luckName) {
            console.log('Auto:', LUCK_LEVELS.filter(l=>l.every>0).map(l=>`${l.name}=${l.mult}x /${l.every}`).join(', '),
                        '| Cmd:', LUCK_LEVELS.filter(l=>l.every===0).map(l=>`${l.name}=${l.mult}x`).join(', '));
        }
        console.log('rngForce("diamond") | rngForce("gold","x100") | rngForce(null,"x1K") | rngList("x10K")');
    };

    function forceRoll(prize, luck) {
        if (busy) return;
        busy = true; total++;
        d.classList.remove('rng-bar-mega'); d.querySelectorAll('.rng-bar-beam').forEach(el => el.remove());
        btn.disabled = true; d.removeAttribute('data-tier'); d.classList.remove('rng-bar-mega');
        d.classList.add('spinning'); sym.className = 'rng-symbol'; rar.classList.remove('show');
        let frame = 0;
        const tick = () => {
            if (frame >= FRAMES) { finish(prize, luck); return; }
            sym.textContent = showPool[frame % showPool.length].symbol;
            sym.classList.remove('tick'); void sym.offsetWidth; sym.classList.add('tick');
            setTimeout(tick, delays[frame]); frame++;
        };
        tick();
    }

    rngList();
}
