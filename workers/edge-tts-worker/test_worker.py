#!/usr/bin/env python3
"""
Edge TTS Worker 测试脚本
测试 Cloudflare Worker 代理的 Edge TTS 服务
"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, Any


# Worker 配置
WORKER_URL = "https://shu.66666618.xyz"
API_KEY = None  # 如果需要 API 密钥，请在这里设置


async def test_basic_tts():
    """测试基本 TTS 功能"""
    print("=" * 60)
    print("测试 1: 基本 TTS 功能")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    payload = {
        "model": "tts-1",
        "input": "你好，世界！",
        "voice": "shimmer",  # 普通话女声
        "speed": 1.0,
        "pitch": 1.0
    }
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    print()
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    content_type = response.headers.get('Content-Type')
                    print(f"Content-Type: {content_type}")
                    
                    audio_data = await response.read()
                    print(f"音频大小: {len(audio_data)} bytes")
                    
                    # 保存音频文件
                    with open("test_worker_basic.mp3", "wb") as f:
                        f.write(audio_data)
                    print("✅ 成功生成音频文件: test_worker_basic.mp3")
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_multiple_voices():
    """测试多个语音"""
    print("=" * 60)
    print("测试 2: 多个语音")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    voices = [
        ("shimmer", "test_worker_shimmer.mp3", "普通话女声"),
        ("alloy", "test_worker_alloy.mp3", "普通话男声"),
        ("fable", "test_worker_fable.mp3", "激情男声"),
        ("onyx", "test_worker_onyx.mp3", "活泼女声"),
        ("nova", "test_worker_nova.mp3", "阳光男声"),
    ]
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    async with aiohttp.ClientSession() as session:
        for voice, output_file, description in voices:
            try:
                payload = {
                    "model": "tts-1",
                    "input": "你好，这是测试语音。",
                    "voice": voice,
                    "speed": 1.0,
                    "pitch": 1.0
                }
                
                print(f"正在测试: {description} ({voice})")
                
                async with session.post(url, json=payload, headers=headers) as response:
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


async def test_with_rate_and_pitch():
    """测试语速和音调调整"""
    print("=" * 60)
    print("测试 3: 语速和音调调整")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    
    test_cases = [
        {
            "name": "正常语速和音调",
            "speed": 1.0,
            "pitch": 1.0,
            "output": "test_worker_normal.mp3"
        },
        {
            "name": "快速",
            "speed": 1.5,
            "pitch": 1.0,
            "output": "test_worker_fast.mp3"
        },
        {
            "name": "慢速",
            "speed": 0.8,
            "pitch": 1.0,
            "output": "test_worker_slow.mp3"
        },
        {
            "name": "高音调",
            "speed": 1.0,
            "pitch": 1.2,
            "output": "test_worker_high_pitch.mp3"
        },
        {
            "name": "低音调",
            "speed": 1.0,
            "pitch": 0.8,
            "output": "test_worker_low_pitch.mp3"
        },
    ]
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    async with aiohttp.ClientSession() as session:
        for test_case in test_cases:
            try:
                payload = {
                    "model": "tts-1",
                    "input": "这是一个测试语速和音调的句子。",
                    "voice": "shimmer",
                    "speed": test_case["speed"],
                    "pitch": test_case["pitch"]
                }
                
                print(f"正在测试: {test_case['name']} (speed={test_case['speed']}, pitch={test_case['pitch']})")
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        audio_data = await response.read()
                        
                        with open(test_case["output"], "wb") as f:
                            f.write(audio_data)
                        print(f"  ✅ 生成: {test_case['output']} ({len(audio_data)} bytes)")
                    else:
                        error_text = await response.text()
                        print(f"  ❌ 错误: {error_text}")
            except Exception as e:
                print(f"  ❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_long_text():
    """测试长文本"""
    print("=" * 60)
    print("测试 4: 长文本")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    
    long_text = """打小人，打小人，打得小人不敢再欺人。
