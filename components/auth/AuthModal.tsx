'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { useWallet } from '@solana/wallet-adapter-react';
import { signIn, useSession } from 'next-auth/react';
import { signInWithPhantom } from '@/lib/phantom-auth';
import { Loader2, Mail, ExternalLink } from 'lucide-react';

// Detect if user is on mobile device (not in Phantom browser)
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if we're in Phantom's in-app browser
function isPhantomBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  // Phantom injects window.phantom when in its browser
  return !!(window as any).phantom?.solana?.isPhantom;
}

export function AuthModal() {
  const { showAuthModal, setShowAuthModal } = useAuthStore();
  const { connect, select, publicKey, connected, signMessage, wallets } = useWallet();
  const { status: sessionStatus } = useSession();

  // Form states
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasAutoSignedRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInPhantom, setIsInPhantom] = useState(false);

  // Check device type on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsInPhantom(isPhantomBrowser());
  }, []);

  // Mobile-specific: Auto-complete Phantom auth when returning from Phantom app
  // This handles the case where user is redirected back after approving in Phantom
  useEffect(() => {
    const completePhantomAuth = async () => {
      // Only proceed if:
      // 1. Wallet is connected
      // 2. User is not already authenticated
      // 3. We haven't already tried auto-signing
      // 4. signMessage is available
      if (!connected || !publicKey || sessionStatus === 'authenticated' || hasAutoSignedRef.current || !signMessage) {
        return;
      }

      // Check if there's a pending phantom auth flag in localStorage (set before redirect)
      const pendingAuth = localStorage.getItem('pendingPhantomAuth');
      if (!pendingAuth) {
        return;
      }

      // Clear the pending flag
      localStorage.removeItem('pendingPhantomAuth');
      hasAutoSignedRef.current = true;

      console.log('Mobile: Detected return from Phantom, completing authentication...');
      setLoading(true);
      setShowAuthModal(true);

      try {
        // Create and sign authentication message
        const { publicKey: pubKey, signature, message } = await signInWithPhantom(
          publicKey.toBase58(),
          signMessage
        );

        // Authenticate with NextAuth
        const result = await signIn('phantom', {
          publicKey: pubKey,
          signature,
          message,
          username: `phantom_${pubKey.slice(0, 6)}`,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        // Redirect to golive/onboarding
        window.location.href = '/golive';
      } catch (error: any) {
        console.error('Auto Phantom auth failed:', error);
        setError(error.message || 'Failed to complete authentication');
        setLoading(false);
      }
    };

    completePhantomAuth();
  }, [connected, publicKey, signMessage, sessionStatus, setShowAuthModal]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setError('');
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('email', {
        email,
        password,
        username: activeTab === 'signup' ? username : undefined,
        isSignup: activeTab === 'signup' ? 'true' : 'false',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Success - reload to update session
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  // Open in Phantom's in-app browser for mobile users
  const openInPhantomBrowser = () => {
    const currentUrl = window.location.href;
    // Phantom deep link to open URL in Phantom's in-app browser
    // Format: https://phantom.app/ul/browse/{encodedUrl}
    const phantomBrowseUrl = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(window.location.origin)}`;
    window.location.href = phantomBrowseUrl;
  };

  const handlePhantomConnect = async () => {
    try {
      setLoading(true);
      setError('');

      // If on mobile and NOT in Phantom browser, redirect to Phantom's browser
      if (isMobile && !isInPhantom) {
        openInPhantomBrowser();
        return;
      }

      if (!connected || !publicKey) {
        // Find and select Phantom wallet
        const phantomWallet = wallets.find(
          wallet => wallet.adapter.name === 'Phantom'
        );

        if (!phantomWallet) {
          throw new Error('Phantom wallet not found. Please install Phantom browser extension.');
        }

        // Set pending auth flag BEFORE connecting - this persists across mobile app switches
        localStorage.setItem('pendingPhantomAuth', 'true');

        try {
          // Select triggers connection automatically in wallet adapter
          select(phantomWallet.adapter.name);
          // Wait longer for wallet popup and connection
          await new Promise(resolve => setTimeout(resolve, 500));

          // Only call connect if not already connected
          if (!phantomWallet.adapter.connected) {
            await connect();
          }
        } catch (connectError: any) {
          console.error('Connection error:', connectError);
          // Clear pending flag on error
          localStorage.removeItem('pendingPhantomAuth');
          // WalletNotSelectedError is expected on first click, just retry
          if (connectError.name === 'WalletNotSelectedError') {
            throw new Error('Please click the Phantom button again to connect.');
          }
          throw new Error('Failed to connect to Phantom. Please make sure Phantom is unlocked and try again.');
        }

        // Wait a moment for the wallet to be connected, then continue to signing
        setLoading(false);
        return;
      }

      if (!signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      // Create and sign authentication message
      const { publicKey: pubKey, signature, message } = await signInWithPhantom(
        publicKey.toBase58(),
        signMessage
      );

      // Authenticate with NextAuth - no username yet, will be set in onboarding
      const result = await signIn('phantom', {
        publicKey: pubKey,
        signature,
        message,
        username: `phantom_${pubKey.slice(0, 6)}`, // Temporary username
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Clear pending auth flag on success
      localStorage.removeItem('pendingPhantomAuth');

      // Redirect to golive (which will redirect to onboarding if needed)
      window.location.href = '/golive';
    } catch (error: any) {
      console.error('Phantom authentication failed:', error);
      // Clear pending flag on error too
      localStorage.removeItem('pendingPhantomAuth');
      setError(error.message || 'Failed to authenticate with Phantom wallet');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signIn('google', {
        callbackUrl: window.location.origin,
      });
    } catch (error: any) {
      setError(error.message || 'Failed to login with Google');
      setLoading(false);
    }
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => {
      setShowAuthModal(open);
      if (!open) {
        resetForm();
        setActiveTab('login');
      }
    }}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Welcome to creator.fun
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sign up or login to start creating tokens and going live
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="login" className="data-[state=active]:bg-gray-700">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gray-700">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Login with Email
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      minLength={6}
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Sign Up with Email
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Phantom Wallet Option */}
            <Button
              onClick={handlePhantomConnect}
              disabled={loading}
              className={`w-full h-12 ${connected && publicKey ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-semibold flex items-center justify-center space-x-3`}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : connected && publicKey ? (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 128 128" fill="none">
                    <path d="M105.5 35.5C94.5 21.5 78.5 14 60.5 14C31.5 14 8 37.5 8 66.5C8 95.5 31.5 119 60.5 119C78.5 119 94.5 111.5 105.5 97.5" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                    <circle cx="60.5" cy="66.5" r="20" fill="white"/>
                    <path d="M105.5 50.5L120 66.5L105.5 82.5" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Sign & Continue</span>
                </>
              ) : isMobile && !isInPhantom ? (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 128 128" fill="none">
                    <path d="M105.5 35.5C94.5 21.5 78.5 14 60.5 14C31.5 14 8 37.5 8 66.5C8 95.5 31.5 119 60.5 119C78.5 119 94.5 111.5 105.5 97.5" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                    <circle cx="60.5" cy="66.5" r="20" fill="white"/>
                    <path d="M105.5 50.5L120 66.5L105.5 82.5" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Open in Phantom</span>
                  <ExternalLink className="h-4 w-4" />
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 128 128" fill="none">
                    <path d="M105.5 35.5C94.5 21.5 78.5 14 60.5 14C31.5 14 8 37.5 8 66.5C8 95.5 31.5 119 60.5 119C78.5 119 94.5 111.5 105.5 97.5" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                    <circle cx="60.5" cy="66.5" r="20" fill="white"/>
                    <path d="M105.5 50.5L120 66.5L105.5 82.5" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Phantom Wallet</span>
                </>
              )}
            </Button>

            {/* Show helpful message for mobile users */}
            {isMobile && !isInPhantom && (
              <p className="text-xs text-gray-400 text-center">
                Tap to open this page in Phantom&apos;s browser for wallet connection
              </p>
            )}

            {/* Show connected wallet address when connected */}
            {connected && publicKey && (
              <p className="text-xs text-green-400 text-center">
                Wallet connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </p>
            )}

            {/* Google Option */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold flex items-center justify-center space-x-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google</span>
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
      </DialogContent>
    </Dialog>
  );
}
