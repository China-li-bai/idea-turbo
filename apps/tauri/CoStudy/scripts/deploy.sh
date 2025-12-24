#!/bin/bash

# make-gold 部署脚本
# 用于手动部署或回滚应用

set -e

# 配置变量
APP_NAME="make-gold"
APP_DIR="/var/www/${APP_NAME}"
DIST_DIR="${APP_DIR}/dist"
BACKUP_DIR="${APP_DIR}/backup"
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
DOMAIN="mgai.66666618.xyz"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以root权限运行
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        exit 1
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    mkdir -p "${DIST_DIR}"
    mkdir -p "${BACKUP_DIR}"
    chown -R "$USER":"$USER" "${APP_DIR}"
    log_info "目录创建完成"
}

# 备份当前部署
backup_current() {
    if [ -d "${DIST_DIR}" ] && [ "$(ls -A ${DIST_DIR})" ]; then
        local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        log_info "备份当前部署到 ${BACKUP_DIR}/${backup_name}..."
        mkdir -p "${BACKUP_DIR}/${backup_name}"
        cp -r "${DIST_DIR}/"* "${BACKUP_DIR}/${backup_name}/"
        
        # 保留最近5个备份
        cd "${BACKUP_DIR}"
        ls -t | tail -n +6 | xargs -r rm -rf
        log_info "备份完成"
    else
        log_warn "没有找到需要备份的内容"
    fi
}

# 部署新版本
deploy_new_version() {
    local source_dir="$1"
    
    if [ -z "${source_dir}" ]; then
        log_error "请指定源目录"
        exit 1
    fi
    
    if [ ! -d "${source_dir}" ]; then
        log_error "源目录不存在: ${source_dir}"
        exit 1
    fi
    
    log_info "从 ${source_dir} 部署新版本..."
    
    # 清空当前目录并复制新文件
    rm -rf "${DIST_DIR}"/*
    cp -r "${source_dir}"/* "${DIST_DIR}/"
    
    log_info "部署完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    # 检测操作系统类型
    if [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        NGINX_CONF_FILE="${NGINX_CONF_DIR}/${DOMAIN}"
        NGINX_ENABLED_LINK="${NGINX_ENABLED_DIR}/${DOMAIN}"
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        NGINX_CONF_DIR="/etc/nginx/conf.d"
        NGINX_CONF_FILE="${NGINX_CONF_DIR}/${DOMAIN}.conf"
        NGINX_ENABLED_LINK=""
    else
        log_error "不支持的操作系统"
        exit 1
    fi
    
    # 如果配置文件不存在，创建它
    if [ ! -f "${NGINX_CONF_FILE}" ]; then
        log_info "创建Nginx配置文件: ${NGINX_CONF_FILE}"
        cat > "${NGINX_CONF_FILE}" << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    root ${DIST_DIR};
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查端点
    location /health {
        try_files /health.html =404;
    }
    
    # SPA路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
        
        # 对于Ubuntu/Debian，创建符号链接
        if [ -n "${NGINX_ENABLED_LINK}" ] && [ ! -L "${NGINX_ENABLED_LINK}" ]; then
            ln -s "${NGINX_CONF_FILE}" "${NGINX_ENABLED_LINK}"
        fi
    else
        log_info "Nginx配置文件已存在，跳过创建"
    fi
    
    # 测试Nginx配置
    log_info "测试Nginx配置..."
    if nginx -t; then
        log_info "Nginx配置测试通过"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
    
    # 重载Nginx
    log_info "重载Nginx..."
    systemctl reload nginx
    log_info "Nginx重载完成"
}

# 列出可用备份
list_backups() {
    log_info "可用备份:"
    if [ -d "${BACKUP_DIR}" ]; then
        ls -lt "${BACKUP_DIR}" | grep -E '^d' | head -10
    else
        log_warn "备份目录不存在"
    fi
}

# 回滚到指定备份
rollback_to_backup() {
    local backup_name="$1"
    
    if [ -z "${backup_name}" ]; then
        log_error "请指定备份名称"
        list_backups
        exit 1
    fi
    
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    if [ ! -d "${backup_path}" ]; then
        log_error "备份不存在: ${backup_path}"
        list_backups
        exit 1
    fi
    
    log_info "回滚到备份: ${backup_name}"
    
    # 备份当前版本
    backup_current
    
    # 恢复备份
    rm -rf "${DIST_DIR}"/*
    cp -r "${backup_path}"/* "${DIST_DIR}/"
    
    # 重载Nginx
    systemctl reload nginx
    
    log_info "回滚完成"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  deploy <源目录>    部署新版本"
    echo "  rollback <备份名>   回滚到指定备份"
    echo "  backup             备份当前版本"
    echo "  list-backups       列出可用备份"
    echo "  configure-nginx    配置Nginx"
    echo "  help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy /tmp/make-gold-dist"
    echo "  $0 rollback backup-20231101-120000"
    echo "  $0 backup"
    echo "  $0 list-backups"
}

# 主函数
main() {
    case "${1:-help}" in
        "deploy")
            check_root
            create_directories
            backup_current
            deploy_new_version "$2"
            configure_nginx
            log_info "部署完成！"
            ;;
        "rollback")
            check_root
            create_directories
            rollback_to_backup "$2"
            log_info "回滚完成！"
            ;;
        "backup")
            check_root
            create_directories
            backup_current
            log_info "备份完成！"
            ;;
        "list-backups")
            list_backups
            ;;
        "configure-nginx")
            check_root
            configure_nginx
            log_info "Nginx配置完成！"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"