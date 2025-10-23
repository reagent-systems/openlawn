'use client';

import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '@/lib/env';

export function EnvCheck() {
  const [envStatus, setEnvStatus] = useState<{
    firebase: boolean;
    googleMaps: boolean;
    googleAI: boolean;
  }>({
    firebase: false,
    googleMaps: false,
    googleAI: false,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      setEnvStatus({
        firebase: isFirebaseConfigured(),
        googleMaps: !!(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
        googleAI: !!(process.env.GOOGLE_AI_API_KEY),
      });
    }
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
      <div className="font-bold mb-2">Environment Check</div>
      <div className="space-y-1">
        <div className={envStatus.firebase ? 'text-green-400' : 'text-red-400'}>
          Firebase: {envStatus.firebase ? '✓' : '✗'}
        </div>
        <div className={envStatus.googleMaps ? 'text-green-400' : 'text-red-400'}>
          Google Maps: {envStatus.googleMaps ? '✓' : '✗'}
        </div>
        <div className={envStatus.googleAI ? 'text-green-400' : 'text-red-400'}>
          Google AI: {envStatus.googleAI ? '✓' : '✗'}
        </div>
      </div>
    </div>
  );
} 