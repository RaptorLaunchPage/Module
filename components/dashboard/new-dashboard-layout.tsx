"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  Home, 
  BarChart3, 
  Users, 
  Target, 
  DollarSign, 
  UserCheck, 
  User, 
  Bell, 
  Settings, 
  LogOut,
  ChevronDown,
  CalendarCheck,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const iconMap = {
  Home,
  BarChart3,
  Users,
  Target,
  DollarSign,
  UserCheck,
  User,
  CalendarCheck,
  UserPlus
}

interface NewDashboardLayoutProps {
  children: React.ReactNode
}

export function NewDashboardLayout({ children }: NewDashboardLayoutProps) {
  const { profile, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-indigo-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Profile Required</h2>
          <p className="text-gray-600">Please complete your profile setup to access the dashboard.</p>
          <Button onClick={() => router.push('/auth/login')}>
            Return to Login
          </Button>
        </div>
      </div>
    )
  }

  const userRole = profile.role as UserRole
  const navigationModules = DashboardPermissions.getNavigationModules(userRole)
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true
    if (path !== '/dashboard' && pathname.startsWith(path)) return true
    return false
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const NavigationItems = () => (
    <>
      {navigationModules.map((module) => {
        const IconComponent = iconMap[module.icon as keyof typeof iconMap] || Home
        const isActive = isActiveRoute(module.path)
        
        return (
          <Link
            key={module.id}
            href={module.path}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <IconComponent className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{module.title}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/80 backdrop-blur-sm">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Menu Header */}
                  <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 border-2 border-white">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-white text-indigo-600 font-semibold">
                          {profile.name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {profile.name || profile.email}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={`bg-${roleInfo.color}-100 text-${roleInfo.color}-800 text-xs`}
                        >
                          {roleInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="flex-1 p-4 space-y-2">
                    <NavigationItems />
                  </div>

                  {/* Mobile Footer */}
                  <div className="p-4 border-t space-y-2">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-gray-900">Raptor Hub</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {profile.name?.charAt(0) || profile.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <div className="lg:flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-1 bg-white/90 backdrop-blur-md shadow-xl border-r border-white/20">
            {/* Desktop Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <img 
                    src="/RLogo.ico" 
                    alt="Raptor Hub" 
                    className="h-10 w-10 rounded-full bg-white p-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white">Raptor Hub</h1>
                  <p className="text-indigo-200 text-sm truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="px-6 py-4 border-b">
              <Badge 
                variant="secondary" 
                className={`bg-${roleInfo.color}-100 text-${roleInfo.color}-800 w-full justify-center py-2`}
              >
                {roleInfo.label}
              </Badge>
            </div>

            {/* Desktop Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              <NavigationItems />
            </nav>

            {/* Desktop Footer */}
            <div className="px-4 py-4 border-t space-y-2">
              <Link
                href="/dashboard/profile"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left truncate">
                      {profile.name || 'Profile'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}