import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProviderV2 } from "@/hooks/use-auth-v2"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { RouteGuardV2 } from "@/components/route-guard-v2"
import { LoadingErrorBoundary } from "@/components/loading-error-boundary"
import { GlobalLoadingProvider } from "@/lib/global-loading-manager"
import GlobalLoading from "@/components/ui/global-loading"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Raptor Esports Hub",
  description: "Official management hub for Raptor Esports - Professional esports team management system",
  generator: 'Raptor Esports Hub v1.0',
  keywords: ['Raptor Esports', 'esports', 'team management', 'gaming', 'tournament'],
  authors: [{ name: 'Raptor Esports' }],
  creator: 'Raptor Esports',
  publisher: 'Raptor Esports',
  applicationName: 'Raptor Esports Hub'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-transparent`}>
        <LoadingErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <GlobalLoadingProvider>
              <AuthProviderV2>
                <RouteGuardV2>
                  {children}
                </RouteGuardV2>
                <GlobalLoading />
                <Toaster />
              </AuthProviderV2>
            </GlobalLoadingProvider>
          </ThemeProvider>
        </LoadingErrorBoundary>
      </body>
    </html>
  )
}
