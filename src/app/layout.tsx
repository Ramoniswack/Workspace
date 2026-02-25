'use client';

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ClickUpSidebar } from '@/components/sidebar/ClickUpSidebar'
import { Header } from '@/components/Header'
import { SearchProvider } from '@/components/search/SearchProvider'
import GlobalTimer from '@/components/layout/GlobalTimer'
import { PageLoadingIndicator } from '@/components/layout/PageLoadingIndicator'
import { Toaster } from 'sonner'
import { usePathname } from 'next/navigation'
import Head from 'next/head'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  
  // Check if current page is an auth page (login, register, join, forgot-password)
  const isAuthPage = pathname === '/login' || 
                      pathname === '/register' || 
                      pathname === '/join' || 
                      pathname?.startsWith('/auth/');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} ${inter.variable} bg-background text-foreground font-display`}>
        <Providers>
          <SearchProvider>
            {/* Page Loading Indicator */}
            <PageLoadingIndicator />
            
            {/* Toast Notifications */}
            <Toaster position="top-right" richColors />
            
            {/* Global Timer Widget - Hide on auth pages */}
            {!isAuthPage && <GlobalTimer />}
            
            {isAuthPage ? (
              // Auth pages - no sidebar or header
              <main className="min-h-screen">
                {children}
              </main>
            ) : (
              // Regular pages - with sidebar and header
              <div className="flex h-screen overflow-hidden bg-background">
                {/* ClickUp Style Sidebar - Hidden on mobile, visible on desktop */}
                <div className="hidden lg:flex">
                  <ClickUpSidebar />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Header */}
                  <Header />

                  {/* Page Content */}
                  <main className="flex-1 overflow-auto bg-background">
                    {children}
                  </main>
                </div>
              </div>
            )}
          </SearchProvider>
        </Providers>
      </body>
    </html>
  )
}
