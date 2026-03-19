# IndieHackers Idea Board Post

## 标题
**PrivLocal — The AI Calendar That Never Sends Your Data to the Cloud**

## 一句话介绍
A privacy-first AI calendar running 100% locally in your browser — semantic search, multilingual support, and zero server dependencies.

---

## 详细描述

### The Problem

Every AI calendar app today forces you to choose between privacy and intelligence:

- 📡 **Cloud AI = Data Leak Risk** — Your ideas, events, and thoughts are sent to third-party servers
- 🔒 **Privacy Tools = Limited AI** — Most "local" tools still rely on cloud APIs
- 🌐 **Language Barriers** — International teams can't leverage AI effectively across languages
- 📴 **Offline = No AI** — Traditional apps break when you lose internet

### Our Solution

PrivLocal (privlocal.com) flips the script: **All AI runs in your browser**, powered by WebAssembly + Transformers.js. Your data never leaves your device — not because we promise, but because it's technically impossible.

### What Makes Us Different

| Feature | Cloud AI Tools | PrivLocal |
|---------|---------------|-----------|
| Data Privacy | ❌ Sent to servers | ✅ 100% local, never leaves browser |
| Offline Mode | ❌ Requires internet | ✅ Works fully offline |
| AI Model | Provider's choice | ✅ Switch between Chinese/English/Multilingual |
| Latency | Network dependent | ✅ Zero latency inference |
| Setup | API keys, accounts | ✅ Just open the browser |

### Core Features

**🤖 Boss/Secretary Dual Interface**
- **Boss View** — Capture thoughts lightning-fast with natural language. No friction, just flow.
- **Secretary View** — Your AI-powered assistant searches and organizes everything semantically.

**🌍 Multi-language AI Models**
Switch between optimized models for your language:
- 🇨🇳 Chinese (bge-small-zh-v1.5, 512D)
- 🌐 Multilingual (Xenova/multilingual-e5-small, 384D)
- 🇺🇸 English (sentence-transformers/all-MiniLM-L6-v2, 384D)

**🔍 Local Vector Search (No Cloud Required)**
Powered by Orama Database + Transformers.js embeddings. Semantic search across all your ideas — works completely offline.

**💾 Persistent Storage**
Your data survives browser refreshes via IndexedDB. The AI model downloads once (cached locally), then runs forever without internet.

### Tech Stack

```
Frontend:    Next.js 14 + React 19 + TypeScript
AI Engine:   Transformers.js (WASM) + Hugging Face
Search:      Orama Database + Vector Embeddings
State:       Zustand + Persist (IndexedDB)
Styling:     SCSS Modules
```

### The Vision

Privacy should not mean choosing between "smart" and "secure." We're building the future where:

- Your AI assistant is truly *yours*
- Intelligence doesn't require surveillance
- The internet is optional, not required
- Data sovereignty is the default, not the exception

---

**🌐 Try it:** privlocal.com
**📂 Category:** Productivity | AI | Privacy Tools
**🏷️ Tags:** local-first, privacy, AI, calendar, offline, vector-search, multilingual, webassembly
