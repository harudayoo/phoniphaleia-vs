// frontend/src/pages/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('auth/Login');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to login...</p>
    </div>
  );
}