平安顺遂，万事如意。
身体健康，家庭幸福。
财源广进，事业有成。
心想事成，好运连连。"""
    
    payload = {
        "model": "tts-1",
        "input": long_text,
        "voice": "shimmer",
        "speed": 1.0,
        "pitch": 1.0
    }
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    print(f"文本长度: {len(long_text)} 字符")
    print()
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    audio_data = await response.read()
                    print(f"音频大小: {len(audio_data)} bytes")
                    
                    with open("test_worker_long_text.mp3", "wb") as f:
                        f.write(audio_data)
                    print("✅ 成功生成音频文件: test_worker_long_text.mp3")
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_models_list():
    """测试模型列表"""
    print("=" * 60)
    print("测试 5: 模型列表")
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
                        print(f"  - {model['id']}")
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
    print("测试 6: 语音列表")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/voices"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"语音数量: {len(data['data'])}")
                    
                    # 筛选中文语音
                    chinese_voices = [v for v in data['data'] if v['lang'].startswith('zh')]
                    print(f"\n中文语音数量: {len(chinese_voices)}")
                    print("\n中文语音:")
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


async def test_streaming():
    """测试流式输出"""
    print("=" * 60)
    print("测试 7: 流式输出")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    
    payload = {
        "model": "tts-1",
        "input": "这是一个流式输出的测试。",
        "voice": "shimmer",
        "speed": 1.0,
        "pitch": 1.0,
        "stream": True
    }
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    print(f"流式模式: {payload['stream']}")
    print()
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                print(f"状态码: {response.status}")
                
                if response.status == 200:
                    content_type = response.headers.get('Content-Type')
                    print(f"Content-Type: {content_type}")
                    
                    audio_data = await response.read()
                    print(f"音频大小: {len(audio_data)} bytes")
                    
                    with open("test_worker_streaming.mp3", "wb") as f:
                        f.write(audio_data)
                    print("✅ 成功生成流式音频文件: test_worker_streaming.mp3")
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_custom_voice():
    """测试自定义语音"""
    print("=" * 60)
    print("测试 8: 自定义语音")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    
    # 直接使用 Microsoft 语音名称
    test_cases = [
        {
            "name": "普通话女声",
            "voice": "zh-CN-XiaoxiaoNeural",
            "output": "test_worker_zh_cn_female.mp3"
        },
        {
            "name": "普通话男声",
            "voice": "zh-CN-YunjianNeural",
            "output": "test_worker_zh_cn_male.mp3"
        },
        {
            "name": "英语女声",
            "voice": "en-US-JennyNeural",
            "output": "test_worker_en_us_female.mp3"
        },
    ]
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    async with aiohttp.ClientSession() as session:
        for test_case in test_cases:
            try:
                payload = {
                    "model": "tts-1",
                    "input": "这是一个自定义语音的测试。",
                    "voice": test_case["voice"],
                    "speed": 1.0,
                    "pitch": 1.0
                }
                
                print(f"正在测试: {test_case['name']} ({test_case['voice']})")
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        audio_data = await response.read()
                        
                        with open(test_case["output"], "wb") as f:
                            f.write(audio_data)
                        print(f"  ✅ 生成: {test_case['output']} ({len(audio_data)} bytes)")
                    else:
                        error_text = await response.text()
                        print(f"  ❌ 错误: {error_text}")
            except Exception as e:
                print(f"  ❌ 异常: {type(e).__name__}: {e}")
    
    print()


async def test_error_handling():
    """测试错误处理"""
    print("=" * 60)
    print("测试 9: 错误处理")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    
    test_cases = [
        {
            "name": "缺少 input 参数",
            "payload": {
                "model": "tts-1",
                "voice": "shimmer"
            }
        },
        {
            "name": "无效的语音",
            "payload": {
                "model": "tts-1",
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
    
    headers = {}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    
    async with aiohttp.ClientSession() as session:
        for test_case in test_cases:
            try:
                print(f"正在测试: {test_case['name']}")
                
                method = test_case.get("method", "POST")
                if method == "POST":
                    async with session.post(url, json=test_case["payload"], headers=headers) as response:
                        print(f"  状态码: {response.status}")
                        if response.status != 200:
                            error_text = await response.text()
                            print(f"  ✅ 正确返回错误: {error_text[:100]}")
                        else:
                            print(f"  ❌ 应该返回错误，但返回了成功")
                else:
                    async with session.get(url, headers=headers) as response:
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
    print("📝 说明:")
    print("  1. 所有测试都使用 Cloudflare Worker 代理")
    print("  2. 验证了基本 TTS 功能")
    print("  3. 测试了多个语音")
    print("  4. 测试了语速和音调调整")
    print("  5. 测试了长文本处理")
    print("  6. 测试了模型和语音列表")
    print("  7. 测试了流式输出")
    print("  8. 测试了自定义语音")
    print("  9. 测试了错误处理")
    print()
    print("🔗 Worker URL:")
    print(f"  - {WORKER_URL}")
    print()
    print("📦 生成的音频文件:")
    audio_files = [f for f in os.listdir('.') if f.startswith('test_worker_') and f.endswith('.mp3')]
    for audio_file in sorted(audio_files):
        size = os.path.getsize(audio_file)
        print(f"  - {audio_file} ({size} bytes)")
    print()


async def main():
    """主函数"""
    print()
    print("🎤 Edge TTS Worker 测试脚本")
    print("📦 测试 Cloudflare Worker 代理的 Edge TTS 服务")
    print()
    
    # 运行所有测试
    await test_basic_tts()
    await test_multiple_voices()
    await test_with_rate_and_pitch()
    await test_long_text()
    await test_models_list()
    await test_voices_list()
    await test_streaming()
    await test_custom_voice()
    await test_error_handling()
    
    # 打印总结
    await print_summary()


if __name__ == "__main__":
    asyncio.run(main())
