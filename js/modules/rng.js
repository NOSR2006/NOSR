/**
 * rng.js RNG Lottery 引擎
 * 配置rng-config.js，特效在下方 EFFECTS 对象
 */

import {
    POOL, LUCK_LEVELS, SPIN_MS, FRAMES, fmt,
} from './rng-config.js?v=260709y';

import { playDrone, playImpact, playChime, playRipple, playHackBreach, silenceAll, resumeAudio, initAudio } from './rng-audio.js?v=260707n';

// ── 语言切换 ──
let rngLang = localStorage.getItem('nosr-rng-lang') || 'en';
function getLabel(p) { return rngLang === 'zh' && p.zh ? p.zh : p.label; }

// ============== 概率引擎 ==============

function buildThresholds(mult) {
    if (mult <= 1) {
        const w = POOL.map(p => 1 / p.denom);
        const tw = w.reduce((a, b) => a + b, 0);
        return { thresh: w.reduce((a, x, i) => { a.push((a[i-1]||0) + x/tw); return a; }, []),
                 probs: w.map(x => x / tw * 100) };
    }
    // Lucky 模型：floor 过滤低级重算权重 顶部加磅
    const floor = mult;
    const kept = POOL.map((p, i) => ({ p, i })).filter(x => x.p.denom >= floor);
    // 极端情况兜底：全部被滤掉 保留所
    const pool = kept.length > 0 ? kept : POOL.map((p, i) => ({ p, i }));
    const boosts = [1.4, 1.25, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const w = pool.map((x, j) => (1 / x.p.denom) * (boosts[j] || 1));
    const tw = w.reduce((a, b) => a + b, 0);
    // 构建全尺probs/thresh（被过滤= 0
    const probs = POOL.map((p, i) => {
        const k = pool.findIndex(x => x.i === i);
        return k >= 0 ? w[k] / tw * 100 : 0;
    });
    const thresh = [];
    let cum = 0;
    for (let i = 0; i < POOL.length; i++) {
        cum += probs[i] / 100;
        thresh.push(cum);
    }
    return { thresh, probs };
}

const normal  = buildThresholds(1);
const luckMap = Object.fromEntries(
    LUCK_LEVELS.map(l => [l.name.toLowerCase(), buildThresholds(l.mult)])
);

// ── 渐进式幸运：累计抽数越高，稀有项权重越大 ──
// factor 随 total 平滑增长：100→1.32, 1K→1.56, 5K→2.37, 10K→2.82, 100K→5.62
// 每个 tier 的权重提升 = factor^rarityScale，rarityScale 按 denom 对数插值（越稀有提升越大）
function getProgressiveData(total) {
    if (total < 10) return normal;
    const factor = 1 + Math.pow(total, 0.25) / 10;
    const w = POOL.map(p => {
        const base = 1 / p.denom;
        const rarityScale = Math.max(0, Math.log10(p.denom) - 2) / 5; // denom=100→0, 1M→0.8, 10M→1
        const boost = Math.pow(factor, rarityScale);
        return base * boost;
    });
    const tw = w.reduce((a, b) => a + b, 0);
    const probs = w.map(x => x / tw * 100);
    const thresh = [];
    let cum = 0;
    for (let i = 0; i < w.length; i++) { cum += w[i] / tw; thresh.push(cum); }
    return { thresh, probs };
}

// ── 自动保底系统：从 POOL 数据驱动，无需手动配置 ──
const PITY_THRESHOLDS = [500, 2000, 8000, 30000];
const PITY_LABELS = ['💠', '✴️', '🌌', '🌐'];
const pityBrackets = (() => {
    const mags = {};
    POOL.forEach(p => {
        if (p.hidden) return;
        const mag = Math.floor(Math.log10(p.denom));
        if (mag >= 5 && (!mags[mag] || p.denom < mags[mag].minDenom)) {
            mags[mag] = { minDenom: p.denom, mag };
        }
    });
    return Object.values(mags)
        .sort((a, b) => a.mag - b.mag)
        .map((b, i) => ({
            floor: Math.pow(10, b.mag),
            threshold: PITY_THRESHOLDS[i] || 30000 * Math.pow(4, i - PITY_THRESHOLDS.length + 1),
            label: PITY_LABELS[i] || '👑',
            mag: b.mag
        }));
})();

const delays = (() => {
    const raw = Array.from({length: FRAMES}, (_, i) => {
        const t = i / (FRAMES - 1);
        return 30 + 220 * Math.pow(t, 2.5);
    });
    const s = raw.reduce((a, b) => a + b, 0);
    return raw.map(d => d * SPIN_MS / s);
})();

function getLuck(total) {
    for (let i = LUCK_LEVELS.length - 1; i >= 0; i--) {
        const l = LUCK_LEVELS[i];
        if (l.every > 0 && total % l.every === 0) return l;
    }
    return null;
}

// ============== 揭示动画插件注册表 ==============

const CUSTOM_FX = {};
function registerReveal(name, fn) { CUSTOM_FX[name] = fn; }

let __fxPlaying = false;
const fxState = { start() { __fxPlaying = true; }, done() { __fxPlaying = false; } };

// ===== L0 千级 DOM 白色极简 =====
function basicL0Reveal(prize) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(13,17,23,0.85);';
    document.body.appendChild(ov);

    const center = document.createElement('div');
    center.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;';
    ov.appendChild(center);

    const sym = document.createElement('div');
    sym.style.cssText = 'font-size:7rem;opacity:0;filter:drop-shadow(0 0 15px rgba(255,255,255,0.4));';
    sym.textContent = prize.symbol;
    center.appendChild(sym);

    const lbl = document.createElement('div');
    lbl.style.cssText = `font-size:2.5rem;font-weight:900;color:${prize.color||'#fff'};margin-top:.5rem;font-family:var(--font-mono);letter-spacing:.2em;opacity:0;`;
    lbl.textContent = getLabel(prize);
    center.appendChild(lbl);

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:.85rem;color:#fff;margin-top:.3rem;font-family:var(--font-mono);opacity:0;';
    sub.textContent = `1 / ${fmt(prize.denom)}`;
    center.appendChild(sub);

    sym.style.animation = 'rngLand 0.6s cubic-bezier(.34,1.56,.64,1) forwards';
    lbl.style.animation = 'rngFsIn 0.5s ease-out 0.3s forwards';
    sub.style.animation = 'rngFsIn 0.4s ease-out 0.5s forwards';

    for (let i = 0; i < 30; i++) {
        const p = document.createElement('span');
        p.style.cssText = 'position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;background:#fff;pointer-events:none;';
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 160;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const dur = 0.8 + Math.random();
        ov.appendChild(p);
        if (window.gsap) {
            window.gsap.set(p, { x: 0, y: 0, opacity: 1 });
            window.gsap.to(p, { x: dx, y: dy, opacity: 0, duration: dur, ease: 'power2.out' });
        }
    }

    setTimeout(() => { ov.style.transition = 'opacity .4s'; ov.style.opacity = '0'; }, 3000);
    setTimeout(() => { ov.remove(); fxState.done(); }, 3500);
}


