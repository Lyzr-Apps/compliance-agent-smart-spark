import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Send, Paperclip, Lock, Bell, ChevronDown, ChevronUp, Download, Search,
  Filter, AlertCircle, CheckCircle, AlertTriangle, Info, User, FileText,
  RefreshCw, Loader2, X, Plus, Calendar, TrendingUp, TrendingDown, Shield,
  Database, GitBranch, Eye, Check
} from 'lucide-react'
import { callAIAgent, uploadFiles, type NormalizedAgentResponse } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// =============================================================================
// Agent Configuration
// =============================================================================
const COMPLIANCE_MANAGER_AGENT_ID = '69689d0df038ff7259fe36fb'

// =============================================================================
// Type Definitions
// =============================================================================
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agentResponse?: NormalizedAgentResponse
  pendingApproval?: {
    type: 'rule_extraction'
    rules: Rule[]
    filename: string
    uploadedFile?: File
  }
}

interface Rule {
  rule_id: string
  rule_name: string
  rule_type: string
  value_threshold: string
  applicable_funds?: string[]
  threshold?: string
  confidence?: number
  confidence_score?: number
  source_section?: {
    page: number
    paragraph: string
    exact_quote: string
  }
  historical_context?: string
  cross_fund_applicability?: boolean
  exception_conditions?: string | null
}

interface Breach {
  fund_name?: string
  fund?: string
  rule_violated?: string
  rule?: string
  current_value: string
  limit: string
  variance?: string
  severity: string
  exception_applicability?: string | null
  cross_fund_impact?: boolean
  remediation_suggestion?: string
  remediation?: string
}

interface Version {
  id: string
  version: string
  filename: string
  uploadDate: string
  ruleCount: number
  status: 'current' | 'archived'
  changes: {
    added: number
    removed: number
    modified: number
  }
  rules?: Rule[]
  complianceScore?: number
  breaches?: Breach[]
}

interface Holding {
  assetClass: string
  name: string
  weight: number
  sector: string
  rating: string
  country: string
}

interface FundData {
  name: string
  totalValue: number
  holdings: Holding[]
  summary: {
    cash: number
    equities: number
    bonds: number
    avgRating: string
    totalHoldings: number
  }
}

