import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Geist } from "next/font/google";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import RegisterSW from "@/components/RegisterSW";
import SyncManager from "@/components/SyncManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Amiri Quran (SIL Open Font License): a classical naskh face designed for Quranic text.
const quranFont = Amiri_Quran({
  variable: "--font-quran",
  subsets: ["arabic", "latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "Deen Companion",
  title: { default: "Deen Companion: free Islamic app", template: "%s · Deen Companion" },
  authors: [{ name: "Abdulai Bah" }],
  creator: "Abdulai Bah",
  publisher: "Abdulai Bah",
  category: "religion",
  other: { copyright: "© 2026 Abdulai Bah. All rights reserved." },
  openGraph: { siteName: "Deen Companion", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Deen", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  // Search engines may show large previews and full snippets of the pages.
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  // Paste the codes from Google Search Console and Bing Webmaster Tools into these settings in Vercel (see the README).
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined },
  description:
    "The complete Islamic hub: Quran with recitation, prayer times, hadith, learning, Islamic reels and an AI companion — free for every Muslim.",
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
};

// Runs before first paint so the saved theme never flashes. Mirrors applyPrefs() in lib/prefs.ts.
const BOOT_SCRIPT = `(function(){try{
var p=JSON.parse(localStorage.getItem('deen:prefs')||'{}');
var t=p.theme||'system';
if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var r=document.documentElement;r.dataset.theme=t;
if(p.arSize)r.style.setProperty('--ar-size',p.arSize+'px');
if(p.trSize)r.style.setProperty('--tr-size',p.trSize+'px');
if(JSON.parse(localStorage.getItem('deen:kids')||'false'))r.dataset.kids='true';
var a=JSON.parse(localStorage.getItem('deen:a11y')||'{}');
if([115,130,150].indexOf(a.scale)>=0)r.setAttribute('data-scale',String(a.scale));
if(a.contrast===true)r.setAttribute('data-contrast','high');
if(a.plainFont===true)r.setAttribute('data-font','plain');
if(a.calm===true)r.setAttribute('data-calm','on');
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${quranFont.variable} h-full antialiased`}
    >
      <head>
        {/* Recitation comes from this server: open the connection early so the first verse starts sooner. */}
        <link rel="preconnect" href="https://everyayah.com" />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-gray-900">
        {children}
        <RegisterSW />
        <ErrorReporter />
        <SyncManager />
      </body>
    </html>
  );
}
