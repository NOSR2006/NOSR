# NOSR

`nosr.top` 的站点仓库。Cloudflare Pages 项目 **`nosr`**（账号 NOSR，`549a4fc4cbcf521ed0b9b91bd4827855`），**直传模式，未连 Git**——推送代码不会自动上线，需要手动 deploy。

当前内容：**占位页**（2026-10-24 起）。原「NOSR Dashboard + NOSR's RNG」源码保留在本仓库历史里，见文末还原方法。

## 目录结构

```
NOSR/
├── public/            # 只有这里的内容会被发布
│   ├── index.html     # 首页占位
│   ├── 404.html       # 任意未知路径
│   ├── robots.txt     # 禁止抓取
│   └── _headers       # noindex / nosniff / no-referrer / 禁 iframe
├── wrangler.toml      # pages_build_output_dir = "public"
└── README.md          # 本文件（不发布）
```

站点绑定：`nosr.top`、`www.nosr.top`、`web.nosr.top`。

## 部署

```bash
cd D:\CodeX\NOSR
wrangler pages deploy --project-name=nosr --branch=main --commit-dirty=true
```

`wrangler.toml` 里已指定 `pages_build_output_dir = "public"`，命令不用再带目录。

登录态在 `%APPDATA%\xdg.config\.wrangler\config\default.toml`；若提示 `Not logged in`，运行 `D:\CodeX\_backups\NOSR-wip-20261024\tools\cf-oauth.mjs`（自建回调，30 分钟窗口，不用赶时间）。

## 换上新内容时

1. 静态文件放进 `public/`。
2. 想被搜索引擎收录时，删掉 `public/_headers` 里的 `X-Robots-Tag`、`public/robots.txt` 的禁止规则、以及 `index.html` 的 `noindex` meta。
3. 需要后端（Pages Functions / D1）时再加回 `functions/`，并把绑定写进 `wrangler.toml`；密钥只放 Dashboard 环境变量，**不要提交**。

## 还原原站点源码

2026-10-24 的提交 `c7a32f21` 清空了原站点（43 个文件：Dashboard 的认证 / 待办 / 笔记 / 书签 / RSS / 监控 / 天气 / 时钟，以及 NOSR's RNG 抽奖模块）。源码仍在历史中：

```bash
git switch -c restore/dashboard c7a32f21^   # 在分支上查看完整源码，不污染 main
git checkout c7a32f21^ -- .                 # 或直接把 43 个文件取回工作区
```

离线快照另存于 `D:\CodeX\_backups\NOSR-wip-20261024\`（bundle / worktree tar.gz / patch / D1 导出 SQL）。
