import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { SolanaWalletProvider } from "@/components/providers/WalletProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { AudioUnlockProvider } from "@/components/providers/AudioUnlockProvider";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen`}
      >
        <SessionProvider>
          <SolanaWalletProvider>
            <AudioUnlockProvider>
              <Header />
              <main className="min-h-screen bg-black">
                {children}
              </main>
              <AuthModal />
            </AudioUnlockProvider>
          </SolanaWalletProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
