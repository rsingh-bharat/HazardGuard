import React, { Suspense } from "react";
import HomePageClient from "./_HomePageClient";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full h-screen items-center justify-center" style={{ background: "#04121b" }}>
          <div style={{ color: "rgba(255,255,255,.55)", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Loading Command Center…
          </div>
        </div>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
