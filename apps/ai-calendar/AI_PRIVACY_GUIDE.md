# AI API 隐私保护指南

## 一、隐私保护技术概览

### 主流隐私保护技术对比

| 技术 | 原理 | 适用场景 | 实现难度 | 性能影响 |
|------|------|----------|----------|----------|
| **本地 AI** | 模型完全在本地运行 | 所有场景 | 中 | 无网络延迟 |
| **数据脱敏** | 匿名化敏感信息 | 结构化数据 | 低 | 极小 |
| **差分隐私** | 添加噪声保护 | 统计分析 | 中 | 小 |
| **联邦学习** | 本地训练，共享参数 | 模型训练 | 高 | 中 |
| **同态加密** | 加密状态计算 | 敏感计算 | 极高 | 大 |

---

## 二、推荐方案（按优先级）

### 🥇 方案一：本地优先 + AI 可选（已实现）

**适用场景**：排班、日程管理等

**实现**：
- 默认使用 `localScheduler.ts` 本地算法
- 用户主动选择时才启用 AI
- 完全控制数据流向

**优点**：
- ✅ 零网络请求，绝对隐私
- ✅ 实时响应
- ✅ 无需 API Key

---

### 🥈 方案二：数据脱敏（Data Anonymization）

**适用场景**：需要 AI 辅助，但数据敏感

**核心思想**：发送前替换/删除敏感信息

| 敏感信息 | 脱敏方式 | 示例 |
|----------|----------|------|
| 真实姓名 | 替换为假名 | 张三 → Employee_A |
| 联系方式 | 删除 | 138xxxxxx → (删除) |
| 具体地址 | 泛化 | 北京市朝阳区 → 北京 |
| 身份证号 | 完全删除 | (删除) |

**实现示例**：
```typescript
// 原始数据
const original = {
  employee: { name: "张三", phone: "13800138000" },
  location: "北京市朝阳区xxx大厦"
};

// 脱敏后
const sanitized = {
  employee: { name: "Employee_001" },
  location: "北京"
};
```

---

### 🥉 方案三：差分隐私（Differential Privacy）

**适用场景**：统计分析、聚合数据

**核心思想**：添加数学可证明的噪声，保护个体不被识别

**关键概念**：
- **ε (epsilon)**：隐私预算，越小越隐私
- **δ (delta)**：失败概率

**实现示例**：
```typescript
function addLaplaceNoise(value: number, epsilon: number, sensitivity: number): number {
  const scale = sensitivity / epsilon;
  const noise = (Math.random() - 0.5) * 2 * scale;
  return value + noise;
}
```

---

### 🏅 方案四：本地 AI 运行

**适用场景**：需要 AI 能力，但数据极端敏感

**技术选项**：
1. **Ollama** - 本地运行 LLM
2. **Transformers.js** - 浏览器端运行模型
3. **WebLLM** - WebGPU 加速

**Ollama 示例**：
```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 运行模型
ollama run llama2
```

---

## 三、本项目的隐私保护实现

### 当前状态 ✅

| 层级 | 保护措施 | 状态 |
|------|----------|------|
| 默认模式 | 本地算法，零网络请求 | ✅ 已实现 |
| AI 模式 | 用户主动选择 | ✅ 已实现 |
| 数据脱敏 | 发送前匿名化 | ⏳ 待实现 |
| 差分隐私 | 可选噪声添加 | ⏳ 待实现 |
| 本地 AI | Ollama/Transformers.js | 🔮 未来 |

---

## 四、数据脱敏实现方案

### 4.1 员工信息脱敏

```typescript
interface SanitizedEmployee {
  id: string;           // 保持不变（用于关联）
  anonymizedName: string; // Employee_001, Employee_002...
  constraints?: {
    unavailableDateCount: number;  // 只发数量
    forbiddenShiftTypeCount: number;
  };
  preferences?: {
    preferredShiftCount: number;
    preferredDayOffCount: number;
  };
}
```

### 4.2 排班需求脱敏

```typescript
function sanitizeShiftRequest(request: string): string {
  return request
    .replace(/张三|李四|王五/g, (match, idx) => `员工${idx + 1}`)
    .replace(/1[3-9]\d{9}/g, '[手机号]')
    .replace(/\d{17}[\dXx]/g, '[身份证号]');
}
```

---

## 五、隐私提示最佳实践

### 5.1 明确的隐私分层

```
┌─────────────────────────────────────────┐
│  🔒 隐私级别选择                        │
├─────────────────────────────────────────┤
│  ● 完全本地 (推荐)                       │
│    - 无网络请求                         │
│    - 绝对隐私保护                       │
│                                         │
│  ○ AI 辅助 (需联网)                     │
│    - 数据脱敏后发送                     │
│    - 不存储任何数据                     │
└─────────────────────────────────────────┘
```

### 5.2 AI 调用前确认

```
⚠️ 隐私提示
您即将使用 AI 辅助功能，请注意：
• 员工姓名将被匿名化 (张三 → Employee_001)
• 联系方式将被删除
• 数据不会被存储

[ 取消 ]  [ 继续使用 AI ]
```

---

## 六、法律合规参考

### 相关法规
- **欧盟 GDPR** - 通用数据保护条例
- **中国《个人信息保护法》** - PIPL
- **美国 CCPA/CPRA** - 加州隐私法

### 关键原则
1. **最小必要** - 只收集必需数据
2. **知情同意** - 明确告知用户
3. **用户控制** - 可删除/导出数据
4. **安全保障** - 加密存储和传输

---

## 七、未来 roadmap

| 阶段 | 功能 | 时间 |
|------|------|------|
| Phase 1 | 数据脱敏工具 | 当前 |
| Phase 2 | 差分隐私选项 | 近期 |
| Phase 3 | Ollama 集成 | 中期 |
| Phase 4 | Transformers.js | 长期 |

---

## 总结

对于排班场景，**最佳方案**是：
1. ✅ **默认使用本地算法**（已实现）
2. ✅ **AI 模式用户主动选择**（已实现）
3. ⏳ **AI 调用时数据脱敏**（下一步）
4. 🔮 **长期考虑本地 AI**（未来）

这样既保证了隐私，又提供了灵活性！
