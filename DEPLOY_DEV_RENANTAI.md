# Dev 分支部署到 Cloudflare Pages 指南

## 🎯 目标
将 **dev 分支**（新价格 399/799/1299）部署到独立的 Cloudflare Pages 应用，绑定域名 **renantai.top**

---

## 📋 部署步骤（Cloudflare Dashboard）

### Step 1: 创建新的 Pages 项目

1. 访问：https://dash.cloudflare.com/
2. 左侧菜单 → **Workers & Pages**
3. 点击右上角 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**

---

### Step 2: 连接 Git 仓库

1. 选择你的 Git 提供商（GitHub / GitLab / Bitbucket）
2. 授权 Cloudflare 访问你的仓库
3. 选择 **graypay** 仓库

---

### Step 3: 配置构建设置 ⚠️ **关键步骤**

#### 基础设置
```
项目名称: graypay-dev
```
或者
```
项目名称: renantai-top
```
（随你喜欢，这个名字不影响域名）

#### 构建配置 ⭐ **重要：必须精确填写**

| 配置项 | 值 | 说明 |
|-------|---|------|
| **生产分支** | `dev` | ⚠️ 不是 main！选择 dev 分支 |
| **Framework preset** | `Next.js` | 选择框架预设 |
| **构建命令** | `npm run build:cf` | Next.js + Cloudflare 适配 |
| **构建输出目录** | `.vercel/output/static` | Cloudflare 适配器输出目录 |
| **根目录** | `/` | 留空或填 `/` |

#### 环境变量（Build environment variables）

点击 **Add variable** 按钮，逐个添加：

| 变量名 | 值 | 是否必需 |
|--------|---|---------|
| `NODE_VERSION` | `20` | 推荐 |
| `MAIN_BACKEND_URL` | `https://你的主站域名.com` | ✅ 必需 |
| `PAY_PROXY_TOKEN` | `你的token字符串` | ✅ 必需（与主站一致） |
| `WECHAT_RATE_URL` | `http://pay.noveltypay.com/wechatrate.aspx` | 可选 |
| `RATE_CACHE_SEC` | `300` | 可选 |

**示例：**
```bash
MAIN_BACKEND_URL=https://api.example.com
PAY_PROXY_TOKEN=abc123xyz789strongtoken
WECHAT_RATE_URL=http://pay.noveltypay.com/wechatrate.aspx
RATE_CACHE_SEC=300
```

---

### Step 4: 开始部署

1. 点击 **Save and Deploy** 按钮
2. 等待构建完成（约 2-3 分钟）
3. 查看构建日志，确保没有错误

**成功标志：**
```
✓ Deploying to Cloudflare Pages...
✓ Success! Deployed to https://graypay-dev.pages.dev
```

---

### Step 5: 验证部署

#### 测试临时域名
访问：`https://你的项目名.pages.dev/pay/wechat`

**应该看到：**
- ✅ 三个价格按钮：**399 / 799 / 1299** （不是旧价格 990/1990/2990）
- ✅ "生成二维码" 按钮
- ✅ 页面样式正常
- ✅ "微信支付" 标题

#### 测试功能
1. 选择金额 **399**
2. 点击 **生成二维码**
3. 检查是否成功生成二维码
4. 检查浏览器控制台是否有错误

---

### Step 6: 绑定自定义域名 renantai.top

#### 6.1 在 Cloudflare Pages 添加域名

1. 进入你的 Pages 项目（graypay-dev）
2. 点击 **Custom domains** 标签
3. 点击 **Set up a custom domain**
4. 输入：`renantai.top`
5. 点击 **Continue**

#### 6.2 DNS 配置

**如果域名已在 Cloudflare（推荐）：**
- ✅ 自动配置，无需手动操作
- Cloudflare 会自动添加 CNAME 记录

**如果域名在其他服务商：**

需要在域名提供商处添加 CNAME 记录：

| 类型 | 名称 | 目标 | TTL |
|------|------|------|-----|
| `CNAME` | `@` 或 `renantai.top` | `graypay-dev.pages.dev` | 自动 |

或者使用 A 记录（推荐迁移到 Cloudflare）：
```
类型: A
名称: @
IPv4: [从 Cloudflare 获取的 IP]
```

#### 6.3 等待 DNS 生效

- 国内：5-10 分钟
- 国际：最多 48 小时（通常几分钟）

**验证方法：**
```bash
# Windows PowerShell
nslookup renantai.top

# 应该返回 Cloudflare 的 IP 地址
```

---

### Step 7: 配置 HTTPS（自动）

Cloudflare Pages 会自动为你的域名配置：
- ✅ 免费 SSL 证书
- ✅ 自动续期
- ✅ HTTP → HTTPS 重定向

