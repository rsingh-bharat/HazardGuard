'use client'

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { VerificationPanel } from '@/components/verification/VerificationPanel';
import { VerificationResult } from '@/lib/contracts/verification';
import mockVerification from '@/data/mock/verification.json';

export default function VerificationPage() {
  const [results, setResults] = useState<VerificationResult[]>(mockVerification as VerificationResult[]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchVerification() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/verification');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setResults(json.data);
        }
      } catch (err) {
        console.warn('Verification API fetch fallback:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVerification();
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-graphite-950 pb-12 font-mono">
      <VerificationPanel results={results} />
    </div>
  );
}
