import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProviderV2 } from "@/hooks/use-auth-v2"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { RouteGuardV2 } from "@/components/route-guard-v2"
import { LoadingErrorBoundary } from "@/components/loading-error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Raptor Esports CRM",
  description: "Professional esports team management system",
  generator: 'v0.dev'
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
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <AuthProviderV2>
              <RouteGuardV2>
                {children}
              </RouteGuardV2>
              <Toaster />
            </AuthProviderV2>
          </ThemeProvider>
        </LoadingErrorBoundary>
      </body>
    </html>
  )
}
