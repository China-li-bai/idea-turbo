import asyncio
import re
import os
from pathlib import Path
import subprocess
import json


class DoubaoImageGenerator:
    def __init__(self, prompts_file="all_prompts.md", output_dir="imgs"):
        self.prompts_file = prompts_file
        self.output_dir = output_dir
        self.base_url = "https://www.doubao.com/chat/create-image"
        self.output_path = Path(output_dir)
        self.output_path.mkdir(exist_ok=True)
        self.session_file = "generation_session.json"

    def parse_prompts(self):
        with open(self.prompts_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        sections = {}
        current_level = None
        current_subsection = None
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('## '):
                current_level = line[3:].strip()
                sections[current_level] = {}
            elif line.startswith('### '):
                current_subsection = line[4:].strip()
                if current_level:
                    sections[current_level][current_subsection] = []
            elif line.startswith('- ') and current_subsection:
                prompt_text = line[2:].strip()
                sections[current_level][current_subsection].append(prompt_text)
        
        return sections

    def extract_word_and_tag(self, prompt):
        match = re.match(r'^(\w+):\s*(.+)$', prompt)
        if match:
            word = match.group(1).lower()
            description = match.group(2).lower()
            
            tag = 'noun'
            
            action_words = ['jump', 'run', 'walk', 'sit', 'stand', 'sleep', 'eat', 'drink', 
                          'move', 'touch', 'hold', 'push', 'pull', 'kick', 'hit', 'throw', 
                          'catch', 'climb', 'crawl', 'fly', 'swim', 'dance', 'sing', 'speak']
            if any(action in description for action in action_words):
                tag = 'verb'
            
            color_words = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 
                          'purple', 'pink', 'brown', 'gray', 'grey', 'gold', 'silver']
            if any(color in description for color in color_words):
                tag = 'adj'
            
            shape_words = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart']
            if any(shape in description for shape in shape_words):
                tag = 'noun'
            
            position_words = ['above', 'below', 'left', 'right', 'front', 'back', 'top', 'bottom']
            if any(pos in description for pos in position_words):
                tag = 'adj'
            
            number_words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 
                          'nine', 'ten', 'many', 'few', 'single', 'multiple']
            if any(num in description for num in number_words):
                tag = 'num'
            
            return word, tag
        return None, None

    def download_image(self, url, filename, subdirectory=None):
        if subdirectory:
            filepath = self.output_path / subdirectory / filename
            filepath.parent.mkdir(parents=True, exist_ok=True)
        else:
            filepath = self.output_path / filename
        try:
            result = subprocess.run([
                'curl', '-L', url, '-o', str(filepath)
            ], check=True, capture_output=True, text=True)
            if filepath.exists() and filepath.stat().st_size > 0:
                return True, f"✓ 下载成功: {filename}"
            else:
                return False, f"✗ 文件为空或下载失败: {filename}"
        except subprocess.CalledProcessError as e:
            return False, f"✗ 下载失败: {filename} - {e.stderr}"

    def save_session(self, session_data):
        with open(self.session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

    def load_session(self):
        if os.path.exists(self.session_file):
            with open(self.session_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def get_browser_instructions(self, level, subsection, prompts):
        prompt_text = '\n'.join(prompts)
        
        instructions = f"""
{'='*80}
浏览器操作指南
{'='*80}

目标: 生成 {level} - {subsection} 的图片

步骤:
1. 确保浏览器已打开并访问: {self.base_url}
2. 确保已登录豆包账号
3. 在输入框中输入以下提示词（建议使用粘贴方式）:

{prompt_text}

4. 点击发送按钮
5. 等待图片生成（通常需要30-60秒）
6. 生成完成后，在浏览器控制台执行以下JavaScript代码获取图片URL:

```javascript
const allImages = document.querySelectorAll('img');
const generatedImages = Array.from(allImages).filter(img => {
  const src = img.src || '';
  return src.includes('rc_gen_image');
});

console.log('Generated images found:', generatedImages.length);
generatedImages.forEach((img, index) => {
  console.log(`Image ${index + 1}:`, img.src);
});

JSON.stringify({
  count: generatedImages.length,
  urls: generatedImages.map(img => img.src)
});
```

7. 复制控制台输出的JSON数据
8. 返回此脚本并粘贴JSON数据

{'='*80}
"""
        return instructions

    def process_subsection(self, level, subsection, prompts):
        print(f"\n{'='*80}")
        print(f"处理: {level} - {subsection}")
        print(f"提示词数量: {len(prompts)}")
        print(f"{'='*80}\n")
        
        print(self.get_browser_instructions(level, subsection, prompts))
        
        print("\n请按照上述指南在浏览器中操作，然后粘贴控制台输出的JSON数据:")
        print("(输入 'skip' 跳过此子集，输入 'quit' 退出)")
        
        user_input = input().strip()
        
        if user_input.lower() == 'quit':
            return False
        elif user_input.lower() == 'skip':
            print(f"已跳过: {level} - {subsection}")
            return True
        
        try:
            data = json.loads(user_input)
            image_urls = data.get('urls', [])
            
            if len(image_urls) != len(prompts):
                print(f"\n警告: 图片数量({len(image_urls)})与提示词数量({len(prompts)})不匹配")
                response = input("是否继续下载? (y/n): ").strip().lower()
                if response != 'y':
                    return True
            
            print(f"\n开始下载 {len(image_urls)} 张图片...")
            
            subdirectory = f"{level}/{subsection}"
            success_count = 0
            for i, (prompt, url) in enumerate(zip(prompts, image_urls)):
                word, tag = self.extract_word_and_tag(prompt)
                if word and tag:
                    filename = f"{word}_{tag}.png"
                    success, message = self.download_image(url, filename, subdirectory)
                    print(message)
                    if success:
                        success_count += 1
                else:
                    print(f"无法解析提示词: {prompt}")
            
            print(f"\n下载完成: {success_count}/{len(image_urls)} 张图片成功")
            
            session = self.load_session()
            if level not in session:
                session[level] = {}
            session[level][subsection] = {
                'status': 'completed',
                'images_count': len(image_urls),
                'success_count': success_count,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            self.save_session(session)
            
        except json.JSONDecodeError:
            print("错误: 无效的JSON数据")
            return True
        
        return True

    def generate_all_images(self):
        sections = self.parse_prompts()
        
        print("\n" + "="*80)
        print("豆包图片生成器")
        print("="*80)
        
        print("\n解析到的层级和子集:")
        for i, (level, subsections) in enumerate(sections.items(), 1):
            print(f"\n{i}. {level}:")
            for j, subsection in enumerate(subsections.keys(), 1):
                print(f"   {i}.{j} {subsection}")
        
        print("\n" + "="*80)
        print("开始生成图片...")
        print("="*80)
        
        session = self.load_session()
        completed_count = sum(
            1 for level in session.values() 
            for subsection in level.values() 
            if subsection.get('status') == 'completed'
        )
        
        total_subsections = sum(len(subsections) for subsections in sections.values())
        print(f"\n已完成: {completed_count}/{total_subsections} 个子集")
        
        for level, subsections in sections.items():
            for subsection, prompts in subsections.items():
                if level in session and subsection in session[level]:
                    if session[level][subsection].get('status') == 'completed':
                        print(f"\n跳过已完成: {level} - {subsection}")
                        continue
                
                should_continue = self.process_subsection(level, subsection, prompts)
                if not should_continue:
                    print("\n用户中断操作")
                    break
        
        print("\n" + "="*80)
        print("所有图片生成完成！")
        print("="*80)
        
        final_session = self.load_session()
        final_completed = sum(
            1 for level in final_session.values() 
            for subsection in level.values() 
            if subsection.get('status') == 'completed'
        )
        print(f"\n最终完成: {final_completed}/{total_subsections} 个子集")


import time


def main():
    generator = DoubaoImageGenerator()
    generator.generate_all_images()


if __name__ == "__main__":
    main()
