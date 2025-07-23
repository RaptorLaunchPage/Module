"use client"

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, Monitor, Sun, Moon, Smartphone, Eye, Volume2, Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ThemeSettingsPage() {
  const { theme, setTheme, themes } = useTheme()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  
  // Local state for settings
  const [settings, setSettings] = useState({
    reducedMotion: false,
    highContrast: false,
    fontSize: [16],
    autoNightMode: false,
    nightModeStart: '22:00',
    nightModeEnd: '06:00',
    compactMode: false,
    showAnimations: true,
    soundEffects: true,
    notificationSounds: true,
    visualNotifications: true
  })

  useEffect(() => {
    setMounted(true)
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('raptor-theme-settings')
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) })
    }
  }, [])

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings)
    localStorage.setItem('raptor-theme-settings', JSON.stringify(newSettings))
    toast({
      title: "Settings Saved",
      description: "Your theme preferences have been updated.",
    })
  }

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Theme & Display</h1>
            <p className="text-gray-600">Loading theme settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Theme & Display</h1>
          <p className="text-gray-600">Customize your Raptor Esports Hub experience</p>
        </div>
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light Mode
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark Mode
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System Preference
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-night" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Auto Night Mode
              </Label>
              <Switch
                id="auto-night"
                checked={settings.autoNightMode}
                onCheckedChange={(checked) => handleSettingChange('autoNightMode', checked)}
              />
            </div>
            
            {settings.autoNightMode && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <Label htmlFor="night-start" className="text-sm">Start Time</Label>
                  <Select value={settings.nightModeStart} onValueChange={(value) => handleSettingChange('nightModeStart', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="night-end" className="text-sm">End Time</Label>
                  <Select value={settings.nightModeEnd} onValueChange={(value) => handleSettingChange('nightModeEnd', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Display Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="font-size" className="mb-3 block">
                Font Size: {settings.fontSize[0]}px
              </Label>
              <Slider
                id="font-size"
                min={12}
                max={24}
                step={1}
                value={settings.fontSize}
                onValueChange={(value) => handleSettingChange('fontSize', value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <Switch
                id="compact-mode"
                checked={settings.compactMode}
                onCheckedChange={(checked) => handleSettingChange('compactMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="high-contrast">High Contrast</Label>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reduced-motion">Reduce Motion</Label>
              <Switch
                id="reduced-motion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-animations">Show Animations</Label>
              <Switch
                id="show-animations"
                checked={settings.showAnimations}
                onCheckedChange={(checked) => handleSettingChange('showAnimations', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-effects" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Sound Effects
            </Label>
            <Switch
              id="sound-effects"
              checked={settings.soundEffects}
              onCheckedChange={(checked) => handleSettingChange('soundEffects', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notification-sounds" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Sounds
            </Label>
            <Switch
              id="notification-sounds"
              checked={settings.notificationSounds}
              onCheckedChange={(checked) => handleSettingChange('notificationSounds', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="visual-notifications">Visual Notifications</Label>
            <Switch
              id="visual-notifications"
              checked={settings.visualNotifications}
              onCheckedChange={(checked) => handleSettingChange('visualNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <h3 className="font-semibold mb-2">Raptor Esports Hub</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This is how your interface will look with the current settings.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="default">Primary Button</Button>
              <Button size="sm" variant="outline">Secondary Button</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset to Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Reset Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Reset all theme and display settings to their default values.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem('raptor-theme-settings')
              setTheme('system')
              setSettings({
                reducedMotion: false,
                highContrast: false,
                fontSize: [16],
                autoNightMode: false,
                nightModeStart: '22:00',
                nightModeEnd: '06:00',
                compactMode: false,
                showAnimations: true,
                soundEffects: true,
                notificationSounds: true,
                visualNotifications: true
              })
              toast({
                title: "Settings Reset",
                description: "All theme settings have been reset to defaults.",
              })
            }}
          >
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
