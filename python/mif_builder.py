import os
import requests
import concurrent.futures
import time
from threading import Lock

# --- 配置区 ---
API_KEY = "54105475-28c649f5a4e59ba46d8925ea9"
SAVE_FOLDER = "MIF_Teaching_Library_1000"
MAX_WORKERS = 5
RATE_LIMIT = 100
RATE_LIMIT_WINDOW = 60

# --- 智能词库分类定义 ---
# 不同的 Key 对应不同的 API 过滤参数和 Query 优化策略
raw_vocab = {
    "action": (  # TPR 动作类：追求动态特征明确，背景极简
        "stand up,sit down,walk,run,jump,hop,dance,crawl,climb,sleep,wake up,stretch,yawn,wave,clap,shrug,nod,shake head,wink,blink,smile,laugh,cry,frown,sneeze,cough,burp,"
        "point to,touch,pick up,put down,throw,catch,push,pull,lift,drop,hold,carry,shake,fold,tear,cut,tie,rub,scrub,wash,wipe,comb,brush,shave,dress,undress,button,zip,"
        "eat,drink,bite,chew,swallow,breathe,smell,taste,listen,watch,look,think,sing,shout,whisper,kiss,hug,kick,punch,hit,fall,dig,climb,swim,dive,float,fly"
    ),
    "food": (    # 食物类：追求实物感、新鲜感
        "apple,banana,orange,strawberry,grape,watermelon,pineapple,lemon,lime,mango,peach,pear,cherry,blueberry,kiwi,papaya,coconut,avocado,plum,apricot,"
        "tomato,potato,onion,garlic,cucumber,corn,broccoli,spinach,lettuce,cabbage,carrot,mushroom,pepper,eggplant,pumpkin,pea,bean,celery,asparagus,radish,"
        "bread,rice,noodle,pasta,egg,meat,chicken,beef,pork,fish,shrimp,crab,ham,bacon,sausage,cheese,butter,yogurt,cream,honey,sugar,salt,pepper,oil,vinegar,flour,"
        "milk,water,juice,tea,coffee,soda,beer,wine,soup,sauce,jam,chocolate,candy,cookie,cake,pie,donut,ice cream,sandwich,hamburger,pizza,taco,hot dog,french fries,popcorn,nut,peanut,walnut"
    ),
    "objects": ( # 实物/器皿类：追求单一视角、无遮挡
        "cup,plate,bowl,fork,spoon,knife,napkin,bottle,glass,mug,jug,pot,pan,kettle,toaster,oven,stove,microwave,fridge,sink,faucet,counter,cupboard,trash can,"
        "table,chair,sofa,bed,pillow,blanket,sheet,lamp,clock,mirror,rug,carpet,curtain,shelf,desk,drawer,cabinet,wardrobe,hanger,ladder,hammer,screwdriver,pliers,saw,drill,nail,screw,"
        "telephone,computer,laptop,mouse,keyboard,screen,printer,camera,television,radio,speaker,remote control,battery,charger,cable,wire,bulb,flashlight,"
        "bag,backpack,suitcase,wallet,purse,key,umbrella,towel,soap,shampoo,toothbrush,toothpaste,comb,brush,razor,scissors,paper,pen,pencil,eraser,ruler,glue,tape,envelope,stamp,coin,bill"
    ),
    "animals": ( # 动物类：追求侧面全身照，特征明显
        "dog,cat,bird,fish,hamster,rabbit,horse,cow,pig,sheep,goat,chicken,duck,goose,turkey,pigeon,owl,eagle,parrot,penguin,swan,"
        "lion,tiger,elephant,giraffe,zebra,monkey,gorilla,bear,panda,kangaroo,koala,hippo,rhino,camel,deer,wolf,fox,squirrel,mouse,rat,bat,"
        "snake,lizard,turtle,frog,crocodile,alligator,shark,dolphin,whale,octopus,crab,shrimp,shell,starfish,jellyfish,"
        "bee,butterfly,ant,spider,mosquito,fly,ladybug,grasshopper,caterpillar,worm,snail,scorpion"
    ),
    "nature": (  # 自然/环境
        "sun,moon,star,sky,cloud,rain,snow,wind,fire,smoke,ice,water,mountain,hill,valley,forest,jungle,desert,beach,island,ocean,sea,river,lake,pond,waterfall,cave,"
        "tree,flower,leaf,grass,bush,root,seed,branch,trunk,stone,rock,sand,mud,earth,ground,rainbow,thunder,lightning,field,garden,path"
    ),
    "human": (   # 人体部位
        "head,eye,nose,mouth,ear,tooth,tongue,neck,shoulder,arm,elbow,wrist,hand,finger,thumb,fingernail,chest,back,waist,hip,leg,knee,ankle,foot,toe,heel,skin,bone,"
        "man,woman,boy,girl,baby,child,father,mother,grandfather,grandmother"
    ),
    "various": ( # 颜色/形状
        "red,blue,yellow,green,orange,purple,pink,brown,black,white,gray,gold,silver,"
        "circle,square,triangle,rectangle,star,heart,diamond,oval,cross,arrow,line,dot,point"
    )
}

# --- MIF 搜索策略引擎 ---

class RateLimiter:
    def __init__(self, max_calls, time_window):
        self.max_calls = max_calls
        self.time_window = time_window
        self.calls = []
        self.lock = Lock()
    
    def wait_if_needed(self):
        with self.lock:
            now = time.time()
            self.calls = [call_time for call_time in self.calls if now - call_time < self.time_window]
            
            if len(self.calls) >= self.max_calls:
                sleep_time = self.time_window - (now - self.calls[0]) + 0.1
                print(f"⏳ 速率限制：等待 {sleep_time:.1f} 秒...")
                time.sleep(sleep_time)
                self.calls = []
            
            self.calls.append(now)

