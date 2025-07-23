import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth-provider"
import { AgreementProvider } from "@/hooks/use-agreement-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { AgreementRouteGuard } from "@/components/agreement-route-guard"
import { AgreementModal } from "@/components/agreement-modal"

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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <AgreementProvider>
              <AgreementRouteGuard>
                {children}
              </AgreementRouteGuard>
              <AgreementModal />
            </AgreementProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
