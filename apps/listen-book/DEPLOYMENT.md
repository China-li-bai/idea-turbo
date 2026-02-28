# VPS 部署指南

本文档说明如何将 Listen-Book 应用部署到 VPS 服务器。

## 前置要求

- VPS 服务器（Ubuntu/Debian）
- Nginx 已安装
- GitHub 账户
- 域名（可选）

## 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `SSH_HOST` | VPS 的 IP 地址或域名 | `123.45.67.89` |
| `SSH_USER` | SSH 用户名 | `root` 或 `ubuntu` |
| `VPS_SSH_KEY` | SSH 私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_PORT` | SSH 端口 | `22` |
| `WEBROOT` | 部署路径（可选） | `/var/www/listen-book/dist` |

### 获取 SSH 私钥

在本地机器上运行：

```bash
cat ~/.ssh/id_rsa
```

复制整个私钥内容（包括 `-----BEGIN` 和 `-----END` 行）到 GitHub Secret。

## 部署流程

### 自动部署

1. 推送代码到 `main` 分支
2. GitHub Actions 会自动触发构建和部署
3. 查看 Actions 标签页了解部署状态

### 手动触发部署

1. 进入 GitHub 仓库的 Actions 标签页
2. 选择 "CI/CD Deploy to VPS (listen-book)" workflow
3. 点击 "Run workflow" 按钮
4. 选择 `main` 分支并运行

## Nginx 配置

### 1. 复制配置文件

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/listen-book
```

### 2. 修改配置文件

```bash
sudo nano /etc/nginx/sites-available/listen-book
```

将 `your-domain.com` 替换为你的实际域名。

### 3. 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/listen-book /etc/nginx/sites-enabled/
```

### 4. 测试配置

```bash
sudo nginx -t
```

### 5. 重启 Nginx

```bash
sudo systemctl restart nginx
```

## 部署路径

默认部署路径：`/var/www/listen-book/dist`

你可以通过设置 `WEBROOT` Secret 来自定义部署路径。

## 备份

每次部署前，当前版本会自动备份到：

```
/var/www/listen-book/backup/listen-book-YYYYMMDD-HHMMSS.tar.gz
```

## 故障排查

### 检查部署日志

在 GitHub Actions 中查看详细日志。

### 检查 Nginx 错误日志

```bash
sudo tail -f /var/log/nginx/listen-book-error.log
```

### 检查文件权限

```bash
ls -la /var/www/listen-book/dist
```

确保文件所有者是 `www-data:www-data`。

### 测试静态文件

```bash
curl http://your-domain.com
```

## HTTPS 配置（可选）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 性能优化

### 启用 HTTP/2

在 Nginx 配置中添加：

```nginx
listen 443 ssl http2;
```

### 配置缓存

Nginx 配置已包含静态资源缓存设置。

### CDN 配置（可选）

考虑使用 CDN 加速静态资源分发。

## 安全建议

1. 使用强密码和 SSH 密钥
2. 定期更新系统和软件包
3. 配置防火墙（ufw）
4. 启用 HTTPS
5. 定期备份数据

## 相关链接

- [Next.js 静态导出文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
