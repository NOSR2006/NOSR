/**
 * fx-scene.js — FXScene 统一全屏动画基类
 * 统一管理 setTimeout / RAF / 事件监听 / GSAP timeline / 销毁
 */

export class FXScene {
    constructor(duration, bgColor = '#000') {
        this.duration = duration;
        this._timers = [];
        this._intervals = [];
        this._rafs = [];
        this._listeners = [];
        this.destroyed = false;

        this.root = document.createElement('div');
        this.root.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;background:${bgColor};`;
        document.body.appendChild(this.root);
    }

    // ── 资源追踪 ──
    timeout(fn, ms) {
        if (this.destroyed) return null;
        const id = setTimeout(() => { this._timers = this._timers.filter(t => t !== id); fn(); }, ms);
        this._timers.push(id);
        return id;
    }

    interval(fn, ms) {
        if (this.destroyed) return null;
        const id = setInterval(fn, ms);
        this._intervals.push(id);
        return id;
    }

    raf(fn) {
        if (this.destroyed) return;
        const id = requestAnimationFrame(fn);
        this._rafs.push(id);
        return id;
    }

    listen(el, event, fn) {
        if (this.destroyed) return;
        el.addEventListener(event, fn);
        this._listeners.push([el, event, fn]);
    }

    // ── DOM 快捷方法 ──
    html(content) { this.root.innerHTML = content; }

    qs(sel) { return this.root.querySelector(sel); }

    qsa(sel) { return this.root.querySelectorAll(sel); }

    append(el) { this.root.appendChild(el); }

    createEl(tag, cls) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        return el;
    }

    // ── GSAP ──
    get gsap() { return window.gsap; }

    timeline(opts) {
        const g = this.gsap;
        return g ? g.timeline({ ...opts, onComplete: () => { if (opts?.onComplete) opts.onComplete(); this._done(); } }) : null;
    }

    _done() {
        this.destroy();
        if (this.onDone) this.onDone();
    }

    // ── 中心文字 stagger ──
    centerText(centerSel, textSel, subSel) {
        const c = this.qs(centerSel);
        if (!c) return null;
        c.style.animation = 'none'; c.style.opacity = '1'; c.style.transform = 'scale(1)';
        const textEl = this.qs(textSel);
        const subEl = subSel ? this.qs(subSel) : null;
        const letters = textEl.textContent.trim().split('').map(ch => {
            const s = document.createElement('span'); s.textContent = ch; return s;
        });
        textEl.textContent = ''; letters.forEach(l => textEl.appendChild(l));
        return { center: c, textEl, subEl, letters };
    }

    // ── 销毁 ──
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this._timers.forEach(id => clearTimeout(id));
        this._intervals.forEach(id => clearInterval(id));
        this._rafs.forEach(id => cancelAnimationFrame(id));
        this._listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
        this._timers.length = this._intervals.length = this._rafs.length = this._listeners.length = 0;
        this.root?.remove();
    }
}
