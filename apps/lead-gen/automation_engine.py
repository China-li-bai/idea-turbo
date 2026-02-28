import json
import yaml
import time
import random
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class LeadStatus(Enum):
    NEW = "new"
    CONTACTED = "contacted"
    FOLLOW_UP_1 = "follow_up_1"
    FOLLOW_UP_2 = "follow_up_2"
    FOLLOW_UP_3 = "follow_up_3"
    RESPONDED = "responded"
    INTERESTED = "interested"
    SAMPLE_REQUESTED = "sample_requested"
    CONVERTED = "converted"
    REJECTED = "rejected"
    DO_NOT_CONTACT = "do_not_contact"

class Channel(Enum):
    ZALO = "zalo"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    LINE = "line"
    EMAIL = "email"

@dataclass
class Lead:
    id: str
    name: str
    phone: str
    company: str
    country: str
    channel: Channel
    status: LeadStatus
    website: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = None
    category: Optional[str] = None
    last_contact: Optional[datetime] = None
    next_contact: Optional[datetime] = None
    contact_count: int = 0
    notes: List[str] = None
    review_count: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    emails: Optional[str] = None
    open_hours: Optional[str] = None
    timezone: Optional[str] = None
    
    def __post_init__(self):
        if self.notes is None:
            self.notes = []

@dataclass
class Message:
    lead_id: str
    channel: Channel
    template_name: str
    content: str
    sent_at: datetime
    status: str

class AntiBanManager:
    def __init__(self, config: Dict):
        self.config = config
        self.daily_sent = {}
        self.last_message_time = {}
        
    def can_send(self, account_id: str) -> bool:
        today = datetime.now().strftime("%Y-%m-%d")
        key = f"{account_id}_{today}"
        
        if key not in self.daily_sent:
            self.daily_sent[key] = 0
        
        if self.daily_sent[key] >= self.config.get('daily_message_limit_per_account', 50):
            return False
        
        if account_id in self.last_message_time:
            elapsed = (datetime.now() - self.last_message_time[account_id]).total_seconds()
            min_interval = self.config.get('min_interval_seconds', 30)
            max_interval = self.config.get('max_interval_seconds', 120)
            
            if elapsed < min_interval:
                return False
        
        return True
    
    def record_send(self, account_id: str):
        today = datetime.now().strftime("%Y-%m-%d")
        key = f"{account_id}_{today}"
        
        self.daily_sent[key] = self.daily_sent.get(key, 0) + 1
        self.last_message_time[account_id] = datetime.now()
    
    def get_wait_time(self, account_id: str) -> int:
        if account_id not in self.last_message_time:
            return 0
        
        elapsed = (datetime.now() - self.last_message_time[account_id]).total_seconds()
        min_interval = self.config.get('min_interval_seconds', 30)
        max_interval = self.config.get('max_interval_seconds', 120)
        
        if elapsed < min_interval:
            return int(min_interval - elapsed)
        
        return random.randint(0, max_interval - min_interval)

class TemplateManager:
    def __init__(self, templates_path: str):
        with open(templates_path, 'r', encoding='utf-8') as f:
            self.templates = yaml.safe_load(f)
    
    def get_template(self, country: str, template_name: str, use_english: bool = False) -> str:
        country_templates = self.templates.get('templates', {}).get(country, {})
        template = country_templates.get(template_name, {})
        
        if use_english and 'template_en' in template:
            return template['template_en']
        
        return template.get('template', '')
    
    def render(self, template: str, variables: Dict) -> str:
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

class LeadManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                name TEXT,
                phone TEXT,
                company TEXT,
                country TEXT,
                channel TEXT,
                status TEXT,
                website TEXT,
                email TEXT,
                address TEXT,
                rating REAL,
                category TEXT,
                last_contact TEXT,
                next_contact TEXT,
                contact_count INTEGER DEFAULT 0,
                notes TEXT,
                created_at TEXT,
                updated_at TEXT,
                review_count INTEGER DEFAULT 0,
                latitude REAL,
                longitude REAL,
                emails TEXT,
                open_hours TEXT,
                timezone TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id TEXT,
                channel TEXT,
                template_name TEXT,
                content TEXT,
                sent_at TEXT,
                status TEXT,
                FOREIGN KEY (lead_id) REFERENCES leads(id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_lead(self, lead: Lead):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO leads 
            (id, name, phone, company, country, channel, status, website, email, 
             address, rating, category, last_contact, next_contact, contact_count, 
             notes, created_at, updated_at, review_count, latitude, longitude, 
             emails, open_hours, timezone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            lead.id, lead.name, lead.phone, lead.company, lead.country, 
            lead.channel.value, lead.status.value, lead.website, lead.email,
            lead.address, lead.rating, lead.category,
            lead.last_contact.isoformat() if lead.last_contact else None,
            lead.next_contact.isoformat() if lead.next_contact else None,
            lead.contact_count,
            json.dumps(lead.notes),
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            lead.review_count,
            lead.latitude,
            lead.longitude,
            lead.emails,
            lead.open_hours,
            lead.timezone
        ))
        
        conn.commit()
        conn.close()
    
    def get_lead(self, lead_id: str) -> Optional[Lead]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM leads WHERE id = ?', (lead_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_lead(row)
        return None
    
    def get_leads_for_contact(self, country: str = None) -> List[Lead]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT * FROM leads 
            WHERE status IN ('new', 'contacted', 'follow_up_1', 'follow_up_2')
            AND (next_contact IS NULL OR next_contact <= ?)
        '''
        params = [datetime.now().isoformat()]
        
        if country:
            query += ' AND country = ?'
            params.append(country)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_lead(row) for row in rows]
    
    def update_lead_status(self, lead_id: str, status: LeadStatus, next_contact: datetime = None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE leads 
            SET status = ?, next_contact = ?, updated_at = ?
            WHERE id = ?
        ''', (status.value, next_contact.isoformat() if next_contact else None, 
              datetime.now().isoformat(), lead_id))
        
        conn.commit()
        conn.close()
    
    def record_message(self, message: Message):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO messages (lead_id, channel, template_name, content, sent_at, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (message.lead_id, message.channel.value, message.template_name,
              message.content, message.sent_at.isoformat(), message.status))
        
        conn.commit()
        conn.close()
    
    def _row_to_lead(self, row) -> Lead:
        return Lead(
            id=row[0],
            name=row[1] or '',
            phone=row[2] or '',
            company=row[3] or '',
            country=row[4],
            channel=Channel(row[5]),
            status=LeadStatus(row[6]),
            website=row[7],
            email=row[8],
            address=row[9],
            rating=row[10],
            category=row[11],
            last_contact=datetime.fromisoformat(row[12]) if row[12] else None,
            next_contact=datetime.fromisoformat(row[13]) if row[13] else None,
            contact_count=row[14] or 0,
            notes=json.loads(row[15]) if row[15] else [],
            review_count=row[18] or 0,
            latitude=row[19],
            longitude=row[20],
            emails=row[21],
            open_hours=row[22],
            timezone=row[23]
        )

