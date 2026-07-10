/**
 * sg-singularity.js — Singularity 黑洞揭示动画 (~10s)
 * GSAP master timeline drives all phase transitions & CSS animations
 * Three.js 3D black hole (dynamic import sg-blackhole.js) as supplementary layer
 * Canvas 2D particle fallback when Three.js unavailable
 * 7 阶段: ambient → collapse → disk → jets → hawking → text → burst
 *
 * 接收 ctx = { playDrone, playImpact, playChime, fxState }
 */

export function createSingularityReveal(ctx) {
    const { playDrone, playImpact, playChime, silenceAll, resumeAudio } = ctx;

    return async function singularityReveal() {
        const gsap = window.gsap;

        const ov = document.createElement('div');
        ov.className = 'rng-singularity';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;background:radial-gradient(ellipse at 50% 40%, #0a0015 0%, #050010 35%, #000 70%);';
        ov.innerHTML = `
            <div class="rng-sg-vignette"></div>
            <div class="rng-sg-distort d1"></div>
            <div class="rng-sg-distort d2"></div>
            <div class="rng-sg-distort d3"></div>
            <div class="rng-sg-lens"></div>
            <div class="rng-sg-disk"></div>
            <div class="rng-sg-orbit o1"></div>
            <div class="rng-sg-orbit o2"></div>
            <div class="rng-sg-orbit o3"></div>
            <div class="rng-sg-jet jet-up"></div>
            <div class="rng-sg-jet jet-down"></div>
            <div class="rng-sg-core"></div>
            <div class="rng-sg-flash"></div>
            <canvas class="rng-sg-canvas" id="rngSgCanvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;"></canvas>
            <div class="rng-sg-symbol-center"><span class="rng-sg-symbol"><span class="rng-sg-core-icon"></span></span></div>
            <div class="rng-sg-center">
                <span class="rng-sg-text">S I N G U L A R I T Y</span>
                <span class="rng-sg-sub">1 / 5,000,000</span>
            </div>
        `;
        document.body.appendChild(ov);

        // ── Try Three.js black hole (supplementary layer) ──
        let sgBH = null;
        try {
            const { createBlackHole } = await import('./sg-blackhole.js?v=260709b');
            sgBH = await createBlackHole(ov, /Mobi|Android/i.test(navigator.userAgent));
        } catch (e) {
            console.warn('Three.js black hole unavailable, using Canvas 2D:', e.message);
        }
        const hasThree = !!sgBH;

        // ── State ──
        let destroyed = false;
        let rafId = null;

        // ── Dimensions & device factor ──
        const W = innerWidth, H = innerHeight, CX = W / 2, CY = H / 2;
        const m = /Mobi|Android/i.test(navigator.userAgent) ? 0.4 : 1;

        // ── Canvas setup (only when Three.js unavailable) ──
        let canvas, cctx;
        if (!hasThree) {
            canvas = ov.querySelector('#rngSgCanvas');
            cctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr; canvas.height = H * dpr;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // ── Event horizon state (driven by GSAP tweens) ──
        let ehR = 0;
        const ehMaxR = 55;
        let ehGlow = 0;
        let shakeAmt = 0;

        // ── Particle system ──
        const particles = [];
        class Pt {
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

                // ambient: drift + twinkle
                if (this.type === 'ambient') {
                    this.x += this.vx; this.y += this.vy;
                    this.phase += 0.02;
                    this.alpha = this.baseAlpha * (0.5 + 0.5 * Math.sin(this.phase));
                    if (this.x < -10) this.x = W + 10;
                    if (this.x > W + 10) this.x = -10;
                    if (this.y < -10) this.y = H + 10;
                    if (this.y > H + 10) this.y = -10;
                }

                // cloud: large faint nebula blobs, slow drift
                if (this.type === 'cloud') {
                    this.x += this.vx; this.y += this.vy;
                    this.phase += 0.008;
                    this.alpha = this.baseAlpha * (0.6 + 0.4 * Math.sin(this.phase));
                    if (this.x < -this.size) this.x = W + this.size;
                    if (this.x > W + this.size) this.x = -this.size;
                    if (this.y < -this.size) this.y = H + this.size;
                    if (this.y > H + this.size) this.y = -this.size;
                }

                // warped: gravitationally attracted + tangential orbit
                if (this.type === 'warped') {
                    const dx = CX - this.x, dy = CY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const pull = Math.min(0.6, 250 / (dist * dist + 100));
                    this.vx += (dx / dist) * pull;
                    this.vy += (dy / dist) * pull;
                    this.vx += (-dy / dist) * pull * 0.4;
                    this.vy += (dx / dist) * pull * 0.4;
                    this.vx *= 0.992; this.vy *= 0.992;
                    this.x += this.vx; this.y += this.vy;
                    if (this.maxTrail > 0) {
                        this.trail.push({ x: this.x, y: this.y });
                        while (this.trail.length > this.maxTrail) this.trail.shift();
                    }
                    if (dist < ehR + 8) { this.decay = 0.1; this.trail = []; }
                }

                // infall: fast streaks toward center (collapse phase)
                if (this.type === 'infall') {
                    const dx = CX - this.x, dy = CY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = 3.5 + (1 - dist / Math.max(W, H)) * 6;
                    this.vx += (dx / dist) * force * 0.12;
                    this.vy += (dy / dist) * force * 0.12;
                    this.x += this.vx; this.y += this.vy;
                    this.trail.push({ x: this.x, y: this.y });
                    while (this.trail.length > this.maxTrail) this.trail.shift();
                    if (dist < ehR + 5) { this.decay = 0.15; this.trail = []; }
                }

                // accretion: fast orbital with Doppler color shift
                if (this.type === 'accretion') {
                    this.angle += this.orbitSpeed;
                    this.orbitR *= 0.9993;
                    const ex = 1.0, ey = 0.65;
                    this.x = CX + Math.cos(this.angle) * this.orbitR * ex;
                    this.y = CY + Math.sin(this.angle) * this.orbitR * ey;
                    const doppler = Math.cos(this.angle);
                    if (doppler > 0) {
                        this.color = '#93c5fd';
                    } else {
                        this.color = '#f97316';
                    }
                    this.alpha = Math.max(0.2, this.life * (0.5 + Math.abs(doppler) * 0.5));
                    if (this.orbitR < ehR + 12) { this.decay = 0.04; }
                }

                // jet: relativistic jet streams (vertical)
                if (this.type === 'jet') {
                    this.y += this.jetDir * this.jetSpeed;
                    this.x += Math.sin(this.phase + this.y * 0.015) * 0.4;
                    this.jetSpeed *= 0.997;
                    if (Math.abs(this.y - CY) > H * 0.48 || this.jetSpeed < 0.5) {
                        this.decay = 0.035;
                    }
                }

                // hawking: tiny quantum particles escaping horizon
                if (this.type === 'hawking') {
                    this.x += this.vx; this.y += this.vy;
                    this.vx *= 0.992; this.vy *= 0.992;
                    this.alpha = this.life * (0.5 + 0.5 * Math.sin(this.phase + elapsed * 0.008));
                    if (Math.abs(this.vx) + Math.abs(this.vy) < 0.15) this.decay = 0.03;
                }

                // burst: final radial explosion
                if (this.type === 'burst') {
                    this.x += this.vx; this.y += this.vy;
                    this.vx *= 0.98; this.vy *= 0.98;
                    if (Math.abs(this.vx) + Math.abs(this.vy) < 0.4) this.decay = 0.018;
                }
            }
            draw() {
                if (this.alpha < 0.01) return;
                if (this.trail.length > 1) {
                    cctx.beginPath();
                    cctx.moveTo(this.trail[0].x, this.trail[0].y);
                    for (let j = 1; j < this.trail.length; j++) {
                        cctx.lineTo(this.trail[j].x, this.trail[j].y);
                    }
                    cctx.strokeStyle = this.color;
                    cctx.globalAlpha = this.alpha * 0.25;
                    cctx.lineWidth = this.size * 0.4;
                    cctx.stroke();
                }
                const g = cctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2.2);
                g.addColorStop(0, this.color);
                g.addColorStop(1, 'transparent');
                cctx.globalAlpha = this.alpha;
                cctx.fillStyle = g;
                cctx.beginPath();
                cctx.arc(this.x, this.y, this.size * 2.2, 0, Math.PI * 2);
                cctx.fill();
            }
        }

        // ═══════════════════════════════════════════════════════
        //  GSAP Master Timeline — single animation driver
        // ═══════════════════════════════════════════════════════
        const tl = gsap ? gsap.timeline() : null;

        // Fallback: if GSAP unavailable, schedule via plain setTimeout
        const schedule = (fn, sec) => {
            if (tl) { tl.call(fn, [], sec); }
            else    { setTimeout(fn, sec * 1000); }
        };

        // ── Phase timing constants (seconds) ──
        const T = {
            COLLAPSE: 1.2,
            DISK:     2.2,
            JETS:     3.0,
            CHIME:    3.8,
            QUIET:    4.3,
            REVEAL:   5.5,
            BURST:    7.5,
            FADE:     9.0,
            REMOVE:  10.0
        };

        // ═══ Phase 1: Ambient starfield (t = 0) ═══
        function phaseAmbient() {
            playDrone(3000, 20, 0.4);
            if (hasThree) return; // Three.js renders its own starfield

            // Nebula clouds — large, faint, slow-drifting colored blobs
            for (let i = 0; i < Math.round(25 * m); i++) {
                const p = new Pt(Math.random() * W, Math.random() * H, 'cloud');
                p.size = 40 + Math.random() * 100;
                p.baseAlpha = 0.015 + Math.random() * 0.035;
                p.alpha = p.baseAlpha;
                p.vx = (Math.random() - 0.5) * 0.06;
                p.vy = (Math.random() - 0.5) * 0.04;
                p.color = ['#4c1d95','#581c87','#1e1b4b','#831843','#312e81'][Math.floor(Math.random()*5)];
                particles.push(p);
            }
            // Ambient stars — dense, twinkling
            for (let i = 0; i < Math.round(150 * m); i++) {
                const p = new Pt(Math.random() * W, Math.random() * H, 'ambient');
                p.size = 0.6 + Math.random() * 1.8;
                p.baseAlpha = 0.08 + Math.random() * 0.35;
                p.alpha = p.baseAlpha;
                p.vx = (Math.random() - 0.5) * 0.2;
                p.vy = (Math.random() - 0.5) * 0.2;
                p.color = ['#c084fc','#e9d5ff','#93c5fd','#fde68a','#f9a8d4','#fff'][Math.floor(Math.random()*6)];
                particles.push(p);
            }
            // Warped stars (pulled toward center with tangential drift)
            for (let i = 0; i < Math.round(55 * m); i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 160 + Math.random() * Math.min(W, H) * 0.4;
                const p = new Pt(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 'warped');
                p.size = 1.2 + Math.random() * 2.2;
                p.alpha = 0.5 + Math.random() * 0.5;
                p.life = 0.9;
                p.maxTrail = 5;
                p.color = Math.random() > 0.5 ? '#8b5cf6' : '#c084fc';
                particles.push(p);
            }
        }

        // ═══ Phase 2: Collapse — matter rushes inward (t = 1.2s) ═══
        function phaseCollapse() {
            playImpact(50);
            shakeAmt = 10;
            if (hasThree) { sgBH.collapse(); }

            if (!hasThree) {
                for (let i = 0; i < Math.round(50 * m); i++) {
                    const a = Math.random() * Math.PI * 2;
                    const d = 220 + Math.random() * Math.min(W, H) * 0.35;
                    const p = new Pt(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 'infall');
                    p.size = 1.5 + Math.random() * 2.5;
                    p.alpha = 0.8;
                    p.maxTrail = 10;
                    p.color = Math.random() > 0.4 ? '#8b5cf6' : '#ec4899';
                    particles.push(p);
                }
            }

            // Grow event horizon via GSAP (replaces manual rAF loop)
            if (gsap) {
                gsap.to({ r: 0 }, {
                    r: ehMaxR, duration: 0.8, ease: 'power2.out',
                    onUpdate() { ehR = this.targets()[0].r; ehGlow = ehR / ehMaxR; },
                    onComplete() { ehGlow = 1; }
                });
            } else {
                const growEH = () => {
                    if (destroyed || ehR >= ehMaxR) { ehGlow = 1; return; }
                    ehR += 2.5; ehGlow = ehR / ehMaxR;
                    requestAnimationFrame(growEH);
                };
                growEH();
            }
        }

        // ═══ Phase 3: Accretion disk (t = 2.2s) ═══
        function phaseDisk() {
            const disk = ov.querySelector('.rng-sg-disk');
            const lens = ov.querySelector('.rng-sg-lens');
            const orbits = ov.querySelectorAll('.rng-sg-orbit');

            if (gsap) {
                gsap.to(disk, { opacity: 0.65, duration: 1.5, ease: 'power2.out' });
                gsap.to(lens, { opacity: 0.8, duration: 1.2, ease: 'power2.out' });
                orbits.forEach((o, i) => gsap.to(o, { opacity: 1, duration: 0.8, delay: i * 0.25 }));
            } else {
                disk.style.opacity = '0.65'; lens.style.opacity = '0.8';
                orbits.forEach(o => o.style.opacity = '1');
            }

            if (hasThree) { sgBH.showDisk(); }

            if (!hasThree) {
                for (let i = 0; i < Math.round(70 * m); i++) {
                    const a = Math.random() * Math.PI * 2;
                    const r = ehMaxR + 20 + Math.random() * 190;
                    const p = new Pt(CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.65, 'accretion');
                    p.angle = a;
                    p.orbitR = r;
                    p.orbitSpeed = (0.012 + Math.random() * 0.025) * (180 / r);
                    p.size = 1.5 + Math.random() * 3;
                    p.alpha = 0.6 + Math.random() * 0.4;
                    p.color = '#f97316';
                    particles.push(p);
                }
            }
        }

        // ═══ Phase 4: Relativistic jets (t = 3.0s) ═══
        function phaseJets() {
            const jets = ov.querySelectorAll('.rng-sg-jet');
            if (gsap) {
                gsap.to(jets, { opacity: 0.55, duration: 1.8, stagger: 0.2, ease: 'power2.out' });
            } else {
                jets.forEach(j => j.style.opacity = '0.55');
            }

            if (hasThree) { sgBH.showJets(); }

            if (!hasThree) {
                const spawnJet = (dir) => {
                    for (let i = 0; i < Math.round(35 * m); i++) {
                        schedule(() => {
                            if (destroyed) return;
                            const p = new Pt(CX + (Math.random() - 0.5) * 5, CY, 'jet');
                            p.size = 1 + Math.random() * 2;
                            p.alpha = 0.85;
                            p.jetDir = dir;
                            p.jetSpeed = 5 + Math.random() * 12;
                            p.color = Math.random() > 0.35 ? '#8b5cf6' : '#60a5fa';
                            particles.push(p);
                        }, T.JETS + i * 0.055);
                    }
                };
                spawnJet(-1); // upward
                spawnJet(1);  // downward
            }
        }

        // ═══ Sound cue: chime at t = 3.8s ═══
        function soundChime() {
            playImpact(30);
            playChime([262, 330, 392, 523], 4);
        }

        // ═══ Phase 5: Information paradox — quiet moment (t = 4.3s) ═══
        function phaseQuiet() {
            const jets = ov.querySelectorAll('.rng-sg-jet');
            if (gsap) {
                gsap.to(jets, { opacity: 0, duration: 1.2, ease: 'power2.inOut' });
            } else {
                jets.forEach(j => { j.style.transition = 'opacity 1.2s'; j.style.opacity = '0'; });
            }

            // Show photon sphere
            const photon = document.createElement('div');
            photon.className = 'rng-sg-photon';
            ov.appendChild(photon);
            if (gsap) {
                gsap.to(photon, { opacity: 0.9, duration: 1, ease: 'power2.out' });
            } else {
                photon.style.opacity = '0.9';
            }

            if (hasThree) { sgBH.showHawking(); }

            if (!hasThree) {
                // Hawking radiation — recurring spawn via GSAP ticker
                if (gsap) {
                    let hawkingAcc = 0;
                    gsap.ticker.add(function hawkingTick(time, deltaTime) {
                        if (destroyed) { gsap.ticker.remove(hawkingTick); return; }
                        hawkingAcc += deltaTime * 1000;
                        if (hawkingAcc >= 180) {
                            hawkingAcc -= 180;
                            for (let i = 0; i < Math.round(3 * m); i++) {
                                const a = Math.random() * Math.PI * 2;
                                const r = ehR + 2 + Math.random() * 6;
                                const p = new Pt(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 'hawking');
                                p.size = 0.4 + Math.random() * 0.8;
                                p.alpha = 0.6;
                                p.life = 0.7;
                                p.vx = Math.cos(a) * (0.4 + Math.random() * 1.2);
                                p.vy = Math.sin(a) * (0.4 + Math.random() * 1.2);
                                p.color = '#ffffff';
                                particles.push(p);
                            }
                        }
                    });
                } else {
                    const spawnHawking = () => {
                        if (destroyed) return;
                        for (let i = 0; i < Math.round(3 * m); i++) {
                            const a = Math.random() * Math.PI * 2;
                            const r = ehR + 2 + Math.random() * 6;
                            const p = new Pt(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 'hawking');
                            p.size = 0.4 + Math.random() * 0.8;
                            p.alpha = 0.6;
                            p.life = 0.7;
                            p.vx = Math.cos(a) * (0.4 + Math.random() * 1.2);
                            p.vy = Math.sin(a) * (0.4 + Math.random() * 1.2);
                            p.color = '#ffffff';
                            particles.push(p);
                        }
                        setTimeout(spawnHawking, 180);
                    };
                    spawnHawking();
                }
            }
        }

        // ═══ Phase 6: Text reveal (t = 5.5s) ═══
        function phaseReveal() {
            playChime([523, 659, 784, 1047, 1319], 3);

            // Shockwave ring
            const shock = document.createElement('div');
            shock.className = 'rng-sg-shock';
            shock.style.animation = 'sgShockExpand 1.8s ease-out forwards';
            ov.appendChild(shock);

            // Gravitational waves
            for (let i = 0; i < 3; i++) {
                schedule(() => {
                    if (destroyed) return;
                    const wave = document.createElement('div');
                    wave.className = 'rng-sg-wave';
                    wave.style.animation = 'sgWavePulse 2.5s ease-out forwards';
                    ov.appendChild(wave);
                    // Auto-remove wave after animation
                    if (gsap) {
                        gsap.delayedCall(2.6, () => wave.remove());
                    } else {
                        setTimeout(() => wave.remove(), 2600);
                    }
                }, T.REVEAL + i * 0.5);
            }

            // Reveal text
            const symBox = ov.querySelector('.rng-sg-symbol-center');
            const center = ov.querySelector('.rng-sg-center');
            const textEl = center.querySelector('.rng-sg-text');
            const subEl = center.querySelector('.rng-sg-sub');

            if (gsap) {
                symBox.style.animation = 'none';
                gsap.fromTo(symBox, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' });
                center.style.opacity = '1';
                // Split letters for stagger
                const letters = textEl.textContent.trim().split('').map(ch => {
                    const s = document.createElement('span');
                    s.textContent = ch === ' ' ? '\u00A0' : ch;
                    s.style.display = 'inline-block';
                    return s;
                });
                textEl.textContent = '';
                letters.forEach(l => textEl.appendChild(l));

                const tlReveal = gsap.timeline();
                tlReveal.fromTo(letters,
                    { opacity: 0, y: 40, scale: 0.3 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.055, ease: 'back.out(2.5)' });
                tlReveal.fromTo(subEl,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
                    0.8);
            } else {
                symBox.style.animation = 'none'; symBox.style.opacity = '1';
                center.style.opacity = '1';
                center.style.transition = 'opacity 0.8s ease-out';
            }
        }

        // ═══ Phase 7: Final burst (t = 7.5s) ═══
        function phaseBurst() {
            // 恢复音量 — 静默后的冲击力
            resumeAudio();
            shakeAmt = 14;

            // Core flash
            const core = ov.querySelector('.rng-sg-core');
            const flash = ov.querySelector('.rng-sg-flash');
            if (gsap) {
                gsap.fromTo(core, { opacity: 0, scale: 0 },
                    { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out',
                      onComplete: () => gsap.to(core, { opacity: 0, scale: 4, duration: 1.5, ease: 'power2.out' }) });
                gsap.fromTo(flash, { opacity: 0 },
                    { opacity: 1, duration: 0.15,
                      onComplete: () => gsap.to(flash, { opacity: 0, duration: 1.2, ease: 'power2.in' }) });
            } else {
                core.style.opacity = '1';
                setTimeout(() => { core.style.opacity = '0'; }, 400);
            }

            if (hasThree) { sgBH.burst(); }

            if (!hasThree) {
                for (let i = 0; i < Math.round(90 * m); i++) {
                    const a = Math.random() * Math.PI * 2;
                    const speed = 3 + Math.random() * 12;
                    const p = new Pt(CX, CY, 'burst');
                    p.vx = Math.cos(a) * speed;
                    p.vy = Math.sin(a) * speed;
                    p.size = 1.5 + Math.random() * 3.5;
                    p.alpha = 0.95;
                    p.color = ['#ffffff','#c084fc','#ec4899','#8b5cf6'][Math.floor(Math.random()*4)];
                    particles.push(p);
                }
            }
        }

        // ═══ Fade out (t = 9.0s) ═══
        function doFade() {
            if (hasThree) {
                sgBH?.fadeOut();
            } else if (gsap) {
                gsap.to(ov, { opacity: 0, duration: 1, ease: 'power2.in' });
            } else {
                ov.style.transition = 'opacity 1s ease-in';
                ov.style.opacity = '0';
            }
        }

        // ═══ Cleanup (t = 10.0s) ═══
        function doCleanup() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            sgBH?.destroy();
            if (hasThree) window.removeEventListener('resize', onResize);
            ctx.fxState.done();
            ov.remove();
        }

        // ── Schedule all phases on the master timeline ──
        phaseAmbient();                               // runs immediately at t=0
        schedule(phaseCollapse, T.COLLAPSE);          // 1.2s
        schedule(phaseDisk,     T.DISK);              // 2.2s
        schedule(phaseJets,     T.JETS);              // 3.0s
        schedule(soundChime,    T.CHIME);             // 3.8s
        schedule(phaseQuiet,    T.QUIET);             // 4.3s
        schedule(phaseReveal,   T.REVEAL);            // 5.5s
        //  burst 前 200ms 全局静默 — 制造 "万物屏息" 的戏剧张力
        schedule(silenceAll,    T.BURST - 0.2);       // 7.3s
        schedule(phaseBurst,    T.BURST);             // 7.5s
        schedule(doFade,        T.FADE);              // 9.0s
        schedule(doCleanup,     T.REMOVE);            // 10.0s

        // ── Shake decay (GSAP-driven, replaces per-frame *= 0.91) ──
        if (gsap) {
            gsap.ticker.add(function shakeTick() {
                if (destroyed) { gsap.ticker.remove(shakeTick); return; }
                if (shakeAmt > 0.3) {
                    shakeAmt *= 0.91;
                } else {
                    shakeAmt = 0;
                }
            });
        }

        // ── Draw loop (pure rendering — GSAP handles all state transitions) ──
        const startTime = performance.now();
        const draw = () => {
            if (destroyed) return;

            // Compute shake offset once — shared by CSS overlay & canvas
            let sx = 0, sy = 0;
            if (shakeAmt > 0.3) {
                sx = (Math.random() - 0.5) * shakeAmt;
                sy = (Math.random() - 0.5) * shakeAmt;
                ov.style.transform = `translate(${sx}px,${sy}px)`;
            } else if (ov.style.transform) {
                ov.style.transform = '';
            }

            if (hasThree) {
                // Three.js renders its own scene; shake handled via CSS above
            } else {
                const elapsed = performance.now() - startTime;

                // Apply canvas shake offset (same values as CSS)
                if (shakeAmt > 0.3) {
                    cctx.save();
                    cctx.translate(sx, sy);
                }

                cctx.clearRect(-20, -20, W + 40, H + 40);

                // ── Event horizon (black disk) ──
                if (ehR > 0) {
                    cctx.globalAlpha = 1;
                    cctx.fillStyle = '#000';
                    cctx.beginPath();
                    cctx.arc(CX, CY, ehR, 0, Math.PI * 2);
                    cctx.fill();

                    // Bright white rim
                    cctx.strokeStyle = `rgba(255,255,255,${0.5 * ehGlow})`;
                    cctx.lineWidth = 1.5;
                    cctx.stroke();

                    // Inner purple glow ring
                    const ig = cctx.createRadialGradient(CX, CY, ehR * 0.85, CX, CY, ehR + 45);
                    ig.addColorStop(0, 'transparent');
                    ig.addColorStop(0.4, `rgba(139,92,246,${0.35 * ehGlow})`);
                    ig.addColorStop(0.7, `rgba(236,72,153,${0.12 * ehGlow})`);
                    ig.addColorStop(1, 'transparent');
                    cctx.fillStyle = ig;
                    cctx.beginPath();
                    cctx.arc(CX, CY, ehR + 45, 0, Math.PI * 2);
                    cctx.fill();

                    // Outer soft glow
                    const og = cctx.createRadialGradient(CX, CY, ehR, CX, CY, ehR + 90);
                    og.addColorStop(0, `rgba(139,92,246,${0.18 * ehGlow})`);
                    og.addColorStop(0.5, `rgba(236,72,153,${0.06 * ehGlow})`);
                    og.addColorStop(1, 'transparent');
                    cctx.fillStyle = og;
                    cctx.beginPath();
                    cctx.arc(CX, CY, ehR + 90, 0, Math.PI * 2);
                    cctx.fill();
                }

                // ── Particles ──
                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update(elapsed);
                    particles[i].draw();
                    if (particles[i].alpha <= 0.005 && particles[i].life <= 0) particles.splice(i, 1);
                }

                cctx.globalAlpha = 1;
                if (shakeAmt > 0.3) cctx.restore();
            }

            rafId = requestAnimationFrame(draw);
        };
        draw();

        // ── Resize handler (Three.js supplementary layer) ──
        const onResize = () => { sgBH?.handleResize(); };
        if (hasThree) window.addEventListener('resize', onResize);

        // ── Safety net (independent of GSAP timeline — always fires) ──
        setTimeout(() => {
            if (!destroyed) {
                destroyed = true;
                if (rafId) cancelAnimationFrame(rafId);
                sgBH?.destroy();
                if (hasThree) window.removeEventListener('resize', onResize);
                ctx.fxState.done();
                ov.remove();
            }
        }, 11500);
    };
}
