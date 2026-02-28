# 豆包图片生成器使用指南

## 概述

这个工具用于自动化从豆包AI生成图片的过程，基于 `all_prompts.md` 文件中的提示词批量生成并下载图片。

## 文件说明

- `doubao_image_generator.py` - 主要的图片生成脚本
- `all_prompts.md` - 包含所有提示词的源文件
- `imgs/` - 图片输出目录
- `generation_session.json` - 会话进度保存文件（自动生成）

## 使用方法

### 1. 准备工作

确保你已经：
- 登录了豆包账号 (https://www.doubao.com/chat/create-image)
- 安装了Python 3.7+
- 安装了curl工具（用于下载图片）

### 2. 运行脚本

```bash
python doubao_image_generator.py
```

### 3. 操作流程

脚本会显示一个详细的操作指南，包括：

1. **解析提示词**: 脚本会自动解析 `all_prompts.md` 文件
2. **显示层级结构**: 显示所有层级和子集
3. **生成操作指南**: 为每个子集生成详细的浏览器操作指南
4. **手动操作**: 按照指南在浏览器中输入提示词并生成图片
5. **获取图片URL**: 在浏览器控制台执行JavaScript代码获取图片URL
6. **粘贴数据**: 将控制台输出的JSON数据粘贴回脚本
7. **自动下载**: 脚本自动下载并命名图片

### 4. 浏览器操作步骤

对于每个子集，你需要：

1. 访问 https://www.doubao.com/chat/create-image
2. 确保已登录
3. 复制脚本显示的提示词
4. 在输入框中粘贴提示词（建议使用粘贴方式触发发送按钮）
5. 点击发送按钮
6. 等待30-60秒让图片生成
7. 按F12打开浏览器控制台
8. 粘贴并执行脚本提供的JavaScript代码
9. 复制控制台输出的JSON数据
10. 返回脚本并粘贴数据

### 5. JavaScript代码

脚本会提供以下JavaScript代码用于提取图片URL：

```javascript
const allImages = document.querySelectorAll('img');
const generatedImages = Array.from(allImages).filter(img => {
  const src = img.src || '';
  return src.includes('rc_gen_image');
});

console.log('Generated images found:', generatedImages.length);
generatedImages.forEach((img, index) => {
  console.log(`Image ${index + 1}:`, img.src);
});

JSON.stringify({
  count: generatedImages.length,
  urls: generatedImages.map(img => img.src)
});
```

### 6. 图片命名规则

图片会按照 `word_tag.png` 格式自动命名：
- 名词: `water_noun.png`, `apple_noun.png`
- 动词: `jump_verb.png`, `run_verb.png`
- 形容词: `red_adj.png`, `big_adj.png`
- 数词: `one_num.png`, `many_num.png`

## 会话管理

脚本会自动保存进度到 `generation_session.json`：
- 已完成的子集会被标记
- 可以随时中断并继续
- 下次运行时会跳过已完成的子集

## 命令选项

在脚本运行过程中，你可以使用以下命令：
- 输入 `skip` - 跳过当前子集
- 输入 `quit` - 退出整个程序

## 示例输出

```
================================================================================
处理: 第一层级：生命维持与核心本能 - 基础饮品
提示词数量: 6
================================================================================

浏览器操作指南
================================================================================

目标: 生成 第一层级：生命维持与核心本能 - 基础饮品 的图片

步骤:
1. 确保浏览器已打开并访问: https://www.doubao.com/chat/create-image
2. 确保已登录豆包账号
3. 在输入框中输入以下提示词（建议使用粘贴方式）:

Water: A single Water in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast.
Milk: A single Milk in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast.
...

4. 点击发送按钮
5. 等待图片生成（通常需要30-60秒）
6. 生成完成后，在浏览器控制台执行以下JavaScript代码获取图片URL
7. 复制控制台输出的JSON数据
8. 返回此脚本并粘贴JSON数据

================================================================================

请按照上述指南在浏览器中操作，然后粘贴控制台输出的JSON数据:
(输入 'skip' 跳过此子集，输入 'quit' 退出)
```

## 故障排除

### 图片数量不匹配
如果生成的图片数量与提示词数量不匹配，脚本会提示你确认是否继续下载。

### 下载失败
如果下载失败，请检查：
- 网络连接是否正常
- curl工具是否正确安装
- 图片URL是否有效

### 会话文件损坏
如果 `generation_session.json` 文件损坏，删除它并重新运行脚本即可。

## 注意事项

1. 确保浏览器已登录豆包账号
2. 每次生成图片后等待足够的时间（30-60秒）
3. 使用粘贴方式输入提示词以确保发送按钮能正常激活
4. 定期检查 `imgs/` 目录中的图片
5. 如果遇到问题，可以删除 `generation_session.json` 重新开始

## 完成状态

脚本会跟踪所有子集的完成状态，并在最后显示总结：

```
================================================================================
所有图片生成完成！
================================================================================

最终完成: 20/20 个子集
```

## 技术支持

如有问题，请检查：
1. Python版本是否为3.7+
2. curl工具是否正确安装
3. 网络连接是否正常
4. 浏览器控制台是否能正常执行JavaScript代码
