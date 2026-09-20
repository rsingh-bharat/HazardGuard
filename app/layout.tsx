import type { Metadata } from "next";
import React, { Suspense } from "react";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { MeghDoot } from "@/components/ai/MeghDoot";
import { LiveForecastProvider } from "@/lib/state/LiveForecastContext";

export const metadata: Metadata = {
  title: "HazardGuard · Tactical AI Rainfall & Impact Intelligence",
  description:
    "Regime-Aware AI Post-Processing & 3D Rainfall-to-Impact Digital Twin for NDMA/SDMA emergency operations. Smart India Hackathon 2026 (SIH26080).",
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
        {/* Aurora design system fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased overflow-hidden"
        style={{ background: "#04121b", color: "#ffffff" }}
      >
        {/*
          Aurora layout shell:
          - Navbar is now the Aurora left floating glass CommandRail (position: fixed)
          - Main content uses aurora-content (margin-left: 104px) for the sidebar offset
          - AlertBanner is a thin glass strip at top of content area
          - MeghDoot floats as a glass drawer
        */}
        <Suspense fallback={null}>
          <LiveForecastProvider>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <AlertBanner />
            <main className="aurora-content min-h-screen overflow-x-hidden">
              <Suspense fallback={null}>{children}</Suspense>
            </main>
            <MeghDoot mode="floating" />
          </LiveForecastProvider>
        </Suspense>

      </body>
    </html>
  );
}