class AutomationEngine:
    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        
        with open(self.config_dir / "countries.yaml", 'r', encoding='utf-8') as f:
            self.countries_config = yaml.safe_load(f)
        
        self.template_manager = TemplateManager(self.config_dir / "templates.yaml")
        self.anti_ban = AntiBanManager(self.countries_config.get('global_settings', {}).get('anti_ban', {}))
        self.lead_manager = LeadManager("data/leads.db")
        
        self.accounts = {}
        self._load_accounts()
    
    def _load_accounts(self):
        accounts_file = self.config_dir / "accounts.yaml"
        if accounts_file.exists():
            with open(accounts_file, 'r', encoding='utf-8') as f:
                self.accounts = yaml.safe_load(f) or {}
    
    def import_leads_from_json(self, json_path: str, country: str):
        with open(json_path, 'r', encoding='utf-8') as f:
            leads_data = [json.loads(line) for line in f if line.strip()]
        
        country_config = self.countries_config['countries'].get(country, {})
        primary_channel = country_config.get('primary_channels', [{}])[0].get('name', 'whatsapp').lower()
        
        for data in leads_data:
            emails_list = data.get('emails', [])
            emails_str = ','.join(emails_list) if emails_list else None
            
            open_hours = data.get('open_hours', {})
            open_hours_str = json.dumps(open_hours) if open_hours else None
            
            lead = Lead(
                id=data.get('place_id', data.get('title', '')),
                name=data.get('title', ''),
                phone=data.get('phone', ''),
                company=data.get('title', ''),
                country=country,
                channel=Channel(primary_channel),
                status=LeadStatus.NEW,
                website=data.get('web_site'),
                address=data.get('address'),
                rating=data.get('review_rating'),
                category=data.get('category'),
                review_count=data.get('review_count', 0),
                latitude=data.get('latitude'),
                longitude=data.get('longtitude'),
                emails=emails_str,
                open_hours=open_hours_str,
                timezone=data.get('timezone')
            )
            self.lead_manager.add_lead(lead)
        
        return len(leads_data)
    
    def get_next_action(self, lead: Lead) -> tuple:
        country_config = self.countries_config['countries'].get(lead.country, {})
        follow_up_config = self.countries_config.get('global_settings', {}).get('follow_up', {})
        
        if lead.status == LeadStatus.NEW:
            return 'first_contact', None
        
        elif lead.status == LeadStatus.CONTACTED:
            days = follow_up_config.get('first_follow_up_days', 3)
            return 'follow_up_1', days
        
        elif lead.status == LeadStatus.FOLLOW_UP_1:
            days = follow_up_config.get('second_follow_up_days', 7)
            return 'follow_up_2', days
        
        elif lead.status == LeadStatus.FOLLOW_UP_2:
            days = follow_up_config.get('third_follow_up_days', 14)
            return 'follow_up_3', days
        
        return None, None
    
    def prepare_message(self, lead: Lead, template_name: str) -> str:
        template = self.template_manager.get_template(lead.country, template_name)
        
        variables = {
            'name': lead.name or lead.company or 'there',
            'sender_name': 'Sales Team',
            'company': lead.company or lead.name,
            'website': 'https://reecho-ssd.com',
            'phone': lead.phone
        }
        
        return self.template_manager.render(template, variables)
    
    def get_leads_for_today(self, country: str = None) -> List[Dict]:
        leads = self.lead_manager.get_leads_for_contact(country)
        
        results = []
        for lead in leads:
            action, _ = self.get_next_action(lead)
            if action:
                message = self.prepare_message(lead, action)
                results.append({
                    'lead': asdict(lead),
                    'action': action,
                    'message': message,
                    'channel': lead.channel.value
                })
        
        return results
    
    def mark_as_sent(self, lead_id: str, status: str = 'sent'):
        lead = self.lead_manager.get_lead(lead_id)
        if not lead:
            return
        
        action, days = self.get_next_action(lead)
        
        new_status_map = {
            'first_contact': LeadStatus.CONTACTED,
            'follow_up_1': LeadStatus.FOLLOW_UP_1,
            'follow_up_2': LeadStatus.FOLLOW_UP_2,
            'follow_up_3': LeadStatus.FOLLOW_UP_3
        }
        
        new_status = new_status_map.get(action, lead.status)
        next_contact = datetime.now() + timedelta(days=days) if days else None
        
        self.lead_manager.update_lead_status(lead_id, new_status, next_contact)
    
    def get_stats(self) -> Dict:
        conn = sqlite3.connect("data/leads.db")
        cursor = conn.cursor()
        
        cursor.execute('SELECT status, COUNT(*) FROM leads GROUP BY status')
        status_counts = dict(cursor.fetchall())
        
        cursor.execute('SELECT country, COUNT(*) FROM leads GROUP BY country')
        country_counts = dict(cursor.fetchall())
        
        cursor.execute('SELECT COUNT(*) FROM messages WHERE date(sent_at) = date("now")')
        today_sent = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_leads': sum(status_counts.values()),
            'by_status': status_counts,
            'by_country': country_counts,
            'sent_today': today_sent
        }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='B2B Lead Generation Automation Engine')
    parser.add_argument('--import', dest='import_file', help='Import leads from JSON file')
    parser.add_argument('--country', help='Country code for import')
    parser.add_argument('--stats', action='store_true', help='Show statistics')
    parser.add_argument('--list', action='store_true', help='List leads for today')
    
    args = parser.parse_args()
    
    Path("data").mkdir(exist_ok=True)
    engine = AutomationEngine()
    
    if args.import_file and args.country:
        count = engine.import_leads_from_json(args.import_file, args.country)
        print(f"Imported {count} leads from {args.country}")
    
    elif args.stats:
        stats = engine.get_stats()
        print("\n📊 Lead Generation Statistics")
        print("=" * 40)
        print(f"Total Leads: {stats['total_leads']}")
        print(f"Messages Sent Today: {stats['sent_today']}")
        print("\nBy Status:")
        for status, count in stats['by_status'].items():
            print(f"  {status}: {count}")
        print("\nBy Country:")
        for country, count in stats['by_country'].items():
            print(f"  {country}: {count}")
    
    elif args.list:
        leads = engine.get_leads_for_today()
        print(f"\n📋 {len(leads)} leads ready for contact today\n")
        for item in leads[:10]:
            lead = item['lead']
            print(f"• {lead['name']} ({lead['country']})")
            print(f"  Channel: {item['channel']}")
            print(f"  Action: {item['action']}")
            print(f"  Phone: {lead['phone']}")
            print()
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