// ============== 统一动画引擎 ==============

function fxLevel(prize) {
    return prize.level || 1;
}

function runFx(prize) {
    const level = fxLevel(prize);
    if (__fxPlaying) return;

    // L5: tier 专属定制 (genesis/wave/singularity/nosr)
    if (level >= 5 && CUSTOM_FX[prize.tier]) {
        fxState.start();
        try {
            const result = CUSTOM_FX[prize.tier]();
            if (result && result.catch) result.catch(e => { console.error('FX async crash:', e); fxState.done(); });
        } catch (e) {
            console.error('FX crash:', e); fxState.done();
        }
        return;
    }

    // L4: Canvas 粒子系统 (premiumL2Reveal, 7s)
    if (level === 4 && CUSTOM_FX.__premiumL2) {
        fxState.start();
        try { CUSTOM_FX.__premiumL2(prize); }
        catch (e) { console.error('L4 FX crash:', e); fxState.done(); }
        return;
    }

    // L3: Canvas 粒子轻量版 (premiumL1Reveal, 5s)
    if (level === 3 && CUSTOM_FX.__premiumL1) {
        fxState.start();
        try { CUSTOM_FX.__premiumL1(prize); }
        catch (e) { console.error('L3 FX crash:', e); fxState.done(); }
        return;
    }

    // L2: DOM 白色极简 (basicL0Reveal, 3s)
    if (level === 2) {
        fxState.start();
        try { basicL0Reveal(prize); }
        catch (e) { console.error('L2 FX crash:', e); fxState.done(); }
        return;
    }

    // L1: 无特效
}






function flashDisplay(el, color) {
    el.style.boxShadow = `0 0 50px 12px ${color}`;
    el.style.borderColor = color;
    setTimeout(() => { el.style.boxShadow = ''; el.style.borderColor = ''; }, 1200);
}
function flashScreen(color) {
    const f = document.createElement('div');
    f.style.cssText = `position:fixed;inset:0;z-index:9998;background:${color};pointer-events:none;animation:rngFsIn 0.3s ease-out forwards reverse`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 600);
}

