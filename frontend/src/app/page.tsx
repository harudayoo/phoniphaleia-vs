// frontend/src/pages/index.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingPage from '@/screens/LoadingPage';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('auth/login');
  }, [router]);
  
  return (
    <LoadingPage/>
  );
}