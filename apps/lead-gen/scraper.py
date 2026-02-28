import asyncio
import csv
import json
import os
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import yaml
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from tqdm import tqdm


class GoogleMapsScraper:
    def __init__(self, config_path: str = "config/keywords.yaml", headless: bool = False):
        self.config = self._load_config(config_path)
        self.headless = headless
        self.results = []
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)

    def _load_config(self, config_path: str) -> dict:
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        return random.uniform(min_sec, max_sec)

    async def _create_stealth_context(self, browser: Browser) -> BrowserContext:
        context = await browser.new_context(
            viewport={'width': 1366, 'height': 768},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='Asia/Singapore',
            geolocation={'latitude': 1.3521, 'longitude': 103.8198},
            permissions=['geolocation'],
        )
        
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'zh-CN']
            });
            
            window.chrome = {
                runtime: {}
            };
            
            Object.defineProperty(navigator, 'permissions', {
                get: () => ({
                    query: () => Promise.resolve({ state: 'granted' })
                })
            });
        """)
        
        return context

    async def _scroll_results(self, page: Page, max_scrolls: int = 10):
        for _ in range(max_scrolls):
            await page.evaluate("""
                const sidebar = document.querySelector('[role="feed"]');
                if (sidebar) {
                    sidebar.scrollTop = sidebar.scrollHeight;
                }
            """)
            await asyncio.sleep(self._random_delay(0.5, 1.5))

    async def _extract_place_data(self, page: Page) -> dict:
        try:
            data = await page.evaluate("""
                () => {
                    const getName = () => {
                        const el = document.querySelector('h1[class*="fontHeadline"]');
                        return el ? el.textContent.trim() : null;
                    };
                    
                    const getRating = () => {
                        const el = document.querySelector('[role="img"][aria-label*="stars"]');
                        if (el) {
                            const match = el.getAttribute('aria-label').match(/[\\d.]+/);
                            return match ? parseFloat(match[0]) : null;
                        }
                        return null;
                    };
                    
                    const getReviews = () => {
                        const el = document.querySelector('[aria-label*="review"]');
                        if (el) {
                            const match = el.getAttribute('aria-label').match(/[\\d,]+/);
                            return match ? parseInt(match[0].replace(',', '')) : 0;
                        }
                        return 0;
                    };
                    
                    const getCategory = () => {
                        const buttons = document.querySelectorAll('button[jsaction*="category"]');
                        for (const btn of buttons) {
                            const text = btn.textContent.trim();
                            if (text && text.length > 0 && !text.includes('·')) {
                                return text;
                            }
                        }
                        return null;
                    };
                    
                    const getAddress = () => {
                        const buttons = document.querySelectorAll('button[data-item-id*="address"]');
                        for (const btn of buttons) {
                            const ariaLabel = btn.getAttribute('aria-label');
                            if (ariaLabel) {
                                return ariaLabel.replace('Address: ', '').trim();
                            }
                        }
                        return null;
                    };
                    
                    const getPhone = () => {
                        const buttons = document.querySelectorAll('button[data-item-id*="phone:tel"]');
                        for (const btn of buttons) {
                            const ariaLabel = btn.getAttribute('aria-label');
                            if (ariaLabel) {
                                return ariaLabel.replace('Phone: ', '').trim();
                            }
                        }
                        return null;
                    };
                    
                    const getWebsite = () => {
                        const links = document.querySelectorAll('a[data-item-id*="authority"]');
                        for (const link of links) {
                            const href = link.getAttribute('href');
                            if (href && !href.includes('google.com')) {
                                return href;
                            }
                        }
                        return null;
                    };
                    
                    const getPlusCode = () => {
                        const buttons = document.querySelectorAll('button[data-item-id*="plus_code"]');
                        for (const btn of buttons) {
                            const ariaLabel = btn.getAttribute('aria-label');
                            if (ariaLabel) {
                                return ariaLabel.replace('Plus code: ', '').trim();
                            }
                        }
                        return null;
                    };

                    return {
                        name: getName(),
                        rating: getRating(),
                        reviews: getReviews(),
                        category: getCategory(),
                        address: getAddress(),
                        phone: getPhone(),
                        website: getWebsite(),
                        plus_code: getPlusCode()
                    };
                }
            """)
            return data
        except Exception as e:
            print(f"Error extracting data: {e}")
            return {}

    async def _search_places(self, page: Page, keyword: str, location: str) -> list:
        search_query = f"{keyword} near {location}"
        print(f"  Searching: {search_query}")
        
        try:
            await page.goto("https://www.google.com/maps", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(self._random_delay(2, 4))
            
            try:
                consent_btn = await page.wait_for_selector('button[aria-label*="Accept"]', timeout=5000)
                if consent_btn:
                    await consent_btn.click()
                    await asyncio.sleep(1)
            except:
                pass
            
            search_selectors = ['#searchboxinput', 'input[name="q"]', 'input[placeholder*="search"]', '#searchboxinput']
            search_box = None
            
            for selector in search_selectors:
                try:
                    search_box = await page.wait_for_selector(selector, timeout=5000)
                    if search_box:
                        break
                except:
                    continue
            
            if not search_box:
                print("    Could not find search box")
                return []
            
            await search_box.click()
            await asyncio.sleep(0.5)
            await search_box.fill(search_query)
            await asyncio.sleep(0.5)
            
            await page.keyboard.press('Enter')
            await asyncio.sleep(self._random_delay(3, 5))
            
            await self._scroll_results(page, max_scrolls=5)
            
            places = await page.evaluate("""
                () => {
                    const results = [];
                    const links = document.querySelectorAll('a[href*="/maps/place/"]');
                    const seen = new Set();
                    
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && !seen.has(href)) {
                            seen.add(href);
                            const nameEl = link.querySelector('[class*="fontHeadline"]');
                            if (nameEl) {
                                results.push({
                                    name: nameEl.textContent.trim(),
                                    url: href
                                });
                            }
                        }
                    });
                    
                    return results;
                }
            """)
            
            return places[:self.config['settings']['max_results_per_search']]
            
        except Exception as e:
            print(f"    Error in search: {e}")
            return []

    async def _scrape_place(self, page: Page, place_url: str) -> Optional[dict]:
        try:
            await page.goto(place_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(self._random_delay(1, 2))
            
            data = await self._extract_place_data(page)
            
            if not data.get('name'):
                return None
            
            data['url'] = place_url
            data['scraped_at'] = datetime.now().isoformat()
            
            return data
        except Exception as e:
            print(f"    Error scraping place: {e}")
            return None

    async def scrape_target(self, browser: Browser, country: str, city: dict, keyword: str):
        context = await self._create_stealth_context(browser)
        page = await context.new_page()
        
        try:
            places = await self._search_places(page, keyword, city['name'])
            print(f"    Found {len(places)} places")
            
            for place in tqdm(places, desc=f"    Scraping", leave=False):
                data = await self._scrape_place(page, place['url'])
                
                if data:
                    data['country'] = country
                    data['city'] = city['name']
                    data['search_keyword'] = keyword
                    
                    min_reviews = self.config['settings'].get('min_reviews', 0)
                    if data.get('reviews', 0) >= min_reviews:
                        self.results.append(data)
                
                delay = self.config['settings'].get('delay_between_requests', 2)
                await asyncio.sleep(self._random_delay(delay, delay + 1))
                
        except Exception as e:
            print(f"  Error in scrape_target: {e}")
        finally:
            await context.close()

    async def run(self, countries: list = None):
        print("\n" + "="*60)
        print("Google Maps Scraper - B2B Lead Generation")
        print("="*60 + "\n")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.headless,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            )
            
            targets = self.config['targets']
            if countries:
                targets = {k: v for k, v in targets.items() if k in countries}
            
            for country, config in targets.items():
                print(f"\n📍 Country: {country.upper()}")
                
                for city in config['cities']:
                    print(f"\n  🏙️  City: {city['name']}")
                    
                    for keyword in config['keywords']:
                        await self.scrape_target(browser, country, city, keyword)
                        
                        delay = self.config['settings'].get('delay_between_requests', 2)
                        await asyncio.sleep(delay * 2)
            
            await browser.close()
        
        self._save_results()
        print(f"\n✅ Done! Total leads: {len(self.results)}")

    def _save_results(self):
        if not self.results:
            print("No results to save.")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        csv_path = self.output_dir / f"leads_{timestamp}.csv"
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['name', 'category', 'rating', 'reviews', 'phone', 'website', 
                         'address', 'plus_code', 'country', 'city', 'search_keyword', 
                         'url', 'scraped_at']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.results)
        print(f"📄 Saved CSV: {csv_path}")
        
        json_path = self.output_dir / f"leads_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        print(f"📄 Saved JSON: {json_path}")
        
        phones = [r for r in self.results if r.get('phone')]
        if phones:
            phones_path = self.output_dir / f"phones_{timestamp}.txt"
            with open(phones_path, 'w', encoding='utf-8') as f:
                for r in phones:
                    f.write(f"{r['phone']}\t{r['name']}\t{r['city']}\n")
            print(f"📱 Saved phones: {phones_path} ({len(phones)} entries)")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Google Maps Scraper for B2B Lead Generation')
    parser.add_argument('--countries', nargs='+', help='Countries to scrape (e.g., vietnam russia)')
    parser.add_argument('--config', default='config/keywords.yaml', help='Path to config file')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    args = parser.parse_args()
    
    scraper = GoogleMapsScraper(args.config, headless=args.headless)
    asyncio.run(scraper.run(args.countries))


if __name__ == "__main__":
    main()
