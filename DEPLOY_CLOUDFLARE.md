# Cloudflare Workers & Pages 部署指南

## 🚨 重要：你遇到的问题分析

**问题现象**：访问显示 "There is nothing here yet"

**根本原因**：
1. Cloudflare Workers 部署配置不正确
2. Next.js 需要特殊的适配器才能在 Cloudflare 上运行
3. 构建命令和部署命令配置错误

---

## ✅ 正确的部署配置（请完全按照这个填写）

### 📋 Cloudflare Workers 配置界面填写

#### 1. 项目名称
```
graypay-dev
```

#### 2. 构建和部署命令 ⭐

**构建命令**（第一个输入框）：
```
npm install && npm run build && npm run pages:build
```

**部署命令**（第二个输入框）：
```
npx wrangler pages deploy .vercel/output/static --project-name=graypay-dev
```

⚠️ **关键点**：必须先运行 `npm run build`（Next.js 构建），再运行 `npm run pages:build`（Cloudflare 适配）

#### 3. 根目录
```
/
```
保持默认即可

#### 4. 环境变量（构建变量）

点击 **"添加变量"**，依次添加：

| 变量名称 | 值 | 说明 |
|---------|---|------|
| `NODE_VERSION` | `18` | Node.js 版本 |
| `MAIN_BACKEND_URL` | `https://你的主站域名.com` | 主站API地址 |
| `PAY_PROXY_TOKEN` | `你的token字符串` | 必须与主站一致 |
| `WECHAT_RATE_URL` | `http://pay.noveltypay.com/wechatrate.aspx` | 可选：汇率接口 |
| `RATE_CACHE_SEC` | `300` | 可选：汇率缓存秒数 |

---

## 🔧 方式一：通过 Cloudflare Dashboard 部署（推荐新手）

### Step 1: 推送配置文件到仓库

我已经为你创建了 `wrangler.toml` 配置文件，现在提交并推送：

```bash
git add wrangler.toml package.json
git commit -m "chore: 添加 Cloudflare Workers 部署配置"
git push origin dev
```

### Step 2: 在 Cloudflare Dashboard 重新配置

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 找到你刚才创建的 `graypay-dev` 项目
3. 点击 **设置（Settings）** > **构建和部署（Builds & deployments）**
4. 修改配置为上面的正确配置
5. 点击 **重新部署（Retry deployment）**

### Step 3: 等待构建完成

- 构建时间：约 3-5 分钟
- 可以在 **部署（Deployments）** 标签查看实时日志

---

## 🚀 方式二：通过命令行部署（推荐有经验用户）

### Step 1: 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: 登录 Cloudflare

```bash
wrangler login
```

会自动打开浏览器进行授权

### Step 3: 构建项目

```bash
npm run build
npm run pages:build
```

### Step 4: 部署到 Cloudflare Pages

```bash
wrangler pages deploy .vercel/output/static --project-name=graypay-dev --branch=dev
```

### Step 5: 设置环境变量

```bash
# 设置生产环境变量
wrangler pages secret put MAIN_BACKEND_URL --project-name=graypay-dev
# 输入值：https://你的主站.com

wrangler pages secret put PAY_PROXY_TOKEN --project-name=graypay-dev
# 输入值：你的token字符串
```

---

## 🔍 为什么会显示 "There is nothing here yet"？

### 原因 1：构建失败
**检查方法**：在 Cloudflare Dashboard 查看部署日志

**常见错误**：
```
Error: Cannot find module '@cloudflare/next-on-pages'
```

**解决方法**：确保 `package.json` 中有：
```json
"devDependencies": {
  "@cloudflare/next-on-pages": "^1.13.0"
}
```

### 原因 2：部署命令错误
**错误示例**：
```bash
npx wrangler deploy  ❌ 错误：这是 Workers 命令，不是 Pages
```

**正确命令**：
```bash
npx wrangler pages deploy .vercel/output/static --project-name=graypay-dev  ✅
```

