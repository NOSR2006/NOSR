/**
 * rng-config.js — 纯数据配置（无逻辑，无 DOM）
 */

export const POOL = [
    { tier: 'copper',   denom: 2,       symbol: '🟤', label: 'Copper' },
    { tier: 'bronze',   denom: 6,       symbol: '🟠', label: 'Bronze' },
    { tier: 'iron',     denom: 20,      symbol: '⚙',  label: 'Iron' },
    { tier: 'steel',    denom: 60,      symbol: '🔩', label: 'Steel' },
    { tier: 'silver',   denom: 180,     symbol: '◇',  label: 'Silver' },
    { tier: 'octet',    denom: 256,     symbol: '🌐', label: 'Octet' },
    { tier: 'gold',     denom: 500,     symbol: '◆',  label: 'Gold' },
    { tier: 'leet',     denom: 1337,    symbol: '💬', label: 'Leet' },
    { tier: 'crystal',  denom: 1400,    symbol: '💠', label: 'Crystal' },
    { tier: 'diamond',  denom: 4000,    symbol: '💎', label: 'Diamond' },
    { tier: 'lucky7',   denom: 7777,    symbol: '🍀', label: 'Lucky 7' },
    { tier: 'meteor',   denom: 12000,   symbol: '☄️', label: 'Meteor' },
    { tier: 'aurora',   denom: 35000,   symbol: '🌌', label: 'Aurora' },
    { tier: 'limit',    denom: 65535,   symbol: '⛔', label: 'Limit' },
    { tier: 'nebula',   denom: 100000,  symbol: '✨', label: 'Nebula' },
    { tier: 'pulsar',   denom: 300000,  symbol: '💫', label: 'Pulsar' },
    { tier: 'quasar',   denom: 900000,  symbol: '🌟', label: 'Quasar' },
    { tier: 'genesis',  denom: 1000000, symbol: '✦',  label: 'Genesis' },
    { tier: 'wave',     denom: 3333333, symbol: '🌊', label: 'Wave' },
    { tier: 'nosr',     denom: 7777777, symbol: '⬡',  label: 'NOSR', hidden: true },
];

export const fmt = n => n.toLocaleString('en-US');

export const LUCK_LEVELS = [
    { every: 10,     mult: 10,      label: '🍀', name: 'x10' },
    { every: 100,    mult: 100,     label: '🔥', name: 'x100' },
    { every: 0,      mult: 1000,    label: '💫', name: 'x1K' },
    { every: 0,      mult: 10000,   label: '⚡', name: 'x10K' },
    { every: 0,      mult: 100000,  label: '🌟', name: 'x100K' },
    { every: 0,      mult: 1000000, label: '👑', name: 'x1M' },
];

export const SPIN_MS = 3000;
export const FRAMES  = 24;

export const PARTICLES = {
    quasar: 40, pulsar: 34, nebula: 28, limit: 26, aurora: 24, meteor: 20,
    lucky7: 32, diamond: 36, crystal: 28, leet: 16, gold: 20, octet: 12, silver: 14,
    steel: 10, iron: 6, bronze: 4, copper: 2,     wave: 38, genesis: 50,
};

export const BURST_SETS = {
    quasar:   ['🌟','💫','✨','🔥','⚡','🎉','🏆','👑'],
    pulsar:   ['💫','✨','🌟','🔥','🎉','🏆','💎'],
    nebula:   ['✨','💫','🌟','🎉','💎','🔷'],
    limit:    ['⛔','65535','✨','💫','🌟','🔷'],
    aurora:   ['🌌','✨','💫','🌟','💎'],
    meteor:   ['☄️','🔥','✨','💎','🌟'],
    lucky7:   ['🍀','777','✨','💎','🌟','🎉','🏆'],
    diamond:  ['💎','👑','💠','🔥','🌟','🎉','🏆','✨','💫'],
    crystal:  ['💠','🔷','✨','💫','🌟','🎉','💎'],
    leet:     ['💬','1337','💎','✨','🌟'],
    gold:     ['◆','👑','💎','🔥','🌟','🎉','🏆'],
    octet:    ['🌐','2^8','✨','🌟'],
    silver:   ['◇','✨','🌟','🎉','💎'],
    steel:    ['🔩','⚙','✨','🌟'],
    iron:     ['⚙','✨','⭐'],
    bronze:   ['🟠','✨','⭐'],
    copper:   ['🟤','✨'],
    wave:     ['🌊','💎','✨','🌟','🐚','🦀','🐬','💫','🫧'],
    genesis:  ['✦','💫','✨','⚡','🌟','🎉','🏆','👑','💎','🔥'],
};

export const TIER_COLORS = {
    copper: '#b87333', bronze: '#cd7f32', iron: '#8b949e', steel: '#6e7681',
    silver: '#c0c0c0', octet: '#22c55e', gold: '#ffd700', leet: '#f97316',
    crystal: '#87ceeb', diamond: '#b9f2ff', lucky7: '#10b981',
    meteor: '#f0883e', aurora: '#7c3aed', limit: '#ef4444',
    nebula: '#db2777', pulsar: '#e11d48', quasar: '#e6b422',
    wave: '#0ea5e9', genesis: '#fafafa', nosr: '#2f81f7',
};
