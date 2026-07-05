/**
 * clock.js — 实时时钟模块
 */

import { $, formatTime, formatDate } from '../utils.js?v=260709v';

export function initClock() {
    const timeEl = $('#clockTime');
    const dateEl = $('#clockDate');

    function tick() {
        const now = new Date();
        timeEl.textContent = formatTime(now);
        dateEl.textContent = formatDate(now);
    }

    tick();
    setInterval(tick, 1000);
}
