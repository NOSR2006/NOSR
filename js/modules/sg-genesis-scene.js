/**
 * sg-genesis-scene.js — Three.js 创世氛围 + 灯效点缀层
 * 粒子: 星场 + Bokeh 散景 + 光柱浮尘
 * 灯效: Fresnel 核心光球 + 锥形放射光线 + 揭示火花爆发
 * 无 Bloom / 纯透明背景叠加 CSS 主力视觉
 */

let THREE;

export async function createGenesisScene(ov, isMobile) {
    if (!THREE) {
        THREE = await import('https://esm.sh/three@0.160.0');
    }

    const mob = isMobile ? 0.5 : 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 2000);
    camera.position.set(0, 0, 500);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;transition:opacity 1.5s ease-out;';
    ov.insertBefore(renderer.domElement, ov.firstChild);
    requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; });

    // ── 星场 (远景微尘) ──
    const STAR_N = Math.round(300 * mob);
    const starPos = new Float32Array(STAR_N * 3);
    for (let i = 0; i < STAR_N; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 300 + Math.random() * 500;
        starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
        size: 1.5, color: 0xd0d8f0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    // ── Bokeh 散景 (大光斑) ──
    const BK_N = Math.round(20 * mob);
    const bkPos = new Float32Array(BK_N * 3);
    for (let i = 0; i < BK_N; i++) {
        bkPos[i * 3]     = (Math.random() - 0.5) * 800;
        bkPos[i * 3 + 1] = (Math.random() - 0.5) * 600;
        bkPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    const bkGeom = new THREE.BufferGeometry();
    bkGeom.setAttribute('position', new THREE.BufferAttribute(bkPos, 3));
    const bkMat = new THREE.PointsMaterial({
        size: 55, color: 0xfff5e0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const bokeh = new THREE.Points(bkGeom, bkMat);
    scene.add(bokeh);

    // ── 光柱浮尘 (中心区域聚集) ──
    const DT_N = Math.round(120 * mob);
    const dtPos = new Float32Array(DT_N * 3);
    const dtPhase = new Float32Array(DT_N);
    for (let i = 0; i < DT_N; i++) {
        dtPos[i * 3]     = (Math.random() - 0.5) * 120;
        dtPos[i * 3 + 1] = (Math.random() - 0.5) * 700;
        dtPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
        dtPhase[i] = Math.random() * Math.PI * 2;
    }
    const dtGeom = new THREE.BufferGeometry();
    dtGeom.setAttribute('position', new THREE.BufferAttribute(dtPos, 3));
    const dtMat = new THREE.PointsMaterial({
        size: 2.5, color: 0xffeedd, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const dust = new THREE.Points(dtGeom, dtMat);
    scene.add(dust);

    // ── 核心光球 (Fresnel shader — 2.5s 随光柱出现) ──
    const coreGeom = new THREE.SphereGeometry(30, 32, 32);
    const coreMat = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uOpacity;
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vec3 viewDir = normalize(-vPosition);
                float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
                float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
                float core = pow(max(0.0, dot(viewDir, vNormal)), 4.0) * 0.35;
                float brightness = (fresnel * 0.7 + core) * pulse;
                vec3 color = mix(vec3(1.0, 0.92, 0.75), vec3(1.0, 1.0, 1.0), fresnel);
                gl_FragColor = vec4(color, brightness * uOpacity);
            }
        `,
    });
    const coreOrb = new THREE.Mesh(coreGeom, coreMat);
    scene.add(coreOrb);

    // ── 放射光线 (极坐标 starburst — 单面 shader, 无几何边缘) ──
    const RAY_COUNT = 12;
    const rayGeom = new THREE.PlaneGeometry(1400, 1400);
    const rayMat = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uOpacity;
            uniform float uTime;
            varying vec2 vUv;
            #define PI 3.14159265
            void main() {
                vec2 uv = vUv * 2.0 - 1.0;
                float dist = length(uv);
                float angle = atan(uv.y, uv.x);
                float sector = 2.0 * PI / float(${RAY_COUNT});
                float offset = uTime * 0.08;
                float a = mod(angle + sector * 0.5 + offset, sector) - sector * 0.5;
                float absA = abs(a);
                float core = smoothstep(0.018, 0.0, absA) * smoothstep(1.2, 0.05, dist);
                float inner = exp(-absA * 55.0) * smoothstep(1.1, 0.05, dist) * 0.22;
                float outer = exp(-absA * 16.0) * smoothstep(0.95, 0.0, dist) * 0.055;
                float ray = core + inner + outer;
                ray *= smoothstep(0.04, 0.14, dist);
                vec3 col = mix(vec3(1.0, 0.96, 0.88), vec3(1.0, 0.86, 0.6), dist);
                gl_FragColor = vec4(col, ray * uOpacity);
            }
        `,
    });
    const rayPlane = new THREE.Mesh(rayGeom, rayMat);
    scene.add(rayPlane);

    // ── 揭示火花爆发 (5.5s — 金色粒子球形爆发) ──
    const SP_N = Math.round(50 * mob);
    const spPos = new Float32Array(SP_N * 3);
    const spCol = new Float32Array(SP_N * 3);
    const spVel = [];
    for (let i = 0; i < SP_N; i++) {
        spPos[i * 3] = spPos[i * 3 + 1] = spPos[i * 3 + 2] = 0;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const spd = 2 + Math.random() * 8;
        spVel.push(
            Math.sin(phi) * Math.cos(theta) * spd,
            Math.sin(phi) * Math.sin(theta) * spd,
            Math.cos(phi) * spd
        );
        spCol[i * 3] = 1.0;
        spCol[i * 3 + 1] = 0.85 + Math.random() * 0.15;
        spCol[i * 3 + 2] = 0.4 + Math.random() * 0.2;
    }
    const spGeom = new THREE.BufferGeometry();
    spGeom.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
    spGeom.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
    spGeom.setDrawRange(0, 0);
    const spMat = new THREE.PointsMaterial({
        size: 4, vertexColors: true, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const sparks = new THREE.Points(spGeom, spMat);
    scene.add(sparks);
    let sparksActive = false;

    // ── 渲染循环 ──
    const clock = new THREE.Clock();
    let elapsed = 0;
    let rafId, destroyed = false;

    function animate() {
        if (destroyed) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;

        // 星场慢旋 + 渐入
        stars.rotation.y += 0.0002;
        if (elapsed < 2) starMat.opacity = (elapsed / 2) * 0.4;

        // Bokeh 渐入 (1s 起)
        if (elapsed > 1 && bkMat.opacity < 0.03) {
            bkMat.opacity = Math.min(0.03, bkMat.opacity + dt * 0.02);
        }

        // 浮尘渐入 (2.5s 起) + 呼吸
        if (elapsed > 2.5 && dtMat.opacity < 0.08) {
            dtMat.opacity = Math.min(0.08, dtMat.opacity + dt * 0.04);
        }
        if (dtMat.opacity > 0) {
            const posA = dtGeom.getAttribute('position');
            for (let i = 0; i < DT_N; i++) {
                posA.array[i * 3]     += Math.sin(elapsed * 0.5 + dtPhase[i]) * 0.05;
                posA.array[i * 3 + 1] += Math.cos(elapsed * 0.3 + dtPhase[i]) * 0.02;
            }
            posA.needsUpdate = true;
        }

        // 核心光球 (2.5s 激活)
        if (elapsed > 2.5) {
            const t = elapsed - 2.5;
            const fadeIn = Math.min(1, t / 1.5);
            coreMat.uniforms.uTime.value = elapsed;
            coreMat.uniforms.uOpacity.value = fadeIn * 0.4;
            coreOrb.scale.setScalar(1 + 0.08 * Math.sin(elapsed * 2));
            // 冲击脉冲 3.5s
            if (elapsed > 3.5 && elapsed < 4.5) {
                coreMat.uniforms.uOpacity.value += 0.2 * Math.sin((elapsed - 3.5) * Math.PI);
            }
            // 揭示脉冲 5.5s
            if (elapsed > 5.5 && elapsed < 7.0) {
                coreMat.uniforms.uOpacity.value += 0.3 * Math.sin((elapsed - 5.5) * Math.PI / 1.5);
                coreOrb.scale.setScalar(1 + 0.3 * Math.sin((elapsed - 5.5) * Math.PI * 2));
            }
        }

        // 放射光线 (2.5s 渐入 + 慢旋)
        if (elapsed > 2.5) {
            rayMat.uniforms.uTime.value = elapsed;
            const t = Math.min(1, (elapsed - 2.5) / 2);
            const smooth = t * t * (3 - 2 * t);
            rayMat.uniforms.uOpacity.value = smooth * 0.4;
            // 揭示闪亮 5.5s
            if (elapsed > 5.5 && elapsed < 7.0) {
                const boost = 1 + 0.5 * Math.sin((elapsed - 5.5) * Math.PI / 1.5);
                rayMat.uniforms.uOpacity.value = smooth * 0.4 * boost;
            }
        }

        // 火花爆发 (5.5s 触发)
        if (elapsed > 5.5 && !sparksActive) {
            sparksActive = true;
            spGeom.setDrawRange(0, SP_N);
            spMat.opacity = 1;
        }
        if (sparksActive) {
            const posA = spGeom.getAttribute('position');
            const colA = spGeom.getAttribute('color');
            for (let i = 0; i < SP_N; i++) {
                posA.array[i * 3]     += spVel[i * 3] * dt * 60;
                posA.array[i * 3 + 1] += spVel[i * 3 + 1] * dt * 60;
                posA.array[i * 3 + 2] += spVel[i * 3 + 2] * dt * 60;
                spVel[i * 3]     *= 0.98;
                spVel[i * 3 + 1] *= 0.98;
                spVel[i * 3 + 2] *= 0.98;
                const fade = 0.97;
                colA.array[i * 3]     *= fade;
                colA.array[i * 3 + 1] *= fade;
                colA.array[i * 3 + 2] *= fade;
            }
            posA.needsUpdate = true;
            colA.needsUpdate = true;
        }

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animate);
    }
    animate();

    // ══════════════════════════════════════════════
    // API
    // ══════════════════════════════════════════════
    return {
        fadeOut() {
            if (destroyed) return;
            renderer.domElement.style.transition = 'opacity 0.8s ease-in';
            renderer.domElement.style.opacity = '0';
            const start = performance.now();
            const dur = 800;
            const s0 = starMat.opacity;
            const b0 = bkMat.opacity;
            const d0 = dtMat.opacity;
            const c0 = coreMat.uniforms.uOpacity.value;
            const r0 = rayMat.uniforms.uOpacity.value;
            const sp0 = spMat.opacity;
            const ramp = () => {
                if (destroyed) return;
                const t = Math.min((performance.now() - start) / dur, 1);
                const ease = 1 - t;
                starMat.opacity = s0 * ease;
                bkMat.opacity = b0 * ease;
                dtMat.opacity = d0 * ease;
                coreMat.uniforms.uOpacity.value = c0 * ease;
                rayMat.uniforms.uOpacity.value = r0 * ease;
                spMat.opacity = sp0 * ease;
                if (t < 1) requestAnimationFrame(ramp);
            };
            ramp();
        },

        destroy() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            renderer.dispose();
            starGeom.dispose(); starMat.dispose();
            bkGeom.dispose(); bkMat.dispose();
            dtGeom.dispose(); dtMat.dispose();
            coreGeom.dispose(); coreMat.dispose();
            rayGeom.dispose(); rayMat.dispose();
            spGeom.dispose(); spMat.dispose();
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