// =============================================================================
// Mock Data
// =============================================================================
const mockVersions: Version[] = [
  {
    id: 'v1',
    version: 'Version 1.0',
    filename: 'IMA_eg1.pdf',
    uploadDate: '2024-01-15',
    ruleCount: 18,
    status: 'archived',
    changes: { added: 18, removed: 0, modified: 0 },
    complianceScore: 75,
    rules: [
      { rule_id: 'R001', rule_name: 'Cash Limit', rule_type: 'Limit', value_threshold: '≤10%', confidence_score: 95, source_section: { page: 3, paragraph: '2.1', exact_quote: 'Cash holdings shall not exceed 10% of total portfolio value' } },
      { rule_id: 'R002', rule_name: 'Equity Concentration', rule_type: 'Restriction', value_threshold: 'No single equity >15%', confidence_score: 92, source_section: { page: 4, paragraph: '3.2', exact_quote: 'No single equity position shall exceed 15% of portfolio' } },
      { rule_id: 'R003', rule_name: 'Geographic Restriction', rule_type: 'Restriction', value_threshold: 'China ≤60%', confidence_score: 88, source_section: { page: 5, paragraph: '4.1', exact_quote: 'Total China exposure limited to 60%' } }
    ],
    breaches: [
      { fund_name: 'China Growth Fund', rule_violated: 'Cash Limit', current_value: '12%', limit: '10%', severity: 'High', remediation_suggestion: 'Reduce cash position by 2%' }
    ]
  },
  {
    id: 'v2',
    version: 'Version 2.0',
    filename: 'IMA_eg2.pdf',
    uploadDate: '2024-02-20',
    ruleCount: 22,
    status: 'archived',
    changes: { added: 6, removed: 2, modified: 3 },
    complianceScore: 82,
    rules: [
      { rule_id: 'R001', rule_name: 'Cash Limit', rule_type: 'Limit', value_threshold: '≤10%', confidence_score: 95, source_section: { page: 3, paragraph: '2.1', exact_quote: 'Cash holdings shall not exceed 10% of total portfolio value' } },
      { rule_id: 'R002', rule_name: 'Equity Concentration', rule_type: 'Restriction', value_threshold: 'No single equity >12%', confidence_score: 94, source_section: { page: 4, paragraph: '3.2', exact_quote: 'No single equity position shall exceed 12% of portfolio' } },
      { rule_id: 'R003', rule_name: 'Geographic Restriction', rule_type: 'Restriction', value_threshold: 'China ≤55%', confidence_score: 90, source_section: { page: 5, paragraph: '4.1', exact_quote: 'Total China exposure limited to 55%' } },
      { rule_id: 'R004', rule_name: 'ESG Minimum Rating', rule_type: 'Requirement', value_threshold: '≥BBB', confidence_score: 87, source_section: { page: 6, paragraph: '5.3', exact_quote: 'All holdings must maintain ESG rating of BBB or higher' } }
    ],
    breaches: [
      { fund_name: 'China Growth Fund', rule_violated: 'Cash Limit', current_value: '12%', limit: '10%', severity: 'High', remediation_suggestion: 'Reduce cash position by 2%' },
      { fund_name: 'Emerging Markets Fund', rule_violated: 'Geographic Restriction', current_value: '15%', limit: '12%', severity: 'Medium', remediation_suggestion: 'Reduce Brazil exposure by 3%' }
    ]
  },
  {
    id: 'v3',
    version: 'Version 3.0',
    filename: 'IMA_eg3.pdf',
    uploadDate: '2024-03-10',
    ruleCount: 24,
    status: 'current',
    changes: { added: 3, removed: 1, modified: 4 },
    complianceScore: 67,
    rules: [
      { rule_id: 'R001', rule_name: 'Cash Limit', rule_type: 'Limit', value_threshold: '≤10%', confidence_score: 95, source_section: { page: 3, paragraph: '2.1', exact_quote: 'Cash holdings shall not exceed 10% of total portfolio value' } },
      { rule_id: 'R002', rule_name: 'Equity Concentration', rule_type: 'Restriction', value_threshold: 'No single equity >12%', confidence_score: 94, source_section: { page: 4, paragraph: '3.2', exact_quote: 'No single equity position shall exceed 12% of portfolio' } },
      { rule_id: 'R003', rule_name: 'Geographic Restriction - China', rule_type: 'Restriction', value_threshold: 'China ≤50%', confidence_score: 92, source_section: { page: 5, paragraph: '4.1', exact_quote: 'Total China exposure limited to 50%' } },
      { rule_id: 'R004', rule_name: 'ESG Minimum Rating', rule_type: 'Requirement', value_threshold: '≥BBB', confidence_score: 87, source_section: { page: 6, paragraph: '5.3', exact_quote: 'All holdings must maintain ESG rating of BBB or higher' } },
      { rule_id: 'R005', rule_name: 'Sector Concentration', rule_type: 'Limit', value_threshold: '≤30% per sector', confidence_score: 89, source_section: { page: 7, paragraph: '6.2', exact_quote: 'No single sector shall exceed 30% of equity holdings' } }
    ],
    breaches: [
      { fund_name: 'China Growth Fund', rule_violated: 'Cash Limit', current_value: '12%', limit: '10%', severity: 'High', remediation_suggestion: 'Reduce cash position by 2%' },
      { fund_name: 'Emerging Markets Fund', rule_violated: 'Geographic Restriction - Brazil', current_value: '15%', limit: '12%', severity: 'Medium', remediation_suggestion: 'Reduce Brazil exposure by 3%' },
      { fund_name: 'Global Bond Fund', rule_violated: 'Duration Limit', current_value: '8.2 years', limit: '7.5 years', severity: 'Low', remediation_suggestion: 'Shorten portfolio duration' }
    ]
  }
]

const chinaGrowthFund: FundData = {
  name: 'China Growth Fund',
  totalValue: 500000000,
  holdings: [
    { assetClass: 'Equities', name: 'Tencent Holdings', weight: 8.5, sector: 'Technology', rating: 'A', country: 'China' },
    { assetClass: 'Equities', name: 'Alibaba Group', weight: 7.2, sector: 'Consumer', rating: 'A', country: 'China' },
    { assetClass: 'Equities', name: 'BYD Company', weight: 6.8, sector: 'Industrials', rating: 'A-', country: 'China' },
    { assetClass: 'Equities', name: 'Meituan', weight: 5.5, sector: 'Consumer', rating: 'BBB+', country: 'China' },
    { assetClass: 'Bonds', name: 'China Government 10Y', weight: 10.0, sector: 'Government', rating: 'A+', country: 'China' },
    { assetClass: 'Cash', name: 'Cash Holdings', weight: 12.0, sector: 'Cash', rating: 'N/A', country: 'N/A' }
  ],
  summary: { cash: 12.0, equities: 78.0, bonds: 10.0, avgRating: 'A-', totalHoldings: 15 }
}

