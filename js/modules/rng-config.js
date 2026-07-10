/**
 * rng-config.js — 纯数据配置（无逻辑，无 DOM）
 * 每个 tier 的所有属性集中在一个对象中，便于维护
 *
 * label = 英文名（UI 默认显示）
 * zh    = 中文名（切换后显示）
 *
 * 谱系结构：
 *   L1 Foundation   · 30 tiers · denom 2–950       · 自然万物
 *   L2 Harmonics    · 25 tiers · denom 1000–9500   · 奇珍异宝
 *   L3 Celestial    · 20 tiers · denom 10000–95000 · 天体宇宙
 *   L4 Transcendent · 15 tiers · denom 100000–980000 · 物理极限
 *   L5 Origin       · 4 tiers  · denom ≥1000000
 */

export const POOL = [

    // ════════════════════════════════════════════════════════════
    // L1 · Foundation（基频段）— 30 tiers · 自然万物
    // ════════════════════════════════════════════════════════════
    { tier: 'soil',      denom: 2,     symbol: '🟫', label: 'Soil',        zh: '土壤',     level: 1, particles: 2,  burst: ['🟫','✨'],                    color: '#8b4513' },
    { tier: 'leaf',      denom: 3,     symbol: '🍃', label: 'Leaf',        zh: '叶',       level: 1, particles: 2,  burst: ['🍃','🌱','✨'],                color: '#228b22' },
    { tier: 'flower',    denom: 5,     symbol: '🌺', label: 'Flower',      zh: '花',       level: 1, particles: 3,  burst: ['🌺','🌸','✨'],                color: '#ffb7c5' },
    { tier: 'pebble',    denom: 7,     symbol: '🪨', label: 'Pebble',      zh: '卵石',     level: 1, particles: 3,  burst: ['🪨','✨','⭐'],                color: '#9a9a8e' },
    { tier: 'rain',      denom: 10,    symbol: '🌧️', label: 'Rain',        zh: '雨',       level: 1, particles: 4,  burst: ['🌧️','💧','✨'],               color: '#6b93d6' },
    { tier: 'moss',      denom: 15,    symbol: '🌿', label: 'Moss',        zh: '苔藓',     level: 1, particles: 4,  burst: ['🌿','🌱','✨'],                color: '#6b8e23' },
    { tier: 'pine',      denom: 20,    symbol: '🌲', label: 'Pine',        zh: '松',       level: 1, particles: 5,  burst: ['🌲','🍃','✨'],                color: '#2d5016' },
    { tier: 'shell',     denom: 28,    symbol: '🐚', label: 'Shell',       zh: '贝壳',     level: 1, particles: 5,  burst: ['🐚','✨','⭐'],                color: '#f5deb3' },
    { tier: 'feather',   denom: 40,    symbol: '🪶', label: 'Feather',     zh: '羽毛',     level: 1, particles: 6,  burst: ['🪶','✨','⭐'],                color: '#f5f5dc' },
    { tier: 'coral',     denom: 50,    symbol: '🪸', label: 'Coral',       zh: '珊瑚',     level: 1, particles: 6,  burst: ['🪸','✨','🌟'],                color: '#ff69b4' },
    { tier: 'rainbow',   denom: 60,    symbol: '🌈', label: 'Rainbow',     zh: '虹',       level: 1, particles: 7,  burst: ['🌈','✨','🌟'],                color: '#ff6b6b' },
    { tier: 'flint',     denom: 70,    symbol: '⚒️', label: 'Flint',       zh: '燧石',     level: 1, particles: 7,  burst: ['⚒️','✨','⭐'],                color: '#808080' },
    { tier: 'slate',     denom: 85,    symbol: '🔳', label: 'Slate',       zh: '板岩',     level: 1, particles: 8,  burst: ['🔳','✨','⭐'],                color: '#708090' },
    { tier: 'sand',      denom: 100,   symbol: '⏳', label: 'Sand',        zh: '砂',       level: 1, particles: 9,  burst: ['⏳','✨','⭐'],                color: '#c2b280' },
    { tier: 'basalt',    denom: 120,   symbol: '🌋', label: 'Basalt',      zh: '玄武岩',   level: 1, particles: 10, burst: ['🌋','🔥','✨'],                color: '#3d3d3d' },
    { tier: 'coal',      denom: 140,   symbol: '🖤', label: 'Coal',        zh: '煤',       level: 1, particles: 10, burst: ['🖤','✨','🔥'],                color: '#1a1a1a' },
    { tier: 'wood',      denom: 160,   symbol: '🪵', label: 'Wood',        zh: '木',       level: 1, particles: 11, burst: ['🪵','✨','⭐'],                color: '#8b6914' },
    { tier: 'bone',      denom: 180,   symbol: '🦴', label: 'Bone',        zh: '骨',       level: 1, particles: 11, burst: ['🦴','✨','⭐'],                color: '#e3dac9' },
    { tier: 'iron',      denom: 200,   symbol: '⚙️', label: 'Iron',        zh: '铁',       level: 1, particles: 12, burst: ['⚙️','✨','🌟'],               color: '#434343' },
    { tier: 'copper',    denom: 230,   symbol: '🟤', label: 'Copper',      zh: '铜',       level: 1, particles: 12, burst: ['🟤','✨','🌟'],                color: '#b87333' },
    { tier: 'malachite', denom: 260,   symbol: '🟩', label: 'Malachite',   zh: '孔雀石',   level: 1, particles: 13, burst: ['🟩','✨','🌟'],                color: '#0bda51' },
    { tier: 'jade',      denom: 300,   symbol: '🟢', label: 'Jade',        zh: '玉',       level: 1, particles: 13, burst: ['🟢','✨','💎'],                color: '#00a86b' },
    { tier: 'obsidian',  denom: 350,   symbol: '🗡️', label: 'Obsidian',    zh: '黑曜',     level: 1, particles: 14, burst: ['🗡️','✨','🌟'],               color: '#1a1a2e' },
    { tier: 'peridot',   denom: 400,   symbol: '🫒', label: 'Peridot',     zh: '橄榄石',   level: 1, particles: 15, burst: ['🫒','✨','🌟'],                color: '#aab565' },
    { tier: 'bismuth',   denom: 450,   symbol: '🟣', label: 'Bismuth',     zh: '铋',       level: 1, particles: 15, burst: ['🟣','✨','🌟','💎'],           color: '#a37dba' },
    { tier: 'amber',     denom: 500,   symbol: '🧡', label: 'Amber',       zh: '琥珀',     level: 1, particles: 16, burst: ['🧡','✨','🌟'],                color: '#ffbf00' },
    { tier: 'pearl',     denom: 560,   symbol: '🦪', label: 'Pearl',       zh: '珍珠',     level: 1, particles: 16, burst: ['🦪','✨','🌟','💎'],           color: '#fdeef4' },
    { tier: 'bronze',    denom: 620,   symbol: '🥉', label: 'Bronze',      zh: '青铜',     level: 1, particles: 17, burst: ['🥉','✨','🌟'],                color: '#cd7f32' },
    { tier: 'platinum',  denom: 700,   symbol: '💍', label: 'Platinum',    zh: '铂金',     level: 1, particles: 18, burst: ['💍','✨','🌟','💎'],           color: '#e5e4e2' },
    { tier: 'gold',      denom: 950,   symbol: '🥇', label: 'Gold',        zh: '金',       level: 1, particles: 20, burst: ['🥇','💎','🔥','🌟','🎉','🏆'], color: '#ffd700' },

    // ════════════════════════════════════════════════════════════
    // L2 · Harmonics（谐波段）— 25 tiers · 奇珍异宝
    // ════════════════════════════════════════════════════════════
    { tier: 'key',          denom: 1000,  symbol: '🔑', label: 'Key',           zh: '钥匙',       level: 2, particles: 20, burst: ['🔑','✨','🌟'],                     color: '#daa520' },
    { tier: 'coin',         denom: 1100,  symbol: '🪙', label: 'Coin',          zh: '金币',       level: 2, particles: 20, burst: ['🪙','✨','🌟'],                     color: '#ffd700' },
    { tier: 'lock',         denom: 1200,  symbol: '🔒', label: 'Lock',          zh: '锁',         level: 2, particles: 22, burst: ['🔒','✨','⭐'],                     color: '#c0c0c0' },
    { tier: 'crown',        denom: 1400,  symbol: '👑', label: 'Crown',         zh: '王冠',       level: 2, particles: 22, burst: ['👑','💎','✨','🌟'],                 color: '#ffd700' },
    { tier: 'opal',         denom: 1600,  symbol: '🤍', label: 'Opal',          zh: '欧泊',       level: 2, particles: 24, burst: ['🤍','✨','🌟'],                     color: '#b8d4e8' },
    { tier: 'amethyst',     denom: 1800,  symbol: '💜', label: 'Amethyst',      zh: '紫晶',       level: 2, particles: 24, burst: ['💜','✨','🌟','💎'],                 color: '#9966cc' },
    { tier: 'topaz',        denom: 2000,  symbol: '🟧', label: 'Topaz',         zh: '黄玉',       level: 2, particles: 26, burst: ['🟧','✨','🌟','💎'],                 color: '#ffc87c' },
    { tier: 'citrine',      denom: 2222,  symbol: '🟡', label: 'Citrine',       zh: '黄水晶',     level: 2, particles: 26, burst: ['🟡','✨','🌟','💎'],                 color: '#e4d00a' },
    { tier: 'ruby',         denom: 2500,  symbol: '🔴', label: 'Ruby',          zh: '红宝石',     level: 2, particles: 28, burst: ['🔴','🔥','✨','🌟','💎'],            color: '#e0115f' },
    { tier: 'sapphire',     denom: 2800,  symbol: '💙', label: 'Sapphire',      zh: '蓝宝石',     level: 2, particles: 28, burst: ['💙','✨','🌟','💎','🎉'],            color: '#0f52ba' },
    { tier: 'aquamarine',   denom: 3200,  symbol: '🩵', label: 'Aquamarine',    zh: '海蓝宝',     level: 2, particles: 30, burst: ['🩵','✨','🌟','💎'],                 color: '#7fffd4' },
    { tier: 'emerald',      denom: 3500,  symbol: '💚', label: 'Emerald',       zh: '祖母绿',     level: 2, particles: 30, burst: ['💚','💎','✨','🌟','🎉'],            color: '#50c878' },
    { tier: 'tanzanite',    denom: 4000,  symbol: '🟦', label: 'Tanzanite',     zh: '坦桑石',     level: 2, particles: 30, burst: ['🟦','✨','🌟','💎','🎉'],            color: '#6a0dad' },
    { tier: 'moonstone',    denom: 4500,  symbol: '🌕', label: 'Moonstone',     zh: '月光石',     level: 2, particles: 32, burst: ['🌕','✨','🌟','💎'],                 color: '#fffacd' },
    { tier: 'alexandrite',  denom: 5000,  symbol: '🌗', label: 'Alexandrite',   zh: '变石',       level: 2, particles: 32, burst: ['🌗','✨','🌟','💎','🔥'],            color: '#006b3c' },
    { tier: 'tourmaline',   denom: 5500,  symbol: '🔸', label: 'Tourmaline',    zh: '碧玺',       level: 2, particles: 32, burst: ['🔸','✨','🌟','💎','🎉'],            color: '#e75480' },
    { tier: 'diamond',      denom: 6000,  symbol: '💎', label: 'Diamond',       zh: '钻石',       level: 2, particles: 34, burst: ['💎','👑','💠','🔥','🌟','🎉','🏆','✨','💫'], color: '#b9f2ff' },
    { tier: 'spinel',       denom: 6500,  symbol: '🩷', label: 'Spinel',        zh: '尖晶石',     level: 2, particles: 34, burst: ['🩷','✨','🌟','💎'],                 color: '#ff4d6d' },
    { tier: 'zircon',       denom: 7000,  symbol: '🔷', label: 'Zircon',        zh: '锆石',       level: 2, particles: 34, burst: ['🔷','✨','🌟','💎'],                 color: '#4169e1' },
    { tier: 'kunzite',      denom: 7500,  symbol: '💐', label: 'Kunzite',       zh: '锂紫玉',     level: 2, particles: 36, burst: ['💐','✨','🌟','💎'],                 color: '#d8a8c8' },
    { tier: 'sunstone',     denom: 8000,  symbol: '💛', label: 'Sunstone',      zh: '日光石',     level: 2, particles: 36, burst: ['💛','🔥','✨','🌟','💎'],            color: '#ffd700' },
    { tier: 'labradorite',  denom: 8500,  symbol: '🪞', label: 'Labradorite',   zh: '拉长石',     level: 2, particles: 36, burst: ['🪞','✨','🌟','💎','💫'],            color: '#4682b4' },
    { tier: 'trophy',       denom: 8800,  symbol: '🏆', label: 'Trophy',        zh: '奖杯',       level: 2, particles: 38, burst: ['🏆','✨','🌟','💎'],                 color: '#ffd700' },
    { tier: 'morganite',    denom: 9200,  symbol: '🌸', label: 'Morganite',     zh: '摩根石',     level: 2, particles: 38, burst: ['🌸','✨','🌟','💎'],                 color: '#f7cac9' },
    { tier: 'painite',      denom: 9500,  symbol: '🧿', label: 'Painite',       zh: '硅硼钙铝石', level: 2, particles: 40, burst: ['🧿','✨','🌟','💎','🔥','🎉'],      color: '#8b4513' },

    // ════════════════════════════════════════════════════════════
    // L3 · Celestial（天频段）— 20 tiers · 天体宇宙
    // ════════════════════════════════════════════════════════════
    { tier: 'myriad',         denom: 10000,  symbol: '🌟', label: 'Myriad',         zh: '万象',       level: 3, particles: 30, burst: ['🌟','✨','🔥','💎','🎆'],        color: '#fbbf24' },
    { tier: 'eclipse',        denom: 13000,  symbol: '🌑', label: 'Eclipse',        zh: '蚀',         level: 3, particles: 30, burst: ['🌑','🌘','✨','💎'],                 color: '#2c2c54' },
    { tier: 'solstice',       denom: 16000,  symbol: '☀️', label: 'Solstice',       zh: '至点',       level: 3, particles: 30, burst: ['☀️','🔥','✨','🌟'],                 color: '#f39c12' },
    { tier: 'equinox',        denom: 19000,  symbol: '⚖️', label: 'Equinox',        zh: '分点',       level: 3, particles: 32, burst: ['⚖️','✨','🌟','💎'],                 color: '#e67e22' },
    { tier: 'stardust',       denom: 22000,  symbol: '💠', label: 'Stardust',       zh: '星尘',       level: 3, particles: 32, burst: ['💠','💫','🌟','💎'],                 color: '#e8d5b7' },
    { tier: 'zenith',         denom: 26000,  symbol: '⬆️', label: 'Zenith',         zh: '天顶',       level: 3, particles: 32, burst: ['⬆️','✨','🌟','💎'],                 color: '#6a5acd' },
    { tier: 'meteor',         denom: 30000,  symbol: '☄️', label: 'Meteor',         zh: '流星',       level: 3, particles: 34, burst: ['☄️','🔥','✨','💎','🌟'],            color: '#f0883e' },
    { tier: 'flare',          denom: 34000,  symbol: '🔆', label: 'Flare',          zh: '耀斑',       level: 3, particles: 34, burst: ['🔆','☀️','🔥','✨','💎'],            color: '#ff4500' },
    { tier: 'corona',         denom: 38000,  symbol: '🌅', label: 'Corona',         zh: '日冕',       level: 3, particles: 34, burst: ['🌅','✨','🌟','💎','🔥'],            color: '#f1c40f' },
    { tier: 'comet',          denom: 42000,  symbol: '🌠', label: 'Comet',          zh: '彗星',       level: 3, particles: 36, burst: ['🌠','✨','💫','🌟','🔥','💎'],       color: '#ffaa33' },
    { tier: 'supernova',      denom: 46000,  symbol: '💥', label: 'Supernova',      zh: '超新星',     level: 3, particles: 36, burst: ['💥','🔥','✨','🌟','💎','🎆'],       color: '#ff6347' },
    { tier: 'pulsar_wind',    denom: 50000,  symbol: '💨', label: 'Pulsar Wind',    zh: '脉冲风',     level: 3, particles: 36, burst: ['💨','⚡','✨','🌟'],                 color: '#00ced1' },
    { tier: 'nebula_ring',    denom: 55000,  symbol: '⭕', label: 'Nebula Ring',    zh: '星云环',     level: 3, particles: 38, burst: ['⭕','✨','💫','🌟','💎'],            color: '#da70d6' },
    { tier: 'aurora',         denom: 60000,  symbol: '🌌', label: 'Aurora',         zh: '极光',       level: 3, particles: 38, burst: ['🌌','✨','💫','🌟','💎'],            color: '#7c3aed' },
    { tier: 'dark_matter',    denom: 66000,  symbol: '◼️', label: 'Dark Matter',    zh: '暗物质',     level: 3, particles: 38, burst: ['◼️','✨','💫','🌟'],                 color: '#2f2f2f' },
    { tier: 'magnetar',       denom: 72000,  symbol: '🧲', label: 'Magnetar',       zh: '磁星',       level: 3, particles: 40, burst: ['🧲','⚡','✨','🌟','💎'],            color: '#dc143c' },
    { tier: 'gravity_wave',   denom: 78000,  symbol: '〰️', label: 'Gravity Wave',   zh: '引力波',     level: 3, particles: 40, burst: ['〰️','✨','💫','🌟','💎'],            color: '#4169e1' },
    { tier: 'cosmic_ray',     denom: 85000,  symbol: '⚡', label: 'Cosmic Ray',     zh: '宇宙射线',   level: 3, particles: 40, burst: ['⚡','✨','🌟','💎','🔥'],            color: '#c77dff' },
    { tier: 'vortex',         denom: 90000,  symbol: '🌀', label: 'Vortex',         zh: '涡旋',       level: 3, particles: 42, burst: ['🌀','⚡','💫','🌟','✨'],            color: '#06b6d4' },
    { tier: 'limit',          denom: 95000,  symbol: '🚧', label: 'Limit',          zh: '极限',       level: 3, particles: 42, burst: ['🚧','⚡','💫','🌟'],                 color: '#ef4444' },

    // ════════════════════════════════════════════════════════════
    // L4 · Transcendent（超频段）— 15 tiers · 物理极限
    // ════════════════════════════════════════════════════════════
    { tier: 'nebula',        denom: 100000,  symbol: '✨', label: 'Nebula',          zh: '星云',         level: 4, particles: 36, burst: ['✨','💫','🌟','🎉','💎'],             color: '#db2777' },
    { tier: 'wormhole',      denom: 150000,  symbol: '🕳️', label: 'Wormhole',      zh: '虫洞',         level: 4, particles: 38, burst: ['🕳️','✨','🌟','🔥'],                color: '#7c3aed' },
    { tier: 'dark_energy',   denom: 200000,  symbol: '🔮', label: 'Dark Energy',     zh: '暗能量',       level: 4, particles: 38, burst: ['🔮','✨','💫','🌟'],                color: '#6b21a8' },
    { tier: 'antimatter',    denom: 260000,  symbol: '⚛️', label: 'Antimatter',      zh: '反物质',       level: 4, particles: 40, burst: ['⚛️','💥','✨','🌟','⚡'],           color: '#00ffcc' },
    { tier: 'higgs',         denom: 330000,  symbol: '🔬', label: 'Higgs',           zh: '希格斯',       level: 4, particles: 40, burst: ['🔬','✨','🌟','💎'],                color: '#f0e68c' },
    { tier: 'pulsar',        denom: 400000,  symbol: '💫', label: 'Pulsar',          zh: '脉冲星',       level: 4, particles: 42, burst: ['💫','✨','🌟','🔥','🎉','🏆','💎'], color: '#e11d48' },
    { tier: 'planck',        denom: 480000,  symbol: '📐', label: 'Planck',          zh: '普朗克',       level: 4, particles: 42, burst: ['📐','✨','🌟','⚡'],                color: '#ff69b4' },
    { tier: 'vacuum_decay',  denom: 560000,  symbol: '💀', label: 'Vacuum Decay',    zh: '真空衰变',     level: 4, particles: 44, burst: ['💀','💥','✨','🌟','⚡'],           color: '#4b0082' },
    { tier: 'gamma_burst',   denom: 640000,  symbol: '☢️', label: 'Gamma Burst',     zh: '伽马暴',       level: 4, particles: 44, burst: ['☢️','🔥','✨','🌟','⚡','💎'],      color: '#ff1493' },
    { tier: 'neutronium',    denom: 720000,  symbol: '⚗️', label: 'Neutronium',      zh: '中子素',       level: 4, particles: 44, burst: ['⚗️','✨','🌟','💎'],               color: '#4ecdc4' },
    { tier: 'time_crystal',  denom: 800000,  symbol: '🧊', label: 'Time Crystal',    zh: '时间晶体',     level: 4, particles: 46, burst: ['🧊','✨','🌟','💎','⚡'],           color: '#00ffff' },
    { tier: 'strange_quark', denom: 860000,  symbol: '🎆', label: 'Strange Quark',   zh: '奇异夸克',     level: 4, particles: 46, burst: ['🎆','✨','🌟','⚡','💎'],           color: '#adff2f' },
    { tier: 'cosmic_string', denom: 920000,  symbol: '🎸', label: 'Cosmic String',   zh: '宇宙弦',       level: 4, particles: 48, burst: ['🎸','✨','🌟','💎','⚡'],           color: '#dda0dd' },
    { tier: 'quasar',        denom: 960000,  symbol: '✳️', label: 'Quasar',          zh: '类星体',       level: 4, particles: 48, burst: ['✳️','💫','✨','🔥','⚡','🎉','🏆'], color: '#e6b422' },
    { tier: 'false_vacuum',  denom: 980000,  symbol: '🫧', label: 'False Vacuum',    zh: '伪真空',       level: 4, particles: 50, burst: ['🫧','✨','🌟','💎','⚡','🔥'],      color: '#e0e0ff' },

    // ════════════════════════════════════════════════════════════
    // L5 · Origin（源频段）— 5 tiers
    // ════════════════════════════════════════════════════════════
    { tier: 'genesis',     denom: 1000000,  symbol: '✴️', label: 'Genesis',     zh: '创世',     level: 5, particles: 50, burst: ['✴️','💫','✨','⚡','🌟','🎉','🏆','👑','💎','🔥'], color: '#fff5e0' },
    { tier: 'paradox',     denom: 2000000,  symbol: '♾️', label: 'Paradox',     zh: '悖论',     level: 5, particles: 48, burst: ['♾️','🔮','✨','🌀','⚡','💎','🔥','🌟'], color: '#e040a0' },
    { tier: 'wave',        denom: 3333333,  symbol: '🌊', label: 'Wave',        zh: '涌浪',     level: 5, particles: 38, burst: ['🌊','💎','✨','🌟','🐚','🦀','🐬','💫','🫧'], color: '#0ea5e9' },
    { tier: 'singularity', denom: 5000000,  symbol: '⚫', label: 'Singularity', zh: '奇点',     level: 5, particles: 55, burst: ['⚫','💥','🌑','✨','🌀','⚡','🔥','🕳️'], color: '#8b5cf6' },
    { tier: 'nosr',        denom: 7777777,  symbol: '🌐',  label: 'NOSR',        zh: 'NOSR',     level: 5, particles: 60, burst: ['🌐','🔷','</>','🔓','💻','⚡','🛡️','🔑','🏴','💫'], color: '#2f81f7', hidden: true },
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

export const SPIN_MS = 2500;
export const FRAMES  = 24;
