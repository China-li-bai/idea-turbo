import sqlite3
import csv
import sys
from pathlib import Path

DB_PATH = "data/leads.db"

def import_results(csv_path):
    if not Path(csv_path).exists():
        print(f"❌ File not found: {csv_path}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updated = 0
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            phone = row.get('phone', '')
            exists = row.get('exists', 'False') == 'True'
            lead_id = row.get('id', '')
            
            status = 'registered' if exists else 'not_registered'
            
            if lead_id:
                cursor.execute("""
                    UPDATE leads 
                    SET whatsapp_status = ?, updated_at = datetime('now')
                    WHERE id = ?
                """, (status, lead_id))
            elif phone:
                cursor.execute("""
                    UPDATE leads 
                    SET whatsapp_status = ?, updated_at = datetime('now')
                    WHERE phone LIKE ?
                """, (status, f'%{phone}%'))
            
            if cursor.rowcount > 0:
                updated += 1
                print(f"✅ {phone}: {status}")
    
    conn.commit()
    conn.close()
    
    print(f"\n📊 Import complete: {updated} leads updated")

if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "output/whatsapp_results.csv"
    import_results(csv_path)
