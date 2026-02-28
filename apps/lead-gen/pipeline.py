import subprocess
import json
import yaml
from pathlib import Path
from datetime import datetime
from automation_engine import AutomationEngine, LeadStatus

def run_scraper(country: str, queries_file: str, output_file: str):
    print(f"\n🔍 Scraping leads for {country}...")
    
    cmd = [
        Path.home() / "go/bin/google-maps-scraper",
        "-input", queries_file,
        "-results", output_file,
        "-json",
        "-depth", "5"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        with open(output_file, 'r') as f:
            count = sum(1 for _ in f)
        print(f"✅ Scraped {count} leads")
        return count
    else:
        print(f"❌ Scraping failed: {result.stderr}")
        return 0

def process_and_import(country: str, json_file: str):
    print(f"\n📥 Processing leads for {country}...")
    
    engine = AutomationEngine()
    count = engine.import_leads_from_json(json_file, country)
    
    print(f"✅ Imported {count} leads into database")
    return count

def generate_contact_list(country: str = None, output_file: str = None):
    print(f"\n📝 Generating contact list...")
    
    engine = AutomationEngine()
    leads = engine.get_leads_for_today(country)
    
    if not output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"output/contact_list_{timestamp}.csv"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("Name,Phone,Channel,Message,Country\n")
        for item in leads:
            lead = item['lead']
            message = item['message'].replace('\n', ' ').replace(',', ';')
            f.write(f'"{lead["name"]}","{lead["phone"]}","{item["channel"]}","{message}","{lead["country"]}"\n')
    
    print(f"✅ Generated contact list: {output_file}")
    print(f"   Total leads ready: {len(leads)}")
    
    return output_file

def show_stats():
    engine = AutomationEngine()
    stats = engine.get_stats()
    
    print("\n" + "=" * 50)
    print("📊 LEAD GENERATION STATISTICS")
    print("=" * 50)
    print(f"\n📈 Total Leads: {stats['total_leads']}")
    print(f"📤 Messages Sent Today: {stats['sent_today']}")
    
    print("\n📍 By Country:")
    for country, count in stats['by_country'].items():
        print(f"   {country.upper()}: {count}")
    
    print("\n📋 By Status:")
    status_icons = {
        'new': '🆕',
        'contacted': '📤',
        'follow_up_1': '🔄',
        'follow_up_2': '🔄',
        'follow_up_3': '🔄',
        'responded': '💬',
        'interested': '⭐',
        'converted': '✅',
        'rejected': '❌'
    }
    for status, count in stats['by_status'].items():
        icon = status_icons.get(status, '📌')
        print(f"   {icon} {status}: {count}")
    
    print("\n" + "=" * 50)

def full_pipeline(country: str = None):
    print("\n" + "=" * 50)
    print("🚀 RUNNING FULL LEAD GENERATION PIPELINE")
    print("=" * 50)
    
    with open("config/countries.yaml", 'r') as f:
        config = yaml.safe_load(f)
    
    countries_to_process = [country] if country else list(config['countries'].keys())
    
    for country_code in countries_to_process:
        if country_code not in config['countries']:
            print(f"⚠️ Unknown country: {country_code}")
            continue
        
        country_config = config['countries'][country_code]
        print(f"\n📍 Processing: {country_config['name']} ({country_code.upper()})")
        
        queries = country_config.get('search_queries', [])
        if not queries:
            print(f"   ⚠️ No search queries defined")
            continue
        
        queries_file = f"config/queries_{country_code}.txt"
        with open(queries_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(queries))
        
        output_file = f"output/{country_code}_leads.json"
        
        scraped = run_scraper(country_code, queries_file, output_file)
        
        if scraped > 0:
            process_and_import(country_code, output_file)
    
    generate_contact_list()
    show_stats()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='B2B Lead Generation Pipeline')
    parser.add_argument('command', choices=['scrape', 'import', 'generate', 'stats', 'run'],
                       help='Command to run')
    parser.add_argument('--country', help='Country code (e.g., vietnam, russia)')
    parser.add_argument('--file', help='Input/output file')
    
    args = parser.parse_args()
    
    Path("data").mkdir(exist_ok=True)
    Path("output").mkdir(exist_ok=True)
    
    if args.command == 'scrape':
        if not args.country or not args.file:
            print("❌ --country and --file required for scrape")
            exit(1)
        run_scraper(args.country, f"config/queries_{args.country}.txt", args.file)
    
    elif args.command == 'import':
        if not args.country or not args.file:
            print("❌ --country and --file required for import")
            exit(1)
        process_and_import(args.country, args.file)
    
    elif args.command == 'generate':
        generate_contact_list(args.country, args.file)
    
    elif args.command == 'stats':
        show_stats()
    
    elif args.command == 'run':
        full_pipeline(args.country)
