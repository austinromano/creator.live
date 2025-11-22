'use client';
import React from 'react';
import { notFound } from 'next/navigation';
import { TokenDetailPage } from '@/components/pages/TokenDetailPage';
import { useTokenStore } from '@/stores/tokenStore';

interface TokenPageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default function TokenPage({ params }: TokenPageProps) {
  const resolvedParams = React.use(params);
  const { getTokenBySymbol } = useTokenStore();
  const creator = getTokenBySymbol(resolvedParams.symbol);

  if (!creator) {
    notFound();
  }

  return <TokenDetailPage creator={creator} />;
}