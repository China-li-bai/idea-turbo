import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  // Try to load the actual logo
  const publicDir = path.join(process.cwd(), '..', 'public')
  const iconPath = path.join(publicDir, 'favicon.png')

  let bgColor = '#0d0d0d'
  let iconContent = '📅'

  try {
    if (fs.existsSync(iconPath)) {
      // Return the actual favicon
      const iconBuffer = fs.readFileSync(iconPath)
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0d0d0d',
            }}
          >
            <img
              src={`data:image/png;base64,${iconBuffer.toString('base64')}`}
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
            />
          </div>
        ),
        {
          ...size,
        }
      )
    }
  } catch {
    // Fall back to emoji
  }

  // Fallback emoji icon
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: bgColor,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4af37',
        }}
      >
        {iconContent}
      </div>
    ),
    {
      ...size,
    }
  )
}
