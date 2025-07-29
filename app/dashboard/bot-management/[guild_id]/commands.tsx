'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Terminal,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Code,
  Zap,
  Settings,
  History,
  Info,
  User,
  Calendar,
  Trophy,
  Users,
  BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPermissions } from '@/lib/dashboard-permissions'
import { toast } from 'sonner'

interface BotCommand {
  name: string
  description: string
  category: 'performance' | 'attendance' | 'admin' | 'utility' | 'tournament'
  parameters: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'user' | 'choice'
    description: string
    required: boolean
    choices?: string[]
  }>
  usage: string
  permissions: string[]
  cooldown?: number
}

interface CommandExecution {
  id: string
  command: string
  parameters: Record<string, any>
  status: 'pending' | 'success' | 'error'
  output: string
  timestamp: Date
  execution_time?: number
}

const AVAILABLE_COMMANDS: BotCommand[] = [
  {
    name: 'performance',
    description: 'Upload and analyze performance data from screenshots',
    category: 'performance',
    parameters: [
      { name: 'image', type: 'string', description: 'Screenshot URL or file', required: true },
      { name: 'player', type: 'user', description: 'Player to associate data with', required: false }
    ],
    usage: '/performance <image> [player]',
    permissions: ['player', 'coach', 'admin']
  },
  {
    name: 'reviewteam',
    description: 'Generate AI-powered team performance review',
    category: 'performance',
    parameters: [
      { name: 'days', type: 'number', description: 'Number of days to analyze', required: false },
      { name: 'format', type: 'choice', description: 'Output format', required: false, choices: ['brief', 'detailed'] }
    ],
    usage: '/reviewteam [days] [format]',
    permissions: ['coach', 'admin']
  },
  {
    name: 'attendance',
    description: 'Mark attendance for practice sessions',
    category: 'attendance',
    parameters: [
      { name: 'status', type: 'choice', description: 'Attendance status', required: true, choices: ['present', 'late', 'absent'] },
      { name: 'player', type: 'user', description: 'Player (defaults to self)', required: false },
      { name: 'session', type: 'string', description: 'Session identifier', required: false }
    ],
    usage: '/attendance <status> [player] [session]',
    permissions: ['player', 'coach', 'admin']
  },
  {
    name: 'attendanceai',
    description: 'Get AI analysis of attendance patterns',
    category: 'attendance',
    parameters: [
      { name: 'player', type: 'user', description: 'Specific player to analyze', required: false },
      { name: 'period', type: 'choice', description: 'Time period', required: false, choices: ['week', 'month', 'season'] }
    ],
    usage: '/attendanceai [player] [period]',
    permissions: ['coach', 'admin']
  },
  {
    name: 'screate',
    description: 'Create a new scrim tournament',
    category: 'tournament',
    parameters: [
      { name: 'name', type: 'string', description: 'Tournament name', required: true },
      { name: 'slots', type: 'number', description: 'Number of team slots', required: true },
      { name: 'date', type: 'string', description: 'Tournament date', required: true },
      { name: 'entry_fee', type: 'number', description: 'Entry fee per team', required: false }
    ],
    usage: '/screate <name> <slots> <date> [entry_fee]',
    permissions: ['admin']
  },
  {
    name: 'digest',
    description: 'Generate daily/weekly digest report',
    category: 'utility',
    parameters: [
      { name: 'type', type: 'choice', description: 'Digest type', required: false, choices: ['daily', 'weekly'] },
      { name: 'send', type: 'boolean', description: 'Send to configured webhook', required: false }
    ],
    usage: '/digest [type] [send]',
    permissions: ['coach', 'admin']
  },
  {
    name: 'idp',
    description: 'Share tournament room ID and password',
    category: 'tournament',
    parameters: [
      { name: 'tournament_id', type: 'string', description: 'Tournament identifier', required: true },
      { name: 'room_id', type: 'string', description: 'Game room ID', required: true },
      { name: 'password', type: 'string', description: 'Room password', required: true }
    ],
    usage: '/idp <tournament_id> <room_id> <password>',
    permissions: ['admin']
  },
  {
    name: 'stats',
    description: 'Get player or team statistics',
    category: 'performance',
    parameters: [
      { name: 'target', type: 'choice', description: 'Stats target', required: true, choices: ['player', 'team'] },
      { name: 'player', type: 'user', description: 'Player (if target is player)', required: false },
      { name: 'days', type: 'number', description: 'Number of days to analyze', required: false }
    ],
    usage: '/stats <target> [player] [days]',
    permissions: ['player', 'coach', 'admin']
  }
]

