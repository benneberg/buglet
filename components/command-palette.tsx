"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  MessageCircle,
  Database,
  Activity,
  Settings,
  Copy,
  Download,
  Trash2,
  Moon,
  Sun,
  Radar,
  HelpCircle,
  Zap,
  RefreshCw,
  Search,
} from "lucide-react"

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  keywords: string[]
  action: () => void
  category: "navigation" | "actions" | "settings" | "snippets"
  shortcut?: string
}

interface CommandPaletteProps {
  onNavigate: (tab: string) => void
  onToggleDarkMode: () => void
  onToggleRadar: () => void
  onClearLogs: () => void
  onGenerateSnippet: () => void
  onCopyCurrentSnippet: () => void
  onExportCurrentSnippet: () => void
  onAnalyzeLogs: () => void
  onAttemptFix: () => void
  onOpenFAQ: () => void
  currentSnippet: any
  darkMode: boolean
  radarEnabled: boolean
}

export function CommandPalette({
  onNavigate,
  onToggleDarkMode,
  onToggleRadar,
  onClearLogs,
  onGenerateSnippet,
  onCopyCurrentSnippet,
  onExportCurrentSnippet,
  onAnalyzeLogs,
  onAttemptFix,
  onOpenFAQ,
  currentSnippet,
  darkMode,
  radarEnabled,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Define all available commands
  const commands: Command[] = [
    // Navigation
    {
      id: "nav-generate",
      label: "Go to Generate",
      description: "Generate new debugging snippets",
      icon: <Play className="w-4 h-4" />,
      keywords: ["generate", "create", "new", "snippet"],
      action: () => {
        onNavigate("generate")
        setOpen(false)
      },
      category: "navigation",
      shortcut: "G",
    },
    {
      id: "nav-chat",
      label: "Go to Chat",
      description: "AI debugging assistant",
      icon: <MessageCircle className="w-4 h-4" />,
      keywords: ["chat", "ai", "assistant", "help"],
      action: () => {
        onNavigate("chat")
        setOpen(false)
      },
      category: "navigation",
      shortcut: "C",
    },
    {
      id: "nav-marketplace",
      label: "Go to Marketplace",
      description: "Browse community probes",
      icon: <Database className="w-4 h-4" />,
      keywords: ["marketplace", "probes", "community", "install"],
      action: () => {
        onNavigate("marketplace")
        setOpen(false)
      },
      category: "navigation",
      shortcut: "M",
    },
    {
      id: "nav-templates",
      label: "Go to Templates",
      description: "View telemetry templates",
      icon: <Database className="w-4 h-4" />,
      keywords: ["templates", "telemetry", "prebuilt"],
      action: () => {
        onNavigate("templates")
        setOpen(false)
      },
      category: "navigation",
      shortcut: "T",
    },
    {
      id: "nav-logs",
      label: "Go to Logs",
      description: "View stored telemetry data",
      icon: <Activity className="w-4 h-4" />,
      keywords: ["logs", "telemetry", "data", "view"],
      action: () => {
        onNavigate("logs")
        setOpen(false)
      },
      category: "navigation",
      shortcut: "L",
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      description: "Configure API and preferences",
      icon: <Settings className="w-4 h-4" />,
      keywords: ["settings", "config", "api", "preferences"],
      action: () => {
        onNavigate("settings")
        setOpen(false)
      },
      category: "navigation",
      shortcut: "S",
    },

    // Actions
    {
      id: "action-generate",
      label: "Generate Snippet",
      description: "Create a new debugging snippet",
      icon: <Zap className="w-4 h-4" />,
      keywords: ["generate", "create", "snippet", "new"],
      action: () => {
        onGenerateSnippet()
        setOpen(false)
      },
      category: "actions",
    },
    {
      id: "action-copy",
      label: "Copy Current Snippet",
      description: "Copy snippet code to clipboard",
      icon: <Copy className="w-4 h-4" />,
      keywords: ["copy", "clipboard", "snippet"],
      action: () => {
        if (currentSnippet) {
          onCopyCurrentSnippet()
          setOpen(false)
        }
      },
      category: "actions",
    },
    {
      id: "action-export",
      label: "Export Current Snippet",
      description: "Download snippet as JS file",
      icon: <Download className="w-4 h-4" />,
      keywords: ["export", "download", "save", "snippet"],
      action: () => {
        if (currentSnippet) {
          onExportCurrentSnippet()
          setOpen(false)
        }
      },
      category: "actions",
    },
    {
      id: "action-analyze",
      label: "Analyze Logs",
      description: "AI analysis of telemetry data",
      icon: <Activity className="w-4 h-4" />,
      keywords: ["analyze", "logs", "ai", "telemetry"],
      action: () => {
        if (currentSnippet) {
          onAnalyzeLogs()
          setOpen(false)
        }
      },
      category: "actions",
    },
    {
      id: "action-fix",
      label: "Attempt Fix",
      description: "Generate code fix with AI",
      icon: <RefreshCw className="w-4 h-4" />,
      keywords: ["fix", "patch", "repair", "ai"],
      action: () => {
        onAttemptFix()
        setOpen(false)
      },
      category: "actions",
    },
    {
      id: "action-clear-logs",
      label: "Clear All Logs",
      description: "Delete all telemetry data",
      icon: <Trash2 className="w-4 h-4" />,
      keywords: ["clear", "delete", "logs", "telemetry"],
      action: () => {
        onClearLogs()
        setOpen(false)
      },
      category: "actions",
    },

    // Settings
    {
      id: "setting-dark-mode",
      label: darkMode ? "Disable Dark Mode" : "Enable Dark Mode",
      description: "Toggle dark/light theme",
      icon: darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      keywords: ["dark", "light", "theme", "mode"],
      action: () => {
        onToggleDarkMode()
        setOpen(false)
      },
      category: "settings",
    },
    {
      id: "setting-radar",
      label: radarEnabled ? "Disable Anomaly Radar" : "Enable Anomaly Radar",
      description: "Toggle automatic anomaly detection",
      icon: <Radar className="w-4 h-4" />,
      keywords: ["radar", "anomaly", "detection", "monitoring"],
      action: () => {
        onToggleRadar()
        setOpen(false)
      },
      category: "settings",
    },
    {
      id: "action-faq",
      label: "Open FAQ",
      description: "View frequently asked questions",
      icon: <HelpCircle className="w-4 h-4" />,
      keywords: ["faq", "help", "questions", "guide"],
      action: () => {
        onOpenFAQ()
        setOpen(false)
      },
      category: "settings",
    },
  ]

  // Filter commands based on search
  const filteredCommands = commands.filter((command) => {
    const searchLower = search.toLowerCase()
    return (
      command.label.toLowerCase().includes(searchLower) ||
      command.description?.toLowerCase().includes(searchLower) ||
      command.keywords.some((keyword) => keyword.includes(searchLower))
    )
  })

  // Group commands by category
  const groupedCommands = filteredCommands.reduce(
    (acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = []
      }
      acc[command.category].push(command)
      return acc
    },
    {} as Record<string, Command[]>,
  )

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !open)) {
        e.preventDefault()
        setOpen((open) => !open)
        setSearch("")
        setSelectedIndex(0)
      }

      // Close with Escape
      if (e.key === "Escape") {
        setOpen(false)
        setSearch("")
        setSelectedIndex(0)
      }

      // Navigate with arrow keys when open
      if (open) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const command = filteredCommands[selectedIndex]
          if (command) {
            command.action()
          }
        }
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, filteredCommands, selectedIndex])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const categoryLabels = {
    navigation: "Navigation",
    actions: "Actions",
    settings: "Settings",
    snippets: "Snippets",
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="w-5 h-5 mr-3 text-muted-foreground" />
          <Input
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          <Badge variant="outline" className="ml-2 text-xs">
            Esc
          </Badge>
        </div>

        <ScrollArea className="max-h-[400px]">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No commands found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  <div className="space-y-1">
                    {categoryCommands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command)
                      const isSelected = globalIndex === selectedIndex
                      return (
                        <button
                          key={command.id}
                          onClick={command.action}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          }`}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="flex-shrink-0">{command.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{command.label}</div>
                            {command.description && (
                              <div className="text-xs text-muted-foreground truncate">{command.description}</div>
                            )}
                          </div>
                          {command.shortcut && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {command.shortcut}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                ↑↓
              </Badge>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                Enter
              </Badge>
              Select
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                Esc
              </Badge>
              Close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              ⌘K
            </Badge>
            or
            <Badge variant="outline" className="text-xs">
              /
            </Badge>
            to open
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
