'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CookieNotice from '@/components/layout/CookieNotice';
import NearbyFoodAlert from '@/components/donations/NearbyFoodAlert';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) {
    return <main id="main-content" className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <NearbyFoodAlert />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <CookieNotice />
    </>
  );
}
