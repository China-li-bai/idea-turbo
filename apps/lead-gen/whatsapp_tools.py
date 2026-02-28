import sqlite3
import csv
import re
from pathlib import Path

DB_PATH = "data/leads.db"

def normalize_phone(phone, country_code="+84"):
    if not phone:
        return None
    
    phone = re.sub(r'[^\d+]', '', phone)
    
    if phone.startswith('+'):
        return phone
    
    if phone.startswith('0'):
        return country_code + phone[1:]
    
    if len(phone) >= 9:
        return country_code + phone
    
    return None

def export_for_whatsapp(output_dir="output"):
    Path(output_dir).mkdir(exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, phone, country, rating, company, address
        FROM leads 
        WHERE phone IS NOT NULL AND phone != ''
        ORDER BY rating DESC
    """)
    
    leads = cursor.fetchall()
    conn.close()
    
    vcf_content = []
    csv_rows = []
    
    for lead in leads:
        lead_id, name, phone, country, rating, company, address = lead
        
        normalized = normalize_phone(phone)
        if not normalized:
            continue
        
        vcf_content.append(f"""BEGIN:VCARD
VERSION:3.0
FN:{name}
TEL;TYPE=CELL:{normalized}
NOTE:Rating: {rating} | Country: {country} | Source: B2B Lead Gen
END:VCARD""")
        
        csv_rows.append({
            'id': lead_id,
            'name': name,
            'phone_original': phone,
            'phone_normalized': normalized,
            'country': country,
            'rating': rating,
            'company': company or name,
            'address': address or ''
        })
    
    vcf_path = f"{output_dir}/contacts.vcf"
    with open(vcf_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(vcf_content))
    
    csv_path = f"{output_dir}/contacts.csv"
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'name', 'phone_original', 'phone_normalized', 'country', 'rating', 'company', 'address'])
        writer.writeheader()
        writer.writerows(csv_rows)
    
    return len(csv_rows), vcf_path, csv_path

def update_whatsapp_status(phone, status):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    normalized = normalize_phone(phone)
    if normalized:
        cursor.execute("""
            UPDATE leads 
            SET whatsapp_status = ?, updated_at = datetime('now')
            WHERE phone LIKE ? OR phone LIKE ?
        """, (status, f'%{phone}%', f'%{normalized}%'))
    
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected

def get_stats():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) as with_phone,
            SUM(CASE WHEN whatsapp_status = 'registered' THEN 1 ELSE 0 END) as whatsapp_registered,
            SUM(CASE WHEN whatsapp_status = 'not_registered' THEN 1 ELSE 0 END) as whatsapp_not_registered,
            SUM(CASE WHEN whatsapp_status = 'unknown' OR whatsapp_status IS NULL THEN 1 ELSE 0 END) as whatsapp_unknown
        FROM leads
    """)
    
    stats = cursor.fetchone()
    conn.close()
    
    return {
        'total': stats[0],
        'with_phone': stats[1],
        'whatsapp_registered': stats[2] or 0,
        'whatsapp_not_registered': stats[3] or 0,
        'whatsapp_unknown': stats[4] or 0
    }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='WhatsApp Contact Tools')
    parser.add_argument('command', choices=['export', 'update', 'stats'])
    parser.add_argument('--phone', help='Phone number to update')
    parser.add_argument('--status', choices=['registered', 'not_registered', 'unknown'], help='WhatsApp status')
    
    args = parser.parse_args()
    
    if args.command == 'export':
        count, vcf, csv = export_for_whatsapp()
        print(f"\n✅ Exported {count} contacts")
        print(f"   VCF file: {vcf}")
        print(f"   CSV file: {csv}")
        print("\n📱 Next steps:")
        print("   1. Transfer contacts.vcf to your phone")
        print("   2. Import to your contacts app")
        print("   3. Open WhatsApp → New Chat → Check which numbers have WhatsApp")
        print("   4. Use 'update' command to mark registered numbers")
    
    elif args.command == 'update':
        if not args.phone or not args.status:
            print("❌ --phone and --status required")
            exit(1)
        affected = update_whatsapp_status(args.phone, args.status)
        print(f"✅ Updated {affected} leads")
    
    elif args.command == 'stats':
        stats = get_stats()
        print("\n📊 WhatsApp Detection Statistics")
        print("=" * 40)
        print(f"Total leads:        {stats['total']}")
        print(f"With phone:         {stats['with_phone']}")
        print(f"WhatsApp registered: {stats['whatsapp_registered']}")
        print(f"Not registered:     {stats['whatsapp_not_registered']}")
        print(f"Unknown:            {stats['whatsapp_unknown']}")
