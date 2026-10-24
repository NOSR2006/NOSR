# nosr-placeholder

`nosr.top` 的占位站点。Cloudflare Pages 项目名 `nosr`（账号 NOSR，`549a4fc4cbcf521ed0b9b91bd4827855`），**直传模式，未连 Git**。

## 重新部署

```bash
cd D:\CodeX\nosr-placeholder\public
export CLOUDFLARE_API_TOKEN=<你的 token>
export CLOUDFLARE_ACCOUNT_ID=549a4fc4cbcf521ed0b9b91bd4827855
wrangler pages deploy . --project-name=nosr --branch=main --commit-dirty=true
```

（站点文件在 `public/`，`README.md` 不会被发布。）

或者拖文件夹到 Cloudflare Dashboard → Workers & Pages → `nosr` → Create deployment。

## 换上新内容时

1. 把新静态文件放进本目录（或新建目录），保留 `_headers` 里的 `X-Robots-Tag: noindex`（想被搜索引擎收录时删掉这一行）。
2. 重新部署即可，绑定不变：`nosr.top`、`www.nosr.top`、`web.nosr.top` 都指向这个项目。
3. 需要后端（Functions / D1）时，再把 `functions/` 和 `wrangler.toml` 加回来；密钥只写进 Dashboard 的环境变量，**不要提交到 Git**。

## 文件

- `index.html` — 首页占位
- `404.html` — 任意未知路径
- `robots.txt` — 全站禁止抓取
- `_headers` — noindex / nosniff / no-referrer / 禁 iframe
