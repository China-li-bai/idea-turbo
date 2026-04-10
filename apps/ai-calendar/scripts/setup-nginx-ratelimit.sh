#!/bin/bash

# Nginx Rate Limiting Setup Script
# Run this script on the server to enable rate limiting

set -e

echo "🔧 Setting up Nginx rate limiting..."

NGINX_CONF="/etc/nginx/nginx.conf"
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"

# Backup current nginx.conf
if [ -f "$NGINX_CONF" ]; then
  echo "📦 Backing up $NGINX_CONF to $BACKUP_FILE"
  sudo cp "$NGINX_CONF" "$BACKUP_FILE"
fi

# Check if rate limiting zones already exist
if grep -q "zone=api_limit:" "$NGINX_CONF"; then
  echo "✅ Rate limiting zones already configured in nginx.conf"
else
  echo "➕ Adding rate limiting zones to nginx.conf..."
  
  # Add rate limiting zones before the first server block
  sudo sed -i '/http {/a\
    # Rate limiting zones for ai-calendar\
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;\
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;\
' "$NGINX_CONF"
  
  echo "✅ Rate limiting zones added to nginx.conf"
fi

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
  echo "✅ Nginx configuration is valid"
  
  # Reload Nginx
  echo "🔄 Reloading Nginx..."
  sudo systemctl reload nginx
  
  echo "✅ Nginx reloaded successfully!"
else
  echo "❌ Nginx configuration test failed!"
  echo "🔄 Restoring backup..."
  sudo cp "$BACKUP_FILE" "$NGINX_CONF"
  exit 1
fi

echo ""
echo "🎉 Rate limiting setup complete!"
echo ""
echo "Configuration:"
echo "  - API routes (/api/*): 10 req/s, burst 20"
echo "  - General routes: 30 req/s, burst 50"
echo "  - Health check (/api/health): no limit"
