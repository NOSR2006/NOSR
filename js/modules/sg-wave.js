/**
 * sg-wave.js — Wave 海洋揭示动画 (~10s)
 * CSS + GSAP 主力视觉 + Three.js bokeh 点缀层
 *
 * 接收 ctx = { playDrone, playImpact, playRipple, fxState }
 */

export function createWaveReveal(ctx) {
    const { playDrone, playImpact, playRipple } = ctx;

    return async function waveReveal() {
        const gsap = window.gsap;

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
            <div class="rng-wave-symbol-center"><span class="rng-wave-symbol">🌊</span></div>
            <div class="rng-wave-center">
                <span class="rng-wave-text">W A V E</span>
                <span class="rng-wave-sub">1 / 3,333,333</span>
            </div>
        `;
        document.body.appendChild(ov);

        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const wm = isMobile ? 0.4 : 1;

        // ── Three.js 氛围层 (异步, 可选) ──
        let wvScene = null;
        try {
            const { createWaveScene } = await import('./sg-wave-scene.js?v=260707z');
            wvScene = await createWaveScene(ov, isMobile);
        } catch (e) {
            console.warn('Three.js wave accent unavailable:', e.message);
        }

        // Three.js 替代 CSS lightbeams → 隐藏
        if (wvScene) {
            const lb = ov.querySelector('.rng-wave-lightbeams');
            if (lb) lb.style.display = 'none';
        }

        // ── CSS 海洋生物 / 气泡 / 光点 (Three.js 激活时跳过, 由 Three 替代) ──
        if (!wvScene) {
            // 海洋生物
            const seaLife = ['🐠','🐟','🐡','🦈','🐋','🐳','🐬','🦭','🐙','🦑','🦀','🦞'];
            const fishCount = Math.round(22 * wm);
            for (let i = 0; i < fishCount; i++) {
                const f = document.createElement('span'); f.className = 'rng-wave-fish';
                f.textContent = seaLife[Math.floor(Math.random() * seaLife.length)];
                f.style.top = (5 + Math.random() * 72) + '%';
                f.style.fontSize = (1 + Math.random() * 2.5) + 'rem';
                ov.appendChild(f);
            }

            // 气泡
            const bubbleCount = Math.round(40 * wm);
            for (let i = 0; i < bubbleCount; i++) {
                const b = document.createElement('span'); b.className = 'rng-wave-bubble';
                b.style.left = Math.random() * 100 + '%';
                b.style.width = b.style.height = (3 + Math.random() * 12) + 'px';
                ov.appendChild(b);
            }

            // 浮游光点
            const sparkCount = Math.round(50 * wm);
            for (let i = 0; i < sparkCount; i++) {
                const s = document.createElement('span'); s.className = 'rng-wave-spark';
                s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
                ov.appendChild(s);
            }
        }

        // ── 音效 ──
        playDrone(2000, 40, 0.3);

        // ══════════════════════════════════════
        // GSAP 路径 (主力)
        // ══════════════════════════════════════
        if (gsap) {
            const tl = gsap.timeline({
                onComplete: () => {
                    ctx.fxState.done(); ov.remove();
                    if (wvScene) wvScene.destroy();
                }
            });

            // 海洋生物游泳
            ov.querySelectorAll('.rng-wave-fish').forEach(f => {
                const t = 5 + Math.random() * 5;
                const delay = Math.random() * 1.5;
                tl.fromTo(f,
                    { x: 0, y: 0, scaleX: -1, rotate: 2, opacity: 0 },
                    { x: '110vw', y: 0, opacity: 0.85, duration: t, ease: 'none' },
                    delay
                );
                tl.to(f, { y: -15 + Math.random() * 10, duration: t * 0.25, ease: 'sine.inOut', yoyo: true, repeat: 3 }, delay);
            });

            // 气泡上浮 (不单独淡出, 随 overlay 整体退场)
            ov.querySelectorAll('.rng-wave-bubble').forEach(b => {
                tl.fromTo(b,
                    { y: 0, x: 0, scale: 1 },
                    { y: '-110vh', x: (Math.random() - 0.5) * 30, scale: 0.2, duration: 4 + Math.random() * 5, ease: 'none' },
                    Math.random() * 6
                );
            });

            // 浮游光点脉动 (不单独淡出, 随 overlay 整体退场)
            ov.querySelectorAll('.rng-wave-spark').forEach(s => {
                s.style.opacity = '0.8';
                tl.fromTo(s,
                    { scale: 0.5 },
                    { scale: 1.5, duration: 1.5, yoyo: true, repeat: 3, ease: 'power1.inOut' },
                    Math.random() * 5
                );
            });

            // 冲击 2s + 焦散脉冲
            const shock = ov.querySelector('.rng-wave-shock');
            // 先重置: 清除 CSS animation forwards 锁定的末态 (scale 3.5)
            shock.style.opacity = '0';
            shock.style.transform = 'scale(0)';
            shock.style.animation = 'none';
            tl.call(() => playImpact(55), null, 2);
            tl.call(() => { if (wvScene && wvScene.triggerPulse) wvScene.triggerPulse(); }, null, 2);
            tl.fromTo(shock, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 2);
            tl.to(shock, { opacity: 0, scale: 1.5, duration: 1.5, ease: 'power2.in' }, 2.8);

            // 波浪层 2s (缓慢浮现)
            const waves = ov.querySelector('.rng-wave-waves');
            waves.style.opacity = '0';
            waves.style.animation = 'none';
            tl.fromTo(waves, { opacity: 0 }, { opacity: 1, duration: 2, ease: 'power1.inOut' }, 2);

            // 灯光脉冲
            const beams = ov.querySelector('.rng-wave-lightbeams');
            beams.style.animation = 'none';
            beams.style.opacity = '0';
            tl.to(beams, { opacity: 1.6, duration: 1, ease: 'power2.out' }, 2.5);
            tl.to(beams, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, 3.5);

            // 中心揭示 2.8s (缓慢展开)
            tl.call(() => playRipple(330, 6), null, 2.8);
            const symBox = ov.querySelector('.rng-wave-symbol-center');
            symBox.style.animation = 'none'; symBox.style.opacity = '0';
            const center = ov.querySelector('.rng-wave-center');
            center.style.animation = 'none'; center.style.opacity = '0';
            const textEl = center.querySelector('.rng-wave-text');
            const subEl = center.querySelector('.rng-wave-sub');
            const letters = textEl.textContent.trim().split('').map(ch => {
                const s = document.createElement('span'); s.textContent = ch; return s;
            });
            textEl.textContent = ''; letters.forEach(l => textEl.appendChild(l));

            // 图标淡入 + 文字容器淡入
            tl.fromTo(symBox, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 2.8);
            tl.fromTo(center, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 3.0);
            tl.fromTo(letters, { opacity: 0, y: 30, scale: 0.5 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08, ease: 'back.out(1.5)' }, 3.4);
            tl.fromTo(subEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 4.0);

            // 全场淡出 11s (vignette/bg 随 overlay 整体淡出, 无需单独处理)
            tl.to(ov, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 11);
            // Three.js 同步淡出
            tl.call(() => { if (wvScene) wvScene.fadeOut(); }, null, 11);

        } else {
            // ═══ 纯 CSS fallback (无 GSAP) ═══
            setTimeout(() => playImpact(55), 2000);
            setTimeout(() => playRipple(330, 6), 2500);
            ov.querySelectorAll('.rng-wave-fish').forEach((f) => {
                f.style.opacity = '0.85';
                f.style.animation = `rngWaveFish ${5 + Math.random() * 5}s linear ${Math.random() * 1.5}s forwards`;
            });
            ov.querySelectorAll('.rng-wave-bubble').forEach(b => {
                b.style.animation = `rngWaveBub ${4 + Math.random() * 5}s linear ${Math.random() * 6}s forwards`;
            });
            ov.querySelectorAll('.rng-wave-spark').forEach(s => {
                s.style.animation = `rngWaveSpark ${1.5 + Math.random() * 3}s ease-in-out ${Math.random() * 5}s infinite alternate`;
            });
            ov.classList.add('gsap-fallback');
            setTimeout(() => {
                ov.classList.add('out');
                if (wvScene) wvScene.fadeOut();
            }, 11000);
            setTimeout(() => {
                ctx.fxState.done(); ov.remove();
                if (wvScene) wvScene.destroy();
            }, 11800);
        }

        // 安全保底
        setTimeout(() => {
            if (ov.parentNode) {
                ctx.fxState.done(); ov.remove();
                if (wvScene) wvScene.destroy();
            }
        }, 13000);
    };
}
