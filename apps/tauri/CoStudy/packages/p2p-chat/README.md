# p2p-chat

纯前端 P2P 聊天示例（React + TypeScript）。  
使用 WebRTC DataChannel 做消息传输；信令（SDP/ICE）可以通过 **可选的 WebSocket relay** 自动发现，也可以通过 **手动复制/粘贴 SDP** 完成 100% 无服务器连接。

适合 2–10 人的 full-mesh 小群聊 demo（生产请注意 TURN / 性能 / 安全等）。
设计要点回顾：

完全 纯前端逻辑（聊天消息通过 WebRTC DataChannel 点对点传输）

信令通道 需要一个“转发/广播”能力（公有 WebSocket / tracker）。实现里把信令抽象为 SIGNALING_URL，你可以插入公共 tracker/WSS 或自己搭的转发服务。

我同时保留了 手动复制/粘贴信令（100% 无服务） 的备用流程，便于在没有公共信令服务时测试或部署 demo。
---

## 特点

- 完全前端的聊天逻辑：消息走 WebRTC 点对点通道（DataChannel），不存储聊天记录到任何后端。

- 支持两种 offer 策略（A：老用户向新人发 offer；B：新人向老用户发 offer）。默认策略 A（可在 hook 初始化时切换）。

---

## 快速启动（前端）

前端使用 Vite。

1. 安装依赖：
```bash
npm install
