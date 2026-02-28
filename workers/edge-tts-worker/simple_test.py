#!/usr/bin/env python3
"""
简单的 Edge TTS Worker 测试
验证 Worker 是否可以正常工作
"""

import asyncio
import aiohttp
import json


WORKER_URL = "https://shu.66666618.xyz"


async def test_simple_tts():
    """简单的 TTS 测试"""
    print("=" * 60)
    print("简单的 TTS 测试")
    print("=" * 60)
    
    url = f"{WORKER_URL}/v1/audio/speech"
    payload = {
        "model": "tts-1",
        "input": "你好，这是测试语音。",
        "voice": "zh-CN-XiaoxiaoNeural",  # 普通话女声
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
                    with open("simple_test.mp3", "wb") as f:
                        f.write(audio_data)
                    print("✅ 成功生成音频文件: simple_test.mp3")
                    print()
                    print("🎉 测试成功！Worker 可以正常工作！")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ 错误: {error_text}")
                    return False
        except Exception as e:
            print(f"❌ 异常: {type(e).__name__}: {e}")
            return False


async def main():
    """主函数"""
    print()
    print("🎤 简单的 Edge TTS Worker 测试")
    print()
    
    success = await test_simple_tts()
    
    if success:
        print()
        print("=" * 60)
        print("结论")
        print("=" * 60)
        print()
        print("✅ Worker 可以正常工作")
        print("✅ 普通话语音可以正常生成")
        print("✅ 可以在前端项目中使用")
        print()
        print("📝 使用方法:")
        print("  1. 使用 Microsoft 语音名称（如 zh-CN-XiaoxiaoNeural）")
        print("  2. 不要使用 OpenAI 语音映射（如 shimmer）")
        print("  3. 确保参数格式正确")
        print()
    else:
        print()
        print("=" * 60)
        print("结论")
        print("=" * 60)
        print()
        print("❌ Worker 无法正常工作")
        print("❌ 需要检查 Worker 配置")
        print()


if __name__ == "__main__":
    asyncio.run(main())
