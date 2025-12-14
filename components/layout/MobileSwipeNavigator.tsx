'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Pages in order for swipe navigation
const NAV_PAGES = ['/', '/live', '/explore', '/profile'];

interface MobileSwipeNavigatorProps {
  children: React.ReactNode;
}

export function MobileSwipeNavigator({ children }: MobileSwipeNavigatorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [username, setUsername] = useState<string | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch username for profile page
  useEffect(() => {
    const fetchUsername = async () => {
      if (!session?.user) return;
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.username) {
            setUsername(data.user.username);
          }
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };
    fetchUsername();
  }, [session]);

  // Get current page index, handling profile path variations
  const getCurrentPageIndex = useCallback(() => {
    if (pathname === '/') return 0;
    if (pathname === '/live') return 1;
    if (pathname === '/explore') return 2;
    if (pathname.startsWith('/profile')) return 3;
    return -1; // Not a swipeable page
  }, [pathname]);

  const currentIndex = getCurrentPageIndex();

  // Don't enable swipe on non-main pages
  const isSwipeable = currentIndex !== -1;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isSwipeable || isTransitioning) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipeOffset(0);
  }, [isSwipeable, isTransitioning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current || !isSwipeable || isTransitioning) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      // Prevent vertical scroll when swiping horizontally
      e.preventDefault();

      // Add resistance at edges
      const atLeftEdge = currentIndex === 0 && diffX > 0;
      const atRightEdge = currentIndex === NAV_PAGES.length - 1 && diffX < 0;

      if (atLeftEdge || atRightEdge) {
        setSwipeOffset(diffX * 0.2); // More resistance at edges
      } else {
        setSwipeOffset(diffX * 0.4);
      }
    }
  }, [isSwipeable, isTransitioning, currentIndex]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !isSwipeable || isTransitioning) return;

    const minSwipeDistance = 80;

    if (Math.abs(swipeOffset) > minSwipeDistance * 0.4) {
      if (swipeOffset < 0 && currentIndex < NAV_PAGES.length - 1) {
        // Swipe left - go to next page
        setIsTransitioning(true);
        setSwipeOffset(-window.innerWidth * 0.3);

        setTimeout(() => {
          let nextPage = NAV_PAGES[currentIndex + 1];
          // Handle profile page with username
          if (nextPage === '/profile' && username) {
            nextPage = `/profile/${username}`;
          }
          router.push(nextPage);
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else if (swipeOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous page
        setIsTransitioning(true);
        setSwipeOffset(window.innerWidth * 0.3);

        setTimeout(() => {
          let prevPage = NAV_PAGES[currentIndex - 1];
          // Handle profile page with username
          if (prevPage === '/profile' && username) {
            prevPage = `/profile/${username}`;
          }
          router.push(prevPage);
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else {
        // Snap back
        setSwipeOffset(0);
      }
    } else {
      // Snap back
      setSwipeOffset(0);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [isSwipeable, isTransitioning, swipeOffset, currentIndex, router, username]);

  // Only show on mobile
  return (
    <div
      ref={containerRef}
      className="lg:hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
        transition: isTransitioning ? 'transform 150ms ease-out' : 'transform 50ms ease-out',
      }}
    >
      {children}
    </div>
  );
}
