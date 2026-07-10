/**
 * sg-wave-scene.js — Three.js 深海氛围 (Wave reveal)
 *
 * 视觉要素:
 *   - 锥形体积光束: 6 道 shader plane, 顶部窄底部宽, pendulum 摇摆
 *   - 焦散光纹: 底部 plane, sin 波叠加 + impact 脉冲
 *   - 深度雾层: 底部青蓝雾, 增加纵深感
 *   - Fresnel 气泡: ~30 颗球体, 边缘高光, 光束内增亮
 *   - 发光鱼群: ~8 条菱形鱼, 慢游 + 尾部摆动
 *   - 火星光点: ~60 颗脉动火花
 *   - 远景 bokeh: ~20 颗大光斑
 *   - 近景微尘: ~150 颗极细悬浮粒子
 *   - 微运镜: camera 缓慢呼吸偏移
 *   - 无 Bloom, alpha 透明, insertBefore 首子
 */

let THREE;

export async function createWaveScene(ov, isMobile) {
    if (!THREE) {
        THREE = await import('https://esm.sh/three@0.160.0');
    }

    const mob = isMobile ? 0.5 : 1;

    // ── Scene ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 2000);
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.domElement.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;transition:opacity 1.5s ease-out;';
    ov.insertBefore(renderer.domElement, ov.firstChild);

    // 触发渐入 (CSS transition 处理, fadeOut 时 GSAP 自动接管)
    requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; });

    // ══════════════════════════════════════════════
    // 锥形体积光束 — 6 道, fragment shader, pendulum 摇摆
    // ══════════════════════════════════════════════
    const beamConfigs = [
        { x: -320, rot: 0.08,  width: 0.12, bright: 0.28, coneTaper: 2.8, swayAmount: 0.22 },
        { x: -150, rot: -0.04, width: 0.09, bright: 0.22, coneTaper: 2.2, swayAmount: 0.18 },
        { x: 30,   rot: 0.03,  width: 0.14, bright: 0.30, coneTaper: 3.0, swayAmount: 0.25 },
        { x: 180,  rot: -0.06, width: 0.10, bright: 0.24, coneTaper: 2.5, swayAmount: 0.20 },
        { x: 310,  rot: 0.05,  width: 0.08, bright: 0.20, coneTaper: 2.0, swayAmount: 0.16 },
        { x: -60,  rot: -0.02, width: 0.07, bright: 0.18, coneTaper: 2.4, swayAmount: 0.19 },
    ];
    const beamMeshes = [];
    for (const cfg of beamConfigs) {
        const g = new THREE.PlaneGeometry(200, 800);
        const m = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uWidth: { value: cfg.width },
                uBright: { value: cfg.bright },
                uPhase: { value: Math.random() * Math.PI * 2 },
                uConeTaper: { value: cfg.coneTaper },
                uSwayAmount: { value: cfg.swayAmount },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uWidth;
                uniform float uBright;
                uniform float uPhase;
                uniform float uConeTaper;
                uniform float uSwayAmount;
                varying vec2 vUv;
                void main() {
                    float coneHalf = uWidth * (1.0 + (1.0 - vUv.y) * uConeTaper);
                    float swayPhase = uTime * 0.35 + uPhase;
                    float sway = sin(swayPhase) * uSwayAmount * (1.0 - vUv.y);
                    float centerX = 0.5 + sway;
                    float d = abs(vUv.x - centerX);
                    float beam = smoothstep(coneHalf, 0.0, d);
                    beam *= smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
                    float pulse = 1.0 + 0.15 * sin(uTime * 0.5 + uPhase);
                    beam *= uBright * pulse;
                    gl_FragColor = vec4(0.15, 0.55, 0.9, beam);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(cfg.x, 50, -100);
        mesh.rotation.z = cfg.rot;
        scene.add(mesh);
        beamMeshes.push(mesh);
    }

    // ══════════════════════════════════════════════
    // 焦散光纹 — sin 波叠加 + impact 脉冲
    // ══════════════════════════════════════════════
    const causticGeom = new THREE.PlaneGeometry(1600, 800);
    const causticMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPulse: { value: 1.0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uPulse;
            varying vec2 vUv;
            void main() {
                vec2 uv = vUv * 8.0;
                float c = 0.0;
                c += sin(uv.x * 1.2 + uTime * 0.3) * sin(uv.y * 1.5 + uTime * 0.2) * 0.5;
                c += sin(uv.x * 2.1 - uTime * 0.4 + uv.y * 0.8) * 0.3;
                c += sin((uv.x + uv.y) * 1.8 + uTime * 0.25) * 0.2;
                c = smoothstep(0.3, 0.8, c * 0.5 + 0.5);
                c *= smoothstep(1.0, 0.3, vUv.y) * 0.15 * uPulse;
                gl_FragColor = vec4(0.1, 0.5, 0.8, c);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const causticMesh = new THREE.Mesh(causticGeom, causticMat);
    causticMesh.position.set(0, -120, -50);
    causticMesh.rotation.x = -0.3;
    scene.add(causticMesh);

    // ══════════════════════════════════════════════
    // 深度雾层 — 底部青蓝雾, 增加纵深
    // ══════════════════════════════════════════════
    const fogGeom = new THREE.PlaneGeometry(2000, 600);
    const fogMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            void main() {
                float fog = smoothstep(0.0, 0.6, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
                float drift = sin(vUv.x * 3.0 + uTime * 0.15) * 0.3 + 0.7;
                fog *= drift * 0.06;
                gl_FragColor = vec4(0.05, 0.3, 0.5, fog);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const fogMesh = new THREE.Mesh(fogGeom, fogMat);
    fogMesh.position.set(0, -200, -80);
    scene.add(fogMesh);

    // ══════════════════════════════════════════════
    // Fresnel 气泡 — 球体, 边缘高光, 光束内增亮
    // ══════════════════════════════════════════════
    const BUB_N = Math.round(30 * mob);
    const bubbles = [];
    const bubbleGeom = new THREE.SphereGeometry(1, 10, 10);
    const bubbleMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uCamPos: { value: camera.position },
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uCamPos;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vec3 viewDir = normalize(uCamPos - vWorldPos);
                float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
                // 光束区域增亮
                float beamGlow = 0.0;
                float wx = vWorldPos.x;
                beamGlow += smoothstep(180.0, 0.0, abs(wx + 320.0)) * 0.25;
                beamGlow += smoothstep(180.0, 0.0, abs(wx - 30.0)) * 0.3;
                beamGlow += smoothstep(180.0, 0.0, abs(wx - 180.0)) * 0.2;
                vec3 color = mix(vec3(0.15, 0.5, 0.8), vec3(0.4, 0.85, 1.0), fresnel + beamGlow);
                float alpha = fresnel * 0.45 + 0.03 + beamGlow * 0.12;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    for (let i = 0; i < BUB_N; i++) {
        const mesh = new THREE.Mesh(bubbleGeom, bubbleMat);
        const s = 3 + Math.random() * 12;
        mesh.scale.setScalar(s);
        mesh.position.set(
            (Math.random() - 0.5) * 900,
            (Math.random() - 0.5) * 600,
            (Math.random() - 0.5) * 300,
        );
        scene.add(mesh);
        bubbles.push({
            mesh,
            vy: 0.15 + Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.08,
            size: s,
            phase: Math.random() * Math.PI * 2,
        });
    }

    // ══════════════════════════════════════════════
    // 发光鱼 — 菱形 ShapeGeometry, 慢游 + 尾摆
    // ══════════════════════════════════════════════
    const FISH_N = Math.round(8 * mob);
    const fishShape = new THREE.Shape();
    fishShape.moveTo(0, 0.5);
    fishShape.quadraticCurveTo(0.25, 0.15, 0.15, 0);
    fishShape.lineTo(0.35, -0.25);
    fishShape.lineTo(0, -0.1);
    fishShape.lineTo(-0.35, -0.25);
    fishShape.lineTo(-0.15, 0);
    fishShape.quadraticCurveTo(-0.25, 0.15, 0, 0.5);
    const fishGeom = new THREE.ShapeGeometry(fishShape);
    const fishMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            void main() {
                float glow = 0.3 + 0.15 * sin(uTime * 2.0);
                gl_FragColor = vec4(0.3, 0.75, 1.0, glow);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const fishes = [];
    for (let i = 0; i < FISH_N; i++) {
        const mesh = new THREE.Mesh(fishGeom, fishMat);
        const s = 10 + Math.random() * 20;
        mesh.scale.set(s, s, 1);
        mesh.position.set(
            (Math.random() - 0.5) * 800,
            (Math.random() - 0.5) * 400,
            (Math.random() - 0.5) * 200,
        );
        scene.add(mesh);
        fishes.push({
            mesh,
            vx: (0.2 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
            vy: (Math.random() - 0.5) * 0.1,
            phase: Math.random() * Math.PI * 2,
            size: s,
        });
    }

    // ══════════════════════════════════════════════
    // 火星光点 — 脉动火花
    // ══════════════════════════════════════════════
    const SPK_N = Math.round(60 * mob);
    const spkPos = new Float32Array(SPK_N * 3);
    const spkVel = [];
    for (let i = 0; i < SPK_N; i++) {
        spkPos[i * 3]     = (Math.random() - 0.5) * 1000;
        spkPos[i * 3 + 1] = (Math.random() - 0.5) * 700;
        spkPos[i * 3 + 2] = (Math.random() - 0.5) * 400;
        spkVel.push({
            vx: (Math.random() - 0.5) * 0.12,
            vy: (Math.random() - 0.5) * 0.08,
            vz: (Math.random() - 0.5) * 0.06,
            phase: Math.random() * Math.PI * 2,
        });
    }
    const spkGeom = new THREE.BufferGeometry();
    spkGeom.setAttribute('position', new THREE.BufferAttribute(spkPos, 3));
    const spkMat = new THREE.PointsMaterial({
        size: 6, color: 0x90d5ff, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(spkGeom, spkMat));

    // ══════════════════════════════════════════════
    // Bokeh 柔焦光斑
    // ══════════════════════════════════════════════
    const BK_N = Math.round(20 * mob);
    const bkPos = new Float32Array(BK_N * 3);
    const bkCol = new Float32Array(BK_N * 3);
    const bkVel = [];
    const palette = [
        [0.15, 0.5, 0.9], [0.1, 0.7, 0.85], [0.25, 0.4, 0.8],
        [0.4, 0.7, 0.95], [0.7, 0.8, 0.95],
    ];
    for (let i = 0; i < BK_N; i++) {
        bkPos[i * 3]     = (Math.random() - 0.5) * 900;
        bkPos[i * 3 + 1] = (Math.random() - 0.5) * 600;
        bkPos[i * 3 + 2] = (Math.random() - 0.5) * 400;
        const c = palette[Math.floor(Math.random() * palette.length)];
        bkCol[i * 3] = c[0]; bkCol[i * 3 + 1] = c[1]; bkCol[i * 3 + 2] = c[2];
        bkVel.push({
            vx: (Math.random() - 0.5) * 0.1,
            vy: 0.03 + Math.random() * 0.12,
            vz: (Math.random() - 0.5) * 0.05,
        });
    }
    const bkGeom = new THREE.BufferGeometry();
    bkGeom.setAttribute('position', new THREE.BufferAttribute(bkPos, 3));
    bkGeom.setAttribute('color',    new THREE.BufferAttribute(bkCol, 3));
    const bkMat = new THREE.PointsMaterial({
        size: 55, vertexColors: true, transparent: true, opacity: 0.10,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(bkGeom, bkMat));

    // ══════════════════════════════════════════════
    // 近景微尘
    // ══════════════════════════════════════════════
    const DT_N = Math.round(150 * mob);
    const dtPos = new Float32Array(DT_N * 3);
    const dtVel = [];
    for (let i = 0; i < DT_N; i++) {
        dtPos[i * 3]     = (Math.random() - 0.5) * 1000;
        dtPos[i * 3 + 1] = (Math.random() - 0.5) * 700;
        dtPos[i * 3 + 2] = (Math.random() - 0.5) * 500;
        dtVel.push({
            vx: (Math.random() - 0.5) * 0.08,
            vy: (Math.random() - 0.5) * 0.06,
            vz: (Math.random() - 0.5) * 0.04,
        });
    }
    const dtGeom = new THREE.BufferGeometry();
    dtGeom.setAttribute('position', new THREE.BufferAttribute(dtPos, 3));
    const dtMat = new THREE.PointsMaterial({
        size: 2.5, color: 0x80c0ff, transparent: true, opacity: 0.20,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(dtGeom, dtMat));

    // ── Clock ──
    const clock = new THREE.Clock();
    let elapsed = 0;
    let rafId = null;
    let destroyed = false;
    let causticPulse = 1.0;
    const camBase = { x: 0, y: 0, z: 500 };

    // ══════════════════════════════════════════════
    // 渲染循环
    // ══════════════════════════════════════════════
    function animate() {
        if (destroyed) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;

        // ── 光束 shader 时间 ──
        for (const mesh of beamMeshes) {
            mesh.material.uniforms.uTime.value = elapsed;
        }

        // ── 焦散 + 雾 ──
        causticMat.uniforms.uTime.value = elapsed;
        causticMat.uniforms.uPulse.value = causticPulse;
        if (causticPulse > 1.0) causticPulse = Math.max(1.0, causticPulse - dt * 3.0);
        fogMat.uniforms.uTime.value = elapsed;

        // ── 微运镜 (缓慢呼吸) ──
        camera.position.x = camBase.x + Math.sin(elapsed * 0.12) * 3;
        camera.position.y = camBase.y + Math.cos(elapsed * 0.08) * 2;
        camera.lookAt(0, 0, 0);

        // ── 气泡: 上浮 + 摆动 ──
        bubbleMat.uniforms.uTime.value = elapsed;
        for (const b of bubbles) {
            b.mesh.position.y += b.vy * dt * 60;
            b.mesh.position.x += b.vx * dt * 60 + Math.sin(elapsed * 0.8 + b.phase) * 0.15;
            if (b.mesh.position.y > 400) {
                b.mesh.position.y = -400;
                b.mesh.position.x = (Math.random() - 0.5) * 900;
            }
        }

        // ── 鱼: 慢游 + 尾部摆动 ──
        fishMat.uniforms.uTime.value = elapsed;
        for (const f of fishes) {
            f.mesh.position.x += f.vx * dt * 60;
            f.mesh.position.y += f.vy * dt * 60 + Math.sin(elapsed * 0.5 + f.phase) * 0.08;
            if (f.mesh.position.x > 550) f.mesh.position.x = -550;
            if (f.mesh.position.x < -550) f.mesh.position.x = 550;
            // 尾摆
            f.mesh.rotation.z = Math.sin(elapsed * 3 + f.phase) * 0.12;
        }

        // ── 火星 ──
        const spkA = spkGeom.getAttribute('position');
        for (let i = 0; i < SPK_N; i++) {
            const v = spkVel[i];
            spkA.array[i * 3]     += v.vx * dt * 60;
            spkA.array[i * 3 + 1] += v.vy * dt * 60;
            spkA.array[i * 3 + 2] += v.vz * dt * 60;
            if (spkA.array[i * 3] < -550) spkA.array[i * 3] = 550;
            if (spkA.array[i * 3] > 550) spkA.array[i * 3] = -550;
            if (spkA.array[i * 3 + 1] < -400) spkA.array[i * 3 + 1] = 400;
            if (spkA.array[i * 3 + 1] > 400) spkA.array[i * 3 + 1] = -400;
        }
        spkA.needsUpdate = true;
        spkMat.opacity = 0.25 + 0.15 * Math.sin(elapsed * 1.5);

        // ── Bokeh 漂移 ──
        const bkA = bkGeom.getAttribute('position');
        for (let i = 0; i < BK_N; i++) {
            const v = bkVel[i];
            bkA.array[i * 3]     += v.vx * dt * 60;
            bkA.array[i * 3 + 1] += v.vy * dt * 60;
            bkA.array[i * 3 + 2] += v.vz * dt * 60;
            if (bkA.array[i * 3 + 1] > 400) {
                bkA.array[i * 3 + 1] = -400;
                bkA.array[i * 3] = (Math.random() - 0.5) * 900;
            }
            if (bkA.array[i * 3] < -550) bkA.array[i * 3] = 550;
            if (bkA.array[i * 3] > 550) bkA.array[i * 3] = -550;
        }
        bkA.needsUpdate = true;
        bkMat.opacity = 0.08 + 0.03 * Math.sin(elapsed * 0.6);

        // ── 微尘 ──
        const dtA = dtGeom.getAttribute('position');
        for (let i = 0; i < DT_N; i++) {
            const v = dtVel[i];
            dtA.array[i * 3]     += v.vx * dt * 60;
            dtA.array[i * 3 + 1] += v.vy * dt * 60;
            dtA.array[i * 3 + 2] += v.vz * dt * 60;
            if (dtA.array[i * 3] < -550) dtA.array[i * 3] = 550;
            if (dtA.array[i * 3] > 550) dtA.array[i * 3] = -550;
            if (dtA.array[i * 3 + 1] < -400) dtA.array[i * 3 + 1] = 400;
            if (dtA.array[i * 3 + 1] > 400) dtA.array[i * 3 + 1] = -400;
        }
        dtA.needsUpdate = true;
        dtMat.opacity = 0.16 + 0.05 * Math.sin(elapsed * 1.2);

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animate);
    }
    animate();

    // ══════════════════════════════════════════════
    // API
    // ══════════════════════════════════════════════
    return {
        /** impact 瞬间触发焦散脉冲 */
        triggerPulse() { causticPulse = 3.5; },

        fadeOut() {
            if (destroyed) return;
            // canvas 整体淡出 (覆盖入场 transition 为更快的 0.8s)
            renderer.domElement.style.transition = 'opacity 0.8s ease-in';
            renderer.domElement.style.opacity = '0';

            const start = performance.now();
            const dur = 800;
            const bk0 = bkMat.opacity;
            const dt0 = dtMat.opacity;
            const spk0 = spkMat.opacity;
            const beamBrights = beamMeshes.map(m => m.material.uniforms.uBright.value);
            const ramp = () => {
                if (destroyed) return;
                const t = Math.min((performance.now() - start) / dur, 1);
                const ease = 1 - t;
                bkMat.opacity = bk0 * ease;
                dtMat.opacity = dt0 * ease;
                spkMat.opacity = spk0 * ease;
                bubbleMat.uniforms.uTime.value = -999; // 暗化 fresnel
                fishMat.uniforms.uTime.value = -999;
                beamMeshes.forEach((m, i) => {
                    m.material.uniforms.uBright.value = beamBrights[i] * ease;
                });
                if (t < 1) requestAnimationFrame(ramp);
            };
            ramp();
        },

        destroy() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            renderer.dispose();
            for (const m of beamMeshes) { m.geometry.dispose(); m.material.dispose(); }
            causticGeom.dispose(); causticMat.dispose();
            fogGeom.dispose(); fogMat.dispose();
            bubbleGeom.dispose(); bubbleMat.dispose();
            fishGeom.dispose(); fishMat.dispose();
            spkGeom.dispose(); spkMat.dispose();
            bkGeom.dispose(); bkMat.dispose();
            dtGeom.dispose(); dtMat.dispose();
            renderer.domElement.remove();
        },

        handleResize() {
            if (destroyed) return;
            camera.aspect = innerWidth / innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(innerWidth, innerHeight);
        },
    };
}
