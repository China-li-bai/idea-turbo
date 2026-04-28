# Firebase App Distribution 配置指南

## 1. 安装 Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

## 2. 初始化项目
```bash
cd /root/idea-turbo/flutter_demo
firebase init appdistribution
```

## 3. 上传 APK 到 Firebase
```bash
firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-debug.apk \
  --app YOUR_APP_ID \
  --groups "testers" \
  --release-notes "Flutter LLM Demo 测试版"
```

测试者会收到邮件，点击即可下载安装。

## 4. 获取 App ID
在 Firebase Console -> Project Settings -> 你的 Android 应用
```
1:123456789:android:abcdef123456
```

## 优势
- 免费
- 不需要 Google Play 开发者账号
- 测试者通过邮件/链接直接下载
- 支持版本历史管理