### 原因 3：输出目录不存在
**问题**：没有先运行 `npm run pages:build` 就直接部署

**解决**：必须按顺序执行：
1. `npm run build` → 生成 Next.js 构建
2. `npm run pages:build` → 转换为 Cloudflare Workers 格式
3. 部署 `.vercel/output/static` 目录

### 原因 4：环境变量未设置
即使部署成功，如果缺少环境变量，页面可能无法正常工作。

---

## ✅ 验证部署是否成功

### 1. 检查构建日志
在 Cloudflare Dashboard 中查看：
```
✓ Uploading... (100%)
✓ Deployment complete! Take a peek over at https://graypay-dev.pages.dev
```

### 2. 测试临时域名
访问：`https://graypay-dev.pages.dev/pay/wechat`

应该看到：
- ✅ 三个价格按钮：399 / 799 / 1299
- ✅ "生成二维码" 按钮
- ✅ 页面样式正常显示

### 3. 测试 API 接口
```bash
# 测试生成二维码接口
curl -X POST https://graypay-dev.pages.dev/api/pay/wechat-qrcode \
  -H "Content-Type: application/json" \
  -d '{"amount":399,"currency":"CNY","vendor":"wechatpay","plan":"support-399","duration":"oneoff"}'
```

---

## 🌐 绑定自定义域名 renantai.top

### 在 Cloudflare Pages 中添加域名

1. 进入项目 > **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入：`renantai.top`
4. Cloudflare 会自动配置 DNS（如果域名在 Cloudflare）

### 如果域名在其他服务商

添加 CNAME 记录：
```
类型：CNAME
名称：@
目标：graypay-dev.pages.dev
TTL：自动
```

或 A 记录（推荐）：
```
类型：A
名称：@
IPv4：[查看 Cloudflare Pages 提供的 IP]
```

---

## 🐛 常见问题排查

### Q1: 部署后仍显示空白页
**检查清单**：
- [ ] 构建日志中是否有错误？
- [ ] 是否设置了环境变量？
- [ ] 浏览器控制台是否有错误？
- [ ] 是否访问了正确的路径（/pay/wechat）？

### Q2: API 接口 500 错误
**原因**：环境变量未配置

**解决**：
```bash
wrangler pages secret put MAIN_BACKEND_URL --project-name=graypay-dev
wrangler pages secret put PAY_PROXY_TOKEN --project-name=graypay-dev
```

### Q3: 样式丢失
**原因**：静态资源路径错误

**检查**：`next.config.ts` 中是否有 `output: 'export'`？
- ❌ 不要设置 `output: 'export'`（这会导致静态导出）
- ✅ 保持默认配置，让 `@cloudflare/next-on-pages` 处理

---

## 📝 完整部署流程总结

```bash
# 1. 提交配置文件
git add wrangler.toml package.json
git commit -m "chore: 添加 Cloudflare 部署配置"
git push origin dev

# 2. 本地构建测试（可选）
npm run build
npm run pages:build

# 3. 命令行部署（推荐）
wrangler login
wrangler pages deploy .vercel/output/static --project-name=graypay-dev --branch=dev

# 4. 设置环境变量
wrangler pages secret put MAIN_BACKEND_URL --project-name=graypay-dev
wrangler pages secret put PAY_PROXY_TOKEN --project-name=graypay-dev

# 5. 访问测试
# https://graypay-dev.pages.dev/pay/wechat
```

---

## 🎯 关键要点

1. ✅ **必须使用** `@cloudflare/next-on-pages` 适配器
2. ✅ **构建顺序**：`npm run build` → `npm run pages:build` → 部署
3. ✅ **输出目录**：`.vercel/output/static`
4. ✅ **环境变量**：必须在 Cloudflare 中配置，不能只在本地
5. ✅ **域名绑定**：部署成功后再绑定自定义域名

---

需要我帮你执行命令行部署吗？或者你想继续使用 Dashboard 部署？

