import asyncio
from playwright.async_api import async_playwright

async def debug_google_maps():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = await browser.new_context(
            viewport={'width': 1366, 'height': 900},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
        )
        
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        
        page = await context.new_page()
        
        print("1. Navigating to Google Maps...")
        await page.goto("https://www.google.com/maps", wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)
        
        print("2. Taking screenshot...")
        await page.screenshot(path="output/debug_1_initial.png")
        
        print("3. Looking for search box...")
        search_box = await page.wait_for_selector('#searchboxinput', timeout=10000)
        print("   Found search box!")
        
        print("4. Typing search query...")
        await search_box.click()
        await asyncio.sleep(0.5)
        await search_box.fill("Computer store Ho Chi Minh City")
        await asyncio.sleep(1)
        
        print("5. Taking screenshot before search...")
        await page.screenshot(path="output/debug_2_before_search.png")
        
        print("6. Pressing Enter...")
        await page.keyboard.press('Enter')
        await asyncio.sleep(5)
        
        print("7. Taking screenshot after search...")
        await page.screenshot(path="output/debug_3_after_search.png")
        
        print("8. Getting page content...")
        html = await page.content()
        with open("output/debug_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        
        print("9. Looking for results...")
        places = await page.evaluate("""
            () => {
                const results = [];
                
                const links = document.querySelectorAll('a[href*="/maps/place/"]');
                console.log('Found links:', links.length);
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href) {
                        results.push({
                            href: href,
                            text: link.textContent.substring(0, 100)
                        });
                    }
                });
                
                const feedItems = document.querySelectorAll('[role="feed"] > div > div > a');
                console.log('Found feed items:', feedItems.length);
                
                return {
                    links: results.slice(0, 10),
                    feedCount: feedItems.length
                };
            }
        """)
        
        print(f"\nResults found:")
        print(f"  Links: {len(places.get('links', []))}")
        print(f"  Feed items: {places.get('feedCount', 0)}")
        
        if places.get('links'):
            print("\nFirst few links:")
            for link in places['links'][:5]:
                print(f"  - {link['text'][:50]}...")
        
        print("\n10. Waiting for you to see the browser...")
        await asyncio.sleep(10)
        
        await browser.close()
        print("\nDone! Check output/debug_*.png for screenshots")

if __name__ == "__main__":
    asyncio.run(debug_google_maps())
