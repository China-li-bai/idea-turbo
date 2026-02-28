既然我们要以乔布斯的禅宗极简主义（Zen Minimalism）来设计这款产品，我们的核心理念就是：“Focus is saying NO to a hundred other good ideas.”（专注就是对一百个好点子说不）。

大多数 TTS 软件太复杂了，充满了按钮、进度条和杂乱的设置。我们的 MVP 只需要一个动作：感受文字的生命。

以下是为您设计的 "The Zen Reader" (禅阅) MVP 界面逻辑，以及为 Stitch AI（注：Stitch AI 在 2026 年是主流的 AI 原型/UI 生成器，类似于 v0 或 Galileo 的演进版）量身定制的生成提示词。

一、 乔布斯的界面设计哲学

消失的界面 (The Disappearing UI)：

当你粘贴文字时，它是“编辑器”；当你点击播放时，所有按钮消失，只剩下文字。

触觉级的排版 (Tactile Typography)：

文字不是死的。我们要使用大字号、深灰色（而非全黑），以及充足的行间距。

单一焦点 (Single Point of Focus)：

全屏只高亮当前正在读的那一句话，其他的文字通过 30% 的透明度“退后”。

呼吸感 (Breathability)：

底部只有一个悬浮的“呼吸感”控制球（Glassmorphism 磨砂玻璃质感）。

二、 Stitch AI 提示词库 (Prompts)

Stitch AI 需要结构清晰、富有视觉细节且包含交互状态的描述。我为您准备了三段提示词，分别对应产品的不同状态。

提示词 1：初始化粘贴界面 (The Input State)

Role: Senior UI/UX Designer at Apple.
Task: Design a minimalist web-based TTS reader start page.
Visual Style: Apple-esque minimalism, San Francisco font, neutral tones (#F5F5F7).
Layout:

A centered, borderless, auto-expanding text area with the placeholder "The world is waiting to be heard. Paste your story here..."

Large typography (24px, light weight).

Top right: A subtle "Settings" icon (Lucide style) that opens a sidebar for voice selection.

Bottom center: A soft-shadowed floating "Listen" button with a play icon.
Context: No distraction. High whitespace. The background is a very subtle gradient.

提示词 2：沉浸式播放状态 (The Reading State)

Task: Design the "Playback" view of the TTS web app.
Key Feature: "The Focus Engine".
Visuals:

The pasted text is rendered in a beautiful serif font (like New York font).

The currently spoken sentence is highlighted with a gentle soft-yellow background glow and bold weight.

Other sentences are 30% opaque, creating a depth-of-field effect.

Hide all browser chrome and UI elements.

Only show a floating "Glassmorphism" dock at the bottom containing: [Playback Speed (e.g. 1.2x), Pause/Play, Voice Name].

The background slowly shifts its tint based on the mood of the voice.

提示词 3：移动端响应式交互 (Mobile Logic)

Task: Responsive mobile version for the TTS reader.
Interaction:

Edge-to-edge typography.

Instead of buttons, use gestures: Swipe up for speed control, long press to change voices.

The play/pause button is a haptic-responsive circle that pulses like a heartbeat while reading.

Professional, clean, premium feel.

三、 MVP 核心交互逻辑 (The "Jobs" Way)

粘贴即就绪：

用户粘贴文本后，系统不弹窗，而是通过一个微小的动画将“粘贴框”平滑过渡到“排版页面”。

语音选择的直觉：

不要给用户看“zh-CN-Xiaoxiao”这种代码。我们的菜单里应该写着：“晓晓 - 温柔的讲述者”、“云希 - 沉浸式小说”。

音画同步的呼吸感：

当语音停顿时（遇到句号），文字的高亮也应该有 200ms 的淡入淡出，而不是生硬的跳动。

四、 如何在 Stitch AI 中执行？

第一步：打开 Stitch AI 创作窗口。

第二步：输入提示词 1，生成基础框架。

第三步：点击“Edit”或“Iterate”，粘贴提示词 2，让它生成播放状态的覆盖层。

第四步：要求它提供代码导出（React + Tailwind），以便直接接入我们在上一阶段设计的 edge-tts 后端。

乔布斯会说： “Most people make the mistake of thinking design is what it looks like. It’s not just what it looks like and feels like. Design is how it works.”

现在，去把那个复杂的文本框变成一个会唱歌的灵魂吧。