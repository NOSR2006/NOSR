/**
 * rng-display-3d.js — Three.js Roll 显示区点缀
 * 在 .rng-display 容器内渲染一层 Three.js canvas 作为氛围背景
 * DOM 文字 (symbol / label / rarity) 保持在 canvas 上方
 *
 * 视觉: fresnel 辉光球 + 内核亮点 + 外层辉光壳 + 轨道环 + tier 分级粒子场
 * L5 百万级: 主题专属 Three.js 特效 (Genesis 火星 / Wave 气泡 / Singularity 暗涡 / NOSR 数据栅格 / Paradox 双色悖论)
 * 状态: idle → spinning → landing → idle (tier 着色)
 */

let THREE;

const TIERS = {
    genesis:     { color: 0xffd700, n: 100 },
    wave:        { color: 0x0ea5e9, n: 90  },
    singularity: { color: 0xc084fc, n: 90  },
    nosr:        { color: 0x3b82f6, n: 80  },
    paradox:     { color: 0xe040a0, n: 90  },
};

/**
 * @param {HTMLElement} container — #rngDisplay
 */
export async function createDisplay3D(container) {
    if (!THREE) {
        THREE = await import('https://esm.sh/three@0.160.0');
    }

    const mob = /Mobi|Android/i.test(navigator.userAgent);
    let destroyed = false;
    let _tier = '';

    // ── Scene ──
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 500);
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
    container.insertBefore(renderer.domElement, container.firstChild);

    function syncSize() {
        const w = container.clientWidth  || 300;
        const h = container.clientHeight || 300;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        // orb 投影直径 (px) = 76 / (2*200*tan(25°)) * h
        container.style.setProperty('--orb-px', Math.round(0.4075 * h) + 'px');
    }
    syncSize();

    // ── State ──
    let _spin = 0;        // 0 = idle, 1 = spinning
    let _orbOp = 0;       // 当前 orb 不透明度
    let _orbOpTgt = 0;    // 目标不透明度
    let _color = new THREE.Color(0x6366f1);

    // ══════════════════════════════════════
    //  Orb — fresnel 辉光球 (大半径包裹 emoji)
    // ══════════════════════════════════════
    const orb = new THREE.Mesh(
        new THREE.SphereGeometry(38, 32, 32),
        new THREE.ShaderMaterial({
            uniforms: {
                uTime:    { value: 0 },
                uColor:   { value: _color.clone() },
                uOpacity: { value: 0 },
                uSpin:    { value: 0 },
            },
            vertexShader: /* glsl */`
                varying vec3 vN, vV;
                void main() {
                    vN = normalize(normalMatrix * normal);
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vV = normalize(-mv.xyz);
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity, uSpin;
                uniform vec3 uColor;
                varying vec3 vN, vV;
                void main() {
                    float f = pow(1.0 - abs(dot(vN, vV)), 2.5);
                    float p = 0.85 + 0.15 * sin(uTime * 2.5);
                    float s = 1.0 + uSpin * 0.45;
                    float a = f * uOpacity * p * s;
                    vec3 c = uColor * (1.0 + f * 0.5);
                    gl_FragColor = vec4(c * a, a);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    scene.add(orb);

    // ══════════════════════════════════════
    //  Inner core — 内核亮点 (球心发光)
    // ══════════════════════════════════════
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(6, 16, 16),
        new THREE.ShaderMaterial({
            uniforms: {
                uTime:    { value: 0 },
                uColor:   { value: _color.clone() },
                uOpacity: { value: 0 },
            },
            vertexShader: /* glsl */`
                varying vec3 vN, vV;
                void main() {
                    vN = normalize(normalMatrix * normal);
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vV = normalize(-mv.xyz);
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity;
                uniform vec3 uColor;
                varying vec3 vN, vV;
                void main() {
                    float center = pow(max(0.0, dot(vN, vV)), 1.5);
                    float pulse  = 0.7 + 0.3 * sin(uTime * 3.0);
                    float a = center * uOpacity * pulse * 0.4;
                    vec3 c = mix(uColor, vec3(1.0), 0.5);
                    gl_FragColor = vec4(c * a, a);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    scene.add(core);

    // ══════════════════════════════════════
    //  Particles — 粒子环
    // ══════════════════════════════════════
    const MAX_N = mob ? 60 : 120;
    const pPos   = new Float32Array(MAX_N * 3);
    const pSize  = new Float32Array(MAX_N);
    const pPhase = new Float32Array(MAX_N);
    let pN = 0;

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeom.setAttribute('aSize',    new THREE.BufferAttribute(pSize, 1));
    pGeom.setAttribute('aPhase',   new THREE.BufferAttribute(pPhase, 1));
    pGeom.setDrawRange(0, 0);

    const pMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime:    { value: 0 },
            uSpin:    { value: 0 },
            uColor:   { value: _color.clone() },
            uOpacity: { value: 0.5 },
        },
        vertexShader: /* glsl */`
            attribute float aSize, aPhase;
            uniform float uTime, uSpin;
            varying float vA;
            void main() {
                float t  = uTime * (0.3 + uSpin * 3.5);
                float ca = cos(t + aPhase), sa = sin(t + aPhase);
                vec3 p = position;
                p.x = position.x * ca - position.z * sa;
                p.z = position.x * sa + position.z * ca;
                p.y += sin(uTime * 1.2 + aPhase * 3.0) * 5.0;
                vA = 0.35 + 0.25 * sin(uTime * 2.0 + aPhase * 5.0);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_PointSize = aSize * (1.0 + uSpin * 0.6) * (200.0 / -mv.z);
                gl_Position  = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            uniform vec3 uColor;
            uniform float uOpacity;
            varying float vA;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float g = 1.0 - smoothstep(0.0, 0.5, d);
                float a = g * vA * uOpacity;
                gl_FragColor = vec4(uColor * a, a);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const pts = new THREE.Points(pGeom, pMat);
    scene.add(pts);

    function fillParticles(tier) {
        const cfg = TIERS[tier];
        const n = Math.min(cfg ? cfg.n : 35, MAX_N);
        const inner = cfg ? 52 : 44;
        const outer = cfg ? 120 : 100;
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = inner + Math.random() * (outer - inner);
            pPos[i * 3]     = Math.cos(a) * r;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
            pPos[i * 3 + 2] = Math.sin(a) * r;
            pSize[i]  = 1.5 + Math.random() * 2.5;
            pPhase[i] = Math.random() * Math.PI * 2;
        }
        pN = n;
        pGeom.attributes.position.needsUpdate = true;
        pGeom.attributes.aSize.needsUpdate    = true;
        pGeom.attributes.aPhase.needsUpdate   = true;
        pGeom.setDrawRange(0, n);
    }

    // ══════════════════════════════════════
    //  Glow shell — 外层辉光壳
    // ══════════════════════════════════════
    const glowShell = new THREE.Mesh(
        new THREE.SphereGeometry(44, 24, 24),
        new THREE.ShaderMaterial({
            uniforms: {
                uTime:    { value: 0 },
                uColor:   { value: _color.clone() },
                uOpacity: { value: 0 },
            },
            vertexShader: /* glsl */`
                varying vec3 vN, vV;
                void main() {
                    vN = normalize(normalMatrix * normal);
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vV = normalize(-mv.xyz);
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity;
                uniform vec3 uColor;
                varying vec3 vN, vV;
                void main() {
                    float f = pow(1.0 - abs(dot(vN, vV)), 5.0);
                    float a = f * uOpacity * 0.2;
                    gl_FragColor = vec4(uColor * a, a);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide,
        })
    );
    glowShell.visible = false;
    scene.add(glowShell);

    // ══════════════════════════════════════
    //  Orbit rings — 轨道环 (2 条不同角度)
    // ══════════════════════════════════════
    const rings = [];
    const ringMat = new THREE.MeshBasicMaterial({
        color: _color.clone(), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ringCfg = [
        { r: 48, tube: 0.5, rx: 1.2, rz: 0.3  },
        { r: 52, tube: 0.4, rx: -0.8, rz: -0.5 },
    ];
    for (const c of ringCfg) {
        const m = new THREE.Mesh(
            new THREE.TorusGeometry(c.r, c.tube, 8, 80), ringMat.clone()
        );
        m.rotation.set(c.rx, 0, c.rz);
        m.visible = false;
        scene.add(m);
        rings.push(m);
    }

    // ══════════════════════════════════════
    //  L5 Themed extras
    // ══════════════════════════════════════
    const _l5 = [];   // 当前活跃的 L5 对象

    function clearL5() {
        for (const o of _l5) {
            scene.remove(o.mesh);
            if (o.mesh.geometry) o.mesh.geometry.dispose();
            if (o.mesh.material) o.mesh.material.dispose();
        }
        _l5.length = 0;
    }

    // ── Genesis: 40 颗金色火星环绕 ──
    function addGenesis() {
        const N = 40;
        const pos = new Float32Array(N * 3);
        const sz  = new Float32Array(N);
        const ph  = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 42 + Math.random() * 25;
            pos[i*3] = Math.cos(a)*r; pos[i*3+1] = (Math.random()-0.5)*15; pos[i*3+2] = Math.sin(a)*r;
            sz[i] = 2 + Math.random() * 3;
            ph[i] = Math.random() * Math.PI * 2;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
        g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                attribute float aSize, aPhase;
                uniform float uTime;
                varying float vA;
                void main() {
                    float a = uTime * 0.6 + aPhase;
                    float r = length(position.xz);
                    vec3 p = vec3(cos(a)*r, position.y + sin(uTime*2.0+aPhase*3.0)*4.0, sin(a)*r);
                    vA = 0.5 + 0.5*sin(uTime*3.0+aPhase*7.0);
                    vec4 mv = modelViewMatrix * vec4(p,1.0);
                    gl_PointSize = aSize * (200.0 / -mv.z);
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uOpacity;
                varying float vA;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if(d>0.5) discard;
                    float g = 1.0-smoothstep(0.0,0.5,d);
                    float a = g*vA*uOpacity;
                    gl_FragColor = vec4(1.0,0.85,0.3, a);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const m = new THREE.Points(g, mat);
        scene.add(m);
        _l5.push({ mesh:m, mat, geom:g, type:'genesis' });
    }

    // ── Wave: 25 个上升气泡 + 焦散光斑平面 ──
    function addWave() {
        // 气泡
        const N = 25;
        const pos = new Float32Array(N * 3);
        const sz  = new Float32Array(N);
        const ph  = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            pos[i*3] = (Math.random()-0.5)*80;
            pos[i*3+1] = (Math.random()-0.5)*80;
            pos[i*3+2] = (Math.random()-0.5)*30;
            sz[i] = 3 + Math.random()*5;
            ph[i] = Math.random()*Math.PI*2;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
        g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                attribute float aSize, aPhase;
                uniform float uTime;
                varying float vA;
                void main() {
                    vec3 p = position;
                    p.y = mod(p.y + uTime*12.0 + aPhase*20.0, 100.0) - 50.0;
                    p.x += sin(uTime*1.5+aPhase*4.0)*8.0;
                    vA = 0.3+0.3*sin(uTime*2.0+aPhase);
                    vec4 mv = modelViewMatrix*vec4(p,1.0);
                    gl_PointSize = aSize*(200.0/-mv.z);
                    gl_Position = projectionMatrix*mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uOpacity;
                varying float vA;
                void main() {
                    float d = length(gl_PointCoord-vec2(0.5));
                    if(d>0.5) discard;
                    float ring = smoothstep(0.3,0.4,d)*(1.0-smoothstep(0.4,0.5,d));
                    float fill = (1.0-smoothstep(0.0,0.5,d))*0.15;
                    float a = (ring*0.6+fill)*vA*uOpacity;
                    gl_FragColor = vec4(0.4,0.85,1.0, a);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const m = new THREE.Points(g, mat);
        scene.add(m);
        _l5.push({ mesh:m, mat, geom:g, type:'wave' });

        // 焦散平面
        const cGeo = new THREE.PlaneGeometry(150, 150);
        const cMat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv*6.0;
                    float c = sin(uv.x*3.0+uTime*0.8)*sin(uv.y*3.0+uTime*0.6);
                    c += sin(uv.x*2.0-uv.y*1.5+uTime*1.2)*0.5;
                    c = smoothstep(0.5,1.0,c*0.5+0.5)*0.06;
                    float edge = 1.0-smoothstep(0.3,0.5,length(vUv-0.5));
                    gl_FragColor = vec4(0.05,0.6,0.9, c*uOpacity*edge);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const cMesh = new THREE.Mesh(cGeo, cMat);
        cMesh.position.z = -40;
        scene.add(cMesh);
        _l5.push({ mesh:cMesh, mat:cMat, geom:cGeo, type:'waveC' });
    }

    // ── Singularity: 暗核 + 30 粒子螺旋吸入 ──
    function addSingularity() {
        // 暗核
        const dGeo = new THREE.SphereGeometry(12, 16, 16);
        const dMat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                varying vec3 vN,vV;
                void main() {
                    vN=normalize(normalMatrix*normal);
                    vec4 mv=modelViewMatrix*vec4(position,1.0);
                    vV=normalize(-mv.xyz);
                    gl_Position=projectionMatrix*mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime,uOpacity;
                varying vec3 vN,vV;
                void main() {
                    float f=pow(1.0-abs(dot(vN,vV)),1.5);
                    float p=0.8+0.2*sin(uTime*4.0);
                    float a=(0.2+f*0.6)*uOpacity*p;
                    vec3 c=mix(vec3(0.1,0.0,0.2),vec3(0.6,0.2,0.9),f);
                    gl_FragColor=vec4(c*a, a);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const dMesh = new THREE.Mesh(dGeo, dMat);
        scene.add(dMesh);
        _l5.push({ mesh:dMesh, mat:dMat, geom:dGeo, type:'sgDark' });

        // 螺旋吸入粒子
        const N = 30;
        const pos = new Float32Array(N * 3);
        const sz  = new Float32Array(N);
        const ph  = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const a = Math.random()*Math.PI*2;
            const r = 20+Math.random()*60;
            pos[i*3]=Math.cos(a)*r; pos[i*3+1]=(Math.random()-0.5)*15; pos[i*3+2]=Math.sin(a)*r;
            sz[i]=1.5+Math.random()*2.5;
            ph[i]=Math.random()*Math.PI*2;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
        g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                attribute float aSize,aPhase;
                uniform float uTime;
                varying float vA;
                void main() {
                    float r0 = length(position.xz);
                    float a0 = atan(position.z, position.x);
                    float r = mod(r0 - uTime*10.0, 65.0) + 10.0;
                    float a = a0 + uTime*0.8 + (65.0-r)*0.03;
                    vec3 p = vec3(cos(a)*r, position.y+sin(uTime*2.0+aPhase*3.0)*3.0, sin(a)*r);
                    vA = smoothstep(10.0,25.0,r)*(1.0-smoothstep(55.0,70.0,r));
                    vec4 mv = modelViewMatrix*vec4(p,1.0);
                    gl_PointSize = aSize*(200.0/-mv.z);
                    gl_Position = projectionMatrix*mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uOpacity;
                varying float vA;
                void main() {
                    float d=length(gl_PointCoord-vec2(0.5));
                    if(d>0.5)discard;
                    float g=1.0-smoothstep(0.0,0.5,d);
                    float a=g*vA*uOpacity*0.7;
                    gl_FragColor=vec4(0.7,0.3,1.0,a);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const m = new THREE.Points(g, mat);
        scene.add(m);
        _l5.push({ mesh:m, mat, geom:g, type:'sgInfall' });
    }

    // ── NOSR: 全息数据栅格平面 ──
    function addNosr() {
        const geo = new THREE.PlaneGeometry(150, 150);
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity;
                varying vec2 vUv;
                void main() {
                    vec2 grid = fract(vUv*12.0);
                    float line = smoothstep(0.02,0.0,grid.x)+smoothstep(0.98,1.0,grid.x)
                               + smoothstep(0.02,0.0,grid.y)+smoothstep(0.98,1.0,grid.y);
                    line = min(line,1.0)*0.12;
                    float scan = smoothstep(0.0,0.03,abs(fract(vUv.y-uTime*0.15)-0.5))*0.08;
                    float data = step(0.97,fract(sin(floor(vUv.x*12.0)*43.1+floor(vUv.y*12.0+uTime*2.0)*17.7)*4375.5));
                    data *= 0.15;
                    float edge = 1.0-smoothstep(0.3,0.5,length(vUv-0.5));
                    float a = (line+scan+data)*uOpacity*edge;
                    gl_FragColor = vec4(0.2,0.5,1.0, a);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.z = -35;
        scene.add(m);
        _l5.push({ mesh:m, mat, geom:geo, type:'nosr' });
    }

    // ── Paradox: 双色对旋环 + 变色粒子 + 扭曲正二十面体 ──
    function addParadox() {
        const magenta = new THREE.Color(0xe040a0);
        const cyan    = new THREE.Color(0x00e5c0);

        // 双色对旋环 — magenta ring
        const r1Geo = new THREE.TorusGeometry(48, 0.6, 8, 80);
        const r1Mat = new THREE.MeshBasicMaterial({
            color: magenta.clone(), transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const r1 = new THREE.Mesh(r1Geo, r1Mat);
        r1.rotation.set(1.0, 0, 0.3);
        scene.add(r1);
        _l5.push({ mesh: r1, mat: r1Mat, geom: r1Geo, type: 'pdxRing', _pdxRing: 1 });

        // 双色对旋环 — cyan ring (opposite tilt)
        const r2Geo = new THREE.TorusGeometry(52, 0.5, 8, 80);
        const r2Mat = new THREE.MeshBasicMaterial({
            color: cyan.clone(), transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const r2 = new THREE.Mesh(r2Geo, r2Mat);
        r2.rotation.set(-0.8, 0, -0.4);
        scene.add(r2);
        _l5.push({ mesh: r2, mat: r2Mat, geom: r2Geo, type: 'pdxRing', _pdxRing: -1 });

        // 变色粒子环 — colors cycle between magenta and cyan per-particle
        const N = 40;
        const pos   = new Float32Array(N * 3);
        const sz    = new Float32Array(N);
        const ph    = new Float32Array(N);
        const cMix  = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 45 + Math.random() * 30;
            pos[i*3] = Math.cos(a)*r; pos[i*3+1] = (Math.random()-0.5)*20; pos[i*3+2] = Math.sin(a)*r;
            sz[i]   = 2 + Math.random() * 3;
            ph[i]   = Math.random() * Math.PI * 2;
            cMix[i] = i % 2 === 0 ? 0.0 : 1.0;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSize',    new THREE.BufferAttribute(sz, 1));
        g.setAttribute('aPhase',   new THREE.BufferAttribute(ph, 1));
        g.setAttribute('aColorMix', new THREE.BufferAttribute(cMix, 1));
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                attribute float aSize, aPhase, aColorMix;
                uniform float uTime;
                varying float vA, vCM;
                void main() {
                    float a = uTime * 0.5 + aPhase;
                    float r = length(position.xz);
                    vec3 p = vec3(cos(a)*r, position.y + sin(uTime*1.8+aPhase*3.0)*5.0, sin(a)*r);
                    vA  = 0.4 + 0.4*sin(uTime*2.5+aPhase*5.0);
                    vCM = aColorMix;
                    vec4 mv = modelViewMatrix * vec4(p,1.0);
                    gl_PointSize = aSize * (200.0 / -mv.z);
                    gl_Position  = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity;
                varying float vA, vCM;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if(d > 0.5) discard;
                    float g = 1.0 - smoothstep(0.0, 0.5, d);
                    vec3 magenta = vec3(0.878, 0.251, 0.627);
                    vec3 cyan    = vec3(0.0, 0.898, 0.753);
                    float cycle  = sin(uTime * 3.0 + vCM * 3.14159) * 0.5 + 0.5;
                    vec3 col = mix(magenta, cyan, cycle);
                    float a = g * vA * uOpacity;
                    gl_FragColor = vec4(col * a, a);
                }
            `,
            transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const m = new THREE.Points(g, mat);
        scene.add(m);
        _l5.push({ mesh:m, mat, geom:g, type:'pdxPts' });

        // 扭曲正二十面体 — vertex displacement replaces normal shimmer icosahedron
        const icoGeo = new THREE.IcosahedronGeometry(22, 1);
        const icoMat = new THREE.ShaderMaterial({
            uniforms: { uTime:{value:0}, uOpacity:{value:0} },
            vertexShader: /* glsl */`
                uniform float uTime;
                varying vec3 vP;
                void main() {
                    vec3 p = position;
                    float wave = sin(uTime*2.0 + p.x*0.3 + p.y*0.5) * 2.5
                               + cos(uTime*1.5 + p.z*0.4) * 2.0;
                    p += normal * wave;
                    vP = p;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime, uOpacity;
                varying vec3 vP;
                void main() {
                    vec3 magenta = vec3(0.878, 0.251, 0.627);
                    vec3 cyan    = vec3(0.0, 0.898, 0.753);
                    float mix_f  = sin(uTime*1.5 + length(vP)*0.2) * 0.5 + 0.5;
                    vec3 col     = mix(magenta, cyan, mix_f);
                    float shimmer = 0.5 + 0.5*sin(uTime*2.0 + length(vP)*0.3);
                    float a = shimmer * uOpacity * 0.5;
                    gl_FragColor = vec4(col * 1.3, a);
                }
            `,
            wireframe:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
        });
        const ico = new THREE.Mesh(icoGeo, icoMat);
        scene.add(ico);
        _l5.push({ mesh:ico, mat:icoMat, geom:icoGeo, type:'pdxIco', _pdxIco:true });
    }

    // ══════════════════════════════════════
    //  Render loop
    // ══════════════════════════════════════
    const clock = new THREE.Clock();
    let rafId = null;

    function animate() {
        if (destroyed) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t  = clock.elapsedTime;

        // Orb opacity 平滑过渡 (淡入快/淡出慢, 自动模式更流畅)
        const lerpSpd = _orbOpTgt > _orbOp ? 12 : 8;
        _orbOp += (_orbOpTgt - _orbOp) * Math.min(dt * lerpSpd, 1);

        // Orb breathing + pulse
        const breath = 1.0 + Math.sin(t * 1.5) * 0.03;
        let s = breath;
        if (_spin > 0.5) s *= 1.0 + Math.sin(t * 12) * 0.07;
        orb.scale.setScalar(s);

        // 主球 + 粒子
        orb.material.uniforms.uTime.value    = t;
        orb.material.uniforms.uOpacity.value = _orbOp;
        orb.material.uniforms.uSpin.value    = _spin;
        pMat.uniforms.uTime.value    = t;
        pMat.uniforms.uSpin.value    = _spin;
        pMat.uniforms.uOpacity.value = _orbOp * 0.5;

        // 内核
        core.material.uniforms.uTime.value    = t;
        core.material.uniforms.uOpacity.value = _orbOp;
        core.scale.setScalar(s * (0.9 + Math.sin(t * 4) * 0.1));

        // 外层辉光壳
        glowShell.visible = _orbOp > 0.01;
        glowShell.material.uniforms.uTime.value    = t;
        glowShell.material.uniforms.uOpacity.value = _orbOp;
        glowShell.scale.setScalar(s * (1.0 + Math.sin(t * 0.8) * 0.02));

        // 轨道环
        for (let i = 0; i < rings.length; i++) {
            const r = rings[i];
            r.visible = _orbOp > 0.05;
            r.material.opacity = _orbOp * 0.25;
            r.rotation.y += (0.002 + i * 0.001) * (1 + _spin * 4);
        }

        // L5 主题特效 + 高级感点缀
        for (const o of _l5) {
            if (o.mat.uniforms?.uTime)    o.mat.uniforms.uTime.value    = t;
            if (o.mat.uniforms?.uOpacity) o.mat.uniforms.uOpacity.value = _orbOp;
            // L5 非材质 uniform 更新
            if (!o.mat.uniforms && o.mat.opacity !== undefined) o.mat.opacity = _orbOp * 0.2;
            // Wireframe 正二十面体: 慢速旋转
            if (o._rot) {
                o.mesh.rotation.y += 0.003 * (1 + _spin * 2);
                o.mesh.rotation.x += 0.002;
            }
            // 脉冲能量环: scale 呼吸 + 微旋转
            if (o._pulse) {
                const ps = o._baseScale + Math.sin(t * 0.8 + (o._baseScale-1)*10) * 0.08;
                o.mesh.scale.setScalar(ps);
                o.mesh.rotation.y += 0.001;
            }
            // 轨道弧: 独立旋转
            if (o._arc) {
                o.mesh.rotation.y += 0.001 * (o._idx + 1);
            }
            // Paradox 双色对旋环: 反向旋转
            if (o._pdxRing) {
                o.mesh.rotation.y += 0.005 * o._pdxRing * (1 + _spin * 3);
                o.mat.opacity = _orbOp * 0.45;
            }
            // Paradox 扭曲正二十面体: 慢速旋转
            if (o._pdxIco) {
                o.mesh.rotation.y += 0.004 * (1 + _spin * 2);
                o.mesh.rotation.x += 0.002;
            }
        }

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animate);
    }
    animate();

    // ── Resize observer ──
    const ro = new ResizeObserver(() => { if (!destroyed) syncSize(); });
    ro.observe(container);

    // ══════════════════════════════════════
    //  API
    // ══════════════════════════════════════
    return {

        /** 切换 tier — 更新颜色 + 粒子 + L5 特效 */
        setTier(tier, color) {
            _tier = tier;
            const cfg = TIERS[tier];
            if (cfg) {
                _color.setHex(cfg.color);
            } else if (color) {
                _color.set(color);
            } else {
                _color.set(0x94a3b8);
            }
            // 更新所有材质颜色
            orb.material.uniforms.uColor.value.copy(_color);
            core.material.uniforms.uColor.value.copy(_color);
            pMat.uniforms.uColor.value.copy(_color);
            glowShell.material.uniforms.uColor.value.copy(_color);
            for (const r of rings) r.material.color.copy(_color);

            fillParticles(tier);

            // L5 主题特效切换
            clearL5();
            if (tier === 'genesis')     addGenesis();
            else if (tier === 'wave')        addWave();
            else if (tier === 'singularity') addSingularity();
            else if (tier === 'nosr')        addNosr();
            else if (tier === 'paradox')     addParadox();

            // L5 高级感点缀
            const isL5 = tier in TIERS;
            if (isL5) {
                // ── Wireframe 正二十面体 (sacred geometry) ──
                // Paradox uses its own distortion icosahedron, skip standard shimmer
                if (tier !== 'paradox') {
                const icoGeo = new THREE.IcosahedronGeometry(22, 0);
                const icoMat = new THREE.ShaderMaterial({
                    uniforms: { uTime:{value:0}, uColor:{value:_color.clone()}, uOpacity:{value:0} },
                    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
                    fragmentShader: `
                        uniform float uTime,uOpacity; uniform vec3 uColor; varying vec3 vP;
                        void main(){
                            float shimmer = 0.5 + 0.5*sin(uTime*2.0 + length(vP)*0.3);
                            float a = shimmer * uOpacity * 0.5;
                            gl_FragColor = vec4(uColor*1.3, a);
                        }`,
                    wireframe:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
                });
                const ico = new THREE.Mesh(icoGeo, icoMat);
                scene.add(ico);
                _l5.push({ mesh:ico, mat:icoMat, geom:icoGeo, _rot:true });
                }

                // ── 脉冲能量环 (expand + fade 循环) ──
                for (let i = 0; i < 3; i++) {
                    const rGeo = new THREE.TorusGeometry(30, 0.4, 8, 80);
                    const rMat = new THREE.ShaderMaterial({
                        uniforms: { uTime:{value:0}, uOpacity:{value:0}, uOff:{value: i*2.094} },
                        vertexShader: `varying vec3 vN,vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
                        fragmentShader: `
                            uniform float uTime,uOpacity,uOff; uniform vec3 uColor; varying vec3 vN,vV;
                            void main(){
                                float cycle = mod(uTime*0.5 + uOff, 6.283);
                                float fade = smoothstep(0.0,1.0,cycle)*(1.0-smoothstep(4.0,6.283,cycle));
                                float f = pow(1.0-abs(dot(vN,vV)), 2.0);
                                float a = f*fade*uOpacity*0.35;
                                gl_FragColor = vec4(uColor*1.2, a);
                            }`,
                        transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
                    });
                    const rMesh = new THREE.Mesh(rGeo, rMat);
                    rMesh.rotation.x = i * 0.7;
                    rMesh.rotation.z = i * 0.4;
                    scene.add(rMesh);
                    _l5.push({ mesh:rMesh, mat:rMat, geom:rGeo, _pulse:true, _baseScale:1.0 + i*0.15 });
                }

                // ── 轨道弧 (2 条不同角度, 比基础环更精致) ──
                for (let i = 0; i < 2; i++) {
                    const aGeo = new THREE.TorusGeometry(55 + i*3, 0.3, 8, 80);
                    const aMat = new THREE.MeshBasicMaterial({
                        color: _color.clone().multiplyScalar(1.2), transparent:true, opacity:0,
                        blending:THREE.AdditiveBlending, depthWrite:false,
                    });
                    const aMesh = new THREE.Mesh(aGeo, aMat);
                    aMesh.rotation.x = Math.PI * 0.15 * (i+1);
                    aMesh.rotation.z = Math.PI * 0.1 * i;
                    scene.add(aMesh);
                    _l5.push({ mesh:aMesh, mat:aMat, geom:aGeo, _arc:true, _idx:i });
                }
            }

            _orbOpTgt = 0.7;
        },

        /** Spin 开始 — 粒子加速, orb 脉冲 */
        spinStart() {
            _spin = 1;
            _orbOpTgt = 0.15;
        },

        /** Spin 结束 — 恢复常态 */
        spinStop() {
            _spin = 0;
        },

        /** 立即重置 */
        reset() {
            _orbOpTgt = 0;
            _spin = 0;
            _tier = '';
            pN = 0;
            pGeom.setDrawRange(0, 0);
            clearL5();
        },

        /** 销毁 */
        destroy() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            ro.disconnect();
            clearL5();
            scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            renderer.dispose();
            renderer.domElement.remove();
        },

        handleResize: syncSize,
    };
}
