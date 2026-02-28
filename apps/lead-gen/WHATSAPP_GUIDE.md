# WhatsApp 检测方案汇总

## 📊 方案对比

| 方案 | 风险 | 成本 | 效率 | 推荐度 |
|-----|------|------|------|--------|
| **手动导入手机** | ⭐ 极低 | 免费 | 慢 | ⭐⭐⭐⭐⭐ |
| **Baileys（低风险）** | ⭐⭐ 中 | 免费 | 中 | ⭐⭐⭐ |
| **付费 API** | ⭐ 低 | $0.01-0.05/条 | 快 | ⭐⭐⭐⭐ |

---

## 🚀 方案一：Baileys 低风险检测（自动化）

### 安装

```bash
cd baileys-checker
npm install
```

### 使用

```bash
# 运行检测（默认检测 15 个号码）
npm run check

# 或指定输入文件
node checker.js ../output/contacts.csv
```

### 低风险策略

| 策略 | 默认值 | 说明 |
|-----|--------|------|
| **随机延迟** | 8-20秒 | 每次检测间隔 |
| **批量限制** | 15个/次 | 每次会话最多检测 |
| **建议分批** | 8-10天 | 完成 124 个号码 |

### 📅 推荐日程表

| 天数 | 检测数量 |
|-----|---------|
| 第1天 | 15个 |
| 第2天 | 15个 |
| 第3天 | 15个 |
| 第4天 | 15个 |
| 第5天 | 15个 |
| 第6天 | 15个 |
| 第7天 | 15个 |
| 第8天 | 19个 |
| **总计** | **124个** |

### 导入结果

检测完成后，导入数据库：

```bash
cd ..
python import_whatsapp_results.py output/whatsapp_results.csv
```

---

## 📱 方案二：手动导入（零风险）

### 步骤

1. **导出联系人**
   ```bash
   python whatsapp_tools.py export
   ```

2. **传输到手机**
   - 将 `output/contacts.vcf` 传到手机

3. **导入通讯录**
   - 打开通讯录 App → 导入 VCF

4. **检查 WhatsApp**
   - 打开 WhatsApp → 新建聊天
   - 查看哪些号码出现

5. **标记状态**
   - 在 CRM 中标记已注册的号码

---

## ⚠️ Baileys 重要提醒

### 风险控制

1. **使用备用账号**
   - 不要用主 WhatsApp 账号
   - 建议使用专门的测试账号

2. **严格遵守限制**
   - 不要修改批量大小
   - 不要缩短延迟时间

3. **监控账号状态**
   - 每次检测后观察账号
   - 如有异常立即停止

4. **分批完成**
   - 不要急于一天完成
   - 分多天处理更安全

### 配置调整（谨慎）

编辑 `baileys-checker/checker.js`：

```javascript
const CONFIG = {
    MIN_DELAY: 8000,        // 最小延迟（毫秒）
    MAX_DELAY: 20000,       // 最大延迟（毫秒）
    BATCH_SIZE: 15,          // 每批数量
    SESSION_TIMEOUT: 300000, // 会话超时
    AUTH_DIR: './auth'       // 认证目录
};
```

---

## 💡 建议使用流程

### 阶段一：验证可行性（1-2天）

1. 先用 **手动方案** 检测 20-30 个号码
2. 了解有多少号码注册了 WhatsApp
3. 验证整个流程的可行性

### 阶段二：扩大规模（3-10天）

1. 如果手动方案可行，尝试 **Baileys 方案**
2. 第1天先检测 15 个，观察账号状态
3. 如果正常，继续按日程表完成
4. 每天检测后检查账号是否正常

### 阶段三：长期方案

1. 如果 Baileys 稳定，继续使用
2. 如果担心风险，考虑 **付费 API**
3. 规模扩大后（>1000个），付费 API 更划算

---

## 📞 付费 API 选项（备选）

如果 Baileys 不适合，可以考虑：

- **Proweblook**: https://proweblook.com/
- **eKYCPro**: https://docs.ekycpro.com/
- **WA Number Checker**: https://wanumberchecker.com/

价格通常在 $0.01-0.05/条之间。

---

## 🔗 相关文件

| 文件 | 说明 |
|-----|------|
| `baileys-checker/checker.js` | Baileys 检测脚本 |
| `baileys-checker/README.md` | Baileys 详细文档 |
| `whatsapp_tools.py` | 手动方案工具 |
| `import_whatsapp_results.py` | 导入检测结果 |
| `crm_ui.py` | CRM 界面（查看结果） |
