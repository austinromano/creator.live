'use client';
// Dev branch test
import { Suspense } from 'react';
import { Homepage } from '@/components/pages/Homepage';

function HomePageWrapper() {
  return <Homepage />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageWrapper />
    </Suspense>
  );
}
