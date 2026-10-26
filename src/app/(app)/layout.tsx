import { Suspense } from 'react'
import AppNav from '@/components/AppNav'
import InstallBanner from '@/components/InstallApp'
import LocationPrompt from '@/components/LocationPrompt'
import MiniPlayer from '@/components/MiniPlayer'
import AudioProvider from '@/lib/audio'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      <Suspense fallback={<div className="h-14 bg-white border-b border-gray-200" />}>
        <AppNav />
      </Suspense>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-36 md:pb-24">
        <InstallBanner />
        {children}
      </main>
      <LocationPrompt />
      <Suspense fallback={null}>
        <MiniPlayer />
      </Suspense>
    </AudioProvider>
  )
}
