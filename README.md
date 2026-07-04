# NOSR Dashboard

个人综合控制面板 — 面向自己与亲友的私密型仪表盘。

## 功能模块

- **认证** — 管理员/访客双角色，SHA-256 密码哈希 + JWT
- **待办** — 优先级分类、一键完成
- **笔记** — 速记区，支持置顶
- **书签** — 内置 6 个常用入口 + 自定义添加
- **RSS** — 信息流聚合，支持 RSS 2.0 / Atom
- **监控** — 服务器/服务状态实时检测
- **天气** — 基于地理定位，OpenWeatherMap
- **时钟** — 顶部实时时间日期

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | 原生 HTML/CSS/JS（ES Module），零框架 |
| 后端 | Cloudflare Pages Functions |
| 存储 | Cloudflare KV |
| 认证 | SHA-256 + JWT（httpOnly Cookie） |
| 图标 | Font Awesome 6（本地 JS） |
| 字体 | 阿里妈妈方圆体 VF |

## 项目结构

```
NOSR/
├── index.html              # 仪表盘主页面
├── robots.txt              # 禁止搜索引擎抓取
├── _headers                # Cloudflare Pages 安全头
├── wrangler.toml           # Cloudflare 配置
├── .env                    # API 密钥（不提交 Git）
├── .gitignore
├── .gitattributes
├── css/
│   ├── index.css           # 基础变量 + 全局重置
│   └── dashboard.css       # 仪表盘样式
├── js/
│   ├── dashboard.js        # 主入口
│   ├── auth.js             # 认证模块
│   ├── utils.js            # 工具函数
│   ├── all.min.js          # Font Awesome 图标
│   ├── fontawesome.min.js  # Font Awesome 核心
│   └── modules/
│       ├── clock.js        # 时钟
│       ├── weather.js      # 天气
│       ├── todos.js        # 待办
│       ├── notes.js        # 笔记
│       ├── bookmarks.js    # 书签
│       ├── rss.js          # RSS
│       └── monitor.js      # 监控
├── functions/
│   ├── _middleware.js      # 认证中间件
│   └── api/
│       ├── _kv.js          # KV 数据层
│       ├── auth.js         # 登录/登出
│       ├── todos.js        # 待办 CRUD
│       ├── notes.js        # 笔记 CRUD
│       ├── bookmarks.js    # 书签 CRUD
│       ├── rss.js          # RSS 聚合
│       ├── monitor.js      # 服务监控
│       └── weather.js      # 天气代理
├── img/
│   └── logo.png            # 站点 Logo
└── font/
    └── AlimamaFangYuanTiVF-Thin.woff2
```

## 部署指南

### 前置条件

1. Cloudflare 账号，域名 DNS 已托管到 Cloudflare
2. Node.js ≥ 18（仅用于生成密码哈希）

### 步骤

**1. 创建 KV Namespace**

进入 Cloudflare Dashboard → Workers & Pages → KV → Create namespace
- 名称：`NOSR_KV`
- 记下 ID，填入 `wrangler.toml` 的 `kv_namespaces.id`

**2. 生成密码哈希**

```bash
# 管理员密码
node -e "console.log(require('crypto').createHash('sha256').update('你的管理员密码').digest('hex'))"

# 访客密码（可选，留空则允许无密码访客）
node -e "console.log(require('crypto').createHash('sha256').update('访客密码').digest('hex'))"
```

**3. 配置环境变量**

在 Cloudflare Dashboard → Pages → 你的项目 → Settings → Environment variables，添加：

| 变量 | 值 |
|------|-----|
| `ADMIN_PASSWORD_HASH` | 第 2 步生成的管理员哈希 |
| `VISITOR_PASSWORD_HASH` | 第 2 步生成的访客哈希（或留空） |
| `JWT_SECRET` | 至少 32 字符的随机字符串 |
| `OPEN_WEATHER` | OpenWeatherMap API Key（已有 `.env` 中） |

同时添加 KV binding：变量名 `NOSR_KV`，选择刚创建的 namespace。

**4. 连接 GitHub 部署**

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
- 选择 `github.com/NOSR2006/NOSR`
- 构建命令：留空
- 输出目录：`.`
- 部署

**5. 绑定自定义域名**

Pages → 你的项目 → Custom domains → 添加 `nosr.top`（或 `dash.nosr.top`）

### 本地开发

```bash
# 安装 wrangler（如未安装）
npm install -g wrangler

# 本地运行
wrangler pages dev . --kv NOSR_KV

# 访问 http://localhost:8788
```

## 权限说明

| 角色 | 访问范围 |
|------|----------|
| 管理员 | 全部功能（CRUD + 管理） |
| 访客 | 天气、时钟、书签（只读）、RSS（只读）、监控（只读） |
| 未登录 | 仅登录页 |

- 管理员会话：7 天有效
- 访客会话：24 小时有效
