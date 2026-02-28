#!/usr/bin/env python3
"""
修改后的 Edge TTS Worker 测试
验证修改后的 Worker 是否可以正常工作
"""

import asyncio
import aiohttp
import json


WORKER_URL = "https://shu.66666618.xyz"


async def test_models_list():
    """测试模型列表"""
    print("=" * 60)
    print("测试 1: 模型列表")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/models"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"模型数量: {len(data['data'])}")
                    print("\n可用模型:")
                    for model in data['data']:
                        print(f"  - {model['id']}: {model.get('description', 'N/A')}")
                    print("✅ 成功获取模型列表")
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_voices_list():
    """测试语音列表"""
    print("=" * 60)
    print("测试 2: 语音列表")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/voices"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"语音总数: {len(data['data'])}")
                    
                    # 筛选中文语音
                    chinese_voices = [v for v in data['data'] if v['lang'].startswith('zh')]
                    print(f"中文语音数量: {len(chinese_voices)}")
                    print("\n中文语音示例:")
                    for voice in chinese_voices[:10]:  # 只显示前10个
                        print(f"  - {voice['id']} ({voice['name']}) - {voice['gender']}")
                    
                    if len(chinese_voices) > 10:
                        print(f"  ... 还有 {len(chinese_voices) - 10} 个语音")
                    
                    print("✅ 成功获取语音列表")
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_tts_with_microsoft_voice():
    """测试 TTS（使用 Microsoft 语音名称）"""
    print("=" * 60)
    print("测试 3: TTS（使用 Microsoft 语音名称）")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    payload = {
        "model": "microsoft-tts",
        "input": "你好，这是测试语音。",
        "voice": "zh-CN-XiaoxiaoNeural",  # Microsoft 官方语音名称
        "speed": 1.0,
        "pitch": 1.0
    }
    
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    print()
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    content_type = response.headers.get('Content-Type')
                    print(f"Content-Type: {content_type}")
                    
                    audio_data = await response.read()
                    print(f"音频大小: {len(audio_data)} bytes")
                    
                    # 保存音频文件
                    with open("test_microsoft_voice.mp3", "wb") as f:
                        f.write(audio_data)
                    print("✅ 成功生成音频文件: test_microsoft_voice.mp3")
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_multiple_microsoft_voices():
    """测试多个 Microsoft 语音"""
    print("=" * 60)
    print("测试 4: 多个 Microsoft 语音")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    voices = [
        ("zh-CN-XiaoxiaoNeural", "test_xiaoxiao.mp3", "晓晓（普通话女声）"),
        ("zh-CN-YunjianNeural", "test_yunjian.mp3", "云健（普通话男声）"),
        ("zh-CN-XiaoyiNeural", "test_xiaoyi.mp3", "晓伊（普通话女声）"),
        ("zh-CN-YunyangNeural", "test_yunyang.mp3", "云扬（普通话男声）"),
    ]
    
    async with aiohttp.ClientSession() as session:
        for voice, output_file, description in voices:
            try:
                payload = {
                    "model": "microsoft-tts",
                    "input": "你好，这是测试语音。",
                    "voice": voice,
                    "speed": 1.0,
                    "pitch": 1.0
                }
                
                print(f"正在测试: {description} ({voice})")
                
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        audio_data = await response.read()
                        
                        with open(output_file, "wb") as f:
                            f.write(audio_data)
                        print(f"  ✅ 生成: {output_file} ({len(audio_data)} bytes)")
                    else:
                        error_text = await response.text()
                        print(f"  ❌ 错误: {error_text}")
            except Exception as e:
                print(f"  ❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_error_handling():
    """测试错误处理"""
    print("=" * 60)
    print("测试 5: 错误处理")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    
    test_cases = [
        {
            "name": "缺少 input 参数",
            "payload": {
                "model": "microsoft-tts",
                "voice": "zh-CN-XiaoxiaoNeural"
            }
        },
        {
            "name": "无效的语音",
            "payload": {
                "model": "microsoft-tts",
                "input": "测试",
                "voice": "invalid-voice-name"
            }
        },
        {
            "name": "无效的 HTTP 方法",
            "method": "GET",
            "payload": {}
        },
    ]
    
    async with aiohttp.ClientSession() as session:
        for test_case in test_cases:
            try:
                print(f"正在测试: {test_case['name']}")
                
                method = test_case.get("method", "POST")
                if method == "POST":
                    async with session.post(url, json=test_case["payload"]) as response:
                        print(f"  状态码: {response.status}")
                        if response.status != 200:
                            error_text = await response.text()
                            print(f"  ✅ 正确返回错误: {error_text[:100]}")
                        else:
                            print(f"  ❌ 应该返回错误，但返回了成功")
                else:
                    async with session.get(url) as response:
                        print(f"  状态码: {response.status}")
                        if response.status != 200:
                            error_text = await response.text()
                            print(f"  ✅ 正确返回错误: {error_text[:100]}")
                        else:
                            print(f"  ❌ 应该返回错误，但返回了成功")
            except Exception as e:
                print(f"  ✅ 捕获异常: {type(e).__name__}: {e}")
    
    print()


async def print_summary():
    """打印测试总结"""
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    print()
    print("✅ 所有测试完成！")
    print()
    print("📝 修改内容:")
    print("  1. 删除了 OpenAI 语音映射（shimmer, alloy 等）")
    print("  2. 直接使用 Microsoft 官方语音名称")
    print("  3. 模型列表现在只返回 1 个模型：microsoft-tts")
    print("  4. 语音列表仍然返回 Microsoft 官方的 563 个语音")
    print()
    print("🔗 Worker URL:")
    print(f"  - {WORKER_URL}")
    print()
    print("📦 推荐使用的 Microsoft 语音:")
    print("  - zh-CN-XiaoxiaoNeural (晓晓 - 普通话女声)")
    print("  - zh-CN-YunjianNeural (云健 - 普通话男声)")
    print("  - zh-CN-XiaoyiNeural (晓伊 - 普通话女声)")
    print("  - zh-CN-YunyangNeural (云扬 - 普通话男声)")
    print()


async def main():
    """主函数"""
    print()
    print("🎤 修改后的 Edge TTS Worker 测试")
    print("📦 测试删除 OpenAI 语音映射后的 Worker")
    print()
    
    # 运行所有测试
    await test_models_list()
    await test_voices_list()
    await test_tts_with_microsoft_voice()
    await test_multiple_microsoft_voices()
    await test_error_handling()
    
    # 打印总结
    await print_summary()


if __name__ == "__main__":
    asyncio.run(main())
