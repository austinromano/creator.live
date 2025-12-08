import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SolanaWalletProvider } from "@/components/providers/WalletProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { AudioUnlockProvider } from "@/components/providers/AudioUnlockProvider";
import { HeartbeatProvider } from "@/components/HeartbeatProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSHO - Where creators launch tokens and fans get rich",
  description: "The ultimate platform for content creators to launch their own tokens with bonding curves, go live stream, and let fans trade their tokens.",
  keywords: ["creator tokens", "bonding curve", "live streaming", "crypto", "web3"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0f0a15] text-white min-h-screen`}
      >
        <SessionProvider>
          <SolanaWalletProvider>
            <AudioUnlockProvider>
              <HeartbeatProvider>
                <Header />
                <main className="min-h-screen bg-[#0f0a15] pb-20 lg:pb-0">
                  {children}
                </main>
                <MobileBottomNav />
                <AuthModal />
              </HeartbeatProvider>
            </AudioUnlockProvider>
          </SolanaWalletProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
