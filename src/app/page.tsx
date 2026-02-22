'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          TaskFlow
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your Team Collaboration Platform
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started
          </Link>
          <Link
            href="/register"
            className="inline-block bg-white text-gray-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
