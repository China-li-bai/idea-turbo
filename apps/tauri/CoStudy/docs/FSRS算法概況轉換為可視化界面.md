算法概览

- FSRS 基于 DSR 记忆模型：难度 D、稳定性 S、可提取性 R。
- 遗忘规律用指数曲线建模： R(t) = exp(-t / S) （时间 t 越长，R 越低）。
- 两条核心经验规律：
  - 稳定化曲线（Stabilization curve）：R 越低（更接近忘记），一次复习对 S 的提升越大。
  - 稳定化衰减（Stabilization decay）：S 越高，后续复习带来的 S 增量越小（边际效应递减）。
- 目标是把“何时复习”变成预测问题：当 R 下降到目标阈值（如 0.9 ）时安排复习。
核心变量

- S（稳定性） ：记忆“寿命”的刻度，单位通常为“天”；S 越大，遗忘越慢。
- R（可提取性/回忆率） ：此刻能回忆的概率，随时间按 exp(-t/S) 下降。
- D（难度） ：材料本身的记忆难度；D 越大，S 增长越慢。
- Grade（评分） ：Again/Hard/Good/Easy；影响 S 的增量和 D 的调整。
- request_retention ：目标回忆率（默认 0.9）；用于计算下次间隔。
- maximum_interval / fuzz / short_term ：最大间隔、间隔扰动、短期学习步骤配置。
关键函数（ts-fsrs）

- forgetting_curve(elapsed_days, stability) -> R ：返回此刻回忆率。
- next_recall_stability(d, s, r, g) -> S'_r ：在回忆（Hard/Good/Easy）时更新稳定性。
- next_forget_stability(d, s, r) -> S'_f ：在遗忘（Again）时更新稳定性。
- next_short_term_stability(s, g) -> S'_st ：学习/重学阶段的短期稳定性更新。
- FSRS.repeat(card, now) / FSRS.next(card, now, grade) ：输出下一状态（含 due 、 scheduled_days 、 stability 、 difficulty ）。
具体算法（调度步骤）

- 计算当前回忆率： R_now = exp(-elapsed_days / S) 。
- 根据评分更新状态：
  - 回忆（Hard/Good/Easy）： S' = next_recall_stability(D, S, R_now, Grade) ，同时调整 D' （更容易的评分会降低难度）。
  - 遗忘（Again）： S' = next_forget_stability(D, S, R_now) ， D' 通常上调或保持较高。
  - 学习/重学阶段： S' = next_short_term_stability(S, Grade) 。
- 计算下一间隔（满足目标保留率）： I = -S' * ln(request_retention) ，然后
  - 限制上限： I = min(I, maximum_interval) 。
  - 可选扰动：启用 fuzz 对 I 做轻微随机化，避免扎堆。
- 更新卡片：
  - due = now + I ， scheduled_days = I ， stability = S' ， difficulty = D' ， elapsed_days = 0 。
  - 记录 reps/lapses/state/last_review 等。
用户需知数据（乔布斯式“只给关键”）

- 今日总体回忆率： R_today （例如所有已到期卡的加权平均 R）与“目标 90%”的差值。
- 未来 7 天复习负载：每天预计的卡片数量与总时长。
- 当前记忆状态快照：平均 S（天） 、平均 R 、平均 D 。
- 单卡“最佳复习点”：此卡在未来何时达到 R = request_retention （高亮一个点即可）。
- 建议操作：当明日负载过大，明确给出“今天提前复习 X 张”的唯一按钮。
可视化设计（简洁直觉、讲故事）

- 单一大数字（SBN）：页首显示“总体回忆率”（例如 89% ），小字：“目标 90%，已接近”。
- 未来负载时间轴：7 天水平条，仅显示数量；悬浮提示显示“张数/分钟”；点击展开当天列表。
- 记忆曲线卡片：显示所选卡的 R(t) = exp(-t/S) ，高亮 R = request_retention 的时刻（下一次 due）。
- D/S/R 微卡片：三个小卡分别显示 S（天） 、 R（%） 、 D（难/中/易） ，每个带微型 sparkline。
- 建议操作卡（CTA）：例如“今日提前复习 10 张→减少明天负担”，只给一个大按钮。
- 风格规则：主色+灰度；去除冗余轴线与网格；大字号强调关键数字；解释文字少而清。
代码示例（本仓库封装）

- 调度所有评分：
  - import { scheduleAll } from 'packages/lib/fsrs'
  - const all = scheduleAll(card, new Date())
  - const good = all.Rating.Good.card （含 due 、 scheduled_days 、 stability 、 difficulty ）
