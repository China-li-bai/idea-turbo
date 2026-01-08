import os
import requests
import concurrent.futures

# --- 配置区 ---
API_KEY = "54105475-28c649f5a4e59ba46d8925ea9"
SAVE_FOLDER = "MIF_Full_Library_1000"
MAX_WORKERS = 10  # 并发数

# --- 1000 词库完整定义 ---
raw_vocab = {
    "people": (
        "head,eye,nose,mouth,ear,tooth,tongue,neck,shoulder,arm,elbow,wrist,hand,finger,thumb,fingernail,chest,back,waist,hip,leg,knee,ankle,foot,toe,heel,skin,bone,"
        "man,woman,boy,girl,baby,child,father,mother,grandfather,grandmother,"
        "stand up,sit down,walk,run,jump,hop,dance,crawl,climb,sleep,wake up,stretch,yawn,wave,clap,shrug,nod,shake head,wink,blink,smile,laugh,cry,frown,sneeze,cough,burp,"
        "point to,touch,pick up,put down,throw,catch,push,pull,lift,drop,hold,carry,shake,fold,tear,cut,tie,rub,scrub,wash,wipe,comb,brush,shave,dress,undress,button,zip,"
        "eat,drink,bite,chew,swallow,breathe,smell,taste,listen,watch,look,think,sing,shout,whisper,kiss,hug,kick,punch,hit,fall,dig,climb,swim,dive,float,fly"
    ),
    "food": (
        "apple,banana,orange,strawberry,grape,watermelon,pineapple,lemon,lime,mango,peach,pear,cherry,blueberry,kiwi,papaya,coconut,avocado,plum,apricot,"
        "tomato,potato,onion,garlic,cucumber,corn,broccoli,spinach,lettuce,cabbage,carrot,mushroom,pepper,eggplant,pumpkin,pea,bean,celery,asparagus,radish,"
        "bread,rice,noodle,pasta,egg,meat,chicken,beef,pork,fish,shrimp,crab,ham,bacon,sausage,cheese,butter,yogurt,cream,honey,sugar,salt,pepper,oil,vinegar,flour,"
        "milk,water,juice,tea,coffee,soda,beer,wine,soup,sauce,jam,chocolate,candy,cookie,cake,pie,donut,ice cream,sandwich,hamburger,pizza,taco,hot dog,french fries,popcorn,nut,peanut,walnut"
    ),
    "industry": (
        "cup,plate,bowl,fork,spoon,knife,napkin,bottle,glass,mug,jug,pot,pan,kettle,toaster,oven,stove,microwave,fridge,sink,faucet,counter,cupboard,trash can,"
        "table,chair,sofa,bed,pillow,blanket,sheet,lamp,clock,mirror,rug,carpet,curtain,shelf,desk,drawer,cabinet,wardrobe,hanger,ladder,hammer,screwdriver,pliers,saw,drill,nail,screw,"
        "telephone,computer,laptop,mouse,keyboard,screen,printer,camera,television,radio,speaker,remote control,battery,charger,cable,wire,bulb,flashlight,"
        "bag,backpack,suitcase,wallet,purse,key,umbrella,towel,soap,shampoo,toothbrush,toothpaste,comb,brush,razor,scissors,paper,pen,pencil,eraser,ruler,glue,tape,envelope,stamp,coin,bill"
    ),
    "animals": (
        "dog,cat,bird,fish,hamster,rabbit,horse,cow,pig,sheep,goat,chicken,duck,goose,turkey,pigeon,owl,eagle,parrot,penguin,swan,"
        "lion,tiger,elephant,giraffe,zebra,monkey,gorilla,bear,panda,kangaroo,koala,hippo,rhino,camel,deer,wolf,fox,squirrel,mouse,rat,bat,"
        "snake,lizard,turtle,frog,crocodile,alligator,shark,dolphin,whale,octopus,crab,shrimp,shell,starfish,jellyfish,"
        "bee,butterfly,ant,spider,mosquito,fly,ladybug,grasshopper,caterpillar,worm,snail,scorpion"
    ),
    "nature": (
        "sun,moon,star,sky,cloud,rain,snow,wind,fire,smoke,ice,water,mountain,hill,valley,forest,jungle,desert,beach,island,ocean,sea,river,lake,pond,waterfall,cave,"
        "tree,flower,leaf,grass,bush,root,seed,branch,trunk,stone,rock,sand,mud,earth,ground,rainbow,thunder,lightning,sunrise,sunset,field,garden,path"
    ),
    "transportation": (
        "car,bus,truck,bike,bicycle,motorcycle,train,subway,plane,airplane,helicopter,boat,ship,rocket,taxi,ambulance,fire truck,police car,tractor,van,scooter,skateboard,"
        "wheel,tire,engine,steering wheel,seat,door,window,road,street,bridge,tunnel,railway,airport,station,bus stop,parking lot,gas station,traffic light,stop sign"
    ),
    "clothing": (
        "shirt,t-shirt,pants,jeans,shorts,skirt,dress,sweater,jacket,coat,hoodie,suit,vest,underwear,socks,shoes,boots,sneakers,sandals,slippers,hat,cap,beanie,gloves,mittens,scarf,belt,tie,bowtie,pajamas,swimsuit,apron,uniform,"
        "button,pocket,collar,sleeve,zipper,glasses,sunglasses,watch,ring,necklace,earring,bracelet,wallet,handbag"
    ),
    "places": (
        "house,apartment,building,room,kitchen,bedroom,bathroom,living room,toilet,garage,garden,yard,balcony,roof,wall,floor,ceiling,door,window,stairs,gate,fence,"
        "school,classroom,library,hospital,office,bank,shop,store,supermarket,market,restaurant,cafe,hotel,cinema,theater,museum,church,temple,mosque,park,playground,zoo,gym,stadium,farm"
    ),
    "various": (
        "red,blue,yellow,green,orange,purple,pink,brown,black,white,gray,gold,silver,"
        "circle,square,triangle,rectangle,star,heart,diamond,oval,cross,arrow,line,dot,point,"
        "big,small,long,short,tall,wide,narrow,thick,thin,heavy,light,hot,cold,wet,dry,dirty,clean,fast,slow,loud,quiet,hard,soft,sharp,blunt,smooth,rough,broken,full,empty"
    )
}

