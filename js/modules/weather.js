/**
 * weather.js — 天气模块
 * 复用已有的 OpenWeatherMap API（通过 Cloudflare Worker 代理）
 */

import { API, $ } from './utils.js';

export async function initWeather() {
    const tempEl = $('#weatherTemp');
    const descEl = $('#weatherDesc');
    const humidityEl = $('#weatherHumidity');
    const visibilityEl = $('#weatherVisibility');
    const feelsEl = $('#weatherFeels');
    const cloudsEl = $('#weatherClouds');

    async function refresh() {
        tempEl.textContent = '--°C';
        descEl.textContent = '定位中...';

        navigator.geolocation.getCurrentPosition(
            async(pos) => {
                const { longitude, latitude } = pos.coords;
                try {
                    const data = await API.weather(longitude, latitude);
                    tempEl.textContent = `${Math.round(data.main.temp)}°C`;
                    descEl.textContent = data.weather[0]?.description || '--';
                    humidityEl.textContent = `${data.main.humidity}%`;
                    visibilityEl.textContent = `${(data.visibility / 1000).toFixed(0)} km`;
                    feelsEl.textContent = `${Math.round(data.main.feels_like)}°C`;
                    cloudsEl.textContent = `${data.clouds.all}%`;
                } catch {
                    tempEl.textContent = '--°C';
                    descEl.textContent = '获取失败';
                }
            },
            () => {
                // 定位失败，使用 IP 近似或默认城市
                tempEl.textContent = '--°C';
                descEl.textContent = '需授权定位';
            }, { timeout: 10000 }
        );
    }

    await refresh();

    // 每 30 分钟刷新一次
    setInterval(refresh, 30 * 60 * 1000);
}
