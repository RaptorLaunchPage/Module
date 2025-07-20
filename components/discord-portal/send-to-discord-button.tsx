"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { MessageSquare, Send, Eye, Loader2 } from "lucide-react"
import type { MessageType } from "@/modules/discord-portal"

interface SendToDiscordButtonProps {
  messageType: MessageType
  data: any
  teamId?: string
  webhookTypes?: ('team' | 'admin' | 'global')[]
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  children?: React.ReactNode
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
    icon_url?: string
  }
  timestamp?: string
}

export function SendToDiscordButton({
  messageType,
  data,
  teamId,
  webhookTypes = ['team'],
  disabled = false,
  variant = 'outline',
  size = 'default',
  children
}: SendToDiscordButtonProps) {
  const { profile, getToken } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [preview, setPreview] = useState<{ embeds: DiscordEmbed[] } | null>(null)

  // Check if user has permission to send messages
  const canSendMessages = profile?.role && ['admin', 'manager', 'coach', 'analyst'].includes(profile.role)

  const generatePreview = async () => {
    if (!canSendMessages) return

    setIsLoading(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/discord-portal/send?messageType=${messageType}&data=${encodeURIComponent(JSON.stringify(data))}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setPreview(result.preview)
      } else {
        const error = await response.json()
        toast({
          title: "Preview Error",
          description: error.error || "Failed to generate preview",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      toast({
        title: "Preview Error",
        description: "Failed to generate message preview",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!canSendMessages) return

    setIsSending(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/discord-portal/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageType,
          data,
          teamId,
          webhookTypes
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Message Sent!",
          description: "Successfully sent to Discord",
        })
        setIsOpen(false)
      } else {
        const error = await response.json()
        toast({
          title: "Send Failed",
          description: error.error || "Failed to send message to Discord",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Send Failed",
        description: "Network error while sending message",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  const formatColorForDisplay = (color?: number) => {
    if (!color) return '#000000'
    return `#${color.toString(16).padStart(6, '0')}`
  }

  const getMessageTypeDisplayName = (type: MessageType) => {
    const names: Record<MessageType, string> = {
      slot_create: 'Slot Created',
      slot_update: 'Slot Updated',
      roster_update: 'Roster Updated',
      performance_summary: 'Performance Report',
      attendance_summary: 'Attendance Report',
      expense_summary: 'Expense Report',
      winnings_summary: 'Winnings Report',
      daily_summary: 'Daily Summary',
      weekly_digest: 'Weekly Digest',
      analytics_trend: 'Analytics Trend',
      system_alert: 'System Alert',
      data_cleanup: 'Data Cleanup'
    }
    return names[type] || type
  }

  if (!canSendMessages) {
    return null // Don't show button if user can't send messages
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          onClick={generatePreview}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {children || 'Send to Discord'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send to Discord
          </DialogTitle>
          <DialogDescription>
            Preview and send this {getMessageTypeDisplayName(messageType).toLowerCase()} to Discord
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Type & Target Info */}
          <div className="flex gap-2">
            <Badge variant="outline">{getMessageTypeDisplayName(messageType)}</Badge>
            <Badge variant="secondary">
              {webhookTypes.includes('team') && 'Team'}
              {webhookTypes.includes('admin') && ' Admin'}
              {webhookTypes.includes('global') && ' Global'}
            </Badge>
          </div>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Message Preview
              </CardTitle>
              <CardDescription>
                This is how your message will appear in Discord
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Generating preview...
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {preview.embeds.map((embed, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/20">
                      {/* Embed Color Bar */}
                      {embed.color && (
                        <div 
                          className="w-1 h-full absolute left-0 top-0 rounded-l-lg"
                          style={{ backgroundColor: formatColorForDisplay(embed.color) }}
                        />
                      )}
                      
                      {/* Embed Title */}
                      {embed.title && (
                        <h3 className="font-semibold text-lg mb-2">{embed.title}</h3>
                      )}
                      
                      {/* Embed Description */}
                      {embed.description && (
                        <p className="text-sm text-muted-foreground mb-3">{embed.description}</p>
                      )}
                      
                      {/* Embed Fields */}
                      {embed.fields && embed.fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          {embed.fields.map((field, fieldIndex) => (
                            <div key={fieldIndex} className={field.inline ? '' : 'col-span-full'}>
                              <div className="font-medium text-sm">{field.name}</div>
                              <div className="text-sm text-muted-foreground">{field.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Embed Footer */}
                      {embed.footer && (
                        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                          {embed.footer.text}
                          {embed.timestamp && (
                            <span className="ml-2">
                              • {new Date(embed.timestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click the button above to generate a preview
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendMessage} 
              disabled={!preview || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to Discord
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}