/**
 * sg-paradox-scene.js — Paradox "几何冥想" PixiJS 视觉层 v1.0
 *
 * 极简几何冥想:
 *   - 中心光点 → 扩展 → 三层同心环 (独立旋转)
 *   - 六边形沿环描绘 + 内三角反向旋转
 *   - 顶点光点, 辐射细线, 漂浮微粒
 *
 * GSAP 通过 API 设置 target 值, PixiJS tick 平滑 lerp
 * API: point() → rings() → trace() → bloom() → condense() → fadeOut() → destroy()
 */

let PIXI;

export async function createParadoxScene(overlay, isMobile) {
    if (!PIXI) {
        PIXI = await import('https://esm.sh/pixi.js@7.3.2');
    }

    let destroyed = false;
    let rafId = null;
    const W = overlay.clientWidth, H = overlay.clientHeight;
    const cx = W / 2, cy = H / 2;

    // ── Renderer ─────────────────────────────────────────────────────
    const app = new PIXI.Application({
        width: W, height: H,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
    });
    app.view.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none';
    overlay.insertBefore(app.view, overlay.children[1]);

    const stage = new PIXI.Container();
    app.stage.addChild(stage);

    const MAG = 0xe040a0;
    const CYN = 0x00e5c0;

    // ── Circle sprite texture (for particles) ────────────────────────
    const gfx = new PIXI.Graphics();
    gfx.beginFill(0xffffff);
    gfx.drawCircle(8, 8, 8);
    gfx.endFill();
    const dotTex = app.renderer.generateTexture(gfx, {
        resolution: 2,
        region: new PIXI.Rectangle(0, 0, 16, 16),
    });
    gfx.destroy();

    // ═════════════════════════════════════════════════════════════════════
    //  LAYER 0 — 中心圆 (scale 从 0 扩展)
    // ═════════════════════════════════════════════════════════════════════
    const centerG = new PIXI.Graphics();
    centerG.alpha = 0;
    centerG.scale.set(0);
    stage.addChild(centerG);

    // ═════════════════════════════════════════════════════════════════════
    //  LAYER 1 — 同心环 (3 层, 独立旋转 + 呼吸)
    // ═════════════════════════════════════════════════════════════════════
    const RING_DEFS = [
        { r: 65,  spd: 0.25, color: MAG, w: 1.2 },
        { r: 95,  spd:-0.18, color: CYN, w: 0.8 },
        { r: 125, spd: 0.12, color: MAG, w: 0.5 },
    ];
    const rings = RING_DEFS.map(d => {
        const c = new PIXI.Container();
        const g = new PIXI.Graphics();
        c.alpha = 0;
        c.scale.set(0);
        c.addChild(g);
        stage.addChild(c);
        return { c, g, ...d, angle: 0 };
    });

    // ═════════════════════════════════════════════════════════════════════
    //  LAYER 2 — 微粒 (15 颗, bloom 阶段漂浮)
    // ═════════════════════════════════════════════════════════════════════
    const P_N = isMobile ? 8 : 15;
    const particles = [];

    function spawnParticle() {
        const sp = new PIXI.Sprite(dotTex);
        sp.anchor.set(0.5);
        sp.tint = Math.random() > 0.5 ? MAG : CYN;
        sp.width = sp.height = 2;
        sp.alpha = 0;
        sp.blendMode = PIXI.BLEND_MODES.ADD;
        stage.addChild(sp);
        const ang = Math.random() * Math.PI * 2;
        particles.push({
            sp, ang,
            r: 30 + Math.random() * 50,
            spd: 0.15 + Math.random() * 0.25,
            dr: 0.4 + Math.random() * 0.4,
            alpha: 0,
            alphaTgt: 0,
        });
    }

    // ═════════════════════════════════════════════════════════════════════
    //  LAYER 3 — 六边形 + 顶点光点
    // ═════════════════════════════════════════════════════════════════════
    const hexC = new PIXI.Container();
    const hexG = new PIXI.Graphics();
    hexC.alpha = 0;
    hexC.addChild(hexG);
    stage.addChild(hexC);

    const HEX_R = 75;
    const hexV = [];
    const hexDots = [];
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        hexV.push([Math.cos(a) * HEX_R, Math.sin(a) * HEX_R]);
        const d = new PIXI.Graphics();
        d.beginFill(0xffffff, 0.7);
        d.drawCircle(0, 0, 2);
        d.endFill();
        d.x = hexV[i][0];
        d.y = hexV[i][1];
        d.alpha = 0;
        hexC.addChild(d);
        hexDots.push(d);
    }

    // ═════════════════════════════════════════════════════════════════════
    //  LAYER 4 — 内三角 (反向旋转)
    // ═════════════════════════════════════════════════════════════════════
    const triC = new PIXI.Container();
    const triG = new PIXI.Graphics();
    triC.alpha = 0;
    triC.addChild(triG);
    stage.addChild(triC);

    const TRI_R = 50;
    const triV = [];
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        triV.push([Math.cos(a) * TRI_R, Math.sin(a) * TRI_R]);
    }

    // ═════════════════════════════════════════════════════════════════════
    //  LAYER 5 — 辐射线 (中心 → 六边形顶点, 极淡)
    // ═════════════════════════════════════════════════════════════════════
    const radialG = new PIXI.Graphics();
    radialG.alpha = 0;
    stage.addChild(radialG);

    // ═════════════════════════════════════════════════════════════════════
    //  ANIMATION STATE (target 值由 API 设置, tick lerp)
    // ═════════════════════════════════════════════════════════════════════
    let centerAlphaTgt = 0;
    let centerScaleTgt = 0;
    let ringAlphaTgt   = 0;
    let ringScaleTgt   = 0;
    let hexTraceTgt    = 0;
    let hexAlphaTgt    = 0;
    let triTraceTgt    = 0;
    let triAlphaTgt    = 0;
    let radialAlphaTgt = 0;
    let particleTgt    = 0;
    let rotMult        = 1;
    let fadeA          = 1;

    let elapsed = 0;
    let lastNow = performance.now();

    // ── Helper: 沿多边形路径绘制 trace 比例 ──────────────────────────
    function polyTrace(g, verts, trace, color, width) {
        if (trace <= 0 || !verts.length) return;
        const n = verts.length;
        g.lineStyle(width, color, 1);
        g.moveTo(verts[0][0], verts[0][1]);
        const total = Math.min(trace, n);
        for (let i = 0; i < Math.min(Math.floor(total), n - 1); i++) {
            g.lineTo(verts[i + 1][0], verts[i + 1][1]);
        }
        if (total < n && total > Math.floor(total)) {
            const fi = Math.floor(total);
            const fr = total - fi;
            const nx = verts[fi][0] + (verts[fi + 1][0] - verts[fi][0]) * fr;
            const ny = verts[fi][1] + (verts[fi + 1][1] - verts[fi][1]) * fr;
            g.lineTo(nx, ny);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    //  RENDER LOOP
    // ═════════════════════════════════════════════════════════════════════
    function tick() {
        if (destroyed) return;
        rafId = requestAnimationFrame(tick);

        const now = performance.now();
        const dt = Math.min((now - lastNow) / 1000, 0.05);
        lastNow = now;
        elapsed += dt;
        const t = elapsed;

        const lf = Math.min(1, dt * 3); // lerp factor (~0.33s to target)

        // ── 中心圆: 扩展 + 呼吸 ─────────────────────────────────────
        centerG.alpha += (centerAlphaTgt - centerG.alpha) * lf;
        centerG.scale.x += (centerScaleTgt - centerG.scale.x) * lf;
        centerG.scale.y = centerG.scale.x;

        centerG.clear();
        const breath = 1 + 0.06 * Math.sin(t * 1.2);
        const cr = 14 * breath * Math.max(0.01, centerG.scale.x);
        centerG.beginFill(0xffffff, 0.75);
        centerG.drawCircle(0, 0, cr);
        centerG.endFill();
        // 外晕
        centerG.beginFill(CYN, 0.08 + 0.04 * Math.sin(t * 0.8));
        centerG.drawCircle(0, 0, cr * 2.2);
        centerG.endFill();

        // ── 同心环: 旋转 + 呼吸 ─────────────────────────────────────
        rings.forEach((ring, i) => {
            ring.c.alpha += (ringAlphaTgt - ring.c.alpha) * lf;
            ring.c.scale.x += (ringScaleTgt - ring.c.scale.x) * lf;
            ring.c.scale.y = ring.c.scale.x;

            ring.angle += dt * ring.spd * rotMult;
            ring.c.rotation = ring.angle;

            ring.g.clear();
            const rBreath = 1 + 0.03 * Math.sin(t * 0.8 + i * 1.2);
            const r = ring.r * rBreath;
            ring.g.lineStyle(ring.w, ring.color, 0.45);
            ring.g.drawCircle(0, 0, r);
        });

        // ── 六边形: 路径描绘 + 顶点 ─────────────────────────────────
        hexC.alpha += (hexAlphaTgt - hexC.alpha) * lf;
        hexC.rotation += dt * 0.12 * rotMult;

        const hexTrace = hexTraceTgt;
        hexG.clear();
        polyTrace(hexG, hexV, hexTrace, MAG, 1.5);

        hexDots.forEach((d, i) => {
            d.alpha = i < Math.floor(hexTrace) ? 0.7 * hexC.alpha : 0;
        });

        // ── 内三角: 反向描绘 ────────────────────────────────────────
        triC.alpha += (triAlphaTgt - triC.alpha) * lf;
        triC.rotation -= dt * 0.18 * rotMult;

        const triTrace = triTraceTgt;
        triG.clear();
        polyTrace(triG, triV, triTrace, CYN, 1.2);

        // ── 辐射线 ──────────────────────────────────────────────────
        radialG.alpha += (radialAlphaTgt - radialG.alpha) * lf;
        radialG.clear();
        if (radialG.alpha > 0.005) {
            radialG.lineStyle(0.4, 0xffffff, 0.25);
            for (let i = 0; i < 6; i++) {
                radialG.moveTo(0, 0);
                radialG.lineTo(hexV[i][0], hexV[i][1]);
            }
        }

        // ── 微粒 ────────────────────────────────────────────────────
        if (particles.length < P_N && particleTgt > 0 && Math.random() < dt * 2.5) {
            spawnParticle();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.alpha += (p.alphaTgt * particleTgt - p.alpha) * lf;
            p.ang += dt * p.spd;
            p.r += dt * p.dr;
            p.sp.x = cx + Math.cos(p.ang) * p.r;
            p.sp.y = cy + Math.sin(p.ang) * p.r;
            p.sp.alpha = p.alpha * fadeA;

            if (p.r > 180) {
                p.r = 25 + Math.random() * 30;
                p.ang = Math.random() * Math.PI * 2;
            }
            if (particleTgt <= 0 && p.alpha < 0.008) {
                stage.removeChild(p.sp);
                p.sp.destroy();
                particles.splice(i, 1);
            }
        }

        // ── Global fade ─────────────────────────────────────────────
        stage.alpha = fadeA;

        app.renderer.render(stage);
    }
    rafId = requestAnimationFrame(tick);

    // ── Resize ────────────────────────────────────────────────────────
    const resizeObs = new ResizeObserver(([e]) => {
        if (destroyed) return;
        const { width: w, height: h } = e.contentRect;
        app.renderer.resize(w, h);
    });
    resizeObs.observe(overlay);

    // ═════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ═════════════════════════════════════════════════════════════════════
    return {
        point() {
            centerAlphaTgt = 1;
            centerScaleTgt = 1;
        },

        rings() {
            ringAlphaTgt = 1;
            ringScaleTgt = 1;
            centerScaleTgt = 0.6;
        },

        trace() {
            hexTraceTgt = 6;
            hexAlphaTgt = 0.75;
            triTraceTgt = 3;
            triAlphaTgt = 0.55;
        },

        bloom() {
            rotMult = 2.2;
            radialAlphaTgt = 0.12;
            particleTgt = 1;
            particles.forEach(p => { p.alphaTgt = 0.3; });
        },

        condense() {
            rotMult = 0.3;
            ringAlphaTgt = 0;
            hexAlphaTgt = 0;
            triAlphaTgt = 0;
            radialAlphaTgt = 0;
            particleTgt = 0;
            particles.forEach(p => { p.alphaTgt = 0; });
            centerScaleTgt = 0.25;
        },

        fadeOut() {
            centerAlphaTgt = 0;
            const iv = setInterval(() => {
                fadeA = Math.max(0, fadeA - 0.018);
                if (fadeA <= 0) clearInterval(iv);
            }, 16);
        },

        destroy() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            resizeObs.disconnect();
            particles.forEach(p => { stage.removeChild(p.sp); p.sp.destroy(); });
            particles.length = 0;
            app.destroy(true, { children: true, texture: false });
        },
    };
}
