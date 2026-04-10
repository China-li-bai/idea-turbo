#!/bin/bash

# PM2 Logrotate Setup Script
# Run this script on the server to configure PM2 log rotation

set -e

echo "🔧 Installing PM2 Logrotate..."

# Install pm2-logrotate module
pm2 install pm2-logrotate

# Configure logrotate settings
echo "⚙️  Configuring logrotate settings..."

pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD-HH-mm-ss
pm2 set pm2-logrotate:rotateModule true
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval 0 0 * * *

echo "✅ PM2 Logrotate configured successfully!"
echo ""
echo "Configuration:"
echo "  - Max log size: 10MB"
echo "  - Retain logs: 7 days"
echo "  - Compression: enabled"
echo "  - Rotation interval: daily at midnight"
echo ""
echo "Current PM2 modules:"
pm2 list
