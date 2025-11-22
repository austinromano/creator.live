'use client';
import { useEffect } from 'react';
import { CreateTokenPage } from '@/components/pages/CreateTokenPage';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function CreatePage() {
  const { data: session, status } = useSession();
  const { setShowAuthModal } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not authenticated
    if (status === 'unauthenticated') {
      const timer = setTimeout(() => {
        router.push('/');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // Show login required message
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="bg-gray-900 border-gray-800 p-8 max-w-md w-full text-center">
          <Lock className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 mb-6">
            You need to create an account before you can launch a token
          </p>
          <Button
            onClick={() => setShowAuthModal(true)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Sign Up / Login
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Redirecting to homepage in 3 seconds...
          </p>
        </Card>
      </div>
    );
  }

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return <CreateTokenPage />;
}