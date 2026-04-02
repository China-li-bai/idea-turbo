# 📝 落地页与 Waitlist API 验证报告

## 1. 落地页跳转问题

### 检查结果

| 项目 | 状态 | 说明 |
|------|------|------|
| **路由配置** | ✅ 正常 | `/app` → `app/app/page.tsx` |
| **Link 组件** | ✅ 正常 | `<Link href="/app">` |
| **样式** | ✅ 正常 | `z-index: 100` |
| **Next.js 配置** | ✅ 正常 | 无特殊配置 |

### 跳转按钮位置

1. **Header 导航栏**：
   ```tsx
   <Link href="/app" className={styles.ctaButton}>
     {t.landing.nav.cta}
   </Link>
   ```

2. **Hero 区域主按钮**：
   ```tsx
   <Link href="/app" className={styles.primaryButton}>
     {t.landing.hero.primaryButton}
   </Link>
   ```

3. **CTA 区域大按钮**：
   ```tsx
   <Link href="/app" className={styles.ctaButtonLarge}>
     {t.landing.cta.button}
   </Link>
   ```

### 可能的问题

1. **浏览器缓存**
   - 解决方案：清除浏览器缓存后重试

2. **开发服务器未运行**
   - 解决方案：确保 `pnpm dev` 正在运行

3. **控制台错误**
   - 解决方案：检查浏览器控制台是否有错误

4. **网络问题**
   - 解决方案：检查网络请求是否正常

### 验证步骤

```bash
# 1. 启动开发服务器
pnpm --filter ai-calendar dev

# 2. 访问落地页
open http://localhost:3000

# 3. 点击"立即体验"按钮
# 应该跳转到 http://localhost:3000/app

# 4. 检查浏览器控制台
# 查看是否有错误信息
```

---

## 2. Waitlist API 验证

### 检查结果

| 项目 | 状态 | 说明 |
|------|------|------|
| **API 实现** | ✅ 正常 | `app/api/waitlist/route.ts` |
| **文件存储** | ✅ 正常 | `data/waitlist.json` |
| **防重复** | ✅ 正常 | 检查邮箱是否已存在 |
| **错误处理** | ✅ 正常 | try-catch 包裹 |

### API 功能

**POST /api/waitlist**

```typescript
// 请求体
{
  "email": "user@example.com",
  "source": "sync-waitlist",
  "timestamp": 1774940486489,
  "locale": "zh-CN"
}

// 成功响应
{
  "success": true,
  "message": "Successfully added to waitlist",
  "position": 1
}

// 重复邮箱响应
{
  "error": "Email already registered",
  "alreadyRegistered": true
}
```

**GET /api/waitlist**

```typescript
// 响应
{
  "total": 5,
  "lastUpdated": "2026-04-02T12:00:00.000Z"
}
```

### 数据存储位置

- **开发环境**：`apps/ai-calendar/data/waitlist.json`
- **生产环境**：`/var/www/ai-calendar/data/waitlist.json`

### 验证步骤

```bash
# 1. 测试 POST 请求
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"test","locale":"zh-CN"}'

# 预期响应：
# {"success":true,"message":"Successfully added to waitlist","position":1}

# 2. 测试 GET 请求
curl http://localhost:3000/api/waitlist

# 预期响应：
# {"total":1,"lastUpdated":"2026-04-02T12:00:00.000Z"}

# 3. 查看文件内容
cat apps/ai-calendar/data/waitlist.json

# 预期内容：
# [
#   {
#     "email": "test@example.com",
#     "source": "test",
#     "timestamp": 1774940486489,
#     "locale": "zh-CN"
#   }
# ]
```

---

## 3. 集成测试

### 完整流程测试

```bash
# 1. 启动开发服务器
pnpm --filter ai-calendar dev

# 2. 打开浏览器
open http://localhost:3000

# 3. 测试落地页跳转
# - 点击 Header 的"立即体验"按钮
# - 点击 Hero 区域的"开始使用"按钮
# - 点击 CTA 区域的"立即体验"按钮
# - 所有按钮都应该跳转到 /app

# 4. 测试 Waitlist API
# - 点击"同步"按钮
# - 输入邮箱
# - 提交表单
# - 检查 data/waitlist.json 文件

# 5. 验证数据
cat apps/ai-calendar/data/waitlist.json
```

---

## 4. 常见问题排查

### 问题：点击按钮没有反应

**可能原因**：
1. JavaScript 错误
2. 样式遮挡
3. 事件监听器未绑定

**排查步骤**：
```bash
# 1. 检查浏览器控制台
# 打开开发者工具 > Console
# 查看是否有错误

# 2. 检查元素
# 右键点击按钮 > 检查
# 查看是否有其他元素遮挡

# 3. 检查网络请求
# 打开开发者工具 > Network
# 点击按钮
# 查看是否有请求发出
```

### 问题：API 返回 500 错误

**可能原因**：
1. 文件系统权限问题
2. 目录不存在

**排查步骤**：
```bash
# 1. 检查目录权限
ls -la apps/ai-calendar/data

# 2. 创建目录（如果不存在）
mkdir -p apps/ai-calendar/data

# 3. 检查文件权限
chmod 755 apps/ai-calendar/data
```

---

## 5. 部署后验证

### 生产环境测试

```bash
# 1. 部署到生产环境
git push

# 2. 测试落地页跳转
curl -I https://privlocal.com
curl -I https://privlocal.com/app

# 3. 测试 Waitlist API
curl -X POST https://privlocal.com/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"prod@example.com","source":"prod-test","locale":"zh-CN"}'

# 4. 查看生产环境数据
ssh user@your-vps
cat /var/www/ai-calendar/data/waitlist.json
```

---

## ✅ 总结

### 落地页跳转

- ✅ 路由配置正确
- ✅ Link 组件使用正确
- ✅ 样式正常
- ⚠️ 需要用户验证具体问题

### Waitlist API

- ✅ **确实会保存用户邮箱**
- ✅ 存储到文件系统
- ✅ 防止重复邮箱
- ✅ 完整的错误处理

### 下一步

1. **验证跳转功能**：按照上述步骤测试
2. **验证 Waitlist API**：提交测试邮箱
3. **检查生产环境**：部署后验证功能

---

**如果遇到问题，请提供**：
- 浏览器控制台错误信息
- 网络请求详情
- 具体的复现步骤
