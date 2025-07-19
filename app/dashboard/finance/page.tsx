"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Download, 
  Filter,
  Trophy,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  Calendar,
  RefreshCw
} from "lucide-react"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"
import type { Database } from "@/lib/supabase"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type SlotExpense = Database["public"]["Tables"]["slot_expenses"]["Row"] & {
  team: Team | null
  slot: Database["public"]["Tables"]["slots"]["Row"] | null
}

interface FinancialSummary {
  totalExpenses: number
  totalPrizeWinnings: number
  netProfitLoss: number
  monthlyExpenses: number
  monthlyWinnings: number
  expensesByCategory: { [key: string]: number }
}

export default function FinancePage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<SlotExpense[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalExpenses: 0,
    totalPrizeWinnings: 0,
    netProfitLoss: 0,
    monthlyExpenses: 0,
    monthlyWinnings: 0,
    expensesByCategory: {}
  })
  const [activeTab, setActiveTab] = useState("overview")

  // Filter states
  const [filters, setFilters] = useState({
    team_id: "all",
    date_from: "",
    date_to: "",
    expense_type: "all"
  })

  const userRole = profile?.role as UserRole
  const financePermissions = DashboardPermissions.getDataPermissions(userRole, 'finance')

  useEffect(() => {
    if (profile && financePermissions.canView) {
      fetchFinancialData()
    }
  }, [profile, financePermissions])

  const fetchFinancialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchExpenses(),
        fetchTeams(),
        calculateFinancialSummary()
      ])
    } catch (error) {
      console.error("Error fetching financial data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch financial data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from("slot_expenses")
        .select(`
          *, 
          team:team_id(name), 
          slot:slot_id(organizer, time_range, date, number_of_slots, slot_rate, notes)
        `)
        .order("created_at", { ascending: false })

      const { data, error } = await query
      if (error) throw error
      setExpenses(data || [])
    } catch (error: any) {
      console.error("Error fetching expenses:", error)
      throw error
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name")

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
      throw error
    }
  }

  const calculateFinancialSummary = async () => {
    try {
      // Calculate total expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("slot_expenses")
        .select("total")

      if (expenseError) throw expenseError

      const totalExpenses = expenseData?.reduce((sum, expense) => sum + (expense.total || 0), 0) || 0

      // For now, set placeholder values for other metrics
      // In a real implementation, you'd have prize winnings and other financial data
      const totalPrizeWinnings = 50000 // Placeholder
      const netProfitLoss = totalPrizeWinnings - totalExpenses

      setFinancialSummary({
        totalExpenses,
        totalPrizeWinnings,
        netProfitLoss,
        monthlyExpenses: totalExpenses * 0.3, // Rough estimate
        monthlyWinnings: totalPrizeWinnings * 0.4, // Rough estimate
        expensesByCategory: {
          "Slot Bookings": totalExpenses * 0.7,
          "Equipment": totalExpenses * 0.2,
          "Travel": totalExpenses * 0.1
        }
      })
    } catch (error) {
      console.error("Error calculating financial summary:", error)
    }
  }

  const handleRefresh = () => {
    fetchFinancialData()
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: "Export",
      description: "Export functionality will be implemented soon",
    })
  }

  if (!profile) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!financePermissions.canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access financial data.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Finance Management</h1>
          <p className="text-muted-foreground">
            Track expenses, winnings, and financial performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {financePermissions.canExport && (
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="prizes" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Prize Pool
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Winnings</p>
                    <p className="text-2xl font-bold">₹{financialSummary.totalPrizeWinnings.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold">₹{financialSummary.totalExpenses.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card className={`${financialSummary.netProfitLoss >= 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'} text-white`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Net P&L</p>
                    <p className="text-2xl font-bold">
                      ₹{Math.abs(financialSummary.netProfitLoss).toLocaleString()}
                      {financialSummary.netProfitLoss < 0 && <span className="text-sm ml-1">(Loss)</span>}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">This Month</p>
                    <p className="text-2xl font-bold">₹{financialSummary.monthlyExpenses.toLocaleString()}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Current financial distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(financialSummary.expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="font-medium">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        ₹{amount.toLocaleString()}
                      </span>
                      <Badge variant="outline">
                        {((amount / financialSummary.totalExpenses) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Slot Expenses</CardTitle>
              <CardDescription>Manage tournament slot bookings and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Slots</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No expenses recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.slot?.date || 'N/A'}</TableCell>
                        <TableCell>{expense.team?.name || 'N/A'}</TableCell>
                        <TableCell>{expense.slot?.organizer || 'N/A'}</TableCell>
                        <TableCell>{expense.slot?.number_of_slots || 0}</TableCell>
                        <TableCell>₹{expense.total?.toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Paid</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prize Pool Management</CardTitle>
              <CardDescription>Track tournament winnings and prize distributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Prize Pool Tracking</h3>
                <p className="text-muted-foreground mb-4">
                  Prize pool management system coming soon
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prize Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Tracking</CardTitle>
              <CardDescription>Advanced financial analytics and reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed financial tracking and forecasting tools
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}