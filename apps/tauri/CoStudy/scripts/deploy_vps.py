#!/usr/bin/env python3
import os
import sys
import tarfile
import time
import paramiko


HOST = os.environ.get("DEPLOY_HOST", "192.227.177.133")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_PASS", "TVEpWd5F97xi81fL4k")
PORT = int(os.environ.get("DEPLOY_PORT", "22"))


def project_root():
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(here, os.pardir))


def build_tar(dist_dir: str, tar_path: str):
    if not os.path.isdir(dist_dir):
        print(f"[ERROR] 找不到构建目录: {dist_dir}。请先在项目根运行 'pnpm build'。")
        sys.exit(1)
    # 创建 tar.gz
    with tarfile.open(tar_path, "w:gz") as tf:
        tf.add(dist_dir, arcname=".")
    print(f"[OK] 已打包: {tar_path}")


def ssh_connect(host: str, port: int, user: str, password: str) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, port=port, username=user, password=password, timeout=30)
    return client


def run_cmd(client: paramiko.SSHClient, cmd: str, desc: str = None):
    if desc:
        print(f"[REMOTE] {desc}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    rc = stdout.channel.recv_exit_status()
    if out:
        print(out.rstrip())
    if err:
        # 某些包管理器会输出到 stderr，但不一定是错误；仍打印供参考
        print(err.rstrip())
    if rc != 0:
        raise RuntimeError(f"命令执行失败 (rc={rc}): {cmd}\n{err}")


def ensure_nginx(client: paramiko.SSHClient):
    script = r'''
set -e
if ! command -v nginx >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y nginx
    systemctl enable nginx || true
    systemctl start nginx || true
  elif command -v yum >/dev/null 2>&1; then
    yum install -y epel-release || true
    yum install -y nginx
    systemctl enable nginx || true
    systemctl start nginx || true
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y nginx
    systemctl enable nginx || true
    systemctl start nginx || true
  elif command -v apk >/dev/null 2>&1; then
    apk update && apk add nginx
    rc-update add nginx default || true
    service nginx start || true
  else
    echo "Unsupported package manager" >&2
    exit 1
  fi
fi
'''
    run_cmd(client, f"bash -lc '{script}'", desc="安装或启用 Nginx")


def write_nginx_config(client: paramiko.SSHClient):
    config_script = r'''
set -e

if [ -d /etc/nginx/sites-available ]; then
  cat > /etc/nginx/sites-available/make-gold <<'CONF'
server {
  listen 80;
  server_name _;
  root /var/www/make-gold/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
CONF
  ln -sf /etc/nginx/sites-available/make-gold /etc/nginx/sites-enabled/make-gold
else
  cat > /etc/nginx/conf.d/make-gold.conf <<'CONF'
server {
  listen 80;
  server_name _;
  root /var/www/make-gold/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
CONF
fi

nginx -t
if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx || systemctl restart nginx || true
else
  service nginx reload || service nginx restart || true
fi

# 尝试开放 80 端口（若存在防火墙）
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
elif command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http || true
  firewall-cmd --reload || true
fi
'''
    run_cmd(client, f"bash -lc '{config_script}'", desc="写入并重载 Nginx 配置")


def main():
    root = project_root()
    dist_dir = os.path.join(root, "dist")
    tar_path = os.path.join(root, "dist.tar.gz")

    # 打包 dist
    build_tar(dist_dir, tar_path)

    # 连接服务器
    print(f"[INFO] 连接到 {HOST}:{PORT} 以用户 {USER}")
    client = ssh_connect(HOST, PORT, USER, PASSWORD)

    try:
        # 创建部署目录
        run_cmd(client, "mkdir -p /var/www/make-gold", desc="创建部署目录 /var/www/make-gold")

        # 上传压缩包
        print("[REMOTE] 上传 dist.tar.gz 到 /var/www/make-gold/dist.tar.gz")
        sftp = client.open_sftp()
        sftp.put(tar_path, "/var/www/make-gold/dist.tar.gz")
        sftp.close()

        # 解压到 dist
        run_cmd(
            client,
            "bash -lc 'set -e; cd /var/www/make-gold; rm -rf dist; mkdir -p dist; tar -xzf dist.tar.gz -C dist'",
            desc="解压部署包到 dist"
        )

        # 安装/启用 Nginx
        ensure_nginx(client)

        # 写入 Nginx 配置并重载
        write_nginx_config(client)

        print(f"[DONE] 部署完成。请访问: http://{HOST}/")
    finally:
        client.close()


if __name__ == "__main__":
    main()