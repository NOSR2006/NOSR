/**
 * rng-audio.js — Web Audio API 合成音效
 * 纯合成，无外部文件依赖
 */

let ctx = null;
let master = null;

function ac() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);
        ctx.suspend(); // 延迟启动，等待用户手势
    }
    // resume 由用户手势触发（Roll 按钮点击）
    if (ctx.state !== 'running') ctx.resume();
    return ctx;
}

/* ── 低频嗡鸣（混沌/深渊） ── */
export function playDrone(durMs = 2300, f = 55, vol = 0.35) {
    const a = ac(); const now = a.currentTime; const d = durMs * 0.001;

    // 次谐波
    const sub = a.createOscillator(); sub.type = 'sine';
    sub.frequency.value = f * 0.5;
    const sg = a.createGain();
    sg.gain.setValueAtTime(0, now);
    sg.gain.linearRampToValueAtTime(vol, now + d * 0.4);
    sg.gain.setValueAtTime(vol, now + d * 0.75);
    sg.gain.linearRampToValueAtTime(0, now + d);
    sub.connect(sg).connect(master);
    sub.start(now); sub.stop(now + d + 0.1);

    // 主频率 + 微颤
    const osc = a.createOscillator(); osc.type = 'sine';
    osc.frequency.value = f;
    const lfo = a.createOscillator(); lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoG = a.createGain(); lfoG.gain.value = 1.5;
    lfo.connect(lfoG).connect(osc.frequency);
    lfo.start(now); lfo.stop(now + d + 0.1);
    const og = a.createGain();
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(vol * 0.5, now + d * 0.5);
    og.gain.linearRampToValueAtTime(0, now + d);
    osc.connect(og).connect(master);
    osc.start(now); osc.stop(now + d + 0.1);

    // 噪声纹理 — 低通滤波
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate);
    const arr = buf.getChannelData(0);
    for (let i = 0; i < arr.length; i++) arr[i] = Math.random() * 2 - 1;
    const ns = a.createBufferSource(); ns.buffer = buf;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.03, now);
    ng.gain.linearRampToValueAtTime(0, now + d);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    ns.connect(lp).connect(ng).connect(master);
    ns.start(now); ns.stop(now + d + 0.1);
    lfo.stop(now + d + 0.1);
}

/* ── 冲击/天裂 ── */
export function playImpact(f = 50) {
    const a = ac(); const now = a.currentTime;

    // 低频重击
    const osc = a.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 2.5, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.2, now + 0.45);
    const g = a.createGain();
    g.gain.setValueAtTime(0.8, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g).connect(master);
    osc.start(now); osc.stop(now + 0.55);

    // 高频噪声碎片
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * 0.5), a.sampleRate);
    const arr = buf.getChannelData(0);
    for (let i = 0; i < arr.length; i++) arr[i] = Math.random() * 2 - 1;
    const ns = a.createBufferSource(); ns.buffer = buf;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.55, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
    ns.connect(hp).connect(ng).connect(master);
    ns.start(now); ns.stop(now + 0.35);
}

/* ── 神圣谐波钟（泛音列） ── */
export function playChime(notes = [523, 659, 784, 1047], dur = 3) {
    const a = ac(); const now = a.currentTime;

    notes.forEach((freq, i) => {
        const t = now + i * 0.1;
        const osc = a.createOscillator(); osc.type = 'sine';
        osc.frequency.value = freq;
        const g = a.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.35 / (i + 1), t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g).connect(master);
        osc.start(t); osc.stop(t + dur + 0.1);

        // 泛音
        const ov = a.createOscillator(); ov.type = 'sine';
        ov.frequency.value = freq * 2.003;
        const og2 = a.createGain();
        og2.gain.setValueAtTime(0, t + 0.02);
        og2.gain.linearRampToValueAtTime(0.06, t + 0.06);
        og2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
        ov.connect(og2).connect(master);
        ov.start(t + 0.02); ov.stop(t + dur + 0.1);
    });
}

/* ── 涟漪泛音（Wave 专用） ── */
export function playRipple(baseFreq = 330, steps = 6) {
    const a = ac(); const now = a.currentTime;
    for (let i = 0; i < steps; i++) {
        const t = now + i * 0.12;
        const osc = a.createOscillator(); osc.type = 'sine';
        osc.frequency.value = baseFreq * (1 + i * 0.22);
        const g = a.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
        osc.connect(g).connect(master);
        osc.start(t); osc.stop(t + 2.6);
    }
}

/* ── 骇入音效（NOSR hack 序列专用）── */
export function playHackBreach() {
    const a = ac(); const now = a.currentTime;

    // 快速递升方波 — 数据入侵感
    const steps = 8;
    for (let i = 0; i < steps; i++) {
        const t = now + i * 0.07;
        const osc = a.createOscillator(); osc.type = 'square';
        osc.frequency.value = 400 + i * 150;
        const g = a.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g).connect(master);
        osc.start(t); osc.stop(t + 0.06);
    }

    // 噪声脉冲 — glitch 碎裂
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * 0.3), a.sampleRate);
    const arr = buf.getChannelData(0);
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() * 2 - 1) * (i % 73 < 36 ? 1 : 0.2);
    const ns = a.createBufferSource(); ns.buffer = buf;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.25, now + 0.56);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.86);
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 2;
    ns.connect(bp).connect(ng).connect(master);
    ns.start(now + 0.56); ns.stop(now + 0.9);

    // 低频确认音 — 突破成功
    const kick = a.createOscillator(); kick.type = 'sine';
    kick.frequency.setValueAtTime(200, now + 0.9);
    kick.frequency.exponentialRampToValueAtTime(40, now + 1.5);
    const kg = a.createGain();
    kg.gain.setValueAtTime(0.5, now + 0.9);
    kg.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    kick.connect(kg).connect(master);
    kick.start(now + 0.9); kick.stop(now + 1.6);
}

/* ── 全局静默 (Singularity burst 前的戏剧性停顿) ── */
export function silenceAll() {
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.001, now + 0.2);
    // 安全网: 12s 后自动恢复 (防止中断导致永久静音)
    const recoverAt = now + 12;
    master.gain.setValueAtTime(0.001, recoverAt);
    master.gain.linearRampToValueAtTime(1, recoverAt + 0.5);
}

export function resumeAudio() {
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(1, now);
}

/** 在 Roll 按钮点击时初始化 AudioContext */
export function initAudio() {
    const a = ac();
    if (a.state === 'suspended') a.resume();
}
