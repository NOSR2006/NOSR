/**
 * sg-blackhole.js — Three.js 黑洞特效 (Singularity reveal)
 * 按需加载，替代 Canvas 2D 事件视界 + 吸积盘渲染
 *
 * 视觉要素:
 *   - 事件视界: 黑色球体 + 辉光圆环
 *   - 吸积盘: ~2500 粒子, 倾斜视角, Kepler 轨道, 温度色梯度 + 多普勒色移
 *   - 背景星场: ~500 粒子
 *   - 动态粒子池: infall / jet / burst / hawking
 *   - 电影运镜: 关键帧插值 (高位俯瞰→倾斜→低角度→burst拉远)
 *   - Bloom后期: UnrealBloomPass (additive辉光溢出)
 */

let THREE;

/**
 * @param {HTMLElement} ov   — .rng-singularity overlay
 * @param {boolean} isMobile — 移动端减半粒子
 */
export async function createBlackHole(ov, isMobile) {
    if (!THREE) {
        THREE = await import('https://esm.sh/three@0.160.0');
    }

    const mob = isMobile ? 0.5 : 1;

    // ── Scene ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        60, innerWidth / innerHeight, 1, 2000
    );
    // 初始机位: 略高俯视 (会被运镜系统接管)
    camera.position.set(0, 230, 400);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.domElement.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';
    ov.insertBefore(renderer.domElement, ov.firstChild);

    // ── Bloom + 引力透镜 后期处理 (异步加载，优雅降级) ──
    let bloomComposer = null;
    let lensPass = null;
    let sceneRT = null;
    let _ShaderPass = null;
    try {
        const [
            { EffectComposer },
            { RenderPass },
            { UnrealBloomPass },
            spModule
        ] = await Promise.all([
            import('https://esm.sh/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js'),
            import('https://esm.sh/three@0.160.0/examples/jsm/postprocessing/RenderPass.js'),
            import('https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js'),
            import('https://esm.sh/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js'),
        ]);
        _ShaderPass = spModule.ShaderPass;

        // 场景渲染目标 (透镜输入)
        const pr = renderer.getPixelRatio();
        sceneRT = new THREE.WebGLRenderTarget(
            innerWidth * pr, innerHeight * pr,
            { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
        );

        // Bloom
        bloomComposer = new EffectComposer(renderer);
        bloomComposer.addPass(new RenderPass(scene, camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(innerWidth, innerHeight),
            2.0,   // strength — 辉光溢出强度 (提升)
            0.5,   // radius   — 扩散半径 (更宽泛)
            0.12   // threshold — 亮度阈值 (更低→更多泛光)
        );
        bloomComposer.addPass(bloom);

        // 引力透镜 — 屏幕空间 UV 扭曲
        lensPass = new _ShaderPass({
            uniforms: {
                tDiffuse:     { value: null },
                uBHScreen:    { value: new THREE.Vector2(0.5, 0.5) },
                uStrength:    { value: 0.0 },
                uRadius:      { value: 0.18 },
            },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform sampler2D tDiffuse;
                uniform vec2 uBHScreen;
                uniform float uStrength;
                uniform float uRadius;
                varying vec2 vUv;
                void main() {
                    vec2 delta = vUv - uBHScreen;
                    float dist = length(delta);
                    // 引力扭曲: 靠近黑洞越强, 平滑衰减
                    float warp = uStrength / (dist * dist + 0.002);
                    warp *= smoothstep(uRadius, 0.01, dist);
                    vec2 dir = normalize(delta + vec2(0.0001));
                    // 切向旋转 + 径向拉扯
                    vec2 tangent = vec2(-dir.y, dir.x);
                    vec2 offset = dir * warp * 0.04 + tangent * warp * 0.015;
                    vec2 distUv = vUv + offset;
                    // tDiffuse 已含 bloom 合成, 仅施加扭曲
                    gl_FragColor = texture2D(tDiffuse, distUv);
                }
            `,
        });
        lensPass.renderToScreen = true;
    } catch (e) {
        console.warn('Post-processing unavailable:', e.message);
        bloomComposer = null;
        lensPass = null;
    }

    // BH 屏幕投影 (透镜定位用)
    const _bhWorld = new THREE.Vector3(0, 0, 0);
    const _bhScreen = new THREE.Vector3();

    // ── 电影运镜 — 关键帧系统 ──
    let cameraElapsed = 0;
    // 各阶段总时长约 10s, 关键帧间隔匹配 singularityReveal 的 T 时间线
    // K0(0s 高位全景) → K1(1.5s 坍缩逼近) → K2(3.5s 低角度盘面) → K3(7s burst近景) → K4(9s 拉远淡出)
    const camKF = [
        { t: 0,   pos: [0, 280, 450],   look: [0, 30, 0]   },   // 高位俯瞰
        { t: 1.5, pos: [100, 200, 360],  look: [0, 5, 0]    },   // 右侧倾斜逼近
        { t: 3.5, pos: [-40, 90, 300],   look: [0, -10, 0]  },   // 低角度 (吸积盘侧面)
        { t: 7.0, pos: [20, 65, 260],    look: [0, 0, 0]    },   // burst 近景 (爆发前蓄力)
        { t: 9.0, pos: [0, 150, 540],    look: [0, 0, 0]    },   // burst 拉远 (淡出)
    ];
    const _camPos  = new THREE.Vector3();
    const _camLook = new THREE.Vector3();

    function updateCamera(dt) {
        cameraElapsed += dt;
        const kfs = camKF;
        if (cameraElapsed <= kfs[0].t) {
            _camPos.fromArray(kfs[0].pos);
            _camLook.fromArray(kfs[0].look);
        } else if (cameraElapsed >= kfs[kfs.length - 1].t) {
            _camPos.fromArray(kfs[kfs.length - 1].pos);
            _camLook.fromArray(kfs[kfs.length - 1].look);
        } else {
            for (let i = 0; i < kfs.length - 1; i++) {
                if (cameraElapsed >= kfs[i].t && cameraElapsed < kfs[i + 1].t) {
                    const raw = (cameraElapsed - kfs[i].t) / (kfs[i + 1].t - kfs[i].t);
                    const t = raw * raw * (3 - 2 * raw);   // smoothstep 缓动
                    _camPos.set(
                        kfs[i].pos[0] + (kfs[i + 1].pos[0] - kfs[i].pos[0]) * t,
                        kfs[i].pos[1] + (kfs[i + 1].pos[1] - kfs[i].pos[1]) * t,
                        kfs[i].pos[2] + (kfs[i + 1].pos[2] - kfs[i].pos[2]) * t,
                    );
                    _camLook.set(
                        kfs[i].look[0] + (kfs[i + 1].look[0] - kfs[i].look[0]) * t,
                        kfs[i].look[1] + (kfs[i + 1].look[1] - kfs[i].look[1]) * t,
                        kfs[i].look[2] + (kfs[i + 1].look[2] - kfs[i].look[2]) * t,
                    );
                    break;
                }
            }
        }
        camera.position.copy(_camPos);
        camera.lookAt(_camLook);
    }

    // ── 事件视界 (黑球) ──
    const ehSphere = new THREE.Mesh(
        new THREE.SphereGeometry(55, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    ehSphere.scale.setScalar(0.01);
    scene.add(ehSphere);

    // ── 视界辉光圆环 ──
    const rimTorus = new THREE.Mesh(
        new THREE.TorusGeometry(57, 5, 12, 80),
        new THREE.MeshBasicMaterial({
            color: 0xc084fc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        })
    );
    rimTorus.rotation.x = Math.PI / 2;          // 水平放置
    scene.add(rimTorus);

    // ── 内层紫色辉光环 ──
    const innerGlow = new THREE.Mesh(
        new THREE.TorusGeometry(55, 22, 8, 80),
        new THREE.MeshBasicMaterial({
            color: 0x8b5cf6, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        })
    );
    innerGlow.rotation.x = Math.PI / 2;
    scene.add(innerGlow);

    // ── 爱因斯坦环 — 引力透镜弯曲的背面光 (vertical torus) ──
    // 垂直放置: 正面看几乎不可见(edge-on), 从高/低角度看呈亮环
    // 模拟光线被引力弯曲绕过黑洞背面的效果
    const einsteinRing = new THREE.Mesh(
        new THREE.TorusGeometry(60, 6, 16, 80),
        new THREE.ShaderMaterial({
            uniforms: {
                uTime:    { value: 0 },
                uOpacity: { value: 0 },
            },
            vertexShader: /* glsl */`
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    vViewDir = normalize(-mvPos.xyz);
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime;
                uniform float uOpacity;
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 1.8);
                    float pulse = 0.9 + 0.1 * sin(uTime * 2.0);
                    vec3 color = vec3(1.0, 0.92, 0.82);
                    float alpha = fresnel * uOpacity * pulse * 0.55;
                    gl_FragColor = vec4(color * alpha, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        })
    );
    einsteinRing.scale.setScalar(0.01);
    scene.add(einsteinRing);

    // ── 光子球 — fresnel 边缘辉光壳 ──
    const photonSphere = new THREE.Mesh(
        new THREE.SphereGeometry(62, 48, 48),
        new THREE.ShaderMaterial({
            uniforms: {
                uTime:     { value: 0 },
                uColor1:   { value: new THREE.Color(0xc084fc) },
                uColor2:   { value: new THREE.Color(0xf472b6) },
                uOpacity:  { value: 0 },
            },
            vertexShader: /* glsl */`
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    vViewDir = normalize(-mvPos.xyz);
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                uniform float uOpacity;
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.5);
                    float pulse = 0.85 + 0.15 * sin(uTime * 2.5);
                    float flicker = 0.92 + 0.08 * sin(uTime * 7.3 + vNormal.y * 4.0);
                    vec3 color = mix(uColor1, uColor2, fresnel);
                    float alpha = fresnel * uOpacity * pulse * flicker * 0.65;
                    gl_FragColor = vec4(color * alpha, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
        })
    );
    photonSphere.scale.setScalar(0.01);
    scene.add(photonSphere);

    // ══════════════════════════════════════════════
    // 吸积盘 — 自定义 ShaderMaterial
    // ══════════════════════════════════════════════
    const DISK_N = Math.round(2500 * mob);
    const diskPos    = new Float32Array(DISK_N * 3);
    const diskRadius = new Float32Array(DISK_N);
    const diskAngle0 = new Float32Array(DISK_N);
    const diskSpeed0 = new Float32Array(DISK_N);
    const diskBright = new Float32Array(DISK_N);

    for (let i = 0; i < DISK_N; i++) {
        const r = 75 + Math.random() * 170;       // 75 → 245
        const a = Math.random() * Math.PI * 2;
        diskPos[i * 3]     = Math.cos(a) * r;
        diskPos[i * 3 + 1] = (Math.random() - 0.5) * 3;   // 薄盘微扰
        diskPos[i * 3 + 2] = Math.sin(a) * r;
        diskRadius[i] = r;
        diskAngle0[i] = a;
        diskSpeed0[i] = (0.3 + Math.random() * 0.6) * Math.pow(150 / r, 1.5);
        diskBright[i] = 0.45 + Math.random() * 0.55;
    }

    const diskGeom = new THREE.BufferGeometry();
    diskGeom.setAttribute('position', new THREE.BufferAttribute(diskPos, 3));
    diskGeom.setAttribute('aRadius',  new THREE.BufferAttribute(diskRadius, 1));
    diskGeom.setAttribute('aAngle0',  new THREE.BufferAttribute(diskAngle0, 1));
    diskGeom.setAttribute('aSpeed',   new THREE.BufferAttribute(diskSpeed0, 1));
    diskGeom.setAttribute('aBright',  new THREE.BufferAttribute(diskBright, 1));

    const diskMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime:  { value: 0 },
            uScale: { value: 1.0 }
        },
        vertexShader: /* glsl */`
            attribute float aRadius;
            attribute float aAngle0;
            attribute float aSpeed;
            attribute float aBright;
            uniform float uTime;
            uniform float uScale;
            varying float vRadius;
            varying float vAngle;
            varying float vBright;
            void main() {
                float angle = aAngle0 + uTime * aSpeed;
                float r = aRadius * uScale;
                vec3 pos = vec3(
                    cos(angle) * r,
                    position.y,
                    sin(angle) * r
                );
                vRadius = aRadius;
                vAngle  = angle;
                vBright = aBright;
                vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = clamp((1.0 + (245.0 - aRadius) / 170.0 * 2.8)
                                     * uScale * (220.0 / -mv.z),
                                     1.0, 14.0);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            varying float vRadius;
            varying float vAngle;
            varying float vBright;

            // 伪噪声 — 轻量 hash
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i), b = hash(i + vec2(1,0));
                float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float glow = 1.0 - smoothstep(0.0, 0.5, d);

                // 温度色梯度: 内白→中外橙红
                float t = clamp((vRadius - 75.0) / 170.0, 0.0, 1.0);
                vec3 hot  = vec3(1.0, 0.96, 0.88);
                vec3 warm = vec3(1.0, 0.62, 0.18);
                vec3 cool = vec3(0.98, 0.35, 0.12);
                vec3 color = mix(hot, mix(warm, cool, t), t);

                // 多普勒色移 (approaching 偏亮, receding 偏暗)
                float dop = sin(vAngle) * 0.28;
                color += dop;

                // 密度噪声 — 螺旋臂 + 湍流扰动
                float n1 = noise(vec2(vRadius * 0.018, vAngle * 2.5));
                float n2 = noise(vec2(vRadius * 0.04, vAngle * 5.0 + 3.7));
                float density = 0.55 + n1 * 0.3 + n2 * 0.15;

                float alpha = glow * vBright * 0.55 * density;
                gl_FragColor = vec4(color * alpha, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const diskPoints = new THREE.Points(diskGeom, diskMat);
    const diskGroup  = new THREE.Group();
    diskGroup.add(diskPoints);
    diskGroup.rotation.x = 70 * Math.PI / 180;    // 倾斜 70°
    diskGroup.visible = false;
    scene.add(diskGroup);

    // ── 背景星场 ──
    const STAR_N = Math.round(500 * mob);
    const starPos = new Float32Array(STAR_N * 3);
    for (let i = 0; i < STAR_N; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 400 + Math.random() * 600;
        starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({
        size: 1.8, color: 0xffffff, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    scene.add(stars);

    // ══════════════════════════════════════════════
    // 动态粒子池
    // ══════════════════════════════════════════════
    const _dyn = [];   // { pos, vel, color, size, life, decay, type }

    function _spawnPool(count, factory) {
        for (let i = 0; i < count; i++) _dyn.push(factory(i, count));
    }

    function _makePointsGeom(n) {
        return {
            pos: new Float32Array(n * 3),
            col: new Float32Array(n * 3),
            n: 0
        };
    }

    const hex2rgb = (hex) => {
        const c = parseInt(hex.replace('#', ''), 16);
        return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
    };

    // 通用 Points 对象
    function _createDynPoints(maxN, baseSize) {
        const g = new THREE.BufferGeometry();
        const p = new Float32Array(maxN * 3);
        const c = new Float32Array(maxN * 3);
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        g.setAttribute('color',    new THREE.BufferAttribute(c, 3));
        g.setDrawRange(0, 0);
        const mat = new THREE.PointsMaterial({
            size: baseSize, vertexColors: true, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        });
        const pts = new THREE.Points(g, mat);
        scene.add(pts);
        return { geom: g, mat, pts, maxN };
    }

    const dynPts = _createDynPoints(600, 3.5);

    // ── Clock ──
    const clock = new THREE.Clock();
    let rafId = null;
    let destroyed = false;

    // ══════════════════════════════════════════════
    // 渲染循环
    // ══════════════════════════════════════════════
    function animate() {
        if (destroyed) return;
        const dt = Math.min(clock.getDelta(), 0.05);   // cap to prevent spiral

        // 电影运镜
        updateCamera(dt);

        // 星场慢旋
        stars.rotation.y += 0.00025;
        stars.rotation.x += 0.0001;

        // 吸积盘
        if (diskGroup.visible) {
            diskMat.uniforms.uTime.value += dt;
        }

        // 辉光环呼吸
        if (rimTorus.material.opacity > 0) {
            rimTorus.scale.setScalar(1 + Math.sin(performance.now() * 0.003) * 0.015);
            innerGlow.material.opacity = rimTorus.material.opacity * 0.35;
            innerGlow.scale.setScalar(1 + Math.sin(performance.now() * 0.002) * 0.03);
        }

        // 动态粒子更新
        for (let i = _dyn.length - 1; i >= 0; i--) {
            const p = _dyn[i];
            p.life -= p.decay * dt * 60;
            if (p.life <= 0) { _dyn.splice(i, 1); continue; }

            switch (p.type) {
                case 'infall': {
                    const dx = -p.pos[0], dy = -p.pos[1], dz = -p.pos[2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
                    const f = 6.0 / (dist * 0.015 + 1);
                    p.vel[0] += (dx / dist) * f * dt * 60;
                    p.vel[1] += (dy / dist) * f * dt * 60;
                    p.vel[2] += (dz / dist) * f * dt * 60;
                    // 切向螺旋
                    p.vel[0] += (-dz / dist) * 0.8 * dt * 60;
                    p.vel[2] += ( dx / dist) * 0.8 * dt * 60;
                    break;
                }
                case 'jet':
                    // 轻微横向摆动
                    p.vel[0] += Math.sin(p.pos[1] * 0.02) * 0.15 * dt * 60;
                    p.vel[2] += Math.cos(p.pos[1] * 0.02) * 0.15 * dt * 60;
                    break;
                case 'burst':
                    p.vel[0] *= 0.985;
                    p.vel[1] *= 0.985;
                    p.vel[2] *= 0.985;
                    break;
                // hawking: 匀速外逃
            }

            p.pos[0] += p.vel[0] * dt * 60;
            p.pos[1] += p.vel[1] * dt * 60;
            p.pos[2] += p.vel[2] * dt * 60;
        }

        // 写入动态粒子 GPU buffer
        {
            const posA = dynPts.geom.getAttribute('position');
            const colA = dynPts.geom.getAttribute('color');
            const n = Math.min(_dyn.length, dynPts.maxN);
            for (let i = 0; i < n; i++) {
                const p = _dyn[i];
                const a = Math.max(0, p.life);
                posA.array[i * 3]     = p.pos[0];
                posA.array[i * 3 + 1] = p.pos[1];
                posA.array[i * 3 + 2] = p.pos[2];
                colA.array[i * 3]     = p.col[0] * a;
                colA.array[i * 3 + 1] = p.col[1] * a;
                colA.array[i * 3 + 2] = p.col[2] * a;
            }
            posA.needsUpdate = true;
            colA.needsUpdate = true;
            dynPts.geom.setDrawRange(0, n);
        }

        // 光子球动画
        photonSphere.material.uniforms.uTime.value = cameraElapsed;
        einsteinRing.material.uniforms.uTime.value = cameraElapsed;
        if (ehSphere.scale.x > 0.5) {
            const breathe = 1.0 + Math.sin(performance.now() * 0.002) * 0.015;
            photonSphere.scale.setScalar(ehSphere.scale.x * breathe);
        }

        // 渲染管线优化: bloomComposer 内部渲染场景+bloom → lens 读 bloom 输出
        // (避免先单独渲染到 sceneRT 再在 bloomComposer 内重复渲染)
        if (lensPass && bloomComposer) {
            // 1. bloomComposer: 渲染场景 + bloom 后期 (单次场景渲染)
            bloomComposer.render();
            // 2. lens: 读 bloom 输出纹理, 施加引力扭曲到屏幕
            _bhScreen.copy(_bhWorld).project(camera);
            lensPass.uniforms.uBHScreen.value.set(
                (_bhScreen.x + 1) * 0.5,
                (_bhScreen.y + 1) * 0.5
            );
            const bloomOut = bloomComposer.readBuffer;
            lensPass.uniforms.tDiffuse.value = bloomOut.texture;
            lensPass.render(renderer, null, bloomOut, 0);
        } else if (bloomComposer) {
            bloomComposer.render();
        } else {
            renderer.render(scene, camera);
        }
        rafId = requestAnimationFrame(animate);
    }
    animate();

    // ══════════════════════════════════════════════
    // 阶段控制 API — 由 singularityReveal() setTimeout 调用
    // ══════════════════════════════════════════════
    return {

        // Phase 2: 物质坍缩 → 事件视界出现 + infall 粒子
        collapse() {
            if (destroyed) return;
            // EH 从 0.01 → 1
            const start = performance.now();
            const grow = () => {
                if (destroyed) return;
                const t = Math.min((performance.now() - start) / 800, 1);
                ehSphere.scale.setScalar(0.01 + 0.99 * t);
                rimTorus.material.opacity = 0.7 * t;
                innerGlow.material.opacity = 0.25 * t;
                photonSphere.material.uniforms.uOpacity.value = 0.8 * t;
                einsteinRing.scale.setScalar(0.01 + 0.99 * t);
                einsteinRing.material.uniforms.uOpacity.value = 0.6 * t;
                if (lensPass) lensPass.uniforms.uStrength.value = 0.003 * t;
                if (t < 1) requestAnimationFrame(grow);
            };
            grow();

            // Infall 粒子
            _spawnPool(Math.round(80 * mob), () => {
                const theta = Math.random() * Math.PI * 2;
                const phi   = Math.acos(2 * Math.random() - 1);
                const r     = 220 + Math.random() * 200;
                const clr   = Math.random() > 0.4 ? [0.545, 0.361, 0.965] : [0.925, 0.286, 0.6];
                return {
                    pos: [
                        r * Math.sin(phi) * Math.cos(theta),
                        r * Math.sin(phi) * Math.sin(theta),
                        r * Math.cos(phi)
                    ],
                    vel: [0, 0, 0],
                    col: clr, size: 3, life: 1,
                    decay: 0.005, type: 'infall'
                };
            });
        },

        // Phase 3: 吸积盘显现
        showDisk() {
            if (destroyed) return;
            diskGroup.visible = true;
            const start = performance.now();
            const fadeIn = () => {
                if (destroyed) return;
                const t = Math.min((performance.now() - start) / 1500, 1);
                diskMat.uniforms.uScale.value = 0.3 + 0.7 * t;
                if (t < 1) requestAnimationFrame(fadeIn);
            };
            fadeIn();
        },

        // Phase 4: 相对论喷流
        showJets() {
            if (destroyed) return;
            // 持续喷射 ~1.5s
            let count = 0;
            const spawn = () => {
                if (destroyed || count > 30) return;
                for (const dir of [-1, 1]) {
                    const clr = Math.random() > 0.35
                        ? [0.545, 0.361, 0.965]
                        : [0.376, 0.647, 0.98];
                    _dyn.push({
                        pos: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4],
                        vel: [(Math.random() - 0.5) * 0.5,
                              dir * (4 + Math.random() * 10),
                              (Math.random() - 0.5) * 0.5],
                        col: clr, size: 2.5, life: 1,
                        decay: 0.012, type: 'jet'
                    });
                }
                count++;
                setTimeout(spawn, 50);
            };
            spawn();
        },

        // Phase 5: 霍金辐射
        showHawking() {
            if (destroyed) return;
            const spawn = () => {
                if (destroyed) return;
                for (let i = 0; i < 3; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const r = 57 + Math.random() * 5;
                    _dyn.push({
                        pos: [Math.cos(a) * r, (Math.random() - 0.5) * 4, Math.sin(a) * r],
                        vel: [Math.cos(a) * 1.2, (Math.random() - 0.5) * 0.6, Math.sin(a) * 1.2],
                        col: [1, 1, 1], size: 1.5, life: 0.7,
                        decay: 0.018, type: 'hawking'
                    });
                }
                setTimeout(spawn, 180);
            };
            spawn();
        },

        // Phase 7: 最终爆发
        burst() {
            if (destroyed) return;
            // 透镜激活
            if (lensPass) {
                const ls = performance.now();
                const rampLens = () => {
                    if (destroyed) return;
                    const lt = Math.min((performance.now() - ls) / 600, 1);
                    lensPass.uniforms.uStrength.value = lt * 0.006;
                    if (lt < 1) requestAnimationFrame(rampLens);
                };
                rampLens();
            }
            // 辉光脉冲
            rimTorus.material.opacity = 1;
            innerGlow.material.opacity = 0.8;
            photonSphere.material.uniforms.uOpacity.value = 1.2;
            einsteinRing.material.uniforms.uOpacity.value = 1.0;
            const start = performance.now();
            const pulse = () => {
                if (destroyed) return;
                const t = Math.min((performance.now() - start) / 1500, 1);
                rimTorus.scale.setScalar(1 + t * 2.5);
                rimTorus.material.opacity = Math.max(0, 1 - t * 1.2);
                innerGlow.scale.setScalar(1 + t * 3);
                innerGlow.material.opacity = Math.max(0, 0.8 - t);
                photonSphere.material.uniforms.uOpacity.value = Math.max(0, 1.2 - t * 1.5);
                einsteinRing.material.uniforms.uOpacity.value = Math.max(0, 1.0 - t * 1.3);
                if (t < 1) requestAnimationFrame(pulse);
            };
            pulse();

            // Burst 粒子 — 分 3 批生成, 避免单帧 150 粒子导致卡顿
            const colors = [
                [1, 1, 1], [0.753, 0.518, 0.965],
                [0.925, 0.286, 0.6], [0.545, 0.361, 0.965]
            ];
            const total = Math.round(150 * mob);
            const batch = Math.ceil(total / 3);
            for (let b = 0; b < 3; b++) {
                setTimeout(() => {
                    if (destroyed) return;
                    const n = Math.min(batch, total - b * batch);
                    for (let i = 0; i < n; i++) {
                        const theta = Math.random() * Math.PI * 2;
                        const phi   = Math.acos(2 * Math.random() - 1);
                        const speed = 3 + Math.random() * 14;
                        _dyn.push({
                            pos: [0, 0, 0],
                            vel: [
                                Math.sin(phi) * Math.cos(theta) * speed,
                                Math.sin(phi) * Math.sin(theta) * speed,
                                Math.cos(phi) * speed
                            ],
                            col: colors[Math.floor(Math.random() * 4)],
                            size: 3, life: 1,
                            decay: 0.014, type: 'burst'
                        });
                    }
                }, b * 25);
            }
        },

        // Phase 8: 同步淡出 — 全部由 rAF 驱动, 不依赖 CSS transition
        fadeOut() {
            if (destroyed) return;
            const start = performance.now();
            const dur = 1000;
            // 快照当前值
            const b0 = bloomComposer ? bloomComposer.passes.find(p => p.strength !== undefined)?.strength ?? 2.0 : 2.0;
            const l0 = lensPass ? lensPass.uniforms.uStrength.value : 0;
            const p0 = photonSphere.material.uniforms.uOpacity.value;
            const r0 = rimTorus.material.opacity;
            const g0 = innerGlow.material.opacity;
            const s0 = stars.material.opacity;
            const e0 = einsteinRing.material.uniforms.uOpacity.value;
            // 禁用 CSS transition, 由 JS 完全接管
            ov.style.transition = 'none';
            const ramp = () => {
                if (destroyed) return;
                const raw = Math.min((performance.now() - start) / dur, 1);
                const ease = 1 - raw * raw;   // easeOutQuad
                // overlay 透明度 (替代 CSS transition)
                ov.style.opacity = String(ease);
                // Three.js 视觉元素
                if (bloomComposer) {
                    const bp = bloomComposer.passes.find(p => p.strength !== undefined);
                    if (bp) bp.strength = b0 * ease;
                }
                if (lensPass) lensPass.uniforms.uStrength.value = l0 * ease;
                photonSphere.material.uniforms.uOpacity.value = p0 * ease;
                rimTorus.material.opacity = r0 * ease;
                innerGlow.material.opacity = g0 * ease;
                stars.material.opacity = s0 * ease;
                einsteinRing.material.uniforms.uOpacity.value = e0 * ease;
                if (raw < 1) {
                    requestAnimationFrame(ramp);
                } else {
                    ov.style.background = 'black';
                }
            };
            ramp();
        },

        // ── 销毁 ──
        destroy() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            // 释放 Bloom composer
            if (bloomComposer) {
                bloomComposer.passes.forEach(pass => {
                    if (pass.dispose) pass.dispose();
                });
                bloomComposer.renderTarget1.dispose();
                bloomComposer.renderTarget2.dispose();
            }
            if (sceneRT) sceneRT.dispose();
            renderer.dispose();
            // 释放几何体 & 材质
            scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            renderer.domElement.remove();
        },

        // ── 窗口 resize ──
        handleResize() {
            if (destroyed) return;
            camera.aspect = innerWidth / innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(innerWidth, innerHeight);
            if (bloomComposer) bloomComposer.setSize(innerWidth, innerHeight);
            if (sceneRT) {
                const pr = renderer.getPixelRatio();
                sceneRT.setSize(innerWidth * pr, innerHeight * pr);
            }
        }
    };
}
