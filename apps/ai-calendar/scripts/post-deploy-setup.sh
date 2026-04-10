#!/bin/bash

# Post-deployment setup script for ai-calendar
# Run this script on the server after the first deployment

set -e

echo "🚀 Setting up ai-calendar production environment..."
echo ""

# 1. Setup PM2 Logrotate
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: PM2 Logrotate Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pm2 list | grep -q "pm2-logrotate"; then
  echo "✅ pm2-logrotate is already installed"
else
  echo "Installing pm2-logrotate..."
  pm2 install pm2-logrotate
  
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:dateFormat YYYY-MM-DD-HH-mm-ss
  pm2 set pm2-logrotate:rotateModule true
  pm2 set pm2-logrotate:workerInterval 30
  pm2 set pm2-logrotate:rotateInterval "0 0 * * *"
  
  echo "✅ PM2 Logrotate configured"
fi

echo ""

# 2. Setup Nginx Rate Limiting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Step 2: Nginx Rate Limiting Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NGINX_CONF="/etc/nginx/nginx.conf"

if grep -q "zone=api_limit:" "$NGINX_CONF"; then
  echo "✅ Rate limiting zones already configured"
else
  echo "Adding rate limiting zones to nginx.conf..."
  
  # Backup nginx.conf
  sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
  
  # Add rate limiting zones
  sudo sed -i '/http {/a\
    # Rate limiting zones for ai-calendar\
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;\
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;\
' "$NGINX_CONF"
  
  # Test configuration
  if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
  else
    echo "❌ Nginx configuration test failed, reverting..."
    sudo mv "${NGINX_CONF}.backup."* "$NGINX_CONF"
    exit 1
  fi
fi

echo ""

# 3. Verify deployment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 3: Deployment Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Checking application status..."
sleep 2

# Health check
HEALTH_RESPONSE=$(curl -s http://localhost:3002/api/health)
if [ $? -eq 0 ]; then
  echo "✅ Health check endpoint responding"
  echo "Response: $HEALTH_RESPONSE"
else
  echo "❌ Health check failed"
  exit 1
fi

# PM2 status
echo ""
echo "PM2 Status:"
pm2 list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Configuration Summary:"
echo "  ✅ PM2 Logrotate: enabled (10MB max, 7 days retention)"
echo "  ✅ Nginx Rate Limiting: enabled"
echo "     - API routes: 10 req/s"
echo "     - General routes: 30 req/s"
echo "  ✅ Health check: /api/health"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: pm2 logs ai-calendar"
echo "  2. Check health: curl http://localhost:4439/api/health"
echo "  3. View metrics: pm2 monit"
