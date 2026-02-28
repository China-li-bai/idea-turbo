import json
import csv
from pathlib import Path
from datetime import datetime

def process_leads(input_file: str):
    with open(input_file, 'r', encoding='utf-8') as f:
        leads = [json.loads(line) for line in f if line.strip()]
    
    print(f"\n{'='*60}")
    print(f"📊 Lead Generation Report")
    print(f"{'='*60}")
    print(f"Total leads: {len(leads)}")
    
    countries = {}
    for lead in leads:
        country = lead.get('complete_address', {}).get('country', 'Unknown')
        countries[country] = countries.get(country, 0) + 1
    
    print(f"\n📍 By Country:")
    for country, count in sorted(countries.items(), key=lambda x: -x[1]):
        print(f"   {country}: {count}")
    
    with_phone = [l for l in leads if l.get('phone')]
    print(f"\n📱 With Phone: {len(with_phone)} ({len(with_phone)/len(leads)*100:.1f}%)")
    
    with_website = [l for l in leads if l.get('web_site')]
    print(f"🌐 With Website: {len(with_website)} ({len(with_website)/len(leads)*100:.1f}%)")
    
    categories = {}
    for lead in leads:
        cat = lead.get('category', 'Unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\n📁 By Category:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1])[:5]:
        print(f"   {cat}: {count}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path(input_file).parent
    
    csv_path = output_dir / f"leads_formatted_{timestamp}.csv"
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['title', 'phone', 'web_site', 'address', 'category', 
                     'review_rating', 'country', 'city', 'link']
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for lead in leads:
            row = {
                'title': lead.get('title', ''),
                'phone': lead.get('phone', ''),
                'web_site': lead.get('web_site', ''),
                'address': lead.get('address', ''),
                'category': lead.get('category', ''),
                'review_rating': lead.get('review_rating', ''),
                'country': lead.get('complete_address', {}).get('country', ''),
                'city': lead.get('complete_address', {}).get('city', ''),
                'link': lead.get('link', '')
            }
            writer.writerow(row)
    print(f"\n📄 Saved CSV: {csv_path}")
    
    phones_path = output_dir / f"phones_{timestamp}.txt"
    with open(phones_path, 'w', encoding='utf-8') as f:
        for lead in with_phone:
            phone = lead.get('phone', '').strip()
            title = lead.get('title', '').strip()
            city = lead.get('complete_address', {}).get('city', '').strip()
            country = lead.get('complete_address', {}).get('country', '').strip()
            f.write(f"{phone}\t{title}\t{city}, {country}\n")
    print(f"📱 Saved phones: {phones_path} ({len(with_phone)} entries)")
    
    print(f"\n{'='*60}")
    print("🎯 Top 10 Leads with Phone Numbers:")
    print(f"{'='*60}")
    for i, lead in enumerate(with_phone[:10], 1):
        print(f"\n{i}. {lead.get('title', 'N/A')}")
        print(f"   📱 {lead.get('phone', 'N/A')}")
        print(f"   📍 {lead.get('address', 'N/A')[:60]}...")
        print(f"   ⭐ {lead.get('review_rating', 'N/A')} rating")
        if lead.get('web_site'):
            print(f"   🌐 {lead.get('web_site')}")
    
    return leads

if __name__ == "__main__":
    import sys
    input_file = sys.argv[1] if len(sys.argv) > 1 else "output/vietnam_leads.json"
    process_leads(input_file)
