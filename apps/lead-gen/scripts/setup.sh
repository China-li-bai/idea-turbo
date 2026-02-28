#!/bin/bash
set -e

echo "🚀 Setting up Google Maps Scraper..."

cd "$(dirname "$0")/.."

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "📥 Installing dependencies..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "🎭 Installing Playwright browsers..."
playwright install chromium

echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  ./scripts/run.sh                    # Scrape all countries"
echo "  ./scripts/run.sh --countries vietnam  # Scrape specific country"
echo "  python scraper.py --help            # Show all options"
