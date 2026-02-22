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

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaskFlow - Team Collaboration Platform',
  description: 'Manage your projects and tasks efficiently with your team',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <Providers>
          <SearchProvider>
            {/* Page Loading Indicator */}
            <PageLoadingIndicator />
            
            {/* Toast Notifications */}
            <Toaster position="top-right" richColors />
            
            {/* Global Timer Widget */}
            <GlobalTimer />
            
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
          </SearchProvider>
        </Providers>
      </body>
    </html>
  )
}
