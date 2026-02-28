import asyncio
import os
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright
import aiohttp
import hashlib

OUTPUT_DIR = "/Users/mac/project/idea-turbo/python/imgs"
PROGRESS_FILE = "/Users/mac/project/idea-turbo/python/progress.json"
COOKIE_FILE = "/Users/mac/project/idea-turbo/python/cookies.json"
BASE_URL = "https://www.doubao.com/chat/create-image"


class DoubaoImageGenerator:
    def __init__(self, output_dir=OUTPUT_DIR, progress_file=PROGRESS_FILE):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.progress_file = progress_file
        self.cookie_file = COOKIE_FILE
        self.browser = None
        self.page = None
        self.session = None
        self.context = None

    async def load_progress(self):
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    async def save_progress(self, progress):
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)

    async def save_cookies(self):
        cookies = await self.context.cookies()
        with open(self.cookie_file, 'w', encoding='utf-8') as f:
            json.dump(cookies, f, ensure_ascii=False, indent=2)
        print(f"Cookie已保存到 {self.cookie_file}")

    async def load_cookies(self):
        if os.path.exists(self.cookie_file):
            with open(self.cookie_file, 'r', encoding='utf-8') as f:
                cookies = json.load(f)
            await self.context.add_cookies(cookies)
            print(f"已从 {self.cookie_file} 加载Cookie")
            return True
        return False

    async def init_browser(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        self.page = await self.context.new_page()
        self.session = aiohttp.ClientSession()

    async def close_browser(self):
        if self.session:
            await self.session.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def navigate_to_page(self):
        try:
            await self.page.goto(BASE_URL, wait_until='domcontentloaded', timeout=120000)
            await asyncio.sleep(3)
        except Exception as e:
            print(f"页面导航失败: {e}")
            print("尝试重新加载页面...")
            await asyncio.sleep(2)
            await self.page.goto(BASE_URL, wait_until='domcontentloaded', timeout=120000)
            await asyncio.sleep(3)

    async def wait_for_login(self):
        print("\n请在浏览器中登录豆包账号...")
        print("登录完成后，按回车键继续...")
        input()
        await asyncio.sleep(2)

    async def enter_prompt(self, prompt_text):
        try:
            input_selector = 'textarea[placeholder*="描述你想要生成的画面"]'
            await self.page.wait_for_selector(input_selector, timeout=10000)
            await self.page.fill(input_selector, prompt_text)
            await asyncio.sleep(1)
            return True
        except Exception as e:
            print(f"输入提示词失败: {e}")
            return False

    async def click_send_button(self):
        try:
            send_button = self.page.locator('button:has-text("发送")').first
            await send_button.click()
            print("已点击发送按钮，等待图片生成...")
            return True
        except Exception as e:
            print(f"点击发送按钮失败: {e}")
            return False

    async def wait_for_image_generation(self, timeout=120):
        print(f"等待图片生成（最多{timeout}秒）...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                await asyncio.sleep(3)
                
                image_count = await self.get_generated_image_count()
                if image_count > 0:
                    print(f"检测到 {image_count} 张图片已生成")
                    await asyncio.sleep(2)
                    return True
                    
            except Exception as e:
                print(f"检查图片生成状态时出错: {e}")
                
        print("图片生成超时")
        return False

    async def get_generated_image_count(self):
        try:
            result = await self.page.evaluate("""
                () => {
                    const allImages = Array.from(document.querySelectorAll('img'));
                    const generatedImages = allImages.filter(img => {
                        const src = img.src || '';
                        return src.includes('rc_gen_image') || 
                               src.includes('byteimg.com') ||
                               src.includes('imagex');
                    });
                    return generatedImages.length;
                }
            """)
            return result
        except Exception as e:
            print(f"获取图片数量失败: {e}")
            return 0

    async def get_image_urls(self):
        try:
            urls = await self.page.evaluate("""
                () => {
                    const allImages = Array.from(document.querySelectorAll('img'));
                    const generatedImages = allImages.filter(img => {
                        const src = img.src || '';
                        return src.includes('rc_gen_image') || 
                               src.includes('byteimg.com') ||
                               src.includes('imagex');
                    });
                    return generatedImages.map(img => img.src);
                }
            """)
            print(f"获取到 {len(urls)} 个图片URL")
            return urls
        except Exception as e:
            print(f"获取图片URL失败: {e}")
            return []

    async def download_image(self, url, filepath):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': BASE_URL
            }
            
            async with self.session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 200:
                    content = await response.read()
                    filepath.parent.mkdir(parents=True, exist_ok=True)
                    with open(filepath, 'wb') as f:
                        f.write(content)
                    return True, filepath.stat().st_size
                else:
                    print(f"下载失败: HTTP {response.status}")
                    return False, 0
        except Exception as e:
            print(f"下载图片失败 {url}: {e}")
            return False, 0

    async def generate_and_download_images(self, category_name, prompts):
        print(f"\n{'='*80}")
        print(f"开始处理类别: {category_name}")
        print(f"提示词数量: {len(prompts)}")
        print(f"{'='*80}\n")

        progress = await self.load_progress()
        
        if category_name in progress and progress[category_name].get('completed'):
            print(f"类别 {category_name} 已完成，跳过")
            return True

        await self.navigate_to_page()

        prompt_text = '\n'.join([f"- {word}: {desc}" for word, desc in prompts])
        
        if not await self.enter_prompt(prompt_text):
            print("输入提示词失败")
            return False

        if not await self.click_send_button():
            print("点击发送按钮失败")
            return False

        if not await self.wait_for_image_generation():
            print("图片生成失败或超时")
            return False

        image_urls = await self.get_image_urls()
        
        if len(image_urls) == 0:
            print("未能获取到图片URL")
            return False

        if len(image_urls) != len(prompts):
            print(f"警告: 图片数量({len(image_urls)})与提示词数量({len(prompts)})不匹配")
            response = input("是否继续下载? (y/n): ").strip().lower()
            if response != 'y':
                return False

        category_dir = self.output_dir / category_name
        category_dir.mkdir(parents=True, exist_ok=True)

        success_count = 0
        failed_count = 0
        
        for i, ((word, desc), url) in enumerate(zip(prompts, image_urls)):
            filename = f"{word}.png"
            filepath = category_dir / filename
            
            if filepath.exists():
                print(f"文件已存在，跳过: {filename}")
                success_count += 1
                continue
            
            print(f"下载 {i+1}/{len(prompts)}: {filename}")
            success, size = await self.download_image(url, filepath)
            
            if success and size > 0:
                print(f"  ✓ 下载成功 ({size} bytes)")
                success_count += 1
            else:
                print(f"  ✗ 下载失败")
                failed_count += 1
            
            await asyncio.sleep(0.5)

        print(f"\n下载完成: {success_count} 成功, {failed_count} 失败")

        progress[category_name] = {
            'completed': True,
            'total': len(prompts),
            'success': success_count,
            'failed': failed_count,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        await self.save_progress(progress)

        return True

    async def generate_all_images(self, prompts_dict):
        await self.init_browser()
        
        try:
            await self.navigate_to_page()
            
            has_cookies = await self.load_cookies()
            
            if not has_cookies:
                print("\n未找到Cookie，需要登录...")
                await self.wait_for_login()
                await self.save_cookies()
            else:
                print("\n使用已保存的Cookie，跳过登录步骤")
                await asyncio.sleep(2)
            
            total_categories = len(prompts_dict)
            completed_categories = 0
            
            progress = await self.load_progress()
            completed_categories = sum(1 for cat in progress.values() if cat.get('completed'))
            
            print(f"\n总类别数: {total_categories}")
            print(f"已完成: {completed_categories}")
            print(f"待处理: {total_categories - completed_categories}\n")

            for category_name, prompts in prompts_dict.items():
                try:
                    success = await self.generate_and_download_images(category_name, prompts)
                    if success:
                        completed_categories += 1
                        print(f"\n进度: {completed_categories}/{total_categories}")
                    
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"处理类别 {category_name} 时出错: {e}")
                    continue

            print(f"\n{'='*80}")
            print("所有图片生成完成！")
            print(f"{'='*80}")

        finally:
            await self.close_browser()


async def main():
    from all_prompts_parser import parse_prompts_from_file
    
    parser = parse_prompts_from_file("all_prompts.md")
    prompts_dict = parser.get_all_prompts()
    
    generator = DoubaoImageGenerator()
    await generator.generate_all_images(prompts_dict)


if __name__ == "__main__":
    asyncio.run(main())
