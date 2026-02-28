import os
import re
from pathlib import Path

def parse_prompts_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    sections = {}
    current_level = None
    current_subsection = None
    
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        
        if line.startswith('## 第') and '层级' in line:
            current_level = line
            sections[current_level] = {}
        elif line.startswith('### ') and current_level:
            current_subsection = line
            sections[current_level][current_subsection] = []
        elif line.startswith('- ') and current_subsection:
            match = re.match(r'- (.+?): (.+)', line)
            if match:
                word = match.group(1).strip()
                prompt = match.group(2).strip()
                sections[current_level][current_subsection].append({
                    'word': word,
                    'prompt': prompt
                })
    
    return sections

def create_folder_structure(sections, base_path='imgs'):
    base = Path(base_path)
    base.mkdir(exist_ok=True)
    
    for level, subsections in sections.items():
        level_name = level.replace('## ', '').replace('：', '_').replace(' ', '_')
        level_path = base / level_name
        level_path.mkdir(exist_ok=True)
        
        for subsection, prompts in subsections.items():
            sub_name = subsection.replace('### ', '').replace('：', '_').replace(' ', '_')
            sub_path = level_path / sub_name
            sub_path.mkdir(exist_ok=True)
    
    return base

if __name__ == '__main__':
    sections = parse_prompts_file('all_prompts.md')
    base_path = create_folder_structure(sections)
    print(f"Folder structure created at: {base_path}")
    
    for level, subsections in sections.items():
        print(f"\n{level}")
        for subsection, prompts in subsections.items():
            print(f"  {subsection}: {len(prompts)} prompts")