rate_limiter = RateLimiter(RATE_LIMIT, RATE_LIMIT_WINDOW)

def get_optimized_query(word, category):
    """
    针对不同类别，生成符合MIF教学要求的Query列表。
    MIF（思维闪像）核心特征：简洁、清晰、无干扰、快速识别
    
    优先级策略：
    1. Vector（矢量图）- 最纯净，背景最干净
    2. Illustration（插画）- 风格统一，教育友好
    3. Photo（照片）- 写实，但需要严格筛选
    """
    strategies = []
    
    if category == "action":
        # TPR动作类：追求动态特征明确，便于学生模仿
        # 使用剪影或火柴人，动作特征最明确，无干扰
        strategies.append({"q": f"{word} action silhouette isolated white background", "type": "vector"})
        strategies.append({"q": f"{word} stick figure simple clean", "type": "illustration"})
        strategies.append({"q": f"{word} person doing action minimal", "type": "illustration"})
        strategies.append({"q": f"{word} action icon simple", "type": "vector"})
    
    elif category in ["objects", "food", "human"]:
        # 实物/部位类：追求产品照效果，白底孤立，特征鲜明
        # MIF要求：快速识别，无背景干扰
        strategies.append({"q": f"{word} isolated on white background simple", "type": "vector"})
        strategies.append({"q": f"{word} flat design minimal", "type": "illustration"})
        strategies.append({"q": f"{word} product photography white background", "type": "photo"})
        strategies.append({"q": f"{word} icon flat simple", "type": "vector"})
        
    elif category == "animals":
        # 动物类：侧面全身照，特征最全，便于识别
        # MIF要求：轮廓清晰，特征鲜明
        strategies.append({"q": f"{word} animal isolated white background", "type": "vector"})
        strategies.append({"q": f"{word} illustration side view", "type": "illustration"})
        strategies.append({"q": f"{word} animal photography white background", "type": "photo"})
        
    elif category == "nature":
        # 自然/环境：追求简洁图标化，避免复杂场景
        # MIF要求：符号化，易于记忆
        strategies.append({"q": f"{word} icon simple flat", "type": "vector"})
        strategies.append({"q": f"{word} illustration minimal", "type": "illustration"})
        strategies.append({"q": f"{word} symbol isolated", "type": "vector"})
        
    elif category == "various":
        # 形状/颜色：强制使用矢量图，避免真实世界干扰
        # MIF要求：纯净，标准形状
        strategies.append({"q": f"{word} basic shape flat", "type": "vector"})
        strategies.append({"q": f"{word} icon isolated simple", "type": "vector"})
        strategies.append({"q": f"{word} symbol minimal", "type": "illustration"})
        
    else:
        # 默认：通用干净背景
        strategies.append({"q": f"{word} isolated white background", "type": "vector"})
        strategies.append({"q": f"{word} simple illustration", "type": "illustration"})
        strategies.append({"q": f"{word} clean background", "type": "photo"})

    return strategies

# --- 执行引擎 ---

def download_word(item):
    word = item['word']
    category = item['category']
    file_name = f"{word.replace(' ', '_')}.png"
    file_path = os.path.join(SAVE_FOLDER, file_name)
    
    if os.path.exists(file_path):
        return "SKIP"

    # 获取该类别定制的搜索策略
    strategies = get_optimized_query(word, category)
    
    # 建立分类映射（Pixabay的category参数）
    pix_cat = {
        "action": "people",
        "food": "food",
        "objects": "industry",
        "animals": "animals",
        "nature": "nature",
        "human": "people",
        "various": "backgrounds"
    }.get(category, "")

    for st in strategies:
        # 应用速率限制
        rate_limiter.wait_if_needed()
        
        params = {
            "key": API_KEY,
            "q": st['q'],
            "image_type": st['type'],
            "category": pix_cat,
            "safesearch": "true",
            "per_page": 3
        }
        
        try:
            r = requests.get("https://pixabay.com/api/", params=params, timeout=10)
            data = r.json()
            if data.get("hits") and len(data["hits"]) > 0:
                # 寻找最符合分辨率的图
                img_url = data["hits"][0]["webformatURL"]
                img_data = requests.get(img_url, timeout=10).content
                with open(file_path, 'wb') as f:
                    f.write(img_data)
                return f"OK ({st['type']}: {st['q']})"
        except:
            continue
            
    return "FAIL"

def main():
    if not os.path.exists(SAVE_FOLDER):
        os.makedirs(SAVE_FOLDER)
    
    # 构建任务列表
    task_list = []
    for cat, words_str in raw_vocab.items():
        for w in words_str.split(','):
            if w.strip():
                task_list.append({"word": w.strip(), "category": cat})
    
    print(f"🚀 MIF 教学库构建开始！任务总数: {len(task_list)}")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_word = {executor.submit(download_word, item): item['word'] for item in task_list}
        
        completed = 0
        for future in concurrent.futures.as_completed(future_to_word):
            completed += 1
            word = future_to_word[future]
            try:
                res = future.result()
                if res != "SKIP":
                    print(f"[{completed}/{len(task_list)}] {word} -> {res}")
            except Exception as e:
                print(f"[{word}] 异常: {e}")

    print(f"\n✅ 库构建完成！素材存储在: {SAVE_FOLDER}")

if __name__ == "__main__":
    main()