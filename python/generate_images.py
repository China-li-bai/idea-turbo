import asyncio
import json
import os
from playwright.async_api import async_playwright

# 定义所有提示词
PROMPTS = {
    "第一层级-基础饮品": [
        ("Water", "A single Water in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast."),
        ("Milk", "A single Milk in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast."),
        ("Juice", "A single Juice in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast."),
        ("Tea", "A single Tea in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast."),
        ("Coffee", "A single Coffee in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast."),
        ("Soda", "A single Soda in a clear glass, 3D hyper-realistic, isolated on a pure white background, studio lighting, high contrast."),
    ],
    "第一层级-主食与果蔬": [
        ("Bread", "A single fresh Bread, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Rice", "A single fresh Rice, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Egg", "A single fresh Egg, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Apple", "A single fresh Apple, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Banana", "A single fresh Banana, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Meat", "A single fresh Meat, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Fish", "A single fresh Fish, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Tomato", "A single fresh Tomato, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
        ("Potato", "A single fresh Potato, 3D hyper-realistic, macro photography, isolated on a pure white background, high contrast, clean edges."),
    ],
    "第一层级-基础本能动作": [
        ("Eat", "Minimalist black silhouette of a person Eat, instructional icon style, isolated on a pure white background, high contrast."),
        ("Drink", "Minimalist black silhouette of a person Drink, instructional icon style, isolated on a pure white background, high contrast."),
        ("Sleep", "Minimalist black silhouette of a person Sleep, instructional icon style, isolated on a pure white background, high contrast."),
        ("Wake up", "Minimalist black silhouette of a person Wake up, instructional icon style, isolated on a pure white background, high contrast."),
        ("Breathe", "Minimalist black silhouette of a person Breathe, instructional icon style, isolated on a pure white background, high contrast."),
        ("Smile", "Minimalist black silhouette of a person Smile, instructional icon style, isolated on a pure white background, high contrast."),
        ("Cry", "Minimalist black silhouette of a person Cry, instructional icon style, isolated on a pure white background, high contrast."),
    ],
    "第一层级-核心生存指令": [
        ("Stop", "A bold minimalist icon or silhouette representing Stop, high contrast, isolated on a pure white background, minimalist style."),
        ("Go", "A bold minimalist icon or silhouette representing Go, high contrast, isolated on a pure white background, minimalist style."),
        ("Wait", "A bold minimalist icon or silhouette representing Wait, high contrast, isolated on a pure white background, minimalist style."),
        ("Look", "A bold minimalist icon or silhouette representing Look, high contrast, isolated on a pure white background, minimalist style."),
        ("Listen", "A bold minimalist icon or silhouette representing Listen, high contrast, isolated on a pure white background, minimalist style."),
        ("Help", "A bold minimalist icon or silhouette representing Help, high contrast, isolated on a pure white background, minimalist style."),
    ],
    "第二层级-头部器官": [
        ("Head", "A realistic 3D human Head, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Eye", "A realistic 3D human Eye, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Nose", "A realistic 3D human Nose, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Mouth", "A realistic 3D human Mouth, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Ear", "A realistic 3D human Ear, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Hair", "A realistic 3D human Hair, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Tooth", "A realistic 3D human Tooth, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
        ("Tongue", "A realistic 3D human Tongue, neutral skin tone, high detail, isolated on a pure white background, clinical studio lighting, sharp focus."),
    ],
    "第二层级-四肢与躯干": [
        ("Hand", "A realistic 3D human Hand, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Finger", "A realistic 3D human Finger, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Arm", "A realistic 3D human Arm, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Shoulder", "A realistic 3D human Shoulder, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Leg", "A realistic 3D human Leg, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Knee", "A realistic 3D human Knee, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Foot", "A realistic 3D human Foot, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
        ("Toe", "A realistic 3D human Toe, neutral skin tone, anatomically correct, isolated on a pure white background, studio lighting."),
    ],
    "第二层级-基础身体动作": [
        ("Stand up", "Minimalist black silhouette of a person Stand up, motion lines, isolated on a pure white background, high contrast, clean edges."),
        ("Sit down", "Minimalist black silhouette of a person Sit down, motion lines, isolated on a pure white background, high contrast, clean edges."),
        ("Walk", "Minimalist black silhouette of a person Walk, motion lines, isolated on a pure white background, high contrast, clean edges."),
        ("Run", "Minimalist black silhouette of a person Run, motion lines, isolated on a pure white background, high contrast, clean edges."),
        ("Jump", "Minimalist black silhouette of a person Jump, motion lines, isolated on a pure white background, high contrast, clean edges."),
        ("Turn around", "Minimalist black silhouette of a person Turn around, motion lines, isolated on a pure white background, high contrast, clean edges."),
        ("Bend over", "Minimalist black silhouette of a person Bend over, motion lines, isolated on a pure white background, high contrast, clean edges."),
    ],
    "第二层级-位移交互动作": [
        ("Touch", "Minimalist line art or silhouette of a hand Touch, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Point to", "Minimalist line art or silhouette of a hand Point to, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Push", "Minimalist line art or silhouette of a hand Push, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Pull", "Minimalist line art or silhouette of a hand Pull, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Open", "Minimalist line art or silhouette of a hand Open, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Close", "Minimalist line art or silhouette of a hand Close, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Pick up", "Minimalist line art or silhouette of a hand Pick up, high contrast, isolated on a pure white background, emphasis on motion."),
        ("Put down", "Minimalist line art or silhouette of a hand Put down, high contrast, isolated on a pure white background, emphasis on motion."),
    ],
    "第三层级-餐具与厨具": [
        ("Cup", "A single Cup, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Plate", "A single Plate, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Bowl", "A single Bowl, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Fork", "A single Fork, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Spoon", "A single Spoon, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Knife", "A single Knife, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Bottle", "A single Bottle, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Pan", "A single Pan, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
        ("Pot", "A single Pot, 3D realistic render, 45-degree angle, isolated on a pure white background, metallic/ceramic texture, sharp focus."),
    ],
    "第三层级-家具与起居": [
        ("Table", "A single minimalist Table, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Chair", "A single minimalist Chair, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Bed", "A single minimalist Bed, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Pillow", "A single minimalist Pillow, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Sofa", "A single minimalist Sofa, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Lamp", "A single minimalist Lamp, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Door", "A single minimalist Door, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Window", "A single minimalist Window, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
        ("Stairs", "A single minimalist Stairs, 3D hyper-realistic, isolated on a pure white background, cinematic lighting, high clarity, no shadows."),
    ],
    "第三层级-个人用品": [
        ("Key", "A single Key, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Phone", "A single Phone, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Computer", "A single Computer, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Bag", "A single Bag, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Umbrella", "A single Umbrella, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Pen", "A single Pen, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Book", "A single Book, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
        ("Mirror", "A single Mirror, modern style, 3D realistic render, isolated on a pure white background, high contrast, high definition."),
    ],
    "第三层级-卫浴用品": [
        ("Soap", "A single Soap, realistic texture (fiber/water droplets), isolated on a pure white background, studio lighting."),
        ("Towel", "A single Towel, realistic texture (fiber/water droplets), isolated on a pure white background, studio lighting."),
        ("Toothbrush", "A single Toothbrush, realistic texture (fiber/water droplets), isolated on a pure white background, studio lighting."),
        ("Toilet", "A single Toilet, realistic texture (fiber/water droplets), isolated on a pure white background, studio lighting."),
        ("Sink", "A single Sink, realistic texture (fiber/water droplets), isolated on a pure white background, studio lighting."),
        ("Faucet", "A single Faucet, realistic texture (fiber/water droplets), isolated on a pure white background, studio lighting."),
    ],
    "第四层级-基础衣物": [
        ("Shirt", "A single Shirt, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Pants", "A single Pants, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Shoes", "A single Shoes, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Socks", "A single Socks, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Hat", "A single Hat, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Coat", "A single Coat, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Dress", "A single Dress, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
        ("Glasses", "A single Glasses, ghost mannequin 3D style, clear fabric texture, isolated on a pure white background, neutral colors."),
    ],
    "第四层级-核心动物": [
        ("Dog", "A realistic Dog in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Cat", "A realistic Cat in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Bird", "A realistic Bird in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Horse", "A realistic Horse in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Cow", "A realistic Cow in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Pig", "A realistic Pig in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Fish", "A realistic Fish in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Lion", "A realistic Lion in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
        ("Tiger", "A realistic Tiger in a standing pose, side profile, high detail on fur/scales, isolated on a pure white background, no floor."),
    ],
    "第四层级-自然环境": [
        ("Tree", "A single minimalist 3D Tree, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Flower", "A single minimalist 3D Flower, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Leaf", "A single minimalist 3D Leaf, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Sun", "A single minimalist 3D Sun, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Moon", "A single minimalist 3D Moon, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Star", "A single minimalist 3D Star, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Cloud", "A single minimalist 3D Cloud, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Rain", "A single minimalist 3D Rain, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Snow", "A single minimalist 3D Snow, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
        ("Fire", "A single minimalist 3D Fire, stylized realism, vibrant but simple colors, isolated on a pure white background, high contrast."),
    ],
    "第四层级-交通工具": [
        ("Car", "A single minimalist Car, 3D render, side view, isolated on a pure white background, sharp focus, clean lines."),
        ("Bus", "A single minimalist Bus, 3D render, side view, isolated on a pure white background, sharp focus, clean lines."),
        ("Bike", "A single minimalist Bike, 3D render, side view, isolated on a pure white background, sharp focus, clean lines."),
        ("Plane", "A single minimalist Plane, 3D render, side view, isolated on a pure white background, sharp focus, clean lines."),
        ("Boat", "A single minimalist Boat, 3D render, side view, isolated on a pure white background, sharp focus, clean lines."),
        ("Train", "A single minimalist Train, 3D render, side view, isolated on a pure white background, sharp focus, clean lines."),
    ],
    "第五层级-基础形状": [
        ("Circle", "A 3D solid Circle, matte finish, isometric view, isolated on a pure white background, bold contrast, simple shadows."),
        ("Square", "A 3D solid Square, matte finish, isometric view, isolated on a pure white background, bold contrast, simple shadows."),
        ("Triangle", "A 3D solid Triangle, matte finish, isometric view, isolated on a pure white background, bold contrast, simple shadows."),
        ("Star", "A 3D solid Star, matte finish, isometric view, isolated on a pure white background, bold contrast, simple shadows."),
        ("Heart", "A 3D solid Heart, matte finish, isometric view, isolated on a pure white background, bold contrast, simple shadows."),
        ("Diamond", "A 3D solid Diamond, matte finish, isometric view, isolated on a pure white background, bold contrast, simple shadows."),
    ],
    "第五层级-纯粹颜色": [
        ("Red", "A perfect 3D glossy sphere of Red, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("Blue", "A perfect 3D glossy sphere of Blue, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("Yellow", "A perfect 3D glossy sphere of Yellow, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("Green", "A perfect 3D glossy sphere of Green, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("Orange", "A perfect 3D glossy sphere of Orange, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("Purple", "A perfect 3D glossy sphere of Purple, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("Black", "A perfect 3D glossy sphere of Black, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
        ("White", "A perfect 3D glossy sphere of White, studio lighting, isolated on a pure white background, showcasing the pure pigment."),
    ],
    "第五层级-空间方位对比": [
        ("Big vs Small", "A conceptual 3D minimalist comparison of Big vs Small, high contrast, isolated on a pure white background, simple visual metaphor."),
        ("Up vs Down", "A conceptual 3D minimalist comparison of Up vs Down, high contrast, isolated on a pure white background, simple visual metaphor."),
        ("In vs Out", "A conceptual 3D minimalist comparison of In vs Out, high contrast, isolated on a pure white background, simple visual metaphor."),
        ("Hot vs Cold", "A conceptual 3D minimalist comparison of Hot vs Cold, high contrast, isolated on a pure white background, simple visual metaphor."),
    ],
    "第五层级-数量感知": [
        ("One", "A set of identical 3D white spheres representing One, arranged neatly, isolated on a pure white background, high contrast."),
        ("Two", "A set of identical 3D white spheres representing Two, arranged neatly, isolated on a pure white background, high contrast."),
        ("Three", "A set of identical 3D white spheres representing Three, arranged neatly, isolated on a pure white background, high contrast."),
        ("Many", "A set of identical 3D white spheres representing Many, arranged neatly, isolated on a pure white background, high contrast."),
    ],
}

OUTPUT_DIR = "/Users/mac/project/idea-turbo/python/imgs"

async def generate_and_download_images():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        await page.goto("https://www.doubao.com/chat/create-image")
        await page.wait_for_load_state("networkidle")
        
        for category, prompts in PROMPTS.items():
            print(f"\n开始处理: {category}")
            
            for word, prompt in prompts:
                print(f"  生成图片: {word}")
                
                # 清空输入框
                editable = await page.query_selector('[contenteditable="true"]')
                if editable:
                    await editable.click()
                    await editable.fill("")
                
                # 输入提示词
                await editable.fill(prompt)
                await page.wait_for_timeout(500)
                
                # 点击发送按钮
                send_btn = await page.query_selector('.send-btn-mNNnTf')
                if send_btn:
                    await send_btn.click()
                
                # 等待图片生成，最多等待15秒
                max_retries = 30
                for i in range(max_retries):
                    await page.wait_for_timeout(500)
                    images = await page.query_selector_all('.image-item-img-goVfDB')
                    if images:
                        break
                
                # 查找生成的图片
                images = await page.query_selector_all('.image-item-img-goVfDB')
                if images:
                    first_image = images[0]
                    image_url = await first_image.get_attribute('src')
                    
                    # 下载图片
                    filename = f"{word.replace(' ', '_').lower()}_noun.png"
                    filepath = os.path.join(OUTPUT_DIR, filename)
                    
                    try:
                        response = await page.context.request.get(image_url)
                        with open(filepath, 'wb') as f:
                            f.write(await response.body())
                        print(f"    已下载: {filename}")
                    except Exception as e:
                        print(f"    下载失败: {e}")
                else:
                    print(f"    未找到生成的图片")
                
                # 等待一段时间避免请求过快
                await page.wait_for_timeout(2000)
        
        await browser.close()
        print("\n所有图片生成和下载完成!")

if __name__ == "__main__":
    asyncio.run(generate_and_download_images())
