# Mail Viewer — 邮件查看器

A mail viewer built on Microsoft Graph API, featuring multi-account switching, batch import, and split-pane preview — powered by Vue 3 + Element Plus.

基于 Microsoft Graph API 的图形化邮件查看器，支持多账号切换、批量导入与分栏预览，使用 Vue 3 + Element Plus 构建。

## ✨ Features / 功能

- **Multi-account** — Add and manage multiple Outlook accounts simultaneously, switch on the fly
- **Batch Import** — Bulk-add accounts via JSON or plain text for quick setup
- **Split-pane Preview** — Left-side email list, right-side full content preview; responsive single-column on mobile
- **Search & Filter** — Search by subject, sender, or content in real time
- **OAuth 2.0** — Secure token-based auth via Microsoft Identity Platform, with a built-in local proxy to avoid CORS issues
- **Dark-adapted Design** — Art Design Tokens system with smooth transitions, polished UI

---

- **多账号管理** — 同时添加管理多个 Outlook 账号，一键切换
- **批量导入** — 支持 JSON / 纯文本批量添加账号
- **分栏预览** — 左侧邮件列表，右侧内容详情；移动端自适应单列布局
- **实时搜索** — 支持按主题、发件人、正文内容搜索
- **OAuth 2.0 认证** — 通过 Microsoft Identity Platform 获取 Token，内置本地代理解决 CORS
- **精致 UI** — Art Design Token 设计系统，平滑过渡动画，移动端适配

## 📸 Preview / 预览

![light](./public/screenshot.png)

## 🚀 Quick Start / 快速开始

### Prerequisites / 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- An Azure AD app registration (see [Configuration](#-configuration--配置))

### Install & Run / 安装运行

```bash
# Clone
git clone https://github.com/your-username/mail-viewer.git
cd mail-viewer

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Azure AD credentials

# Start dev server (Vite + token proxy)
pnpm dev
```

The dev server runs at `http://localhost:5173`, the token proxy at `http://localhost:5199`.

## ⚙️ Configuration / 配置

Create a `.env` file in the project root:

```env
VITE_PORT=5173
VITE_BASE_URL=/
VITE_CLIENT_ID=your-azure-ad-client-id
VITE_TENANT_ID=common
VITE_REDIRECT_URI=http://localhost:5173
```

### Azure AD Setup / Azure AD 配置