const globalBondFund: FundData = {
  name: 'Global Bond Fund',
  totalValue: 300000000,
  holdings: [
    { assetClass: 'Bonds', name: 'US Treasury 10Y', weight: 25.0, sector: 'Government', rating: 'AAA', country: 'USA' },
    { assetClass: 'Bonds', name: 'German Bund 10Y', weight: 18.0, sector: 'Government', rating: 'AAA', country: 'Germany' },
    { assetClass: 'Bonds', name: 'Corporate Bonds (Mixed)', weight: 45.0, sector: 'Corporate', rating: 'A', country: 'Global' },
    { assetClass: 'Cash', name: 'Cash Holdings', weight: 8.0, sector: 'Cash', rating: 'N/A', country: 'N/A' }
  ],
  summary: { cash: 8.0, equities: 0.0, bonds: 92.0, avgRating: 'AA', totalHoldings: 18 }
}

const emergingMarketsFund: FundData = {
  name: 'Emerging Markets Fund',
  totalValue: 200000000,
  holdings: [
    { assetClass: 'Equities', name: 'Brazil Equities', weight: 15.0, sector: 'Mixed', rating: 'BBB', country: 'Brazil' },
    { assetClass: 'Equities', name: 'India Equities', weight: 18.0, sector: 'Mixed', rating: 'BBB+', country: 'India' },
    { assetClass: 'Equities', name: 'South Africa Equities', weight: 12.0, sector: 'Mixed', rating: 'BBB-', country: 'South Africa' },
    { assetClass: 'Bonds', name: 'EM Bonds', weight: 10.0, sector: 'Government', rating: 'BB+', country: 'Mixed' },
    { assetClass: 'Cash', name: 'Cash Holdings', weight: 5.0, sector: 'Cash', rating: 'N/A', country: 'N/A' }
  ],
  summary: { cash: 5.0, equities: 85.0, bonds: 10.0, avgRating: 'BBB', totalHoldings: 20 }
}

const allFunds = [chinaGrowthFund, globalBondFund, emergingMarketsFund]

// =============================================================================
// Utility Functions
// =============================================================================
function getSeverityColor(severity: string): string {
  const s = severity.toLowerCase()
  if (s === 'high') return 'bg-red-100 text-red-700 border-red-300'
  if (s === 'low') return 'bg-amber-100 text-amber-700 border-amber-300'
  if (s === 'medium') return 'bg-orange-100 text-orange-700 border-orange-300'
  return 'bg-blue-100 text-blue-700 border-blue-300'
}

function getComplianceColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

// =============================================================================
// Sub-Components
// =============================================================================

