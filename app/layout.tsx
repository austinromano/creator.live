import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SolanaWalletProvider } from "@/components/providers/WalletProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { AudioUnlockProvider } from "@/components/providers/AudioUnlockProvider";
import { HeartbeatProvider } from "@/components/HeartbeatProvider";
import { ClientBackgrounds } from "@/components/ui/ClientBackgrounds";
import { MobileSwipeNavigator } from "@/components/layout/MobileSwipeNavigator";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  weight: "400",
  variable: "--font-pacifico",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSHO - Where creators launch tokens and fans get rich",
  description: "The ultimate platform for content creators to launch their own tokens with bonding curves, go live stream, and let fans trade their tokens.",
  keywords: ["creator tokens", "bonding curve", "live streaming", "crypto", "web3"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OSHO",
  },
  themeColor: "#a855f7",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Enable safe area insets for iOS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} antialiased bg-[#0f0a15] text-white min-h-screen`}
      >
        <ClientBackgrounds />
        <SessionProvider>
          <QueryProvider>
            <SolanaWalletProvider>
              <AudioUnlockProvider>
              <HeartbeatProvider>
                <Header />
                {/* Mobile with swipe navigation */}
                <MobileSwipeNavigator>
                  <main className="min-h-screen bg-transparent pb-20 lg:hidden">
                    {children}
                  </main>
                </MobileSwipeNavigator>
                {/* Desktop without swipe */}
                <main className="min-h-screen bg-transparent hidden lg:block">
                  {children}
                </main>
                <MobileBottomNav />
                <AuthModal />
              </HeartbeatProvider>
            </AudioUnlockProvider>
            </SolanaWalletProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