1. Go to [Azure Portal](https://portal.azure.com/) → **App registrations**
2. Register a new app with **Accounts in any organizational directory and personal Microsoft accounts**
3. Under **Authentication**, add a **Single-page application** redirect URI: `http://localhost:5173`
4. Under **API Permissions**, add `Mail.Read` (delegated) from Microsoft Graph
5. Copy the **Application (client) ID** to your `.env` file

## 📁 Project Structure / 项目结构

```
art-design-pro-main/
├── public/               # Static assets
├── scripts/
│   └── token-proxy.mjs   # Local OAuth proxy (port 5199)
├── src/
│   ├── assets/
│   │   └── styles/       # SCSS design system & tokens
│   │       ├── core/
│   │       │   ├── el-ui.scss     # --art-* design tokens
│   │       │   ├── el-light.scss  # Element Plus theme overrides
│   │       │   ├── mixin.scss     # SCSS mixins
│   │       │   ├── md.scss        # Markdown-like styles
│   │       │   └── reset.scss     # CSS reset
│   │       └── index.scss
│   ├── views/
│   │   └── email-viewer/
│   │       └── index.vue          # Main email viewer page
│   ├── router/           # Vue Router config
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🛠 Tech Stack / 技术栈

| Category | Choice |
|----------|--------|
| Framework | Vue 3 + Composition API |
| Language | TypeScript |
| Build Tool | Vite 7 |
| UI Library | Element Plus |
| CSS | SCSS (Design Tokens) |
| Auth | Microsoft Graph API + OAuth 2.0 |
| Code Quality | ESLint + Prettier |

## 📝 Scripts / 脚本

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server + token proxy (auto-reload) |
| `pnpm build` | Build for production |
| `pnpm serve` | Preview production build |
| `pnpm lint` | Lint codebase |
| `pnpm fix` | Auto-fix lint issues |

## 🖥 Deployment on BT Panel / 宝塔面板部署

> The following guide uses **BT Panel (宝塔面板)** on a Linux server (Ubuntu / CentOS / Debian).
> 以下教程基于 Linux 服务器上的**宝塔面板**。

### 1. Server Preparation / 服务器环境准备

Install the following via BT Panel Software Store / 在宝塔面板软件商店安装：

| Software | Version |
|----------|---------|
| Nginx | ≥ 1.20 |
| Node.js | ≥ 18.x (via Node.js Version Manager) |
| PM2 | Latest |

### 2. Upload & Build / 上传并构建

```bash
# SSH into your server, navigate to web directory
cd /www/wwwroot

# Clone the repository
git clone https://github.com/your-username/mail-viewer.git
cd mail-viewer

# Install dependencies
pnpm install

# Create and edit environment config
cp .env.example .env
nano .env
```

Edit `.env` with your production values:

```env
VITE_PORT=5173
VITE_BASE_URL=/
VITE_CLIENT_ID=your-azure-ad-client-id
VITE_TENANT_ID=common
VITE_REDIRECT_URI=https://your-domain.com
```

> ⚠️ **Important**: Set `VITE_REDIRECT_URI` to your actual domain and add this URI to Azure AD App Registration.

Build the project:

```bash
pnpm build
# Output goes to /www/wwwroot/mail-viewer/dist/
```

### 3. Start Token Proxy with PM2 / 用 PM2 启动 Token 代理

The token proxy must run as a persistent background service / token 代理需要持久化运行：

```bash
# Create a PM2 ecosystem file
cat > /www/wwwroot/mail-viewer/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'mail-token-proxy',
    script: 'scripts/token-proxy.mjs',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start /www/wwwroot/mail-viewer/ecosystem.config.cjs
pm2 save
pm2 startup   # auto-start on boot / 开机自启
```

Verify the proxy is running / 确认代理正常运行：

```bash
pm2 status
curl http://localhost:5199
```

### 4. Configure Nginx / 配置 Nginx

In BT Panel / 宝塔面板中：
- Go to **Websites** → your site → **Configuration File**
- 进入 **网站** → 你的站点 → **配置文件**

```nginx
# ---------- Token Proxy (port 5199) ----------
server {
    listen 80;
    server_name proxy.your-domain.com;  # Subdomain for proxy / 代理专用子域名

    location / {
        proxy_pass http://127.0.0.1:5199;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ---------- Main Site ----------
server {
    listen 80;
    server_name your-domain.com;        # Your main domain / 主域名
    root /www/wwwroot/mail-viewer/dist;
    index index.html;

    # SPA fallback / SPA 回退路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset cache / 静态资源缓存
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression / Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 256;
}
```

> If you have SSL, enable it in BT Panel (one-click Let's Encrypt) and update `VITE_REDIRECT_URI` to `https://`. Don't forget to also enable SSL for the proxy subdomain.
> 如需 HTTPS，在宝塔面板一键开启 Let's Encrypt，并将 `VITE_REDIRECT_URI` 更新为 `https://`。代理子域名也需要开启 SSL。

### 5. Firewall & Ports / 防火墙放行

In BT Panel Security page, allow / 在宝塔面板安全页面放行：

| Port | Purpose |
|------|---------|
| 80 | HTTP (main site) |
| 443 | HTTPS (main site) |
| 5199 | Token Proxy (internal only, or via Nginx reverse proxy) |

### 6. Update Azure AD Redirect URI / 更新 Azure AD 回调地址

Go to [Azure Portal](https://portal.azure.com/) → App registrations → your app → **Authentication**:

Add `https://your-domain.com` to the redirect URI list.

### 7. Verify Deployment / 验证部署

```bash
# Check PM2
pm2 status

# Check Nginx
nginx -t && nginx -s reload

# Test endpoints
curl -I https://your-domain.com
curl http://localhost:5199
```

Visit `https://your-domain.com` in your browser. Everything should work.
用浏览器访问 `https://your-domain.com`，即可正常使用。

---

### Quick Recap for BT Panel Users / 宝塔面板操作总结

1. Software Store → Install Node.js, PM2, Nginx
2. Terminal → `git clone` → `pnpm install` → `pnpm build`
3. Terminal → `pm2 start ecosystem.config.cjs && pm2 save`
4. BT Panel → Websites → Add site (domain + `/www/wwwroot/mail-viewer/dist`)
5. BT Panel → Websites → Config → paste Nginx config above
6. Azure Portal → Add `https://your-domain.com` to redirect URIs
7. Done!

### Quick Recap / 操作总结

1. 软件商店 → 安装 Node.js、PM2、Nginx
2. 终端 → `git clone` → `pnpm install` → `pnpm build`
3. 终端 → `pm2 start ecosystem.config.cjs && pm2 save`
4. 宝塔面板 → 网站 → 添加站点（域名 + `/www/wwwroot/mail-viewer/dist`）
5. 宝塔面板 → 网站 → 配置 → 粘贴上述 Nginx 配置
6. Azure Portal → 添加 `https://你的域名.com` 到回调 URI
7. 完成！

## 📄 License

MIT
