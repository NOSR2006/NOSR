/**
 * sg-genesis.js — Genesis 创世揭示动画 (~10s)
 * CSS 主力 + GSAP 中心揭示 + Three.js 氛围点缀层
 *
 * 接收 ctx = { playDrone, playImpact, playChime, fxState }
 */

export function createGenesisReveal(ctx) {
    const { playDrone, playImpact, playChime } = ctx;

    return async function genesisReveal() {
        const gsap = window.gsap;
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);

        const ov = document.createElement('div');
        ov.className = 'rng-genesis';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;display:flex;align-items:center;justify-content:center;';
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
            <div class="rng-gs-symbol-center"><svg class="rng-gs-symbol" viewBox="0 0 100 100"><polygon points="50,2 58,32 84,16 68,42 98,50 68,58 84,84 58,68 50,98 42,68 16,84 32,58 2,50 32,42 16,16 42,32"/></svg></div>
            <div class="rng-gs-center">
                <span class="rng-gs-text">G E N E S I S</span>
                <span class="rng-gs-sub">1 / 1,000,000</span>
            </div>
        `;
        document.body.appendChild(ov);

        // ── Three.js 氛围层 (异步, 可选) ──
        let gsScene = null;
        try {
            const { createGenesisScene } = await import('./sg-genesis-scene.js?v=260708n');
            gsScene = await createGenesisScene(ov, isMobile);
        } catch (e) {
            console.warn('Three.js genesis accent unavailable:', e.message);
        }

        // ── 音效 ──
        playDrone(2300, 55);
        setTimeout(() => playImpact(50), 2300);
        setTimeout(() => playChime([523, 659, 784, 1047], 3), 5500);

        // ── 地震 2.3s ──
        setTimeout(() => ov.classList.add('shaken'), 2300);

        // ══════════════════════════════════════
        // GSAP 中心揭示 + 整体退场
        // ══════════════════════════════════════
        if (gsap) {
            const tl = gsap.timeline({
                onComplete: () => {
                    ctx.fxState.done(); ov.remove();
                    if (gsScene) gsScene.destroy();
                }
            });

            // 中心揭示 5.5s (接管 CSS forwards)
            const symBox = ov.querySelector('.rng-gs-symbol-center');
            symBox.style.animation = 'none'; symBox.style.opacity = '0';
            const center = ov.querySelector('.rng-gs-center');
            center.style.animation = 'none'; center.style.opacity = '1';

            const symEl = symBox.querySelector('.rng-gs-symbol');
            const textEl = center.querySelector('.rng-gs-text');
            const subEl = center.querySelector('.rng-gs-sub');
            const letters = textEl.textContent.trim().split('').map(ch => {
                const s = document.createElement('span'); s.textContent = ch; return s;
            });
            textEl.textContent = ''; letters.forEach(l => textEl.appendChild(l));

            tl.fromTo(symBox, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 5.3);
            tl.fromTo(symEl,
                { opacity: 0, scale: 0, y: -60 },
                { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.3)' },
                5.5
            );
            tl.fromTo(letters,
                { opacity: 0, y: 40, scale: 0.3 },
                { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.07, ease: 'back.out(2.5)' },
                5.8
            );
            tl.fromTo(subEl,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
                6.4
            );

            // 全场淡出 8s (所有元素随 overlay 整体退场)
            tl.to(ov, { opacity: 0, duration: 1, ease: 'power2.in' }, 8);
            tl.call(() => { if (gsScene) gsScene.fadeOut(); }, null, 8);

        } else {
            // ═══ 纯 CSS fallback (无 GSAP) ═══
            setTimeout(() => ov.classList.add('out'), 8000);
            setTimeout(() => {
                ctx.fxState.done(); ov.remove();
                if (gsScene) gsScene.destroy();
            }, 9000);
        }

        // 安全保底
        setTimeout(() => {
            if (ov.parentNode) {
                ctx.fxState.done(); ov.remove();
                if (gsScene) gsScene.destroy();
            }
        }, 11000);
    };
}
