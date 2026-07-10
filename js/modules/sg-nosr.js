/**
 * sg-nosr.js — NOSR 科技揭示动画 (15s)
 * Canvas 数据流 + 神经网络 + GSAP 时间轴 + 骇入序列
 *
 * 接收 ctx = { playDrone, playImpact, playChime, playHackBreach, fxState }
 */

export function createNosrReveal(ctx) {
    const { playDrone, playImpact, playChime, playHackBreach } = ctx;

    return function nosrReveal() {
        const gsap = window.gsap;
        const ov = document.createElement('div');
        ov.className = 'rng-nosr-tech';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;';
        ov.innerHTML = `
            <canvas class="rng-nt-canvas" id="rngNtCanvas"></canvas>
            <div class="rng-nt-bg"></div>
            <div class="rng-nt-grid"></div>
            <svg class="rng-nt-neural" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
                <g class="rng-nt-links" fill="none" stroke-width="0.8">
                    ${(()=>{ let s=''; for(let i=0;i<18;i++){ const ax=100+Math.random()*1000,ay=100+Math.random()*600,bx=100+Math.random()*1000,by=100+Math.random()*600; s+=`<path class="rng-nt-link" d="M${ax},${ay} L${bx},${by}"/>`; } return s; })()}
                </g>
                <g class="rng-nt-nodes">${(()=>{ let s=''; for(let i=0;i<16;i++){ s+=`<circle class="rng-nt-nn" cx="${100+Math.random()*1000}" cy="${100+Math.random()*600}" r="${2+Math.random()*4}"/>`; } return s; })()}</g>
            </svg>
            <div class="rng-nt-scan"></div>
            <div class="rng-nt-scan rng-nt-scan-rev"></div>
            <div class="rng-nt-star"><svg viewBox="0 0 200 200"><polygon points="100,4 116,64 168,32 136,84 196,100 136,116 168,168 116,136 100,196 84,136 32,168 64,116 4,100 64,84 32,32 84,64"/></svg></div>
            <div class="rng-nt-terminal" id="rngNtTerm"></div>
            <div class="rng-nt-rings">
                <div class="rng-nt-ring r1"></div><div class="rng-nt-ring r2"></div><div class="rng-nt-ring r3"></div>
            </div>
            <div class="rng-nt-core"></div>
            <div class="rng-nt-symbol-center"><span class="rng-nt-symbol">🌐</span></div>
            <div class="rng-nt-center">
                <span class="rng-nt-text">N O S R</span>
                <span class="rng-nt-sub">1 / 7,777,777</span>
            </div>
        `;
        document.body.appendChild(ov);

        // 销毁标+ Canvas RAF 资源
        let destroyed = false;
        let rafId = null;
        const timers = [];
        const intervals = [];
        const listeners = [];
        const doCleanup = () => {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            timers.forEach(id => clearTimeout(id));
            intervals.forEach(id => clearInterval(id));
            listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
            rafId = null; timers.length = intervals.length = listeners.length = 0;
        };

        // ===== GSAP 主时间轴 =====
        const gsapLib = window.gsap;
        const tl = gsapLib ? gsapLib.timeline({ onComplete: () => { doCleanup(); ctx.fxState.done(); ov.remove(); } }) : null;

        // 保底清理6s 后强制移overlay（防timeline 不触onComplete
        timers.push(setTimeout(() => {
            if (!destroyed) { doCleanup(); ctx.fxState.done(); ov.remove(); }
        }, 16000));

        // ── 音效 ──
        playDrone(6000, 30, 0.35);
        if (tl) {
            tl.call(() => { playImpact(40); playChime([196,247,294,392,587], 3.5); }, null, 6);
        } else {
            setTimeout(() => { playImpact(40); playChime([196,247,294,392,587], 3.5); }, 6000);
        }

        // ── Canvas 数据──
        const canvas = ov.querySelector('#rngNtCanvas');
        if (canvas) {
            const cctx = canvas.getContext('2d');
            let trail = 0.12;
            const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
            resize();
            listeners.push([window, 'resize', resize]);
            window.addEventListener('resize', resize);

            const particles = Array.from({length: 200}, () => ({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: (Math.random()-0.5)*0.6, vy: (Math.random()-0.5)*0.6,
                c: ['0','1','.',':','*','#','%','$','@'][Math.floor(Math.random()*9)],
                life: Math.random(), age: 0
            }));
            const sweeps = Array.from({length: 3}, () => ({
                y: Math.random() * canvas.height, speed: 0.3+Math.random()*0.7, dir: Math.random()>0.5?1:-1
            }));
            const webIcons = ['🌐','🔷','🔓','{ }','[ ]','<>','</>','#','*','🔗','📡','💻','⚡','🔌'];
            const iconParticles = Array.from({length: 50}, () => {
                const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 4;
                return {
                    x: canvas.width / 2, y: canvas.height / 2,
                    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    size: 8 + Math.random() * 14,
                    life: 0, decay: 0.003 + Math.random() * 0.005,
                    emoji: webIcons[Math.floor(Math.random() * webIcons.length)],
                    born: performance.now() + 3000 + Math.random() * 6000
                };
            });
            const draw = () => {
                if (destroyed) return;
                cctx.fillStyle = `rgba(0,0,0,${trail})`;
                cctx.fillRect(0, 0, canvas.width, canvas.height);
                cctx.font = '12px "Fira Code",Consolas,monospace';
                cctx.shadowBlur = 0;
                for (const p of particles) {
                    p.x += p.vx; p.y += p.vy; p.age++;
                    if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
                    if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
                    if (p.age > 300) { p.age = 0; p.x = Math.random()*canvas.width; p.y = Math.random()*canvas.height; }
                    const alpha = 0.1 + 0.3 * Math.sin(p.age * 0.05 + p.life * 10);
                    cctx.fillStyle = p.c === '1' || p.c === '0' ? `rgba(47,129,247,${alpha})` : `rgba(47,129,247,${alpha*0.4})`;
                    cctx.fillText(p.c, p.x, p.y);
                }
                for (const s of sweeps) {
                    s.y += s.speed * s.dir;
                    if (s.y < -10) { s.y = canvas.height + 10; s.speed = 0.3+Math.random()*0.7; }
                    if (s.y > canvas.height + 10) { s.y = -10; s.speed = 0.3+Math.random()*0.7; }
                    cctx.strokeStyle = 'rgba(47,129,247,0.15)'; cctx.lineWidth = 1;
                    cctx.beginPath(); cctx.moveTo(0, s.y); cctx.lineTo(canvas.width, s.y); cctx.stroke();
                    if (Math.random() > 0.97) {
                        cctx.shadowBlur = 20; cctx.shadowColor = '#2f81f7';
                        cctx.strokeStyle = 'rgba(47,129,247,0.4)'; cctx.lineWidth = 2;
                        cctx.beginPath(); cctx.moveTo(0, s.y); cctx.lineTo(canvas.width, s.y); cctx.stroke();
                        cctx.shadowBlur = 0;
                    }
                }
                // Icon particles — emoji drifting outward
                const now = performance.now();
                for (const ip of iconParticles) {
                    if (now < ip.born) continue;
                    ip.x += ip.vx; ip.y += ip.vy;
                    ip.vx *= 0.995; ip.vy *= 0.995;
                    // 边界反弹 — 防止图标超出 Canvas 被裁剪
                    const margin = ip.size * 2;
                    if (ip.x < margin) { ip.x = margin; ip.vx = Math.abs(ip.vx); }
                    if (ip.x > canvas.width - margin) { ip.x = canvas.width - margin; ip.vx = -Math.abs(ip.vx); }
                    if (ip.y < margin) { ip.y = margin; ip.vy = Math.abs(ip.vy); }
                    if (ip.y > canvas.height - margin) { ip.y = canvas.height - margin; ip.vy = -Math.abs(ip.vy); }
                    ip.life -= ip.decay;
                    if (ip.life <= 0) {
                        const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 4;
                        ip.x = canvas.width / 2; ip.y = canvas.height / 2;
                        ip.vx = Math.cos(a) * spd; ip.vy = Math.sin(a) * spd;
                        ip.life = 1;
                        ip.emoji = webIcons[Math.floor(Math.random() * webIcons.length)];
                    }
                    cctx.globalAlpha = ip.life * 0.6;
                    cctx.font = ip.size + 'px sans-serif';
                    cctx.fillText(ip.emoji, ip.x, ip.y);
                }
                cctx.globalAlpha = 1;
                rafId = requestAnimationFrame(draw);
            };
            draw();
            // Canvas trail fade at 13s
            if (tl) {
                tl.to({}, { duration: 2, onUpdate: function() { trail = Math.min(0.35, trail + 0.008 * (1/60)); } }, 13);
            } else {
                timers.push(setTimeout(() => {
                    const iv = setInterval(() => { trail = Math.min(0.35, trail + 0.008); }, 200);
                    intervals.push(iv);
                    timers.push(setTimeout(() => clearInterval(iv), 2000));
                }, 13000));
            }
        }

        // ── 神经网络呼吸 ──
        const neural = ov.querySelector('.rng-nt-neural');
        if (neural) {
            const nnodes = neural.querySelectorAll('.rng-nt-nn');
            const stored = Array.from(nnodes).map(n => ({ el: n, cx: +n.getAttribute('cx'), cy: +n.getAttribute('cy') }));
            const breathe = setInterval(() => {
                if (destroyed) { clearInterval(breathe); return; }
                for (const s of stored) {
                    s.el.setAttribute('cx', s.cx + (Math.random() - 0.5) * 40);
                    s.el.setAttribute('cy', s.cy + (Math.random() - 0.5) * 25);
                }
            }, 2500);
            intervals.push(breathe);
        }

        // ── 骇入序列（GSAP / fallback 共用）──
        const createHackSequence = () => {
            if (destroyed) return;
            playHackBreach();
            const xo = document.createElement('div');
            xo.className = 'rng-nt-hack';
            xo.innerHTML = `<div class="rng-nt-hack-bars"></div><div class="rng-nt-hack-overlay"></div><div class="rng-nt-hack-text"><div class="rng-nt-hack-line l1">[!] UNAUTHORIZED ACCESS DETECTED</div><div class="rng-nt-hack-line l2">[!] FIREWALL BYPASSED → NOSR://ROOT</div><div class="rng-nt-hack-line l3">[>] INJECTING PAYLOAD... ████████████ 100%</div><div class="rng-nt-hack-line l4">[✓] SYSTEM COMPROMISED — 7,777,777 NODES BREACHED</div></div><div class="rng-nt-hack-glitch"></div>`;
            xo.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;';
            ov.appendChild(xo);
            timers.push(setTimeout(() => { if (!destroyed) xo.classList.add('tear'); }, 200));
            timers.push(setTimeout(() => { if (!destroyed) { xo.classList.add('redflash'); xo.classList.add('shake'); } }, 600));
            timers.push(setTimeout(() => { if (!destroyed) xo.classList.add('reveal'); }, 800));
            timers.push(setTimeout(() => { if (!destroyed) xo.classList.add('fadeout'); }, 1800));
        };

        // ── GSAP CSS 元素动画 ──
        if (tl) {
            // Canvas fade in
            tl.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 2 }, 1);
            // Scan lines
            const scans = ov.querySelectorAll('.rng-nt-scan');
            tl.fromTo(scans, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1);
            // Grid
            const grid = ov.querySelector('.rng-nt-grid');
            tl.fromTo(grid, { opacity: 0 }, { opacity: 1, duration: 1 }, 2);
            // Neural network
            tl.fromTo(neural, { opacity: 0 }, { opacity: 1, duration: 1 }, 3);
            // Star
            const star = ov.querySelector('.rng-nt-star');
            tl.fromTo(star, { opacity: 0 }, { opacity: 1, duration: 1 }, 4);
            // Rings
            const rings = ov.querySelector('.rng-nt-rings');
            tl.fromTo(rings, { opacity: 0 }, { opacity: 1, duration: 1 }, 5);
            // Center reveal
            const symBox = ov.querySelector('.rng-nt-symbol-center');
            symBox.style.animation = 'none'; symBox.style.opacity = '0';
            const center = ov.querySelector('.rng-nt-center');
            center.style.animation = 'none'; center.style.opacity = '1';
            const symEl = symBox.querySelector('.rng-nt-symbol');
            const textEl = center.querySelector('.rng-nt-text');
            const subEl = center.querySelector('.rng-nt-sub');
            const textLetters = textEl.textContent.trim().split('').map(ch => {
                const s = document.createElement('span'); s.textContent = ch; return s;
            });
            textEl.textContent = ''; textLetters.forEach(l => textEl.appendChild(l));
            tl.fromTo(symBox, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 5.8);
            tl.fromTo(symEl, { opacity: 0, scale: 0, rotate: -20 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: 'back.out(3)' }, 6);
            tl.fromTo(textLetters, { opacity: 0, y: 50, scale: 0.3 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 6.1);
            tl.fromTo(subEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 6.6);

            // Glitch burst on text at 8s
            tl.call(() => {
                if (destroyed) return;
                const gtl = gsapLib.timeline();
                gtl.to(textEl, { x: -4, textShadow: '-3px 0 #ff0040, 3px 0 #00ffea', duration: 0.05 });
                gtl.to(textEl, { x: 3, textShadow: '3px 0 #ff0040, -3px 0 #00ffea', duration: 0.05 });
                gtl.to(textEl, { x: -2, textShadow: '-2px 0 #ff0040, 2px 0 #00ffea', duration: 0.05 });
                gtl.to(textEl, { x: 4, textShadow: '2px 0 #ff0040, -2px 0 #00ffea', duration: 0.05 });
                gtl.to(textEl, { x: 0, textShadow: '0 0 30px rgba(47,129,247,0.8)', duration: 0.1,
                    onComplete: () => { textEl.style.animation = 'rngNtTextGlow 3s ease-in-out infinite'; }
                });
            }, null, 8);

            // ── Data surge at 9.5s — visual climax between reveal and hack ──
            tl.call(() => {
                if (destroyed) return;
                const flash = document.createElement('div');
                flash.className = 'rng-nt-surge';
                ov.appendChild(flash);
                document.body.style.animation = 'rngShake 0.5s ease-out';
                timers.push(setTimeout(() => { document.body.style.animation = ''; }, 500));
                timers.push(setTimeout(() => flash.remove(), 1200));
            }, null, 9.5);

            // Hack sequence at 12.5s
            tl.call(createHackSequence, null, 12.5);

            // Fade out 15s
            tl.to(ov, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 15);
        } else {
            // Fallback: CSS animations
            timers.push(setTimeout(createHackSequence, 12500));
            timers.push(setTimeout(() => { if (!destroyed) ov.classList.add('out'); }, 15000));
            timers.push(setTimeout(() => { if (!destroyed) { ctx.fxState.done(); } doCleanup(); ov.remove(); }, 15800));
        }

        // ── 浮游光点 + 粒子 ──
        // sparks 使用 CSS 动画（不GSAP repeat:-1，否timeline Infinity
        for (let i = 0; i < 80; i++) {
            const s = document.createElement('span'); s.className = 'rng-nt-spark';
            s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
            s.style.animationDuration = (2+Math.random()*5)+'s'; s.style.animationDelay = (1+Math.random()*10)+'s';
            ov.appendChild(s);
        }


        // 光标闪烁
        const term = ov.querySelector('#rngNtTerm');
        timers.push(setTimeout(() => {
            if (destroyed) return;
            const prompt = document.createElement('div');
            prompt.className = 'rng-nt-codeline c4';
            prompt.innerHTML = '$ <span class="rng-nt-cursor">▌</span>';
            term.appendChild(prompt);
        }, 12800));

        // ── Typewriter ──
        const termLines = [
            { t:"$ curl -s https://api.nosr.top/v1/inference \\", c:'',   d:4.0 },
            { t:'  -H "Authorization: Bearer ****"',             c:'',   d:4.6 },
            { t:'HTTP/2 200  {"tier":"NOSR","prob":"1/7,777,777"}', c:'c2', d:5.4 },
            { t:'$ ssh -p 7777 nosr@core.nosr.top',              c:'c3', d:6.2 },
            { t:'nosr@core:~$ npx wrangler deploy --env prod',   c:'c3', d:6.8 },
            { t:'▶ Deploying to 330 edge locations...',           c:'c3', d:7.6 },
            { t:'▶ [nosr] 7,777,777 nodes · live in 7.7s',       c:'c4', d:8.4 },
            { t:'══════════════════════════════════════',         c:'c4', d:9.0 },
            { t:'$ breach core.nosr.top',                         c:'c2', d:9.8 },
            { t:'Firewall bypassed · [████████] 100%',             c:'c2', d:10.6 },
            { t:'Kernel hooks injected · [████████] OK',           c:'c3', d:11.2 },
            { t:'ACCESS GRANTED ▶ initiating breach sequence',     c:'c4', d:11.8 },
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
                if (destroyed || !el.parentElement) return;
                if (i <= text.length) {
                    el.textContent = text.slice(0, i) + (i < text.length ? '▌' : '');
                    i++;
                    timers.push(setTimeout(type, 20 + Math.random() * 40));
                } else {
                    el.textContent = text;
                }
            };
            timers.push(setTimeout(type, delay));
        });
    };
}