**无需任何操作，等待 1-2 分钟即可。**

---

## ✅ 最终验证清单

部署完成后，确认以下各项：

- [ ] 访问 `https://renantai.top/pay/wechat` 显示支付页面
- [ ] 三个价格按钮显示 **399 / 799 / 1299**（不是旧价格）
- [ ] 选择金额后可以成功生成二维码
- [ ] 二维码显示正常，没有加载失败
- [ ] 浏览器控制台没有报错
- [ ] HTTPS 证书有效（浏览器地址栏显示锁图标）
- [ ] 页面样式完整，没有错位

---

## 🔧 环境变量说明

### 必需的环境变量

#### `MAIN_BACKEND_URL`
- **作用**：主站 API 地址
- **示例**：`https://api.example.com`
- **用途**：子站通过此地址调用主站的二维码生成和订单查询接口

#### `PAY_PROXY_TOKEN`
- **作用**：内部鉴权 token
- **要求**：必须与主站的 `INTERNAL_API_TOKEN` 完全一致
- **安全性**：强随机字符串，至少 32 位
- **示例**：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 可选的环境变量

#### `WECHAT_RATE_URL`
- **作用**：微信汇率接口地址
- **默认值**：`http://pay.noveltypay.com/wechatrate.aspx`
- **用途**：获取实时汇率用于前端展示

#### `RATE_CACHE_SEC`
- **作用**：汇率缓存时间（秒）
- **默认值**：`300`（5分钟）
- **用途**：减少对汇率接口的请求频率

---

## 🐛 常见问题

### Q1: 部署失败，提示 "Cannot find module '@cloudflare/next-on-pages'"

**原因**：依赖未安装

**解决**：
1. 检查 `package.json` 的 `devDependencies` 中是否有：
   ```json
   "@cloudflare/next-on-pages": "^1.13.0"
   ```
2. 如果没有，运行：
   ```bash
   npm install --save-dev @cloudflare/next-on-pages
   git add package.json package-lock.json
   git commit -m "chore: add cloudflare adapter"
   git push origin dev
   ```
3. 在 Cloudflare Dashboard 点击 **Retry deployment**

---

### Q2: 部署成功但显示 "There is nothing here yet"

**原因**：构建输出目录配置错误

**解决**：
1. 检查 **Build output directory** 是否填写：`.vercel/output/static`
2. 检查 **Build command** 是否填写：`npm run build:cf`
3. 重新保存配置并重新部署

---

### Q3: API 接口返回 500 错误

**原因**：环境变量未配置或配置错误

**解决**：
1. 进入项目 → **Settings** → **Environment variables**
2. 检查 `MAIN_BACKEND_URL` 和 `PAY_PROXY_TOKEN` 是否正确
3. 修改后点击 **Save**
4. 进入 **Deployments** → 点击最新部署的三个点 → **Retry deployment**

---

### Q4: 域名访问显示 522 错误

**原因**：DNS 配置错误或 Cloudflare 与源站连接失败

**解决**：
1. 检查 DNS 记录是否正确指向 `graypay-dev.pages.dev`
2. 等待 DNS 传播（5-10 分钟）
3. 清除浏览器缓存重试

---

### Q5: 支付时显示旧价格（990/1990/2990）

**原因**：部署的不是 dev 分支

**解决**：
1. 进入项目 → **Settings** → **Builds & deployments**
2. 检查 **Production branch** 是否为 `dev`
3. 如果不是，修改为 `dev` 并保存
4. 点击 **Retry deployment**

---

## 📊 与 main 分支的区别

| 项目 | main 分支 | dev 分支 (renantai.top) |
|------|----------|------------------------|
| **价格** | 990 / 1990 / 2990 | **399 / 799 / 1299** |
| **Plan ID** | support-990/1990/2990 | **support-399/799/1299** |
| **部署分支** | main | **dev** |
| **域名** | 原域名 | **renantai.top** |
| **主站对接** | 使用旧 plan | **使用新 plan** |

---

## 🎯 成功标准

部署成功的标志：

1. ✅ 访问 `https://renantai.top/pay/wechat` 正常显示
2. ✅ 价格显示为 **399 / 799 / 1299**
3. ✅ 可以成功生成微信支付二维码
4. ✅ 支付流程完整（生成→扫码→成功页）
5. ✅ 没有控制台错误或 API 失败

---

## 📞 需要帮助？

如果遇到问题，检查以下内容：
1. Cloudflare Dashboard 的构建日志
2. 浏览器控制台的错误信息
3. 网络面板查看 API 请求是否成功
4. 环境变量是否正确配置

---

**祝部署顺利！🎉**