# --- 逻辑引擎 ---

def get_meta():
    """解析词库并生成搜索元数据"""
    meta_list = []
    for cat, words_str in raw_vocab.items():
        for w in words_str.split(','):
            word = w.strip()
            if not word: continue
            # 策略：如果是动作短语，优化搜索词
            search_query = word
            if " " in word:
                search_query = f"{word} action"
            
            meta_list.append({
                "word": word,
                "search": search_query,
                "cat": cat
            })
    return meta_list

def download_word(item):
    """单词执行逻辑"""
    word = item['word']
    # 文件名规范化
    file_name = f"{word.replace(' ', '_')}.png"
    file_path = os.path.join(SAVE_FOLDER, file_name)
    
    # 断点续传：已存在则跳过
    if os.path.exists(file_path):
        return "EXISTS"

    # 搜索策略优先级：Vector > Illustration > Photo
    strategies = [
        {"type": "vector", "suffix": "isolated"},
        {"type": "illustration", "suffix": "white background"},
        {"type": "photo", "suffix": "isolated white background"}
    ]
    
    for st in strategies:
        q = f"{item['search']} {st['suffix']}"
        params = {
            "key": API_KEY,
            "q": q,
            "image_type": st['type'],
            "category": item['cat'],
            "safesearch": "true",
            "per_page": 3
        }
        
        try:
            r = requests.get("https://pixabay.com/api/", params=params, timeout=10)
            data = r.json()
            if data.get("hits") and len(data["hits"]) > 0:
                img_url = data["hits"][0]["webformatURL"]
                img_data = requests.get(img_url, timeout=10).content
                with open(file_path, 'wb') as f:
                    f.write(img_data)
                return f"DOWNLOADED ({st['type']})"
        except:
            continue
            
    return "FAILED"

def main():
    if not os.path.exists(SAVE_FOLDER):
        os.makedirs(SAVE_FOLDER)
    
    all_items = get_meta()
    print(f"🚀 开始任务：共计 {len(all_items)} 个词汇")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_word = {executor.submit(download_word, item): item['word'] for item in all_items}
        
        count = 0
        for future in concurrent.futures.as_completed(future_to_word):
            word = future_to_word[future]
            try:
                result = future.result()
                count += 1
                if result != "EXISTS":
                    print(f"[{count}/{len(all_items)}] {word}: {result}")
            except Exception as e:
                print(f"{word}: ERROR {e}")

    print(f"\n✅ 任务结束！素材保存在: {SAVE_FOLDER}")

if __name__ == "__main__":
    main()