import os
import requests
import concurrent.futures

# --- 配置区 ---
API_KEY = "54105475-28c649f5a4e59ba46d8925ea9"
SAVE_FOLDER = "English_MIF_Library"
# 线程数：加快下载速度
MAX_WORKERS = 10 

# 词汇表 (这里先放入你文章中提到的典型词汇，你可以继续在列表中添加)
# 建议通过文本文件导入或直接在此扩展到 1000 个
words_to_download = [
    # General Body Movements
    "stand up", "sit down", "walk", "stop", "turn left", "turn right", "jump", "hop", 
    "squat", "shake hands", "make a fist", "clap hands", "wave",
    # Facial things
    "smile", "cough", "laugh", "cry", "sneeze", "open mouth", "wink", "blink",
    # Objects & Kitchen
    "cup", "plate", "bowl", "knife", "fork", "spoon", "napkin", "table", "chair",
    "oven", "stove", "sink", "faucet", "refrigerator", "pan",
    # Foods & Drinks
    "bread", "rice", "milk", "water", "juice", "coffee", "tea", "candy",
    # Fruits & Veg (重点素材)
    "apple", "banana", "orange", "plum", "grapes", "lemon", "tomato", "cucumber", 
    "onion", "carrot", "eggplant", "potato", "garlic", "lettuce", "cabbage"
    # ... 你可以根据需要继续添加至 1000 个词
]

# --- 逻辑区 ---

if not os.path.exists(SAVE_FOLDER):
    os.makedirs(SAVE_FOLDER)

def fetch_and_download(word):
    """搜索并下载单张图片"""
    # 策略：增加后缀确保背景干净 (MIF化)
    search_query = f"{word} isolated white background"
    url = f"https://pixabay.com/api/?key={API_KEY}&q={requests.utils.quote(search_query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get("hits") and len(data["hits"]) > 0:
            # 优先取第一张图
            img_url = data["hits"][0]["webformatURL"]
            img_data = requests.get(img_url, timeout=10).content
            
            # 文件名处理：空格转下划线
            file_name = f"{word.replace(' ', '_')}.jpg"
            file_path = os.path.join(SAVE_FOLDER, file_name)
            
            with open(file_path, 'wb') as f:
                f.write(img_data)
            print(f"[成功] 已下载: {word}")
        else:
            # 如果带后缀搜不到，尝试直接搜原词
            print(f"[重试] 正在尝试不带后缀搜索: {word}")
            fallback_url = f"https://pixabay.com/api/?key={API_KEY}&q={requests.utils.quote(word)}&image_type=vector&safesearch=true"
            # 这里改用矢量图(vector)，背景通常也比较干净
            res_fb = requests.get(fallback_url).json()
            if res_fb.get("hits"):
                img_url = res_fb["hits"][0]["webformatURL"]
                img_data = requests.get(img_url).content
                with open(os.path.join(SAVE_FOLDER, f"{word.replace(' ', '_')}.jpg"), 'wb') as f:
                    f.write(img_data)
                print(f"[成功] 已通过矢量模式下载: {word}")
            else:
                print(f"[失败] 找不到相关图片: {word}")
                
    except Exception as e:
        print(f"[错误] 处理 {word} 时发生异常: {e}")

def main():
    print(f"开始建立 MIF 素材库，目标文件夹: {SAVE_FOLDER}")
    # 使用线程池并发下载，极速完成
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        executor.map(fetch_and_download, words_to_download)
    
    print("\n任务完成！")
    print(f"统计：文件夹中现有 {len(os.listdir(SAVE_FOLDER))} 张图片。")

if __name__ == "__main__":
    main()