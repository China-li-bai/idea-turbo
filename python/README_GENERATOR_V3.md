# 豆包图片生成器 - 使用说明

## 概述

这是一个自动化脚本，用于从豆包AI批量生成和下载图片。脚本使用Playwright进行浏览器自动化，支持断点续传和进度跟踪。

## 之前遇到的问题和解决方案

### 问题1: JavaScript触发下载失败
**原因**: 
- 浏览器的下载行为可能被安全策略阻止
- 图片URL可能需要特定的请求头才能访问
- 下载的文件可能被保存到默认下载目录以外的位置

**解决方案**:
- 使用Python的aiohttp库直接下载图片
- 添加必要的请求头（User-Agent, Referer）
- 明确指定文件保存路径

### 问题2: 图片URL获取不准确
**原因**:
- CSS选择器可能不匹配实际的DOM结构
- 图片URL可能动态加载
- 需要等待图片完全渲染

**解决方案**:
- 使用多个URL模式匹配（rc_gen_image, byteimg.com, imagex）
- 添加等待机制确保图片加载完成
- 使用JavaScript直接提取URL

### 问题3: 进度跟踪和断点续传
**原因**:
- 没有保存已完成的任务状态
- 脚本中断后需要重新开始

**解决方案**:
- 使用JSON文件保存进度
- 支持跳过已完成的类别
- 记录每个类别的详细状态

## 文件说明

### 核心脚本

1. **doubao_image_generator_v3.py** - 主脚本
   - 自动化浏览器操作
   - 图片生成和下载
   - 进度管理

2. **all_prompts_parser.py** - 提示词解析器
   - 解析all_prompts.md文件
   - 提取提示词和分类信息

3. **all_prompts.md** - 提示词源文件
   - 包含所有要生成的图片提示词
   - 按层级和子集组织

### 输出文件

- **imgs/** - 图片输出目录
  - 按类别名称创建子目录
  - 每个图片命名为 {word}.png

- **progress.json** - 进度文件
  - 记录已完成的类别
  - 支持断点续传

## 使用方法

### 1. 安装依赖

```bash
pip install playwright aiohttp
playwright install chromium
```

### 2. 准备提示词文件

确保 `all_prompts.md` 文件存在并包含正确的提示词格式。

### 3. 运行脚本

```bash
python doubao_image_generator_v3.py
```

### 4. 登录豆包

脚本启动后会打开浏览器，等待你手动登录豆包账号。登录完成后，按回车键继续。

### 5. 自动化流程

脚本会自动：
1. 导航到豆包图片生成页面
2. 输入提示词
3. 点击发送按钮
4. 等待图片生成
5. 获取图片URL
6. 下载图片到指定目录
7. 保存进度

## 脚本特性

### 断点续传
- 脚本会检查 `progress.json` 文件
- 自动跳过已完成的类别
- 可以随时中断和恢复

### 错误处理
- 网络请求超时处理
- 图片下载失败重试
- 详细的错误日志

### 进度跟踪
- 实时显示当前进度
- 记录成功和失败的数量
- 保存时间戳

### 灵活配置
- 可自定义输出目录
- 可调整等待时间
- 支持自定义提示词

## 提示词格式

提示词文件使用Markdown格式：

```markdown
## 第一层级：生命维持与核心本能

### 基础本能动作
- Eat: Minimalist black silhouette of a person eating, eyes closed in satisfaction, relaxed posture, slight smile, isolated on a pure white background, high contrast.
- Drink: Minimalist black silhouette of a person drinking, head tilted back in relief, comfortable posture, isolated on a pure white background, high contrast.
```

## 故障排除

### 问题: 浏览器无法启动
**解决**: 确保已安装Playwright和Chromium
```bash
playwright install chromium
```

### 问题: 图片下载失败
**解决**: 
1. 检查网络连接
2. 确保豆包账号已登录
3. 查看错误日志

### 问题: 图片数量不匹配
**解决**: 
1. 脚本会提示是否继续下载
2. 可以手动检查生成的图片
3. 调整提示词格式

## 技术细节

### 使用的库
- **Playwright**: 浏览器自动化
- **aiohttp**: 异步HTTP请求
- **asyncio**: 异步编程
- **pathlib**: 文件路径处理

### 关键功能
1. **浏览器自动化**
   - 自动导航
   - 自动输入
   - 自动点击

2. **图片提取**
   - JavaScript执行
   - URL过滤
   - 动态等待

3. **图片下载**
   - 异步下载
   - 请求头处理
   - 文件保存

## 最佳实践

1. **分批处理**: 如果提示词很多，可以分批运行
2. **定期备份**: 定期备份imgs目录和progress.json
3. **监控日志**: 注意查看控制台输出
4. **网络稳定**: 确保网络连接稳定
5. **账号状态**: 确保豆包账号正常

## 性能优化

- 使用异步IO提高下载速度
- 批量处理减少浏览器操作
- 智能等待避免不必要的延迟
- 进度缓存减少重复工作

## 安全注意事项

1. 不要在代码中硬编码账号密码
2. 注意保护个人隐私
3. 遵守豆包的使用条款
4. 合理使用API避免滥用

## 更新日志

### v3.0 (当前版本)
- 完全重写，使用Playwright
- 添加断点续传功能
- 改进错误处理
- 优化下载逻辑
- 添加进度跟踪

### v2.0
- 使用JavaScript触发下载
- 添加提示词解析

### v1.0
- 初始版本
- 基本的浏览器自动化

## 联系方式

如有问题或建议，请提交Issue。
