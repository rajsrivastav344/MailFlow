'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    // This will show in browser console
    console.log('🔧 API URL from env:', process.env.NEXT_PUBLIC_API_URL);
  }, []);

  // ... rest of your component
}