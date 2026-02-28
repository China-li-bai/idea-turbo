#!/bin/bash

echo "🚀 B2B Lead Generation Automation Setup"
echo "========================================"

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "📥 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -q pyyaml

if ! command -v go &> /dev/null; then
    echo "⚠️ Go not installed. Installing..."
    brew install go
fi

if [ ! -f "$HOME/go/bin/google-maps-scraper" ]; then
    echo "📦 Installing Google Maps Scraper..."
    GOPROXY=https://goproxy.cn,direct go install github.com/gosom/google-maps-scraper@latest
fi

mkdir -p data output config

if [ ! -f "config/accounts.yaml" ]; then
    echo "📝 Creating accounts template..."
    cat > config/accounts.yaml << 'EOF'
accounts:
  whatsapp:
    - id: "wa_main"
      phone: "+65XXXXXXXX"
      status: "active"
      daily_limit: 50
      warmup_days: 7
      
  zalo:
    - id: "zalo_main"
      phone: "+84XXXXXXXX"
      status: "active"
      daily_limit: 30
      
  telegram:
    - id: "tg_main"
      username: "@your_bot"
      status: "active"
      daily_limit: 100

EOF
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit config/accounts.yaml with your account details"
echo "   2. Run: python pipeline.py run --country vietnam"
echo "   3. Check: python pipeline.py stats"
echo ""
