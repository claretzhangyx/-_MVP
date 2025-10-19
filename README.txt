# 林鹭俄语｜词汇记忆 MVP（r12f）

这是一个纯前端静态网页（HTML + JS + CSS）。无需服务器端代码，可直接部署到任何静态托管平台：GitHub Pages、Netlify、Vercel、Cloudflare Pages、阿里云 OSS、七牛、又拍云等。

## 快速开始（本地预览）
1. 双击 `index.html` 用浏览器打开即可。
2. 如需本地 HTTP 预览，可用：
   - Python: `python -m http.server 8080`
   - Node: `npx serve`

## 一键上线（四选一）

### 方案 A：GitHub Pages
1. 在 GitHub 新建一个仓库（public）。
2. 把 `index.html` 提交到仓库根目录。
3. 打开仓库 Settings → Pages：
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`（或 `master`）根目录 `/`
   - 保存后，稍等片刻获得一个 `https://<你的用户名>.github.io/<仓库名>/` 的链接

### 方案 B：Netlify（最简单拖拽）
1. 访问 Netlify 控制台（需登录）。
2. 把 `index.html` 直接拖拽到 Netlify Drop（或新建站点并选择上传目录）。
3. 完成后会得到一个 `https://*.netlify.app` 的地址。可再绑定自定义域名。

### 方案 C：Vercel
1. 新建项目 → 导入 GitHub 仓库（包含 `index.html`）。
2. Framework 选择 “Other / Static”。
3. Deploy 后获得 `https://*.vercel.app` 地址。

### 方案 D：Cloudflare Pages
1. 新建项目 → 选择 “直接上传” 或 连接 Git 仓库。
2. 构建命令留空，构建输出目录选择根目录。
3. 部署完成后获得 `https://*.pages.dev` 地址。

## 自定义域名（可选）
- 在你的 DNS 服务商处新增 CNAME 记录指向托管平台提供的域名。
- 具体步骤因平台而异，通常是：添加 CNAME → 验证 → 启用 HTTPS。

## 注意事项
- 本项目使用浏览器 `localStorage` 保存学习记录，**同一域名**下数据可持续。更换站点域名会导致数据“像新站一样从零开始”。
- 俄语发音采用浏览器 `SpeechSynthesis`，若设备缺少俄语语音，会自动回退到在线 TTS（需联网）。
- XLSX 解析使用公共 CDN（jsDelivr/UNPKG 等），若地区网络受限，可自行把 `xlsx.full.min.js` 下载并本地引用。
- 若要启用 Hash 路由（例如 `#/home`），当前实现已支持在单页内切换视图。

祝上线顺利！