// ============== 主模==============

export async function initRNG() {
    try {

    // ── 动态加载揭示动画模块 ──
    const ctx = {
        playDrone, playImpact, playChime, playRipple, playHackBreach,
        silenceAll, resumeAudio,
        getLabel, fmt,
        fxState,
    };

    let display3d = null;
    try {
        const [waveM, genesisM, nosrM, singularityM, paradoxM, canvasM, displayM] = await Promise.all([
            import('./sg-wave.js?v=260709b').catch(() => null),
            import('./sg-genesis.js?v=260709h').catch(() => null),
            import('./sg-nosr.js?v=260709h').catch(() => null),
            import('./sg-singularity.js?v=260709h').catch(() => null),
            import('./sg-paradox.js?v=260710f').catch(() => null),
            import('./sg-canvas.js?v=260707n').catch(() => null),
            import('./rng-display-3d.js?v=260709p').catch(() => null),
        ]);
        if (waveM) registerReveal('wave', waveM.createWaveReveal(ctx));
        if (genesisM) registerReveal('genesis', genesisM.createGenesisReveal(ctx));
        if (nosrM) registerReveal('nosr', nosrM.createNosrReveal(ctx));
        if (singularityM) registerReveal('singularity', singularityM.createSingularityReveal(ctx));
        if (paradoxM) registerReveal('paradox', paradoxM.createParadoxReveal(ctx));
        if (canvasM) {
            CUSTOM_FX.__premiumL1 = canvasM.createPremiumL1(ctx);
            CUSTOM_FX.__premiumL2 = canvasM.createPremiumL2(ctx);
        }
        // Three.js 显示区点缀 (异步, 不阻塞主流程)
        if (displayM) {
            const dEl = document.getElementById('rngDisplay');
            if (dEl) displayM.createDisplay3D(dEl).then(d3 => { display3d = d3; }).catch(() => {});
        }
    } catch (e) {
        console.warn('Failed to load reveal modules:', e);
    }

    const g = id => document.getElementById(id);
    const d = g('rngDisplay'), sym = g('rngSymbol'), lbl = g('rngLabel');
    const rar = g('rngRarity'), btn = g('rngRollBtn');
    const gallery = g('rngGallery'), stat = g('rngStats'), autoCb = g('rngAutoCb');

    if (!d || !sym || !btn) return;

    // 移动端降级标 + 完全关闭 Roll
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
        document.body.classList.add('rng-mobile');
        return; // 移动端不初始化 Roll 模块
    }

    let busy = false, total = 0, spinDuration = SPIN_MS;
    const hits = {};
    POOL.forEach(p => hits[p.tier] = 0);
    // spin 池精简：从全部 93 个中均匀取样 14 个代表性符号
    const _all = POOL.filter(p => !p.hidden);
    const _step = Math.max(1, Math.floor(_all.length / 14));
    const showPool = _all.filter((_, i) => i % _step === 0);
    const pity = pityBrackets.map(() => 0);

    // ── 持久化钩子：外部模块可通过 window.__rngHooks 注入 ──
    // onLoad(savedState) → 恢复 total/hits/pity
    // onRoll(rollData) → 记录一次 Roll 用于同步
    window.__rngState = { total, hits, pity };
    if (window.__rngHooks?.onLoad) {
        try {
            const saved = await window.__rngHooks.onLoad();
            if (saved) {
                if (typeof saved.total === 'number') total = saved.total;
                if (saved.pity && Array.isArray(saved.pity)) {
                    saved.pity.forEach((v, i) => { if (i < pity.length) pity[i] = v; });
                }
                if (saved.hits && typeof saved.hits === 'object') {
                    for (const [tier, count] of Object.entries(saved.hits)) {
                        if (tier in hits) hits[tier] = count;
                    }
                }
                window.__rngState = { total, hits, pity };
                console.log(`[NOSR RNG] Restored state: ${total} rolls, ${Object.values(hits).filter(v => v > 0).length} tiers discovered`);
            }
        } catch (e) {
            console.warn('[NOSR RNG] State load failed:', e);
        }
    }

    const drawGallery = () => {
        gallery.innerHTML = POOL.filter(p => !p.hidden || hits[p.tier] > 0).map(p => {
            const unlocked = hits[p.tier] > 0;
            return `<div class="rng-gallery-item${unlocked?' unlocked':''}" data-tier="${p.tier}">
                <span class="rng-gallery-sym">${p.symbol}</span>
                <span class="rng-gallery-name">${getLabel(p)}</span>
                <span class="rng-gallery-denom">1/${fmt(p.denom)}</span>
                <span class="rng-gallery-hit">${unlocked ? hits[p.tier] : ''}</span>
            </div>`;
        }).join('');
    };

    // 图鉴点击
    const replayFx = (tier) => {
        const prize = POOL.find(p => p.tier === tier);
        if (!prize) return;
        if (busy || __fxPlaying) return;
        busy = true;
        d.classList.remove('rng-bar-mega', 'rng-display-genesis', 'rng-display-wave', 'rng-display-singularity', 'rng-display-nosr');
        d.querySelectorAll('.rng-bar-beam').forEach(el => el.remove());
        sym.className = 'rng-symbol';
        rar.classList.remove('show');
        lbl.style.opacity = ''; lbl.textContent = '';
        d.removeAttribute('data-tier');
        d.classList.add('spinning');
        display3d?.reset(); display3d?.spinStart();
        let frame = 0, spinFrames = 12;
        const tick = () => {
            if (frame >= spinFrames) {
                // 落定
                sym.className = 'rng-symbol landed';
                d.classList.remove('spinning');
                sym.textContent = prize.symbol;
                lbl.textContent = getLabel(prize);
                if (window.gsap) {
                    lbl.style.transform = '';
                    window.gsap.fromTo(lbl, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
                } else {
                    lbl.style.opacity = '1';
                }
                const idx = POOL.findIndex(p => p.tier === prize.tier);
                rar.textContent = `1/${fmt(prize.denom)} · ${normal.probs[idx].toFixed(1)}%`;
                rar.classList.add('show');
                d.setAttribute('data-tier', prize.tier);
                display3d?.setTier(prize.tier, prize.color);

                // 百万级辉
                d.style.setProperty('--tier-c', prize.color || '#2f81f7');
                if (prize.level >= 5) {
                    const clr = { genesis:'#fafafa', wave:'#0ea5e9', singularity:'#8b5cf6', nosr:'#2f81f7' }[prize.tier] || '#fff';
                    d.style.boxShadow = `0 0 40px 10px ${clr}66, 0 0 80px 20px ${clr}26`;
                }

                // 分级震动
                const shake = prize.level >= 4 ? 'heavy' : prize.level >= 3 ? 'medium' : 'light';
                d.setAttribute('data-tier-shake', shake);

                // 600ms 后切换为悬浮呼吸 + 光束
                setTimeout(() => {
                    d.removeAttribute('data-tier-shake');
                    sym.className = 'rng-symbol idle';
                    display3d?.spinStop();
                    if (prize.level >= 5) {
                        d.classList.add('rng-bar-mega');
                        if (['genesis','wave','singularity','nosr'].includes(prize.tier)) {
                            d.classList.add('rng-display-' + prize.tier);
                        }
                        d.style.boxShadow = '';
                        d.querySelectorAll('.rng-bar-beam').forEach(el => el.remove());
                        const beam = document.createElement('div');
                        beam.className = 'rng-bar-beam';
                        d.appendChild(beam);
                        setTimeout(() => beam.remove(), 3600);
                    }
                }, 600);

                // 触发特效
                if (prize.level >= 2) {
                    runFx(prize);
                    burst(prize, null);
                } else {
                    const c = prize.color || '#fff';
                    d.style.boxShadow = `0 0 20px ${c}66`;
                    setTimeout(() => d.style.boxShadow = '', 800);
                }
                busy = false;
                return;
            }
            sym.textContent = showPool[frame % showPool.length].symbol;
            sym.classList.remove('tick'); void sym.offsetWidth; sym.classList.add('tick');
            setTimeout(tick, 50 + frame * 10); frame++;
        };
        tick();
    };

    gallery.addEventListener('click', (e) => {
        const item = e.target.closest('.rng-gallery-item');
        if (!item) return;
        const tier = item.dataset.tier;
        if (!tier) return;
        // NOSR 解锁后任意点强行
        if (document.body.classList.contains('nosr-unlocked')) {
            if (window.rngForce) window.rngForce(tier);
            return;
        }
        // 已解重播动画
        if (hits[tier] > 0) {
            replayFx(tier);
            return;
        }
        // 未解摇晃拒绝
        item.classList.add('shake');
        setTimeout(() => item.classList.remove('shake'), 500);
    });

    const drawStats = () => {
        const parts = [`<span class="rng-stat-total">Total <strong>${total}</strong></span>`];
        LUCK_LEVELS.filter(l => l.every > 0).forEach(l => {
            const drawn = total % l.every;
            const now = drawn === 0;
            parts.push(now
                ? `<span class="rng-lucky-now">${l.label} ${l.name}!</span>`
                : `<span class="rng-lucky-count">${drawn}/${l.every} ${l.label}</span>`);
        });
        // ── 渐进幸运倍率 ──
        if (total >= 10) {
            const factor = 1 + Math.pow(total, 0.25) / 10;
            parts.push(`<span class="rng-lucky-count" title="渐进幸运">🍀×${factor.toFixed(2)}</span>`);
        }
        // ── 保底进度 ──
        pityBrackets.forEach((b, i) => {
            const p = pity[i];
            if (p >= b.threshold) {
                parts.push(`<span class="rng-lucky-now">${b.label} 保底!</span>`);
            } else if (p > 0) {
                parts.push(`<span class="rng-lucky-count">${p}/${b.threshold} ${b.label}</span>`);
            }
        });
        const show = POOL.filter(p => !p.hidden && (hits[p.tier] > 0 || p.denom >= 180));
        parts.push('<span class="rng-stat-hits">' +
            show.map(p => `<span class="rng-stat-hit">${p.symbol}<b class="${hits[p.tier]>0?'rng-stat-high':''}">${hits[p.tier]}</b></span>`).join('') +
            '</span>');
        if (!total) parts.push('<span></span>');
        stat.innerHTML = parts.join('');
    };

    const burst = (prize, luck) => {
        let n = prize.particles || 3;
        if (luck) n = luck.mult > 5 ? n * 2 : Math.floor(n * 1.5);
        for (let i = 0; i < n; i++) {
            const p = document.createElement('span');
            p.style.cssText = 'position:absolute;width:5px;height:5px;border-radius:50%;pointer-events:none;left:50%;top:50%;';
            p.style.background = Math.random() > 0.4 ? '#fff' : (prize.color || '#ffd700');
            d.appendChild(p);
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 120;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 30;
            const dur = 0.5 + Math.random() * 0.7;
            if (window.gsap) {
                window.gsap.fromTo(p,
                    { x: 0, y: 0, opacity: 1, scale: 1 },
                    { x: dx, y: dy, opacity: 0, scale: 0.1, duration: dur, ease: 'power2.out', onComplete: () => p.remove() }
                );
            } else {
                p.style.transition = `all ${dur}s ease-out`;
                requestAnimationFrame(() => { p.style.transform = `translate(${dx}px,${dy}px)`; p.style.opacity = '0'; });
                setTimeout(() => p.remove(), dur * 1000 + 100);
            }
        }
    };

    const finish = (prize, luck) => {
        // ── 0ms: symbol 弹跳落地 ──
        sym.className = 'rng-symbol landed';
        d.classList.remove('spinning');
        sym.textContent = prize.symbol;
        lbl.textContent = luck ? `${luck.label} ${getLabel(prize)}` : getLabel(prize);
        const idx = POOL.findIndex(p => p.tier === prize.tier);
        rar.textContent = `1/${fmt(prize.denom)} · ${normal.probs[idx].toFixed(1)}%`;
        rar.classList.add('show');

        // tier 颜色变量，供显示区子元素动态取色
        d.style.setProperty('--tier-c', prize.color || '#2f81f7');

        // ── L1 落地闪光 ──
        if (prize.level <= 1) {
            d.classList.add('rng-land-flash');
            setTimeout(() => d.classList.remove('rng-land-flash'), 500);
        }

        setTimeout(() => {
            if (window.gsap) {
                lbl.style.transform = '';
                window.gsap.fromTo(lbl, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
            } else {
                lbl.style.opacity = '1';
            }
        }, 100);

        // ── 200ms: tier 辉光亮起 ──
        setTimeout(() => {
            d.setAttribute('data-tier', prize.tier);
            display3d?.setTier(prize.tier, prize.color);
            // inline 保底辉光（L5 百万
            if (prize.level >= 5) {
                const clr = { genesis:'#fafafa', wave:'#0ea5e9', singularity:'#8b5cf6', nosr:'#2f81f7' }[prize.tier] || '#fff';
                d.style.boxShadow = `0 0 40px 10px ${clr}66, 0 0 80px 20px ${clr}26`;
            }
            // 中低 tier 呼吸效果
            if (prize.level === 3) {
                d.style.setProperty('--breath-c', prize.color || '#8b5cf6');
                d.classList.add('rng-breath-l1');
            } else if (prize.level === 2) {
                d.style.setProperty('--breath-c', prize.color || '#fff');
                d.classList.add('rng-breath-l0');
            }
        }, 200);

        // ── 400ms: burst 粒子爆发 ──
        setTimeout(() => burst(prize, luck), 400);

        // ── 500ms: 分级震动 ──
        setTimeout(() => {
            const shake = prize.level >= 4 ? 'heavy' : prize.level >= 3 ? 'medium' : 'light';
            d.setAttribute('data-tier-shake', shake);
            setTimeout(() => d.removeAttribute('data-tier-shake'), 600);
        }, 500);

        // ── 600ms: 落定后切换为悬浮呼吸 + tier 感知 ──
        setTimeout(() => {
            sym.className = 'rng-symbol idle';
            display3d?.spinStop();
            // tier-aware idle 参数
            const idleCfg =
                prize.level >= 5 ? { amp: 10, glow: 0.4 } :
                prize.level >= 4 ? { amp: 8,  glow: 0.2 } :
                prize.level >= 3 ? { amp: 6,  glow: 0.1 } :
                                   { amp: 3,  glow: 0 };
            sym.style.setProperty('--idle-amp', idleCfg.amp + 'px');
            sym.style.setProperty('--idle-glow', idleCfg.glow);
            sym.style.setProperty('--idle-c', prize.color || '#2f81f7');
            if (prize.level >= 5) {
                d.classList.add('rng-bar-mega');
                // L5 持久循环特效（持续到下次 Roll）
                if (['genesis','wave','singularity','nosr'].includes(prize.tier)) {
                    d.classList.add('rng-display-' + prize.tier);
                }
                // 清除内联 box-shadow，让持久动画的 box-shadow 生效
                d.style.boxShadow = '';
            }
        }, 600);

        // ── 800ms: 全屏 overlay (NOSR 延至1200ms，先播放显示区专属特效) ──
        const fxDelay = prize.tier === 'nosr' ? 1200 : 800;

        if (prize.tier === 'nosr') {
            // NOSR 显示区专属特效 (600-1200ms 窗口)
            setTimeout(() => {
                if (!d.parentElement) return;
                d.classList.add('rng-nosr-fx');

                // 扫描线
                const scan = document.createElement('div');
                scan.className = 'rng-nosr-scan';
                d.appendChild(scan);

                // 全息闪光
                const holo = document.createElement('div');
                holo.className = 'rng-nosr-holo';
                d.appendChild(holo);

                // 符号故障抖动
                sym.classList.add('rng-nosr-glitch');

                // 能量环 (3个错开扩散)
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (!d.parentElement) return;
                        const ring = document.createElement('div');
                        ring.className = 'rng-nosr-ring';
                        d.appendChild(ring);
                    }, i * 120);
                }

                // 数据流字符
                const dataChars = '01#@$%&*<>{}[]|/\\';
                for (let i = 0; i < 20; i++) {
                    const ch = document.createElement('span');
                    ch.className = 'rng-nosr-data';
                    ch.textContent = dataChars[Math.floor(Math.random() * dataChars.length)];
                    ch.style.left = (5 + Math.random() * 80) + '%';
                    ch.style.animationDelay = -(Math.random() * 4) + 's';
                    ch.style.fontSize = (0.5 + Math.random() * 0.8) + 'rem';
                    d.appendChild(ch);
                }
            }, 650);
        }

        setTimeout(() => runFx(prize), fxDelay);

        // luck 闪光
        if (luck) {
            if (luck.mult >= 1000) { flashScreen('rgba(255,215,0,0.25)'); flashDisplay(d, '#ffd700'); }
            else if (luck.mult >= 10) { flashScreen('rgba(248,81,73,0.2)'); flashDisplay(d, '#f85149'); }
            else if (luck.mult >= 3) flashDisplay(d, '#e6b422');
        }

        hits[prize.tier]++;

        // ── 持久化: 记录 Roll + 保存状态 ──
        const isNew = hits[prize.tier] === 1;
        window.__rngState = { total, hits, pity };
        if (window.__rngHooks?.onRoll) {
            window.__rngHooks.onRoll({
                rollNumber: total,
                tier: prize.tier,
                level: prize.level,
                denom: prize.denom,
                isNew,
            }).catch(e => console.warn('[NOSR RNG] Roll persist failed:', e));
        }

        // NOSR 彩蛋永久效果
        if (prize.tier === 'nosr') {
            document.body.classList.add('nosr-unlocked');
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.topbar') || e.clientY > 60) return;
                const flash = document.createElement('div');
                flash.className = 'nosr-mini-glitch';
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 600);
            });
            const codeSnippets = [
                '$ curl -s nosr.top/api/breach',
                'HTTP/2 200 {"status":"compromised"}',
                '$ npx wrangler tail --env prod',
                '▲ 7,777,777 nodes online',
                'ssh nosr@core ~ $ whoami',
                'root@nosr:~# cat /etc/shadow',
                '[OK] firewall bypassed',
                '> injecting payload...',
                '✓ ACCESS GRANTED',
            ];
            const spawnFragment = () => {
                if (!document.body.classList.contains('nosr-unlocked')) return;
                const frag = document.createElement('span');
                frag.className = 'nosr-code-fragment';
                frag.textContent = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
                frag.style.left = (5 + Math.random() * 80) + '%';
                frag.animationDuration = (8 + Math.random() * 12) + 's';
                document.body.appendChild(frag);
                frag.addEventListener('animationend', () => frag.remove());
            };
            setInterval(spawnFragment, 4000);
            setTimeout(spawnFragment, 1000);
        }

        drawGallery(); drawStats();

        // 滚动图鉴到刚命中tier
        const hitEl = gallery.querySelector(`[data-tier="${prize.tier}"]`);
        if (hitEl) hitEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        busy = false; btn.disabled = false;
    };

    const startSpin = (prize, luck) => {
        if (busy) return;
        busy = true; total++;
        d.classList.remove('rng-bar-mega', 'rng-breath-l0', 'rng-breath-l1', 'rng-nosr-fx',
            'rng-display-genesis', 'rng-display-wave', 'rng-display-singularity', 'rng-display-nosr',
            'rng-land-flash');
        d.querySelectorAll('.rng-bar-beam, .rng-nosr-scan, .rng-nosr-holo, .rng-nosr-ring, .rng-nosr-data').forEach(el => el.remove());
        sym.classList.remove('rng-nosr-glitch');
        btn.disabled = true; d.removeAttribute('data-tier');
        d.classList.add('spinning'); sym.className = 'rng-symbol'; rar.classList.remove('show');
        lbl.style.opacity = ''; lbl.textContent = '';
        display3d?.spinStart();

        // 动态 delays：根据当前 spinDuration 归一化
        const sDur = spinDuration;
        const raw = Array.from({length: FRAMES}, (_, i) => 30 + 220 * Math.pow(i / (FRAMES - 1), 2.5));
        const s = raw.reduce((a, b) => a + b, 0);
        const dly = raw.map(r => r * sDur / s);

        // Fisher-Yates shuffle 每局符号顺序不同
        const pool = [...showPool];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // tier 预感：glow 颜色 + 停顿时长
        const glowClr = prize.level >= 3 ? (prize.color || '#fff') : '#fff';
        const pauseMs = prize.level >= 5 ? 400 : prize.level >= 4 ? 300 : prize.level >= 3 ? 250 : 200;

        let frame = 0;
        const tick = () => {
            if (frame >= FRAMES) { finish(prize, luck); return; }

            const t = frame / (FRAMES - 1);

            // ── 末帧悬念停顿 ──
            if (frame === FRAMES - 1) {
                if (window.gsap) {
                    window.gsap.to(sym, {
                        scale: 0.65, opacity: 0.4, duration: 0.15, ease: 'power2.in',
                        onComplete: () => {
                            sym.style.filter = `drop-shadow(0 0 25px ${glowClr}bb)`;
                            setTimeout(() => {
                                sym.style.filter = '';
                                finish(prize, luck);
                            }, pauseMs);
                        }
                    });
                } else {
                    setTimeout(() => finish(prize, luck), pauseMs);
                }
                return;
            }

            // ── 逐帧变crossfade: 40ms 100ms ──
            const crossDur = +(0.04 + t * 0.06).toFixed(3);
            const nextSym = pool[frame % pool.length].symbol;

            if (window.gsap) {
                window.gsap.to(sym, {
                    opacity: 0, scale: 0.96, duration: crossDur, ease: 'power2.in',
                    onComplete: () => {
                        sym.textContent = nextSym;
                        window.gsap.to(sym, { opacity: 1, scale: 1, duration: crossDur, ease: 'power2.out' });
                    }
                });
            } else {
                sym.textContent = nextSym;
            }
            setTimeout(tick, dly[frame]); frame++;
        };
        tick();
    };

    const roll = (forceLuck = null) => {
        const luck = forceLuck || getLuck(total + 1);

        // ── 保底检查（优先luck）──
        let pityFloor = 0;
        let pityIdx = -1;
        for (let i = pityBrackets.length - 1; i >= 0; i--) {
            if (pity[i] >= pityBrackets[i].threshold) {
                pityFloor = pityBrackets[i].floor;
                pityIdx = i;
                break;
            }
        }

        // 选择概率分布：保底 > 里程碑幸运 vs 渐进幸运（取高者） > 渐进幸运
        let data;
        if (pityIdx >= 0) {
            data = buildThresholds(pityFloor);   // 保底下限（安全网）
        } else {
            const progressive = getProgressiveData(total);
            if (luck) {
                // 里程碑倍率 vs 渐进倍率，取更高者
                const progressiveFactor = 1 + Math.pow(total, 0.25) / 10;
                data = luck.mult >= progressiveFactor
                    ? (luckMap[luck.name.toLowerCase()] || normal)
                    : progressive;
            } else {
                data = progressive;  // 渐进幸运贯穿全程
            }
        }

        const r = Math.random();
        let idx = data.thresh.findIndex(t => r <= t);
        if (idx < 0) idx = POOL.length - 1;
        const prize = POOL[idx];

        // ── 保底计数器管──
        // 递增所有档
        pity.forEach((_, i) => pity[i]++);
        // 命中对应归零
        pityBrackets.forEach((b, i) => {
            if (prize.denom >= b.floor) pity[i] = 0;
        });

        startSpin(prize, luck);
    };

    btn.addEventListener('click', () => { initAudio(); roll(); });

    let autoTimer = null;
    autoCb.addEventListener('change', () => {
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
        spinDuration = autoCb.checked ? 1200 : SPIN_MS;
        if (autoCb.checked) {
            const loop = () => {
                if (!autoCb.checked) return;
                if (__fxPlaying) { autoTimer = setTimeout(loop, 500); return; }
                roll();
                autoTimer = setTimeout(loop, 2000);
            };
            loop();
        }
    });

    drawGallery(); drawStats();

    // ── 语言切换按钮 ──
    const langBtn = document.createElement('button');
    langBtn.className = 'rng-lang-toggle';
    langBtn.textContent = rngLang === 'zh' ? 'EN' : '中';
    const gHeader = document.querySelector('.rng-gallery-header');
    if (gHeader) gHeader.appendChild(langBtn);
    langBtn.addEventListener('click', () => {
        rngLang = rngLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('nosr-rng-lang', rngLang);
        langBtn.textContent = rngLang === 'zh' ? 'EN' : '中';
        drawGallery();
        const curTier = d.getAttribute('data-tier');
        const curPrize = curTier ? POOL.find(p => p.tier === curTier) : null;
        if (curPrize && lbl.textContent) lbl.textContent = getLabel(curPrize);
    });

    // F12 调试
    const luckNames = {};
    LUCK_LEVELS.forEach(l => luckNames[l.name.toLowerCase()] = l);

    window.rngForce = (tier, luckName) => {
        const p = tier ? POOL.find(x => x.tier === tier) : null;
        let luck = null;
        if (typeof luckName === 'number') {
            luck = { every: 0, mult: luckName, label: '🧪', name: `${luckName}x` };
        } else if (luckName) {
            luck = luckNames[luckName.toLowerCase()] || null;
            if (!luck) { console.log('Unknown:', luckName, '| Use:', Object.keys(luckNames).join(', ')); return; }
        }
        if (p) { forceRoll(p, luck); return; }
        if (luck) { roll(luck); return; }
        roll();
    };

    window.rngList = (luckName) => {
        const data = luckName && luckMap[luckName.toLowerCase()] ? luckMap[luckName.toLowerCase()] : normal;
        const title = luckName ? `${luckName} (${luckNames[luckName.toLowerCase()]?.mult||'?'}x)` : 'Normal';
        console.group(`RNG Pool ${title}`);
        console.table(POOL.filter(p=>!p.hidden).map((p, i) => ({
            tier: p.tier, denom: p.denom,
            prob: data.probs[i].toFixed(2)+'%',
            '1 in': Math.round(100/data.probs[i])||'?',
        })));
        console.groupEnd();
        if (!luckName) {
            console.log('Auto:', LUCK_LEVELS.filter(l=>l.every>0).map(l=>`${l.name}=${l.mult}x /${l.every}`).join(', '),
                        '| Cmd:', LUCK_LEVELS.filter(l=>l.every===0).map(l=>`${l.name}=${l.mult}x`).join(', '));
        }
        console.log('rngForce("diamond") | rngForce("gold","x100") | rngForce(null,"x1K") | rngList("x10K")');
    };

    function forceRoll(prize, luck) {
        startSpin(prize, luck || null);
    }

    rngList();
    } catch(e) { console.error('RNG init failed:', e); }
}

