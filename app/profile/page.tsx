'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { signInWithPhantom } from '@/lib/phantom-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, ExternalLink, User } from 'lucide-react';

// Detect if user is on mobile device (not in Phantom browser)
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if we're in Phantom's in-app browser
function isPhantomBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).phantom?.solana?.isPhantom;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { connect, select, publicKey, connected, signMessage, wallets } = useWallet();

  // Form states
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isInPhantom, setIsInPhantom] = useState(false);

  // Check device type on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsInPhantom(isPhantomBrowser());
  }, []);

  // Redirect to user's profile if logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Fetch their username and redirect
      const fetchAndRedirect = async () => {
        try {
          const response = await fetch('/api/user/me');
          if (response.ok) {
            const data = await response.json();
            if (data.user?.username) {
              router.replace(`/profile/${data.user.username}`);
            }
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };
      fetchAndRedirect();
    }
  }, [status, session, router]);

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
    localStorage.removeItem('pendingPhantomAuth');
    const currentUrl = window.location.href;
    const phantomBrowseUrl = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(window.location.origin)}`;
    window.location.href = phantomBrowseUrl;
  };

  const handlePhantomConnect = async () => {
    try {
      setLoading(true);
      setError('');

      if (isMobile && !isInPhantom) {
        openInPhantomBrowser();
        return;
      }

      if (!connected || !publicKey) {
        const phantomWallet = wallets.find(
          wallet => wallet.adapter.name === 'Phantom'
        );

        if (!phantomWallet) {
          throw new Error('Phantom wallet not found. Please install Phantom browser extension.');
        }

        localStorage.setItem('pendingPhantomAuth', 'true');

        try {
          select(phantomWallet.adapter.name);
          await new Promise(resolve => setTimeout(resolve, 500));

          if (!phantomWallet.adapter.connected) {
            await connect();
          }
        } catch (connectError: any) {
          console.error('Connection error:', connectError);
          localStorage.removeItem('pendingPhantomAuth');
          if (connectError.name === 'WalletNotSelectedError') {
            throw new Error('Please click the Phantom button again to connect.');
          }
          throw new Error('Failed to connect to Phantom. Please make sure Phantom is unlocked and try again.');
        }

        setLoading(false);
        return;
      }

      if (!signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      const { publicKey: pubKey, signature, message } = await signInWithPhantom(
        publicKey.toBase58(),
        signMessage
      );

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

      localStorage.removeItem('pendingPhantomAuth');
      window.location.reload();
    } catch (error: any) {
      console.error('Phantom authentication failed:', error);
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
        callbackUrl: window.location.origin + '/profile',
      });
    } catch (error: any) {
      setError(error.message || 'Failed to login with Google');
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Show sign in/sign up for unauthenticated users
  return (
    <div className="min-h-screen bg-[#0f0a15] flex flex-col">
      {/* Header area with icon */}
      <div className="flex flex-col items-center pt-12 px-6 pb-8">
        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <User className="h-12 w-12 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Welcome to OSHO</h1>
        <p className="text-gray-400 text-center mb-8">
          Sign in or create an account to view your profile
        </p>

        {/* Auth Form */}
        <div className="w-full max-w-sm space-y-4">
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
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />

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
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
                <Input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  minLength={6}
                  required
                />

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
              <span className="bg-[#0f0a15] px-2 text-gray-400">
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

          {isMobile && !isInPhantom && (
            <p className="text-xs text-gray-400 text-center">
              Tap to open this page in Phantom&apos;s browser for wallet connection
            </p>
          )}

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
      </div>
    </div>
  );
}
