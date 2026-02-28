import asyncio
from edge_tts import list_voices

async def main():
    voices = await list_voices()
    
    print("Total voices:", len(voices))
    print("\nChinese voices:")
    for voice in voices:
        if voice['Locale'].startswith('zh'):
            print(f"  {voice['Name']} - {voice['DisplayName']} ({voice['Gender']})")
    
    print("\nEnglish voices:")
    for voice in voices:
        if voice['Locale'].startswith('en'):
            print(f"  {voice['Name']} - {voice['DisplayName']} ({voice['Gender']})")

if __name__ == "__main__":
    asyncio.run(main())