export default function CommandsPage() {
  const params = useParams()
  const { profile } = useAuth()
  const guildId = params.guild_id as string
  
  const [selectedCommand, setSelectedCommand] = useState<BotCommand | null>(null)
  const [commandParams, setCommandParams] = useState<Record<string, any>>({})
  const [executions, setExecutions] = useState<CommandExecution[]>([])
  const [executing, setExecuting] = useState(false)
  const [showCommandDialog, setShowCommandDialog] = useState(false)

  const canManage = DashboardPermissions.getDataPermissions(profile?.role, 'discord-portal').canEdit
  const userPermissions = profile?.role ? [profile.role] : []

  // Filter commands based on user permissions
  const availableCommands = AVAILABLE_COMMANDS.filter(cmd => 
    cmd.permissions.some(perm => userPermissions.includes(perm) || userPermissions.includes('admin'))
  )

  const executeCommand = async () => {
    if (!selectedCommand || !canManage) {
      toast.error('You do not have permission to execute commands')
      return
    }

    // Validate required parameters
    const missingRequired = selectedCommand.parameters
      .filter(param => param.required && !commandParams[param.name])
      .map(param => param.name)

    if (missingRequired.length > 0) {
      toast.error(`Missing required parameters: ${missingRequired.join(', ')}`)
      return
    }

    setExecuting(true)

    const execution: CommandExecution = {
      id: Date.now().toString(),
      command: selectedCommand.name,
      parameters: { ...commandParams },
      status: 'pending',
      output: 'Executing command...',
      timestamp: new Date()
    }

    setExecutions(prev => [execution, ...prev])

    try {
      // Simulate command execution with mock responses
      await simulateCommandExecution(execution)
      
    } catch (error) {
      console.error('Command execution error:', error)
      updateExecution(execution.id, {
        status: 'error',
        output: 'Command execution failed',
        execution_time: Date.now() - execution.timestamp.getTime()
      })
    } finally {
      setExecuting(false)
    }
  }

  const simulateCommandExecution = async (execution: CommandExecution) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const mockResponses: Record<string, string> = {
      'performance': `✅ Performance data uploaded successfully!\n📊 Kills: 8, Damage: 1,245, Placement: #3\n🎯 Analysis: Strong aggressive play, good positioning`,
      'reviewteam': `🔍 **Team Performance Review (Last 30 Days)**\n\n📈 **Overall Performance:**\n• Average Placement: #12.4 (↑ 3.2 from last period)\n• Average Kills: 2.8 per match\n• Win Rate: 24%\n\n🎯 **Key Strengths:**\n• Consistent early game rotations\n• Good team coordination in fights\n• Improving late game positioning\n\n⚠️ **Areas for Improvement:**\n• Mid-game decision making\n• Individual mechanical skills\n• Loot priority management\n\n💡 **Recommendations:**\n1. Focus on zone positioning drills\n2. Practice 1v1 scenarios in training\n3. Review VODs of top 5 finishes`,
      'attendance': `✅ Attendance marked: **Present**\n📅 Session: Practice - ${new Date().toLocaleDateString()}\n👥 Team attendance rate: 85%`,
      'attendanceai': `🤖 **AI Attendance Analysis**\n\n📊 **Player: ${execution.parameters.player || 'Team Overview'}**\n• Attendance Rate: 92% (↑ 5% this month)\n• Current Streak: 8 sessions\n• Missed Sessions: 2 (both excused)\n\n🎯 **Insights:**\n• Very consistent attendance pattern\n• Strong commitment to practice\n• No concerning trends detected\n\n💡 **Recommendation:** Maintain current schedule`,
      'screate': `🏆 **Tournament Created Successfully!**\n\n📝 **Details:**\n• Name: ${execution.parameters.name}\n• Slots: ${execution.parameters.slots} teams\n• Date: ${execution.parameters.date}\n${execution.parameters.entry_fee ? `• Entry Fee: ₹${execution.parameters.entry_fee}` : '• Entry Fee: Free'}\n\n🎮 Registration is now open!\nUse \`/sregister\` to join the tournament.`,
      'digest': `📰 **${execution.parameters.type || 'Daily'} Digest Generated**\n\n📊 **Performance Summary:**\n• Matches Played: 15\n• Average Placement: #18.3\n• Top Performer: PlayerX (4.2 avg kills)\n\n📅 **Attendance:**\n• Team Rate: 88%\n• Most Consistent: PlayerY (100%)\n\n${execution.parameters.send ? '✅ Digest sent to configured channel' : '📝 Digest ready for manual sharing'}`,
      'idp': `🔐 **Tournament Room Details**\n\n🎮 **Room Information:**\n• Tournament: ${execution.parameters.tournament_id}\n• Room ID: \`${execution.parameters.room_id}\`\n• Password: \`${execution.parameters.password}\`\n\n⏰ **Important:** Please join 10 minutes before start time!\n🚨 **Do not share these details publicly**`,
      'stats': `📊 **${execution.parameters.target === 'team' ? 'Team' : 'Player'} Statistics**\n\n${execution.parameters.target === 'team' ? 
        `🏆 **Team Performance (Last ${execution.parameters.days || 30} days):**\n• Total Matches: 25\n• Average Placement: #15.8\n• Win Rate: 16%\n• Total Kills: 145\n• Best Placement: #1` :
        `👤 **Player: ${execution.parameters.player || 'Current User'}**\n• Matches: 18\n• Avg Kills: 3.2\n• Avg Damage: 1,180\n• Avg Placement: #22.1\n• Best Game: 12 kills, #1 placement`
      }`
    }

    const output = mockResponses[execution.command] || `✅ Command '${execution.command}' executed successfully`
    const success = Math.random() > 0.1 // 90% success rate

    updateExecution(execution.id, {
      status: success ? 'success' : 'error',
      output: success ? output : `❌ Command failed: ${['Rate limited', 'Invalid parameters', 'Bot offline', 'Permission denied'][Math.floor(Math.random() * 4)]}`,
      execution_time: Date.now() - execution.timestamp.getTime()
    })
  }

  const updateExecution = (id: string, updates: Partial<CommandExecution>) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === id ? { ...exec, ...updates } : exec
    ))
  }

  const getCommandsByCategory = () => {
    const categories = availableCommands.reduce((acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = []
      acc[cmd.category].push(cmd)
      return acc
    }, {} as Record<string, BotCommand[]>)

    return categories
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return <BarChart3 className="w-4 h-4" />
      case 'attendance': return <Calendar className="w-4 h-4" />
      case 'admin': return <Settings className="w-4 h-4" />
      case 'utility': return <Zap className="w-4 h-4" />
      case 'tournament': return <Trophy className="w-4 h-4" />
      default: return <Terminal className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: CommandExecution['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const renderParameterInput = (param: BotCommand['parameters'][0]) => {
    const value = commandParams[param.name] || ''

    switch (param.type) {
      case 'choice':
        return (
          <Select
            value={value}
            onValueChange={(val) => setCommandParams(prev => ({ ...prev, [param.name]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${param.name}`} />
            </SelectTrigger>
            <SelectContent>
              {param.choices?.map((choice) => (
                <SelectItem key={choice} value={choice}>
                  {choice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'boolean':
        return (
          <Select
            value={value.toString()}
            onValueChange={(val) => setCommandParams(prev => ({ ...prev, [param.name]: val === 'true' }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: parseInt(e.target.value) || 0 }))}
            placeholder={`Enter ${param.name}`}
          />
        )
      case 'user':
        return (
          <Input
            value={value}
            onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: e.target.value }))}
            placeholder="@username or User ID"
          />
        )
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: e.target.value }))}
            placeholder={`Enter ${param.name}`}
          />
        )
    }
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <CardTitle className="text-red-400">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You don't have permission to execute bot commands.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Bot Command Testing
          </CardTitle>
          <p className="text-muted-foreground">
            Test and debug bot commands directly from the dashboard. Simulate command execution with live output.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Command Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(getCommandsByCategory()).map(([category, commands]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {getCategoryIcon(category)}
                    <span className="capitalize">{category}</span>
                  </div>
                  <div className="space-y-1">
                    {commands.map((command) => (
                      <Button
                        key={command.name}
                        variant={selectedCommand?.name === command.name ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setSelectedCommand(command)
                          setCommandParams({})
                        }}
                      >
                        <Code className="w-3 h-3 mr-2" />
                        /{command.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Command Configuration & Execution */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCommand ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      /{selectedCommand.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCommand.description}
                    </p>
                  </div>
                  <Badge variant="outline">{selectedCommand.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage */}
                <div>
                  <Label className="text-xs font-medium">Usage</Label>
                  <code className="block mt-1 p-2 bg-muted rounded text-sm">
                    {selectedCommand.usage}
                  </code>
                </div>

                {/* Parameters */}
                {selectedCommand.parameters.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Parameters</Label>
                    {selectedCommand.parameters.map((param) => (
                      <div key={param.name} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={param.name} className="text-sm">
                            {param.name}
                          </Label>
                          {param.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {renderParameterInput(param)}
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Execute Button */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={executeCommand}
                    disabled={executing}
                    className="flex items-center gap-2"
                  >
                    {executing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {executing ? 'Executing...' : 'Execute Command'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommandParams({})}
                  >
                    Clear Parameters
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Terminal className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Command</h3>
                <p className="text-muted-foreground">
                  Choose a command from the list to configure and execute it.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Execution History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Execution History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No commands executed yet. Try running a command above.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {executions.map((execution) => (
                    <div key={execution.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          <code className="text-sm font-medium">
                            /{execution.command}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {execution.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {execution.timestamp.toLocaleTimeString()}
                          {execution.execution_time && (
                            <span className="ml-2">
                              ({execution.execution_time}ms)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {Object.keys(execution.parameters).length > 0 && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Parameters: {JSON.stringify(execution.parameters)}
                        </div>
                      )}
                      
                      <div className="bg-muted/50 p-2 rounded text-sm font-mono whitespace-pre-wrap">
                        {execution.output}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Note:</strong> This is a testing environment. Commands are simulated and do not affect live bot data. 
          Use this interface to test command functionality and debug parameter validation.
        </AlertDescription>
      </Alert>
    </div>
  )
}