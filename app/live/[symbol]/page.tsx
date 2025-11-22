'use client';
import React from 'react';
import { notFound } from 'next/navigation';
import { LiveStreamPage } from '@/components/pages/LiveStreamPage';
import { useTokenStore } from '@/stores/tokenStore';

interface LivePageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default function LivePage({ params }: LivePageProps) {
  const resolvedParams = React.use(params);
  const { getTokenBySymbol } = useTokenStore();
  const creator = getTokenBySymbol(resolvedParams.symbol);

  if (!creator) {
    notFound();
  }

  if (!creator.isLive) {
    // Redirect to token page if not live
    notFound();
  }

  return <LiveStreamPage creator={creator} />;
}