// Header Component
function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#1a365d]" />
          <div>
            <h1 className="text-xl font-bold text-[#1a365d]">Compliance Assistant</h1>
            <p className="text-sm text-[#64748b]">GSAM Investment Guidelines</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-[#64748b]" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              2
            </span>
          </Button>
          <Avatar>
            <AvatarFallback className="bg-[#1a365d] text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

// Quick Action Chips
function QuickActions({ onAction }: { onAction: (query: string) => void }) {
  const actions = [
    { label: 'Extract rules from PDF', query: 'Extract all compliance rules from the investment guidelines.' },
    { label: 'Check compliance', query: 'Check compliance for all funds against current guidelines.' },
    { label: 'What are cash limits?', query: 'What are the cash limit requirements in our investment guidelines?' }
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.query)}
          className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white"
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

// Rules Table Display
function RulesTableCard({ rules }: { rules: Rule[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (ruleId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId)
    } else {
      newExpanded.add(ruleId)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a365d]">Extracted Rules</CardTitle>
        <CardDescription>Total: {rules.length} rules</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#1a365d]">
                <TableHead className="text-white">Rule ID</TableHead>
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Threshold</TableHead>
                <TableHead className="text-white">Confidence</TableHead>
                <TableHead className="text-white">Source</TableHead>
                <TableHead className="text-white w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <>
                  <TableRow key={rule.rule_id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{rule.rule_id}</TableCell>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{rule.rule_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{rule.value_threshold || rule.threshold}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={rule.confidence_score || rule.confidence || 0} className="w-16 h-2" />
                        <span className="text-xs text-gray-600">{rule.confidence_score || rule.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {rule.source_section ? `Page ${rule.source_section.page}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {rule.source_section && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(rule.rule_id)}
                        >
                          {expandedRows.has(rule.rule_id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(rule.rule_id) && rule.source_section && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-gray-50">
                        <div className="p-4 space-y-2">
                          <div className="text-sm">
                            <span className="font-semibold">Source Section: </span>
                            <span className="text-gray-600">{rule.source_section.paragraph}</span>
                          </div>
                          <div className="text-sm bg-white p-3 rounded border italic text-gray-700">
                            "{rule.source_section.exact_quote}"
                          </div>
                          {rule.exception_conditions && (
                            <div className="text-sm">
                              <span className="font-semibold">Exceptions: </span>
                              <span className="text-gray-600">{rule.exception_conditions}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// Compliance Gauge
function ComplianceGauge({ score }: { score: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a365d]">Overall Compliance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="#e5e7eb"
              strokeWidth="16"
              fill="none"
            />
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke={score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626'}
              strokeWidth="16"
              fill="none"
              strokeDasharray={`${(score / 100) * 502.4} 502.4`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-5xl font-bold", getComplianceColor(score))}>
              {score}%
            </span>
            <span className="text-sm text-gray-600 mt-1">Compliant</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Breach Table
function BreachTable({ breaches }: { breaches: Breach[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a365d] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Compliance Breaches
        </CardTitle>
        <CardDescription>Total: {breaches.length} breaches detected</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-red-50">
                <TableHead>Fund</TableHead>
                <TableHead>Rule Violated</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breaches.map((breach, i) => (
                <TableRow key={i} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{breach.fund_name || breach.fund}</TableCell>
                  <TableCell className="text-sm">{breach.rule_violated || breach.rule}</TableCell>
                  <TableCell className="font-mono text-sm text-red-600">{breach.current_value}</TableCell>
                  <TableCell className="font-mono text-sm">{breach.limit}</TableCell>
                  <TableCell>
                    <Badge className={cn("border", getSeverityColor(breach.severity))}>
                      {breach.severity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// Remediation Card
function RemediationCard({ breaches }: { breaches: Breach[] }) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  const toggleCheck = (index: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(index)) {
      newChecked.delete(index)
    } else {
      newChecked.add(index)
    }
    setCheckedItems(newChecked)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a365d]">Remediation Actions</CardTitle>
        <CardDescription>Review and approve suggested actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {breaches.map((breach, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={checkedItems.has(i)}
                onCheckedChange={() => toggleCheck(i)}
              />
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">
                  {breach.fund_name || breach.fund} - {breach.rule_violated || breach.rule}
                </div>
                <p className="text-sm text-gray-600">
                  {breach.remediation_suggestion || breach.remediation}
                </p>
              </div>
            </div>
            <div className="flex gap-2 ml-7">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button size="sm" variant="outline">
                Defer
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Ambiguity Flags
function AmbiguitySection({ flags }: { flags: Array<{ issue: string; recommendation: string }> }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!flags || flags.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <CardTitle className="text-[#1a365d] flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Ambiguity Flags ({flags.length})
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {flags.map((flag, i) => (
              <Alert key={i} className="bg-amber-50 border-amber-300">
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium text-sm">{flag.issue}</div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Recommendation: </span>
                      {flag.recommendation}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// =============================================================================
// Main Component
// =============================================================================
export default function Home() {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState('v3')
  const [selectedFund, setSelectedFund] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [compareMode, setCompareMode] = useState(false)
  const [compareLeft, setCompareLeft] = useState('v2')
  const [compareRight, setCompareRight] = useState('v3')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: 'Welcome to the GSAM Compliance Assistant. I can help you extract rules from investment guidelines, check portfolio compliance, and answer questions about regulations. How can I assist you today?',
          timestamp: new Date()
        }
      ])
    }
  }, [])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const result = await callAIAgent(inputMessage, COMPLIANCE_MANAGER_AGENT_ID)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response.message || 'Response received',
        timestamp: new Date(),
        agentResponse: result.response
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (query: string) => {
    setInputMessage(query)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const uploadResult = await uploadFiles(file)

      if (uploadResult.success) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `Uploaded file: ${file.name}`,
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, userMessage])

        // Step 1: Extract rules only (no compliance check)
        const result = await callAIAgent(
          `Extract all compliance rules from the uploaded investment guidelines document: ${file.name}. Only extract rules with confidence scores and source traceability. Do not validate against portfolio yet.`,
          COMPLIANCE_MANAGER_AGENT_ID,
          { assets: uploadResult.asset_ids }
        )

        if (result.response.status === 'success') {
          // Get extracted rules from response
          const extractedRules = result.response.result?.extracted_rules ||
                                result.response.result?.aggregated_analysis?.rules_table || []

          // Show rules with pending approval
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I've extracted ${extractedRules.length} compliance rules from ${file.name}. Please review the rules below.`,
            timestamp: new Date(),
            agentResponse: result.response,
            pendingApproval: {
              type: 'rule_extraction',
              rules: extractedRules,
              filename: file.name
            }
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error processing file. Please try again.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle approval of extracted rules
  const handleApproveRules = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message?.pendingApproval) return

    setIsLoading(true)

    try {
      // Step 2: Validate rules against portfolio
      const rulesText = message.pendingApproval.rules
        .map(r => `${r.rule_name}: ${r.value_threshold || r.threshold}`)
        .join('; ')

      const result = await callAIAgent(
        `Validate these compliance rules against our portfolio holdings: ${rulesText}. Provide detailed compliance score and breach analysis for all funds.`,
        COMPLIANCE_MANAGER_AGENT_ID
      )

      if (result.response.status === 'success') {
        // Show compliance results
        const complianceMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Portfolio validation complete. Review the compliance results below.',
          timestamp: new Date(),
          agentResponse: result.response,
          pendingApproval: {
            type: 'rule_extraction',
            rules: message.pendingApproval.rules,
            filename: message.pendingApproval.filename
          }
        }
        setMessages((prev) => [...prev, complianceMessage])
      }
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle adding to current version
  const handleAddToVersion = (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message?.pendingApproval) return

    // Create new version
    const newVersion: Version = {
      id: `v${mockVersions.length + 1}`,
      version: `Version ${mockVersions.length + 1}.0`,
      filename: message.pendingApproval.filename,
      uploadDate: new Date().toISOString().split('T')[0],
      ruleCount: message.pendingApproval.rules.length,
      status: 'current',
      changes: {
        added: message.pendingApproval.rules.length,
        removed: 0,
        modified: 0
      }
    }

    mockVersions.forEach(v => v.status = 'archived')
    mockVersions.push(newVersion)
    setSelectedVersion(newVersion.id)

    // Update message to remove pending approval
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, pendingApproval: undefined }
        : m
    ))

    // Add confirmation message
    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Successfully added ${newVersion.version} with ${newVersion.ruleCount} rules. This version is now current and reflected in the Compliance Dashboard and Version Control.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, confirmMessage])
  }

  // Handle ignoring extracted rules
  const handleIgnoreRules = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, pendingApproval: undefined }
        : m
    ))

    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Rules extraction ignored. The document was not added to version control.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, confirmMessage])
  }

  // Filter rules based on search and type
  const getFilteredRules = (rules: Rule[]) => {
    if (!rules) return []

    let filtered = rules

    if (searchQuery) {
      filtered = filtered.filter((rule) =>
        rule.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.rule_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((rule) => rule.rule_type === filterType)
    }

    return filtered
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white border">
            <TabsTrigger value="chat" className="data-[state=active]:bg-[#1a365d] data-[state=active]:text-white">
              Chat Interface
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#1a365d] data-[state=active]:text-white">
              Compliance Dashboard
            </TabsTrigger>
            <TabsTrigger value="versions" className="data-[state=active]:bg-[#1a365d] data-[state=active]:text-white">
              Version Control
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-[#1a365d] data-[state=active]:text-white">
              Portfolio Database
            </TabsTrigger>
          </TabsList>

          {/* ============================================================= */}
          {/* TAB 1: CHAT INTERFACE */}
          {/* ============================================================= */}
          <TabsContent value="chat" className="space-y-4">
            <Alert className="bg-blue-50 border-blue-300">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <span className="font-semibold">Advisory Mode Active:</span> All recommendations require compliance officer review and approval before execution.
              </AlertDescription>
            </Alert>

            <Card className="h-[600px] flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-4",
                          msg.role === 'user'
                            ? 'bg-[#1a365d] text-white'
                            : 'bg-white border border-gray-200'
                        )}
                      >
                        <div className="text-sm mb-1">
                          {msg.content}
                        </div>
                        <div
                          className={cn(
                            "text-xs mt-2",
                            msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                          )}
                        >
                          {msg.timestamp.toLocaleTimeString()}
                        </div>

                        {/* Rich Agent Response Display */}
                        {msg.role === 'assistant' && msg.agentResponse && msg.agentResponse.status === 'success' && (
                          <div className="mt-4 space-y-4">
                            {/* Rules Table */}
                            {msg.agentResponse.result?.aggregated_analysis?.rules_table && (
                              <RulesTableCard rules={msg.agentResponse.result.aggregated_analysis.rules_table} />
                            )}
                            {msg.agentResponse.result?.extracted_rules && (
                              <RulesTableCard rules={msg.agentResponse.result.extracted_rules} />
                            )}

                            {/* Approval Buttons - Step 1: After Rule Extraction */}
                            {msg.pendingApproval && !msg.agentResponse.result?.overall_compliance_score && !msg.agentResponse.result?.aggregated_analysis?.overall_compliance_score && (
                              <Card className="bg-blue-50 border-blue-300">
                                <CardContent className="pt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Info className="h-5 w-5 text-blue-600" />
                                    <p className="font-semibold text-blue-900">Review Required</p>
                                  </div>
                                  <p className="text-sm text-blue-800 mb-4">
                                    Please review the extracted rules above. Click "Approve & Validate" to check these rules against your portfolio holdings.
                                  </p>
                                  <div className="flex gap-3">
                                    <Button
                                      onClick={() => handleApproveRules(msg.id)}
                                      disabled={isLoading}
                                      className="bg-[#16a34a] hover:bg-[#15803d] text-white"
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Approve & Validate Against Portfolio
                                    </Button>
                                    <Button
                                      onClick={() => handleIgnoreRules(msg.id)}
                                      disabled={isLoading}
                                      variant="outline"
                                      className="border-gray-400 text-gray-700"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Ignore
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Compliance Gauge */}
                            {msg.agentResponse.result?.overall_compliance_score && (
                              <ComplianceGauge
                                score={
                                  typeof msg.agentResponse.result.overall_compliance_score === 'string'
                                    ? parseFloat(msg.agentResponse.result.overall_compliance_score)
                                    : msg.agentResponse.result.overall_compliance_score
                                }
                              />
                            )}
                            {msg.agentResponse.result?.aggregated_analysis?.overall_compliance_score && (
                              <ComplianceGauge
                                score={msg.agentResponse.result.aggregated_analysis.overall_compliance_score}
                              />
                            )}

                            {/* Breach Table */}
                            {msg.agentResponse.result?.breaches && msg.agentResponse.result.breaches.length > 0 && (
                              <BreachTable breaches={msg.agentResponse.result.breaches} />
                            )}
                            {msg.agentResponse.result?.aggregated_analysis?.breach_summary && (
                              <BreachTable breaches={msg.agentResponse.result.aggregated_analysis.breach_summary} />
                            )}

                            {/* Remediation */}
                            {msg.agentResponse.result?.breaches && msg.agentResponse.result.breaches.length > 0 && (
                              <RemediationCard breaches={msg.agentResponse.result.breaches} />
                            )}
                            {msg.agentResponse.result?.aggregated_analysis?.breach_summary && (
                              <RemediationCard breaches={msg.agentResponse.result.aggregated_analysis.breach_summary} />
                            )}

                            {/* Version Control Buttons - Step 2: After Compliance Validation */}
                            {msg.pendingApproval && (msg.agentResponse.result?.overall_compliance_score || msg.agentResponse.result?.aggregated_analysis?.overall_compliance_score) && (
                              <Card className="bg-amber-50 border-amber-300">
                                <CardContent className="pt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    <p className="font-semibold text-amber-900">Version Control Decision</p>
                                  </div>
                                  <p className="text-sm text-amber-800 mb-4">
                                    Compliance validation complete. Would you like to add this as the current version in your system?
                                  </p>
                                  <div className="flex gap-3">
                                    <Button
                                      onClick={() => handleAddToVersion(msg.id)}
                                      className="bg-[#16a34a] hover:bg-[#15803d] text-white"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add to Current Version
                                    </Button>
                                    <Button
                                      onClick={() => handleIgnoreRules(msg.id)}
                                      variant="outline"
                                      className="border-gray-400 text-gray-700"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Ignore
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Ambiguity Flags */}
                            {msg.agentResponse.result?.flagged_for_review && (
                              <AmbiguitySection flags={msg.agentResponse.result.flagged_for_review} />
                            )}
                            {msg.agentResponse.result?.aggregated_analysis?.ambiguity_flags && (
                              <AmbiguitySection flags={msg.agentResponse.result.aggregated_analysis.ambiguity_flags} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-lg p-4 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#1a365d]" />
                        <span className="text-sm text-gray-600">Processing...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator />

              <div className="p-4 space-y-3">
                {messages.length <= 1 && <QuickActions onAction={handleQuickAction} />}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-[#1a365d] hover:bg-[#2d4a7c]"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 2: COMPLIANCE DASHBOARD */}
          {/* ============================================================= */}
          <TabsContent value="dashboard">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mockVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Current
                  </Badge>
                </div>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-300">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Advisory Mode: All actions require compliance officer approval
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left Panel - Rules */}
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[#1a365d]">Rules Library</CardTitle>
                      <div className="flex gap-2 mt-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search rules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant={filterType === 'all' ? 'default' : 'outline'}
                          onClick={() => setFilterType('all')}
                          className={filterType === 'all' ? 'bg-[#1a365d]' : ''}
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant={filterType === 'Limit' ? 'default' : 'outline'}
                          onClick={() => setFilterType('Limit')}
                          className={filterType === 'Limit' ? 'bg-[#1a365d]' : ''}
                        >
                          Limits
                        </Button>
                        <Button
                          size="sm"
                          variant={filterType === 'Restriction' ? 'default' : 'outline'}
                          onClick={() => setFilterType('Restriction')}
                          className={filterType === 'Restriction' ? 'bg-[#1a365d]' : ''}
                        >
                          Restrictions
                        </Button>
                        <Button
                          size="sm"
                          variant={filterType === 'Requirement' ? 'default' : 'outline'}
                          onClick={() => setFilterType('Requirement')}
                          className={filterType === 'Requirement' ? 'bg-[#1a365d]' : ''}
                        >
                          Requirements
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                          {/* Get rules from selected version */}
                          {(() => {
                            const currentVersion = mockVersions.find(v => v.id === selectedVersion)
                            const versionRules = currentVersion?.rules || []
                            return versionRules
                              .filter((rule) => {
                                if (searchQuery && !rule.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) && !rule.rule_id.toLowerCase().includes(searchQuery.toLowerCase())) {
                                  return false
                                }
                                if (filterType !== 'all' && rule.rule_type !== filterType) {
                                  return false
                                }
                                return true
                              })
                          })()
                            .map((rule) => (
                              <Card key={rule.rule_id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-mono text-xs text-gray-500 mb-1">{rule.rule_id}</div>
                                    <div className="font-medium text-sm mb-2">{rule.rule_name}</div>
                                    <Badge variant="outline" className="text-xs mb-2">{rule.rule_type}</Badge>
                                    <div className="text-sm text-gray-600">{rule.value_threshold}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Progress value={rule.confidence_score || rule.confidence} className="w-16 h-2" />
                                    <span className="text-xs text-gray-600">{rule.confidence_score || rule.confidence}%</span>
                                  </div>
                                </div>
                              </Card>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Status */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const currentVersion = mockVersions.find(v => v.id === selectedVersion)
                      return <ComplianceGauge score={currentVersion?.complianceScore || 0} />
                    })()}

                    {(() => {
                      const currentVersion = mockVersions.find(v => v.id === selectedVersion)
                      const totalRules = currentVersion?.ruleCount || 0
                      const breachCount = currentVersion?.breaches?.length || 0
                      const compliantCount = totalRules - breachCount

                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-[#1a365d]">Quick Stats</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Total Rules</span>
                              <span className="font-bold text-lg">{totalRules}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Breaches</span>
                              <span className="font-bold text-lg text-red-600">{breachCount}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Compliant Items</span>
                              <span className="font-bold text-lg text-green-600">{compliantCount}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Pending Reviews</span>
                              <span className="font-bold text-lg text-amber-600">0</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}
                  </div>

                  {(() => {
                    const currentVersion = mockVersions.find(v => v.id === selectedVersion)
                    return <BreachTable breaches={currentVersion?.breaches || []} />
                  })()}

                  <AmbiguitySection
                    flags={[
                      {
                        issue: 'Unclear if current excess cash is due to documented contribution/redemption',
                        recommendation: 'Obtain supporting documentation to verify exception eligibility'
                      },
                      {
                        issue: 'Definitions of cash vs money market instruments may differ',
                        recommendation: 'Review portfolio composition for full alignment with guidelines'
                      }
                    ]}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 3: VERSION CONTROL */}
          {/* ============================================================= */}
          <TabsContent value="versions">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#1a365d]">Version History</h2>
                <div className="flex gap-2">
                  <Button
                    variant={compareMode ? 'default' : 'outline'}
                    onClick={() => setCompareMode(!compareMode)}
                    className={compareMode ? 'bg-[#1a365d]' : ''}
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    {compareMode ? 'Exit Compare' : 'Compare Versions'}
                  </Button>
                </div>
              </div>

              {compareMode ? (
                // Compare Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={compareLeft} onValueChange={setCompareLeft}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mockVersions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.version}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={compareRight} onValueChange={setCompareRight}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mockVersions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.version}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert className="bg-blue-50 border-blue-300">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3 text-green-600" />
                          <span className="font-semibold">3 Added</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <X className="h-3 w-3 text-red-600" />
                          <span className="font-semibold">1 Removed</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 text-amber-600" />
                          <span className="font-semibold">4 Modified</span>
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[#1a365d]">Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded">
                          <Plus className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">R008 - Currency Hedging Requirement</div>
                            <div className="text-sm text-gray-600">Type: Currency Risk | Threshold: Min 80% hedged</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                          <RefreshCw className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">R001 - Cash Position Limit</div>
                            <div className="text-sm text-gray-600">
                              <span className="line-through text-red-600">0-5% max</span>
                              {' → '}
                              <span className="text-green-600">0-3% max</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Timeline View
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Timeline Sidebar */}
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-[#1a365d]">Timeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {mockVersions.map((version) => (
                            <div
                              key={version.id}
                              className={cn(
                                "p-3 rounded-lg border-2 cursor-pointer transition-colors",
                                selectedVersion === version.id
                                  ? 'border-[#1a365d] bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                              onClick={() => setSelectedVersion(version.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">{version.version}</span>
                                {version.status === 'current' && (
                                  <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mb-2">{version.filename}</div>
                              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(version.uploadDate).toLocaleDateString()}
                              </div>
                              <div className="flex gap-2 text-xs">
                                {version.changes.added > 0 && (
                                  <span className="text-green-600">+{version.changes.added}</span>
                                )}
                                {version.changes.removed > 0 && (
                                  <span className="text-red-600">-{version.changes.removed}</span>
                                )}
                                {version.changes.modified > 0 && (
                                  <span className="text-amber-600">~{version.changes.modified}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Version Detail */}
                  <div className="lg:col-span-3 space-y-4">
                    {mockVersions
                      .filter((v) => v.id === selectedVersion)
                      .map((version) => (
                        <div key={version.id} className="space-y-4">
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-[#1a365d]">{version.version}</CardTitle>
                                {version.status === 'current' && (
                                  <Badge className="bg-green-600">Current Version</Badge>
                                )}
                              </div>
                              <CardDescription>
                                Uploaded on {new Date(version.uploadDate).toLocaleDateString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-gray-50 rounded">
                                  <div className="text-2xl font-bold">{version.ruleCount}</div>
                                  <div className="text-sm text-gray-600">Total Rules</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded">
                                  <div className="text-2xl font-bold text-green-600">
                                    {version.changes.added}
                                  </div>
                                  <div className="text-sm text-gray-600">Added</div>
                                </div>
                                <div className="text-center p-3 bg-amber-50 rounded">
                                  <div className="text-2xl font-bold text-amber-600">
                                    {version.changes.modified}
                                  </div>
                                  <div className="text-sm text-gray-600">Modified</div>
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <div className="font-semibold mb-2">Source Document</div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FileText className="h-4 w-4" />
                                  {version.filename}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-[#1a365d]">Rules in this Version</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-gray-600">
                                This version contains {version.ruleCount} compliance rules extracted from {version.filename}.
                                Use the Compare feature to see differences between versions.
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 4: PORTFOLIO DATABASE */}
          {/* ============================================================= */}
          <TabsContent value="portfolio">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#1a365d]">Portfolio Database</h2>
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sync with Chat Agent
                </Button>
              </div>

              <Alert className="bg-amber-50 border-amber-300">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <span className="font-semibold">POC Mode:</span> Mock portfolio data for demonstration purposes
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Fund Tabs */}
                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader>
                      <Tabs value={selectedFund.toString()} onValueChange={(v) => setSelectedFund(parseInt(v))}>
                        <TabsList className="w-full grid grid-cols-3">
                          <TabsTrigger value="0">China Growth Fund</TabsTrigger>
                          <TabsTrigger value="1">Global Bond Fund</TabsTrigger>
                          <TabsTrigger value="2">Emerging Markets Fund</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="text-sm text-gray-600">Total Fund Value</div>
                        <div className="text-2xl font-bold">
                          ${allFunds[selectedFund].totalValue.toLocaleString()}
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#1a365d]">
                              <TableHead className="text-white">Asset Class</TableHead>
                              <TableHead className="text-white">Holding Name</TableHead>
                              <TableHead className="text-white">Weight %</TableHead>
                              <TableHead className="text-white">Sector</TableHead>
                              <TableHead className="text-white">Rating</TableHead>
                              <TableHead className="text-white">Country</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allFunds[selectedFund].holdings.map((holding, i) => (
                              <TableRow key={i} className="hover:bg-gray-50">
                                <TableCell>
                                  <Badge variant="outline">{holding.assetClass}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{holding.name}</TableCell>
                                <TableCell className="font-mono">{holding.weight.toFixed(1)}%</TableCell>
                                <TableCell className="text-sm text-gray-600">{holding.sector}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{holding.rating}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">{holding.country}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[#1a365d]">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Cash</span>
                          <span className="font-bold">{allFunds[selectedFund].summary.cash}%</span>
                        </div>
                        <Progress value={allFunds[selectedFund].summary.cash} className="h-2" />
                      </div>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Equities</span>
                          <span className="font-bold">{allFunds[selectedFund].summary.equities}%</span>
                        </div>
                        <Progress value={allFunds[selectedFund].summary.equities} className="h-2" />
                      </div>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Bonds</span>
                          <span className="font-bold">{allFunds[selectedFund].summary.bonds}%</span>
                        </div>
                        <Progress value={allFunds[selectedFund].summary.bonds} className="h-2" />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Rating</span>
                        <Badge variant="secondary">{allFunds[selectedFund].summary.avgRating}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Holdings</span>
                        <span className="font-bold">{allFunds[selectedFund].summary.totalHoldings}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[#1a365d] flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Active Waivers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        No active waivers for this fund
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
