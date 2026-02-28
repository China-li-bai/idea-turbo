import re
from pathlib import Path


class PromptParser:
    def __init__(self, prompts_file="all_prompts.md"):
        self.prompts_file = prompts_file
        self.sections = {}

    def parse_prompts_from_file(self):
        with open(self.prompts_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return self.parse_prompts(content)

    def parse_prompts(self, content):
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
        
        self.sections = sections
        return sections

    def get_all_prompts(self):
        prompts_dict = {}
        
        for level, subsections in self.sections.items():
            for subsection, prompts in subsections.items():
                category_name = f"{level}-{subsection}"
                parsed_prompts = []
                
                for prompt in prompts:
                    match = re.match(r'^(\w+):\s*(.+)$', prompt)
                    if match:
                        word = match.group(1)
                        description = match.group(2)
                        parsed_prompts.append((word, description))
                
                prompts_dict[category_name] = parsed_prompts
        
        return prompts_dict

    def get_prompts_by_level(self, level_name):
        if level_name not in self.sections:
            return {}
        
        prompts_dict = {}
        subsections = self.sections[level_name]
        
        for subsection, prompts in subsections.items():
            category_name = f"{level_name}-{subsection}"
            parsed_prompts = []
            
            for prompt in prompts:
                match = re.match(r'^(\w+):\s*(.+)$', prompt)
                if match:
                    word = match.group(1)
                    description = match.group(2)
                    parsed_prompts.append((word, description))
            
            prompts_dict[category_name] = parsed_prompts
        
        return prompts_dict

    def print_summary(self):
        print("\n" + "="*80)
        print("提示词解析摘要")
        print("="*80)
        
        total_prompts = 0
        for level, subsections in self.sections.items():
            level_count = 0
            print(f"\n{level}:")
            for subsection, prompts in subsections.items():
                print(f"  - {subsection}: {len(prompts)} 个提示词")
                level_count += len(prompts)
            total_prompts += level_count
        
        print(f"\n总计: {total_prompts} 个提示词")
        print("="*80)


def parse_prompts_from_file(prompts_file="all_prompts.md"):
    parser = PromptParser(prompts_file)
    parser.parse_prompts_from_file()
    return parser


if __name__ == "__main__":
    parser = parse_prompts_from_file()
    parser.print_summary()
    
    prompts_dict = parser.get_all_prompts()
    print(f"\n解析出的类别数量: {len(prompts_dict)}")
