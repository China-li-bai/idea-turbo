'use client';

import { TopAppBar } from '../../components/landing/TopAppBar';
import { HeroSection } from '../../components/landing/HeroSection';
import { InputCard } from '../../components/landing/InputCard';
import { FeatureCards } from '../../components/landing/FeatureCards';
import { BottomPlayer } from '../../components/landing/BottomPlayer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-slate-900 dark:text-white transition-colors duration-300">
      <TopAppBar />
      <main className="max-w-xl mx-auto pb-32">
        <HeroSection />
        <InputCard />
        <FeatureCards />
      </main>
      <BottomPlayer />
    </div>
  );
}