- 指定评分：
  - import { scheduleNext } from 'packages/lib/fsrs'
  - const next = scheduleNext(card, Rating.Good, new Date())
  - next.card.scheduled_days 即下一间隔（天）， next.card.due 即复习日期
- 汇总 R/S/D（已实现）：
  - import { getRsdSummary } from 'packages/lib/analytics'
  - 返回： { retention, stabilityAvg, difficultyAvg } 用于“当前记忆状态”卡片。
设计理由（与理论对应）

- R(t) = exp(-t/S) ：对应 SuperMemo 的遗忘曲线。
- S' 的更新包含“R 越低增益越大”（稳定化曲线）与“随 S 增长增益递减”（稳定化衰减）。
- 间隔 I = -S' * ln(request_retention) ：把“何时复习”直接转化为目标回忆率阈值的时间点。
- 简洁仪表盘只呈现“结论”和“下一步行动”，把复杂参数学习与权重拟合隐藏在后台。
参考

- FSRS 算法原理与公式说明： https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- 稳定化曲线（回忆率越低，提升越大）： https://supermemo.guru/wiki/Stabilization_curve
- 稳定化衰减（稳定性越高，增量越小）： https://supermemo.guru/wiki/Stabilization_decay
- ts-fsrs 文档（方法与类型）： https://open-spaced-repetition.github.io/ts-fsrs/
如果你希望把上述

已完成实现并预览 Dashboard 页面。下面是本次交付的要点与使用说明。

成果概览

- 新增 src/pages/Dashboard.tsx ，实现 Jobs 风格的极简 UI：
  - 单一大数字显示“整体保留率”与目标值。
  - “今日到期与预计时长”在右侧对齐。
  - 三张微卡片展示 R/S/D（Retention、Stability 平均、Difficulty 平均）。
  - 未来 7 天工作量时间线（柱形高度按卡片数自动缩放）。
  - 近 7 天评分分布与“今日到期状态分布”并排。
  - 明日工作量过高时显示 CTA，建议提前复习。
- 接入可验证、可测试的算法：
  - 使用 @make-gold/lib/analytics 的 getDashboardMetrics 、 getRsdSummary 、 getRetentionNow 。
  - 数据源为 PGlite，调用 getSingletonInitializedPGlite ，确保单例初始化。
- 路由已连接：
  - 在 App.tsx 中已配置 <Route path="/dashboard" element={<Dashboard />} /> 。
  - 导航配置已包含 Dashboard（ src/navigation/routes.ts 的 NAV_ITEMS ）。
- 文案国际化：
  - 使用 react-i18next ，中文与英文的 dashboard.* 所有文案键均已存在（ packages/locales/zh.json 、 en.json ）。
核心代码

- 页面组件： src/pages/Dashboard.tsx
- 算法模块： packages/lib/analytics.ts
- DB 工具： packages/lib/pglite.ts
如何查看

- 启动开发： pnpm dev
- 预览地址： http://localhost:1025/ （端口可能因占用而自动切换）
- 访问 Dashboard：在导航点击“首页”或直接打开 http://localhost:1025/dashboard
UI 与数据说明

- Retention 大数字来自 getRetentionNow ，展示 value 与目标 goal （默认 90%）。
- 今日到期卡片数与预计时长：
  - todayStates 各状态之和为卡片数。
  - 时长计算： todayMinutes = round(todayCount * avgReviewMs / 60000) ， avgReviewMs 来自近记录或默认值。
- R/S/D 微卡片：
  - retention 为当前整体记忆保持率（基于 R(t) = exp(-t/S) 推导）。
  - stabilityAvg 与 difficultyAvg 为卡片均值。
- 未来 7 天时间线：
  - 使用 getTimeline(db, 7) 生成 [date, count, minutes] 。
  - 每日柱形高度按 count 映射，带 title 提示显示详细。
- 评分分布与状态分布：
  - gradeDist7d 按 again/hard/good/easy 聚合。
  - todayStates 按 new/learning/review(+relearning) 展示。
- CTA 展示逻辑：
  - 若明日到期数大于过去 7 天的日均值，则显示 CTA（“建议提前复习部分卡片”）。
下一步建议

- 在 Deck 或 Review 页补充“自由复习”（提前复习）的入口，并将 CTA 按钮跳转到该功能。
- 可在 getAvgReviewDurationMs 中将平均耗时按用户实际习惯进行自适应调整。
- 若需要更细的负载预测，可加入移动平均与可点击的每日详情弹窗。
如需将 CTA 按钮直接跳转到具体的“自由复习”路径或增加交互动画，我可以继续补充相应路由与组件。