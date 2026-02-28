This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### Hybrid TTS Service

This application implements a hybrid text-to-speech system that intelligently switches between:

- **Web Speech API**: Browser-native TTS for shorter texts
- **Edge-TTS**: Cloud-based TTS via proxy for longer texts

The system automatically selects the appropriate service based on text length and user preferences.

### Voice Selection with Search

Enhanced voice selection component with search functionality for easy voice discovery.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Edge-TTS Proxy Configuration

To use the Edge-TTS service, you need to deploy an Edge-TTS proxy and configure it:

1. **Deploy Edge-TTS Proxy**:
   - Follow the [Edge-TTS deployment guide](https://github.com/rany2/edge-tts) to deploy a proxy server
   - Recommended: Deploy on Cloudflare Workers for serverless operation
   - Alternative: Deploy on any Node.js server

2. **Configure Environment Variables**:
   - Copy `.env.example` to `.env.local`
   - Update `NEXT_PUBLIC_EDGE_TTS_PROXY_URL` with your deployed proxy URL

```bash
cp .env.example .env.local
```

3. **Optional Configuration**:
   - `NEXT_PUBLIC_EDGE_TTS_AUTO_SWITCH_THRESHOLD`: Text length threshold for auto-switching (default: 100)
   - `NEXT_PUBLIC_EDGE_TTS_ENABLE_AUTO_SWITCH`: Enable/disable auto-switch (default: true)
   - `NEXT_PUBLIC_EDGE_TTS_PREFERRED_SERVICE`: Preferred service type (default: auto)

### TTS Service Modes

The application supports three TTS service modes:

- **Auto Mode**: Automatically switches between Web Speech API and Edge-TTS based on text length
- **Web Speech API**: Always uses browser-native TTS
- **Edge-TTS**: Always uses cloud-based TTS via proxy

Users can switch between modes using the service selection buttons in the interface.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
