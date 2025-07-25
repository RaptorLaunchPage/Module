import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProviderV3 } from "@/hooks/use-auth-v3"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { RouteGuardV3 } from "@/components/route-guard-v3"
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
            <AuthProviderV3>
              <RouteGuardV3>
                {children}
              </RouteGuardV3>
              <Toaster />
            </AuthProviderV3>
          </ThemeProvider>
        </LoadingErrorBoundary>
      </body>
    </html>
  )
}
