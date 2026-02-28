#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./scripts/setup.sh first."
    exit 1
fi

source venv/bin/activate
python scraper.py "$@"
