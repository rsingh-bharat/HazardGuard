import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { AlertBanner } from '@/components/layout/AlertBanner';
import { MeghDoot } from '@/components/ai/MeghDoot';

export const metadata: Metadata = {
  title: 'HazardGuard · Tactical AI Rainfall & Impact Intelligence',
  description:
    'Regime-Aware AI Post-Processing & 3D Rainfall-to-Impact Digital Twin for NDMA/SDMA emergency operations. Smart India Hackathon 2026 (SIH26080).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,600;1,700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-graphite-950 text-paper font-sans antialiased overflow-x-hidden selection:bg-chartreuse selection:text-graphite-950">
        {/*
          Suspense boundary here catches usePathname() in Navbar and any
          useSearchParams() calls from child pages during static prerendering.
          This is the canonical Next.js 14 App Router fix for the
          "useSearchParams() should be wrapped in a suspense boundary" error.
        */}
        <Suspense fallback={<div className="h-14 bg-graphite-950 border-b border-graphite-800" />}>
          <Navbar />
        </Suspense>
        <AlertBanner />
        <main className="pt-14 min-h-[calc(100vh-56px)]">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
        <MeghDoot mode="floating" />
      </body>
    </html>
  );
}
