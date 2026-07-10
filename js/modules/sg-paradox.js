/**
 * sg-paradox.js — Paradox "几何冥想" v1 揭示动画 (10s)
 *
 * GSAP 做导演 (Timeline 链式调度), PixiJS 做几何视觉层
 *
 * 叙事线:
 *   1. 起源 — 中心光点从虚无中浮现
 *   2. 扩展 — 光点扩展为薄环
 *   3. 旋转 — 三层同心环依次亮起, 独立旋转
 *   4. 描绘 — 六边形沿环描绘, 内三角反向旋转
 *   5. 绽放 — 辐射线, 微粒漂浮, 旋转加速
 *   6. 凝聚 — 几何内收, 符号浮现, 文字显现
 *
 * 全部 GSAP 驱动, 无 CSS @keyframes
 */

export function createParadoxReveal(ctx) {
    const { playDrone, playImpact, playChime, silenceAll, resumeAudio } = ctx;

    return async function paradoxReveal() {
        const gsap = window.gsap;
        const mob = /Mobi|Android/i.test(navigator.userAgent);
        const m = mob ? 0.4 : 1;

        // ═══════════════════════════════════════════════════════════════════
        //  1. DOM 构建 (极简: 暗角 + 符号 + 文字 + 柔光)
        // ═══════════════════════════════════════════════════════════════════
        const ov = document.createElement('div');
        ov.className = 'rng-paradox';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;background:#080012;';
        ov.innerHTML = `
            <div class="rng-pd-vignette"></div>
            <div class="rng-pd-bloom"></div>
            <div class="rng-pd-symbol-center"><span class="rng-pd-symbol">♾️</span></div>
            <div class="rng-pd-center">
                <span class="rng-pd-text">PARADOX</span>
                <span class="rng-pd-sub">1 / 2,000,000</span>
            </div>
        `;
        document.body.appendChild(ov);

        const $ = (s) => ov.querySelector(s);
        const vig    = $('.rng-pd-vignette');
        const bloom  = $('.rng-pd-bloom');
        const symBox = $('.rng-pd-symbol-center');
        const symEl  = $('.rng-pd-symbol');
        const center = $('.rng-pd-center');
        const textEl = $('.rng-pd-text');
        const subEl  = $('.rng-pd-sub');

        // ═══════════════════════════════════════════════════════════════════
        //  2. PixiJS 几何视觉层
        // ═══════════════════════════════════════════════════════════════════
        let pdScene = null;
        try {
            const { createParadoxScene } = await import('./sg-paradox-scene.js?v=260710f');
            pdScene = await createParadoxScene(ov, mob);
        } catch (e) {
            console.warn('PixiJS paradox scene unavailable:', e.message);
        }
        const hasPx = !!pdScene;

        // ═══════════════════════════════════════════════════════════════════
        //  3. GSAP Timeline — 链式调度
        // ═══════════════════════════════════════════════════════════════════
        const tl = gsap ? gsap.timeline() : null;
        const schedule = (fn, sec) => {
            if (tl) tl.call(fn, [], sec);
            else setTimeout(fn, sec * 1000);
        };

        // ───────────────────────────────────────────────
        //  Phase 1: POINT (t = 0 → 1.5s)
        //  中心光点浮现
        // ───────────────────────────────────────────────
        function phasePoint() {
            playDrone(4000, 30, 0.3 * m);

            // 暗角浮现
            if (gsap) gsap.to(vig, { opacity: 1, duration: 1.5, ease: 'power2.out' });

            // 中心光点
            if (hasPx) pdScene.point();
        }

        // ───────────────────────────────────────────────
        //  Phase 2: RINGS (t = 1.5 → 3.5s)
        //  同心环扩展, 依次亮起
        // ───────────────────────────────────────────────
        function phaseRings() {
            playChime([330, 392], 2);

            // 环出现
            if (hasPx) pdScene.rings();

            // 柔光渐亮
            if (gsap) {
                gsap.to(bloom, {
                    opacity: 0.08, duration: 1.5, ease: 'power2.out',
                    onComplete: () => {
                        gsap.to(bloom, {
                            opacity: 0.12, duration: 2, repeat: -1,
                            yoyo: true, ease: 'sine.inOut',
                        });
                    },
                });
            }
        }

        // ───────────────────────────────────────────────
        //  Phase 3: TRACE (t = 3.5 → 5.5s)
        //  六边形描绘, 三角反向
        // ───────────────────────────────────────────────
        function phaseTrace() {
            playChime([392, 466, 554], 2);

            // 几何描绘
            if (hasPx) pdScene.trace();

            // 符号幽灵预览 (极淡)
            if (gsap) gsap.to(symBox, { opacity: 0.06, scale: 0.3, duration: 1.5, ease: 'power1.out' });
        }

        // ───────────────────────────────────────────────
        //  Phase 4: BLOOM (t = 5.5 → 7.5s)
        //  绽放: 辐射线, 微粒, 旋转加速
        // ───────────────────────────────────────────────
        function phaseBloom() {
            playChime([466, 554, 659, 784], 2);

            // 绽放
            if (hasPx) pdScene.bloom();

            // 柔光增强
            if (gsap) gsap.to(bloom, { opacity: 0.2, duration: 1.5, ease: 'power2.out' });

            // 符号逐渐清晰
            if (gsap) gsap.to(symBox, { opacity: 0.15, scale: 0.6, duration: 1.5, ease: 'power2.out' });
        }

        // ───────────────────────────────────────────────
        //  Phase 5: CONDENSE (t = 7.5 → 9.0s)
        //  凝聚: 几何内收, 符号浮现
        // ───────────────────────────────────────────────
        function phaseCondense() {
            playImpact(35);

            // 几何凝聚
            if (hasPx) pdScene.condense();

            // 柔光减弱
            if (gsap) gsap.to(bloom, { opacity: 0.05, duration: 1.2, ease: 'power2.in' });

            // 符号收缩准备重生
            if (gsap) gsap.to(symBox, { scale: 0.08, opacity: 0.06, duration: 0.4, ease: 'power2.in' });
        }

        // ───────────────────────────────────────────────
        //  Phase 6: REBIRTH (t = 9.0 → 10s)
        //  符号浮现, 文字显现
        // ───────────────────────────────────────────────
        function phaseRebirth() {
            // 符号绽放
            if (gsap) {
                gsap.to(symBox, {
                    opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)',
                    onComplete: () => {
                        gsap.to(symEl, {
                            filter: 'drop-shadow(0 0 30px #00e5c0) drop-shadow(0 0 55px rgba(224,64,160,0.25))',
                            duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
                        });
                    },
                });
            }

            // 文字容器
            if (gsap) gsap.fromTo(center, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.3);

            // 字母逐个弹入
            if (gsap) {
                const letters = textEl.textContent.trim().split('').map(ch => {
                    const s = document.createElement('span');
                    s.textContent = ch === ' ' ? '\u00A0' : ch;
                    s.style.display = 'inline-block';
                    return s;
                });
                textEl.textContent = '';
                letters.forEach(l => textEl.appendChild(l));

                gsap.fromTo(letters,
                    { opacity: 0, y: 10, scale: 0.6 },
                    {
                        opacity: 1, y: 0, scale: 1,
                        duration: 0.35, stagger: 0.04, ease: 'power3.out',
                        onComplete: () => {
                            gsap.to(textEl, {
                                textShadow: '0 0 22px #00e5c0, 0 0 40px rgba(224,64,160,0.2)',
                                duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut',
                            });
                        },
                    }, 0.5
                );
            }

            // 副标题
            if (gsap) {
                gsap.fromTo(subEl, { opacity: 0, y: 5 }, {
                    opacity: 1, y: 0, duration: 0.4, ease: 'power3.out',
                }, 1.0);
            }

            // 无 GSAP 回退
            if (!gsap) {
                symBox.style.opacity = '1';
                center.style.opacity = '1';
            }
        }

        // ───────────────────────────────────────────────
        //  Fade + Cleanup
        // ───────────────────────────────────────────────
        function doFade() {
            if (hasPx) pdScene.fadeOut();
            if (gsap) gsap.to(ov, { opacity: 0, duration: 2, ease: 'power2.in' });
            else { ov.style.transition = 'opacity 2s ease-in'; ov.style.opacity = '0'; }
        }

        function doCleanup() {
            pdScene?.destroy();
            ctx.fxState.done();
            ov.remove();
        }

        // ═══════════════════════════════════════════════════════════════════
        //  4. Schedule
        // ═══════════════════════════════════════════════════════════════════
        phasePoint();
        schedule(phaseRings,    1.5);
        schedule(phaseTrace,    3.5);
        schedule(phaseBloom,    5.5);
        schedule(phaseCondense, 7.5);
        schedule(phaseRebirth,  9.0);
        schedule(doFade,        10.0);
        schedule(doCleanup,     12.0);

        // Safety net
        setTimeout(() => {
            if (ov.parentNode) {
                pdScene?.destroy();
                ctx.fxState.done();
                ov.remove();
            }
        }, 14000);
    };
}
