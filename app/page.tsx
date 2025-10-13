"use client"

import { CardFooter } from "@/components/ui/card"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { CommandPalette } from "@/components/command-palette"
import { TelemetryViewer } from "@/components/telemetry-viewer"
import { TelemetrySettings } from "@/components/telemetry-settings"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Settings,
  Play,
  Moon,
  Sun,
  AlertCircle,
  Activity,
  Zap,
  Database,
  Wifi,
  Video,
  HelpCircle,
  MessageCircle,
  Radar,
  Bell,
  X,
  Trash2,
  User,
  Sparkles,
  Loader2,
  RefreshCw,
  Shield,
  Copy,
  Download,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { SectionErrorBoundary } from "@/components/error-boundary" // Added error boundary component

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface CodePatch {
  id: string
  iteration: number
  code: string
  timestamp: number
  telemetryBefore: any
  telemetryAfter?: any
  improvement?: string
  status: "pending" | "testing" | "improved" | "failed"
}

interface Anomaly {
  id: string
  timestamp: number
  type: "memory" | "fps" | "network" | "video" | "general"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  data?: any
  dismissed?: boolean
}

interface BlackboxSnippet {
  id: string
  timestamp: number
  description: string
  title: string
  instructions: string[]
  code: string
  telemetryTypes: string[]
  logs?: any[]
  analysis?: string
}

interface AppSettings {
  apiKey: string
  provider: "groq" | "openai"
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  tavilyApiKey?: string
  darkMode: boolean
}

// Added MarketplaceProbe interface
interface MarketplaceProbe {
  name: string
  description: string
  category: string
  code: string
  author: string
  version: string
  downloads?: number
  rating?: number
}

// Regression Guard interfaces
interface RegressionBaseline {
  snippetId: string
  timestamp: number
  metrics: {
    memory: { mean: number; stdDev: number; samples: number[] }
    fps: { mean: number; stdDev: number; samples: number[] }
    network: { mean: number; stdDev: number; samples: number[] }
    video: { mean: number; stdDev: number; samples: number[] }
  }
}

interface RegressionAlert {
  id: string
  timestamp: number
  snippetId: string
  metric: string
  baseline: number
  current: number
  threshold: number
  severity: "warning" | "critical"
  message: string
}

// Telemetry Data Bridge interfaces
interface TelemetrySession {
  id: string
  startTime: number
  endTime?: number
  deviceInfo: {
    userAgent: string
    platform: string
    screenResolution: string
    viewport: string
  }
  appInfo: {
    url: string
    version?: string
    environment?: string
  }
  snippetId?: string
}

interface TelemetryDataPoint {
  id: string
  sessionId: string
  timestamp: number
  type: "memory" | "fps" | "network" | "video" | "error" | "custom"
  data: any
  tags?: Record<string, string>
}

interface TelemetryCollectionSettings {
  enabled: boolean
  collectionMode: "push" | "pull" | "live"
  batchSize: number
  flushInterval: number // milliseconds
  endpoint?: string
  retryAttempts: number
  persistOffline: boolean
}

interface BlackboxRecording {
  id: string
  sessionId: string
  startTime: number
  endTime?: number
  crashDetected: boolean
  dataPoints: TelemetryDataPoint[]
  ringBufferSize: number
  metadata: {
    snippetId?: string
    description?: string
    tags?: string[]
  }
}

interface TelemetryFilter {
  sessionIds?: string[]
  types?: string[]
  startTime?: number
  endTime?: number
  tags?: Record<string, string>
  searchQuery?: string
}

const TELEMETRY_TEMPLATES = {
  memory: `
// Memory & Heap Usage Monitoring
(function() {
  const memoryLog = [];
  const MAX_LOGS = 100;
  
  function captureMemory() {
    if (performance.memory) {
      const data = {
        timestamp: Date.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usedPercent: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(2)
      };
      
      memoryLog.push(data);
      if (memoryLog.length > MAX_LOGS) memoryLog.shift();
      
      // Persist to localStorage for crash resilience
      try {
        localStorage.setItem('blackbox_memory_log', JSON.stringify(memoryLog));
      } catch(e) {
        console.warn('[BlackBox] Failed to persist memory log:', e);
      }
      
      console.log('[BlackBox Memory]', data);
      return data;
    }
    return null;
  }
  
  // Expose globally
  window.__blackbox_memory = {
    capture: captureMemory,
    getLogs: () => memoryLog,
    clear: () => { memoryLog.length = 0; localStorage.removeItem('blackbox_memory_log'); }
  };
  
  // Auto-capture every 5 seconds
  setInterval(captureMemory, 5000);
  captureMemory(); // Initial capture
})();
`,

  fps: `
// FPS & Rendering Performance Monitoring
(function() {
  const fpsLog = [];
  const MAX_LOGS = 100;
  let lastTime = performance.now();
  let frames = 0;
  let fps = 0;
  
  function measureFPS() {
    frames++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frames * 1000) / (currentTime - lastTime));
      
      const data = {
        timestamp: Date.now(),
        fps: fps,
        frameTime: (currentTime - lastTime) / frames,
        dropped: fps < 30 ? 'WARNING' : 'OK'
      };
      
      fpsLog.push(data);
      if (fpsLog.length > MAX_LOGS) fpsLog.shift();
      
      try {
        localStorage.setItem('blackbox_fps_log', JSON.stringify(fpsLog));
      } catch(e) {
        console.warn('[BlackBox] Failed to persist FPS log:', e);
      }
      
      if (fps < 30) {
        console.warn('[BlackBox FPS] Low FPS detected:', data);
      } else {
        console.log('[BlackBox FPS]', data);
      }
      
      frames = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(measureFPS);
  }
  
  window.__blackbox_fps = {
    getLogs: () => fpsLog,
    getCurrentFPS: () => fps,
    clear: () => { fpsLog.length = 0; localStorage.removeItem('blackbox_fps_log'); }
  };
  
  requestAnimationFrame(measureFPS);
})();
`,

  network: `
// Network & API Call Monitoring
(function() {
  const networkLog = [];
  const MAX_LOGS = 200;
  
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const startTime = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const method = args[1]?.method || 'GET';
    
    return originalFetch.apply(this, args)
      .then(response => {
        const endTime = performance.now();
        const data = {
          timestamp: Date.now(),
          url: url,
          method: method,
          status: response.status,
          duration: Math.round(endTime - startTime),
          ok: response.ok,
          type: 'fetch'
        };
        
        networkLog.push(data);
        if (networkLog.length > MAX_LOGS) networkLog.shift();
        
        try {
          localStorage.setItem('blackbox_network_log', JSON.stringify(networkLog));
        } catch(e) {
          console.warn('[BlackBox] Failed to persist network log:', e);
        }
        
        console.log('[BlackBox Network]', data);
        return response;
      })
      .catch(error => {
        const endTime = performance.now();
        const data = {
          timestamp: Date.now(),
          url: url,
          method: method,
          error: error.message,
          duration: Math.round(endTime - startTime),
          type: 'fetch'
        };
        
        networkLog.push(data);
        if (networkLog.length > MAX_LOGS) networkLog.shift();
        
        try {
          localStorage.setItem('blackbox_network_log', JSON.stringify(networkLog));
        } catch(e) {
          console.warn('[BlackBox] Failed to persist network log:', e);
        }
        
        console.error('[BlackBox Network Error]', data);
        throw error;
      });
  };
  
  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._blackbox_url = url;
    this._blackbox_method = method;
    this._blackbox_startTime = performance.now();
    return originalXHROpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      const endTime = performance.now();
      const data = {
        timestamp: Date.now(),
        url: this._blackbox_url,
        method: this._blackbox_method,
        status: this.status,
        duration: Math.round(endTime - this._blackbox_startTime),
        ok: this.status >= 200 && this.status < 300,
        type: 'xhr'
      };
      
      networkLog.push(data);
      if (networkLog.length > MAX_LOGS) networkLog.shift();
      
      try {
        localStorage.setItem('blackbox_network_log', JSON.stringify(networkLog));
      } catch(e) {
        console.warn('[BlackBox] Failed to persist network log:', e);
      }
      
      console.log('[BlackBox Network]', data);
    });
    
    this.addEventListener('error', function() {
      const endTime = performance.now();
      const data = {
        timestamp: Date.now(),
        url: this._blackbox_url,
        method: this._blackbox_method,
        error: 'Network error',
        duration: Math.round(endTime - this._blackbox_startTime),
        type: 'xhr'
      };
      
      networkLog.push(data);
      if (networkLog.length > MAX_LOGS) networkLog.shift();
      
      try {
        localStorage.setItem('blackbox_network_log', JSON.stringify(networkLog));
      } catch(e) {
        console.warn('[BlackBox] Failed to persist network log:', e);
      }
      
      console.error('[BlackBox Network Error]', data);
    });
    
    return originalXHRSend.apply(this, arguments);
  };
  
  window.__blackbox_network = {
    getLogs: () => networkLog,
    clear: () => { networkLog.length = 0; localStorage.removeItem('blackbox_network_log'); }
  };
})();
`,

  video: `
// Video Playback & GPU Monitoring
(function() {
  const videoLog = [];
  const MAX_LOGS = 100;
  
  function monitorVideo(video) {
    const data = {
      timestamp: Date.now(),
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      ended: video.ended,
      buffered: video.buffered.length > 0 ? {
        start: video.buffered.start(0),
        end: video.buffered.end(video.buffered.length - 1)
      } : null,
      readyState: video.readyState,
      networkState: video.networkState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      playbackRate: video.playbackRate
    };
    
    videoLog.push(data);
    if (videoLog.length > MAX_LOGS) videoLog.shift();
    
    try {
      localStorage.setItem('blackbox_video_log', JSON.stringify(videoLog));
    } catch(e) {
      console.warn('[BlackBox] Failed to persist video log:', e);
    }
    
    console.log('[BlackBox Video]', data);
    return data;
  }
  
  // Monitor all video elements
  function attachVideoMonitors() {
    document.querySelectorAll('video').forEach(video => {
      if (!video._blackbox_monitored) {
        video._blackbox_monitored = true;
        
        ['play', 'pause', 'ended', 'error', 'stalled', 'waiting', 'canplay'].forEach(event => {
          video.addEventListener(event, () => {
            console.log(\`[BlackBox Video Event] \${event}\`);
            monitorVideo(video);
          });
        });
        
        // Periodic monitoring during playback
        setInterval(() => {
          if (!video.paused) {
            monitorVideo(video);
          }
        }, 2000);
      }
    });
  }
  
  // Initial attach
  attachVideoMonitors();
  
  // Watch for new video elements
  const observer = new MutationObserver(attachVideoMonitors);
  observer.observe(document.body, { childList: true, subtree: true });
  
  window.__blackbox_video = {
    getLogs: () => videoLog,
    clear: () => { videoLog.length = 0; localStorage.removeItem('blackbox_video_log'); }
  };
})();
`,
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert senior debugging engineer with 15+ years of experience in web development, performance optimization, and production debugging. Your expertise includes:

- Deep understanding of browser internals, memory management, and garbage collection
- Expert knowledge of JavaScript performance profiling and optimization
- Experience debugging complex race conditions, memory leaks, and Heisenbugs
- Proficiency in analyzing network bottlenecks, API failures, and timeout issues
- Understanding of video streaming, GPU acceleration, and media playback issues
- Ability to identify patterns in telemetry data that indicate systemic problems

When generating debugging code:
1. Always include comprehensive error handling and edge case coverage
2. Add detailed inline comments explaining WHY, not just WHAT
3. Use production-ready patterns with proper cleanup and resource management
4. Include crash-resilient logging that persists to localStorage
5. Implement ring buffers to prevent memory bloat
6. Add visual indicators and console warnings for anomalies
7. Consider mobile devices, low-end hardware, and network constraints
8. Think about timing issues, async operations, and race conditions

Your goal is to generate blackbox debugging snippets that:
- Capture the RIGHT data at the RIGHT time
- Survive browser crashes and page reloads
- Provide actionable insights, not just raw data
- Help developers reproduce and fix even the most elusive bugs

Be thorough, be precise, and think like a detective solving a mystery.`

export default function AutoBlackBoxPro() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("generate")
  const [bugDescription, setBugDescription] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentSnippet, setCurrentSnippet] = useState<BlackboxSnippet | null>(null)
  const [snippets, setSnippets] = useState<BlackboxSnippet[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const sandboxRef = useRef<HTMLIFrameElement>(null)
  const [isFaqOpen, setIsFaqOpen] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatSending, setIsChatSending] = useState(false)
  const [includeSnippet, setIncludeSnippet] = useState(false)
  const [includeTelemetry, setIncludeTelemetry] = useState(false)
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [radarEnabled, setRadarEnabled] = useState(false)
  const [isRadarScanning, setIsRadarScanning] = useState(false)
  const [showAnomalyPanel, setShowAnomalyPanel] = useState(false)
  const radarIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isGeneratingFix, setIsGeneratingFix] = useState(false)
  const [currentPatch, setCurrentPatch] = useState<CodePatch | null>(null)
  const [patchHistory, setPatchHistory] = useState<CodePatch[]>([])
  const [maxPatchIterations] = useState(3)
  const [showPatchPanel, setShowPatchPanel] = useState(false)

  // Regression Guard state
  const [regressionBaselines, setRegressionBaselines] = useState<RegressionBaseline[]>([])
  const [regressionAlerts, setRegressionAlerts] = useState<RegressionAlert[]>([])
  const [regressionGuardEnabled, setRegressionGuardEnabled] = useState(true)
  const [showRegressionPanel, setShowRegressionPanel] = useState(false)

  const [settings, setSettings] = useState<AppSettings>({
    apiKey: "",
    provider: "groq",
    model: "llama-3.3-70b-versatile", // Updated to working model
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    tavilyApiKey: "",
    darkMode: false,
  })

  const [loggingEndpoint, setLoggingEndpoint] = useState("")

  const [availableModels, setAvailableModels] = useState<string[]>([])

  const [marketplaceProbes, setMarketplaceProbes] = useState<MarketplaceProbe[]>([])
  const [installedProbes, setInstalledProbes] = useState<string[]>([])
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false)
  const [marketplaceFilter, setMarketplaceFilter] = useState("all")

  // Load settings and snippets from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("autoblackbox_settings")
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings((prev) => ({ ...prev, ...parsed }))
      if (parsed.darkMode) {
        document.documentElement.classList.add("dark")
      }
    }

    const savedSnippets = localStorage.getItem("autoblackbox_snippets")
    if (savedSnippets) {
      setSnippets(JSON.parse(savedSnippets))
    }

    const savedEndpoint = localStorage.getItem("autoblackbox_logging_endpoint")
    if (savedEndpoint) {
      setLoggingEndpoint(savedEndpoint)
    }

    // Load chat history
    const savedChat = localStorage.getItem("autoblackbox_chat_history")
    if (savedChat) {
      try {
        setChatMessages(JSON.parse(savedChat))
      } catch (e) {
        console.error("[v0] Failed to restore chat history:", e)
      }
    }

    // Load anomalies from localStorage
    const savedAnomalies = localStorage.getItem("autoblackbox_anomalies")
    if (savedAnomalies) {
      setAnomalies(JSON.parse(savedAnomalies))
    }

    // Load radar enabled state
    const savedRadarEnabled = localStorage.getItem("autoblackbox_radar_enabled")
    if (savedRadarEnabled) {
      setRadarEnabled(savedRadarEnabled === "true")
    }

    // Load installed probes from localStorage
    const savedInstalledProbes = localStorage.getItem("autoblackbox_installed_probes")
    if (savedInstalledProbes) {
      setInstalledProbes(JSON.parse(savedInstalledProbes))
    }

    // Load patch history from localStorage
    const savedPatchHistory = localStorage.getItem("autoblackbox_patch_history")
    if (savedPatchHistory) {
      setPatchHistory(JSON.parse(savedPatchHistory))
    }

    const savedBaselines = localStorage.getItem("autoblackbox_regression_baselines")
    if (savedBaselines) {
      setRegressionBaselines(JSON.parse(savedBaselines))
    }

    const savedAlerts = localStorage.getItem("autoblackbox_regression_alerts")
    if (savedAlerts) {
      setRegressionAlerts(JSON.parse(savedAlerts))
    }

    const savedGuardEnabled = localStorage.getItem("autoblackbox_regression_guard_enabled")
    if (savedGuardEnabled !== null) {
      setRegressionGuardEnabled(savedGuardEnabled === "true")
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("autoblackbox_settings", JSON.stringify(settings))
  }, [settings])

  // Save snippets to localStorage
  useEffect(() => {
    if (snippets.length > 0) {
      localStorage.setItem("autoblackbox_snippets", JSON.stringify(snippets))
    }
  }, [snippets])

  useEffect(() => {
    if (loggingEndpoint) {
      localStorage.setItem("autoblackbox_logging_endpoint", loggingEndpoint)
    }
  }, [loggingEndpoint])

  // Save chat messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem("autoblackbox_chat_history", JSON.stringify(chatMessages))
    }
  }, [chatMessages])

  useEffect(() => {
    localStorage.setItem("autoblackbox_anomalies", JSON.stringify(anomalies))
  }, [anomalies])

  useEffect(() => {
    localStorage.setItem("autoblackbox_radar_enabled", radarEnabled.toString())
  }, [radarEnabled])

  // Save installed probes
  useEffect(() => {
    if (installedProbes.length > 0) {
      localStorage.setItem("autoblackbox_installed_probes", JSON.stringify(installedProbes))
    }
  }, [installedProbes])

  // Save patch history to localStorage
  useEffect(() => {
    if (patchHistory.length > 0) {
      localStorage.setItem("autoblackbox_patch_history", JSON.stringify(patchHistory))
    }
  }, [patchHistory])

  useEffect(() => {
    if (regressionBaselines.length > 0) {
      localStorage.setItem("autoblackbox_regression_baselines", JSON.stringify(regressionBaselines))
    }
  }, [regressionBaselines])

  useEffect(() => {
    if (regressionAlerts.length > 0) {
      localStorage.setItem("autoblackbox_regression_alerts", JSON.stringify(regressionAlerts))
    }
  }, [regressionAlerts])

  useEffect(() => {
    localStorage.setItem("autoblackbox_regression_guard_enabled", regressionGuardEnabled.toString())
  }, [regressionGuardEnabled])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    if (radarEnabled && settings.apiKey) {
      // Start scanning every 30 seconds
      radarIntervalRef.current = setInterval(() => {
        scanForAnomalies()
      }, 30000)

      // Initial scan
      scanForAnomalies()

      return () => {
        if (radarIntervalRef.current) {
          clearInterval(radarIntervalRef.current)
        }
      }
    } else {
      if (radarIntervalRef.current) {
        clearInterval(radarIntervalRef.current)
      }
    }
  }, [radarEnabled, settings.apiKey])

  // MODIFIED: Added graceful degradation for service worker in preview environments
  useEffect(() => {
    // Only register service worker in production or localhost
    const isProduction = window.location.protocol === "https:" || window.location.hostname === "localhost"

    if ("serviceWorker" in navigator && isProduction) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration)

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  toast({
                    title: "Update Available",
                    description: "A new version is available. Refresh to update.",
                    action: (
                      <Button
                        size="sm"
                        onClick={() => {
                          newWorker.postMessage({ type: "SKIP_WAITING" })
                          window.location.reload()
                        }}
                      >
                        Refresh
                      </Button>
                    ),
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          // Silently fail in preview environments - this is expected
          console.log(
            "[PWA] Service Worker not available in preview environment. PWA features will be available when deployed.",
          )
        })
    } else if (!isProduction) {
      console.log(
        "[PWA] Service Worker registration skipped in preview environment. Deploy to production for offline capabilities.",
      )
    }
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setSettings((prev) => {
      const newDarkMode = !prev.darkMode
      if (newDarkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return { ...prev, darkMode: newDarkMode }
    })
  }

  const fetchModels = async () => {
    console.log("[v0] fetchModels called")

    if (!settings.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key in settings first.",
        variant: "destructive",
      })
      return
    }

    setIsFetchingModels(true)

    try {
      console.log("[v0] Fetching models from", settings.provider)

      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      }

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/models"
      } else {
        apiUrl = "https://api.openai.com/v1/models"
      }

      console.log("[v0] API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: apiHeaders,
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        let errorMessage = `Failed to fetch models (${response.status})`
        try {
          const errorData = await response.json()
          console.log("[v0] Error data:", errorData)
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          console.log("[v0] Could not parse error response")
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("[v0] Models data:", data)

      if (!data.data || !Array.isArray(data.data)) {
        console.error("[v0] Unexpected API response structure:", data)
        throw new Error("Unexpected API response format")
      }

      // Extract model IDs from the response
      const modelIds = data.data.map((model: any) => model.id)
      console.log("[v0] Found model IDs:", modelIds)

      // For Groq, filter to only chat models
      const filteredModels =
        settings.provider === "groq"
          ? modelIds.filter((id: string) => !id.includes("whisper") && !id.includes("distil"))
          : modelIds.filter((id: string) => id.includes("gpt"))

      console.log("[v0] Filtered models:", filteredModels)

      setAvailableModels(filteredModels)

      toast({
        title: "Models Loaded",
        description: `Loaded ${filteredModels.length} ${settings.provider} models successfully.`,
      })
    } catch (error: any) {
      console.error("[v0] Failed to fetch models:", error)
      toast({
        title: "Error Fetching Models",
        description: error.message || "Failed to fetch models. Check your API key and network connection.",
        variant: "destructive",
      })
    } finally {
      setIsFetchingModels(false)
      console.log("[v0] fetchModels completed")
    }
  }

  // Determine which telemetry templates to use based on bug description
  const selectTelemetryTemplates = (description: string): string[] => {
    const lower = description.toLowerCase()
    const templates: string[] = []

    if (lower.includes("memory") || lower.includes("leak") || lower.includes("heap") || lower.includes("crash")) {
      templates.push("memory")
    }

    if (
      lower.includes("fps") ||
      lower.includes("lag") ||
      lower.includes("stutter") ||
      lower.includes("render") ||
      lower.includes("slow")
    ) {
      templates.push("fps")
    }

    if (
      lower.includes("network") ||
      lower.includes("api") ||
      lower.includes("fetch") ||
      lower.includes("request") ||
      lower.includes("timeout")
    ) {
      templates.push("network")
    }

    if (lower.includes("video") || lower.includes("playback") || lower.includes("stream") || lower.includes("gpu")) {
      templates.push("video")
    }

    // If no specific templates matched, include memory and network as defaults
    if (templates.length === 0) {
      templates.push("memory", "network")
    }

    return templates
  }

  const injectLoggingEndpoint = (code: string): string => {
    if (!loggingEndpoint) return code

    const endpointInjection = `
// Logging Endpoint Configuration
const LOGGING_ENDPOINT = '${loggingEndpoint}';

// Helper function to send logs to endpoint
async function sendToEndpoint(logType, data) {
  if (!LOGGING_ENDPOINT) return;
  
  try {
    await fetch(LOGGING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: logType,
        timestamp: Date.now(),
        data: data,
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });
  } catch (error) {
    console.warn('[BlackBox] Failed to send to endpoint:', error);
  }
}

`
    // This regex is simplified; a more robust solution might involve AST parsing.
    // It looks for console.log statements directly logging 'data'.
    return (
      endpointInjection +
      code.replace(/console\.log\s*['"]\[BlackBox.*?\]['"]\s*,\s*data\s*;/g, (match) => {
        // Attempt to infer log type from the template's console message prefix
        let inferredLogType = "general" // Default
        if (code.includes("[BlackBox Memory]")) {
          inferredLogType = "memory"
        } else if (code.includes("[BlackBox FPS]")) {
          inferredLogType = "fps"
        } else if (code.includes("[BlackBox Network]")) {
          inferredLogType = "network"
        } else if (code.includes("[BlackBox Video]")) {
          inferredLogType = "video"
        }
        return `${match}\n      sendToEndpoint('${inferredLogType}', data);`
      })
    )
  }

  // Generate blackbox snippet using AI
  const generateSnippet = async () => {
    console.log("[v0] generateSnippet called")

    if (!bugDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe the bug you want to debug.",
        variant: "destructive",
      })
      return
    }

    if (!settings.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your API key in settings.",
        variant: "destructive",
      })
      setActiveTab("settings")
      return
    }

    setIsGenerating(true)

    toast({
      title: "Generating Snippet",
      description: "AI is analyzing your bug description...",
    })

    try {
      console.log("[v0] Selecting telemetry templates")
      const telemetryTypes = selectTelemetryTemplates(bugDescription)
      console.log("[v0] Selected templates:", telemetryTypes)

      let telemetryCode = telemetryTypes
        .map((type) => TELEMETRY_TEMPLATES[type as keyof typeof TELEMETRY_TEMPLATES])
        .join("\n\n")

      if (loggingEndpoint) {
        telemetryCode = injectLoggingEndpoint(telemetryCode)
      }

      // Optional: Search web for additional context using Tavily
      let webContext = ""
      if (settings.tavilyApiKey) {
        console.log("[v0] Attempting Tavily search")
        try {
          const tavilyResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: settings.tavilyApiKey,
              query: `web debugging ${bugDescription}`,
              max_results: 3,
            }),
          })

          if (tavilyResponse.ok) {
            const tavilyData = await tavilyResponse.json()
            webContext =
              "\n\nAdditional context from web search:\n" +
              tavilyData.results?.map((r: any) => `- ${r.title}: ${r.content}`).join("\n")
            console.log("[v0] Tavily search successful")
          }
        } catch (e) {
          console.warn("[v0] Tavily search failed:", e)
        }
      }

      const prompt = `Generate a comprehensive debugging snippet for the following issue:

Bug Description: ${bugDescription}
${webContext}

I've already included these telemetry templates:
${telemetryTypes.map((t) => `- ${t.toUpperCase()} monitoring`).join("\n")}

Please generate:
1. A clear, descriptive title for this debugging session
2. Step-by-step instructions (3-7 steps) for using this snippet
3. Additional custom debugging code that complements the telemetry templates

The custom code should:
- Target the specific issue described
- Add event listeners, hooks, or interceptors as needed
- Include detailed logging with timestamps
- Handle edge cases and errors gracefully
- Be production-ready and crash-resilient
- Include inline comments explaining the debugging strategy

Format your response as JSON:
{
  "title": "Clear title describing what we're debugging",
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "customCode": "// Your additional debugging code here"
}`

      console.log("[v0] Calling LLM API")
      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
      }
      let apiBody: any = {}

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            { role: "system", content: settings.systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          response_format: { type: "json_object" },
        }
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            { role: "system", content: settings.systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          response_format: { type: "json_object" },
        }
      }

      console.log("[v0] API URL:", apiUrl)
      console.log("[v0] Model:", settings.model)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(apiBody),
      })

      console.log("[v0] LLM Response status:", response.status)

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`
        try {
          const errorData = await response.json()
          console.error("[v0] LLM Error data:", errorData)
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          console.log("[v0] Could not parse error response")
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("[v0] LLM Response received")

      const content = data.choices[0].message.content
      console.log("[v0] Parsing JSON response")
      const parsed = JSON.parse(content)

      const fullCode = `${telemetryCode}\n\n${parsed.customCode}`

      const snippet: BlackboxSnippet = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        description: bugDescription,
        title: parsed.title,
        instructions: parsed.instructions,
        code: fullCode,
        telemetryTypes,
      }

      console.log("[v0] Snippet created successfully")
      setCurrentSnippet(snippet)
      setSnippets((prev) => [snippet, ...prev])

      toast({
        title: "Snippet Generated",
        description: "Your debugging snippet is ready!",
      })
    } catch (error: any) {
      console.error("[v0] Generation error:", error)
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate snippet. Check your API key and model selection.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      console.log("[v0] generateSnippet completed")
    }
  }

  // Execute snippet in sandbox
  const executeInSandbox = (code: string) => {
    if (sandboxRef.current) {
      const iframe = sandboxRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Sandbox</title>
              <style>
                body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .log { margin: 5px 0; padding: 5px; border-left: 3px solid #4CAF50; }
                .error { border-left-color: #f44336; }
                .warn { border-left-color: #ff9800; }
              </style>
            </head>
            <body>
              <h3>Sandbox Execution</h3>
              <div id="output"></div>
              <script>
                // Mocking localStorage for iframe context
                const iframeLocalStorage = {};
                Object.defineProperty(window, 'localStorage', {
                  get: function() {
                    return {
                      getItem: function(key) {
                        // Ensure we only interact with parent's localStorage for persistence
                        return window.parent.localStorage.getItem(key);
                      },
                      setItem: function(key, value) {
                        window.parent.localStorage.setItem(key, value);
                      },
                      removeItem: function(key) {
                        window.parent.localStorage.removeItem(key);
                      },
                      clear: function() {
                        window.parent.localStorage.clear();
                      }
                    };
                  },
                  set: function() {} // Prevent setting localStorage on the iframe itself
                });
                
                // Override console methods to log to parent window's output div
                const outputDiv = document.getElementById('output');
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.log = function(...args) {
                  originalLog.apply(console, args);
                  const p = document.createElement('p');
                  p.textContent = args.join(' ');
                  p.style.color = '#60a5fa'; // Tailwind indigo-400
                  outputDiv.appendChild(p);
                };
                
                console.error = function(...args) {
                  originalError.apply(console, args);
                  const p = document.createElement('p');
                  p.textContent = 'ERROR: ' + args.join(' ');
                  p.style.color = '#ef4444'; // Tailwind red-500
                  outputDiv.appendChild(p);
                };
                
                console.warn = function(...args) {
                  originalWarn.apply(console, args);
                  const p = document.createElement('p');
                  p.textContent = 'WARN: ' + args.join(' ');
                  p.style.color = '#f59e0b'; // Tailwind orange-500
                  outputDiv.appendChild(p);
                };

                try {
                  ${code}
                  outputDiv.innerHTML += '<p style="color: #22c55e;">Code executed successfully. Check console and localStorage for telemetry data.</p>'; // Tailwind green-500
                  
                  // Check for regressions after a delay to allow telemetry to be captured
                  setTimeout(() => {
                    window.parent.postMessage({ type: 'checkRegressions', snippetId: '${currentSnippet?.id || ""}' }, '*');
                  }, 3000); // 3 second delay
                } catch (error) {
                  outputDiv.innerHTML += '<p style="color: #ef4444;">Sandbox execution error: ' + error.message + '</p>'; // Tailwind red-500
                  console.error('Sandbox error:', error);
                }
              </script>
            </body>
          </html>
        `)
        iframeDoc.close()

        toast({
          title: "Executed in Sandbox",
          description: "Check the sandbox output and localStorage.",
        })
      }
    }
  }

  // Copy code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied!",
      description: "Code copied to clipboard.",
    })
  }

  // Export snippet
  const exportSnippet = (snippet: BlackboxSnippet) => {
    const blob = new Blob([snippet.code], { type: "text/javascript" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `blackbox-${snippet.id}.js`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exported",
      description: "Snippet downloaded as JavaScript file.",
    })
  }

  // Analyze logs with AI
  const analyzeLogs = async (snippet: BlackboxSnippet) => {
    console.log("[v0] analyzeLogs called for snippet:", snippet.id)

    if (!settings.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your API key in settings.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      console.log("[v0] Gathering logs from localStorage")

      // Gather logs from localStorage
      const memoryLogs = localStorage.getItem("blackbox_memory_log")
      const fpsLogs = localStorage.getItem("blackbox_fps_log")
      const networkLogs = localStorage.getItem("blackbox_network_log")
      const videoLogs = localStorage.getItem("blackbox_video_log")

      const logsData = {
        memory: memoryLogs ? JSON.parse(memoryLogs) : [],
        fps: fpsLogs ? JSON.parse(fpsLogs) : [],
        network: networkLogs ? JSON.parse(networkLogs) : [],
        video: videoLogs ? JSON.parse(videoLogs) : [],
      }

      console.log("[v0] Logs gathered:", {
        memory: logsData.memory.length,
        fps: logsData.fps.length,
        network: logsData.network.length,
        video: logsData.video.length,
      })

      const prompt = `Analyze the following debugging logs and provide insights:

Original Issue: ${snippet.description}

Logs:
${JSON.stringify(logsData, null, 2)}

Please analyze:
1. Memory patterns - any leaks, unusual growth, or spikes?
2. FPS performance - any drops, stutters, or rendering issues?
3. Network behavior - slow requests, failures, or bottlenecks?
4. Video playback - buffering issues, stalls, or quality problems?
5. Correlations - do issues happen together? Any patterns?
6. Root cause hypothesis - what's likely causing the problem?
7. Recommended fixes - specific, actionable steps to resolve

Provide a clear, structured analysis that a developer can act on immediately.`

      console.log("[v0] Calling LLM for analysis")

      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
      }
      let apiBody: any = {}

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            { role: "system", content: "You are an expert debugging analyst. Provide clear, actionable insights." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            { role: "system", content: "You are an expert debugging analyst. Provide clear, actionable insights." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(apiBody),
      })

      console.log("[v0] Analysis response status:", response.status)

      if (!response.ok) {
        let errorMessage = "Analysis request failed"
        try {
          const errorData = await response.json()
          console.error("[v0] Analysis error data:", errorData)
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          console.log("[v0] Could not parse error response")
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const analysis = data.choices[0].message.content

      console.log("[v0] Analysis complete")

      // Update snippet with analysis
      setSnippets((prev) => prev.map((s) => (s.id === snippet.id ? { ...s, analysis, logs: logsData } : s)))

      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your logs.",
      })
    } catch (error: any) {
      console.error("[v0] Analysis error:", error)
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze logs.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
      console.log("[v0] analyzeLogs completed")
    }
  }

  // Filter snippets
  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const copyTemplate = (templateKey: string) => {
    let code = TELEMETRY_TEMPLATES[templateKey as keyof typeof TELEMETRY_TEMPLATES]
    if (loggingEndpoint) {
      code = injectLoggingEndpoint(code)
    }
    copyToClipboard(code)
  }

  // Send Chat Message Function
  const sendChatMessage = async () => {
    if (!chatInput.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send.",
        variant: "destructive",
      })
      return
    }

    if (!settings.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your API key in settings.",
        variant: "destructive",
      })
      setActiveTab("settings")
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: Date.now(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsChatSending(true)

    try {
      // Build context for the AI
      let contextPrompt = chatInput

      if (enableWebSearch && settings.tavilyApiKey) {
        console.log("[v0] Performing Tavily web search for chat context")
        try {
          const tavilyResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: settings.tavilyApiKey,
              query: chatInput,
              max_results: 3,
              search_depth: "advanced",
            }),
          })

          if (tavilyResponse.ok) {
            const tavilyData = await tavilyResponse.json()
            if (tavilyData.results && tavilyData.results.length > 0) {
              const webContext =
                "\n\n[WEB SEARCH RESULTS]:\n" +
                tavilyData.results.map((r: any) => `• ${r.title}\n  ${r.content}\n  Source: ${r.url}`).join("\n\n")
              contextPrompt += webContext
              console.log("[v0] Tavily search successful, added context")
            }
          }
        } catch (e) {
          console.warn("[v0] Tavily search failed:", e)
        }
      }

      // Include latest snippet if checkbox is checked
      if (includeSnippet && currentSnippet) {
        contextPrompt += `\n\n[CONTEXT: Latest Blackbox Snippet]\nTitle: ${currentSnippet.title}\nDescription: ${currentSnippet.description}\nCode:\n${currentSnippet.code}`
      }

      // Include telemetry data if checkbox is checked
      if (includeTelemetry) {
        const memoryLogs = localStorage.getItem("blackbox_memory_log")
        const fpsLogs = localStorage.getItem("blackbox_fps_log")
        const networkLogs = localStorage.getItem("blackbox_network_log")
        const videoLogs = localStorage.getItem("blackbox_video_log")

        const telemetryData = {
          memory: memoryLogs ? JSON.parse(memoryLogs).slice(-5) : [], // Last 5 entries
          fps: fpsLogs ? JSON.parse(fpsLogs).slice(-5) : [],
          network: networkLogs ? JSON.parse(networkLogs).slice(-5) : [],
          video: videoLogs ? JSON.parse(videoLogs).slice(-5) : [],
        }

        contextPrompt += `\n\n[CONTEXT: Latest Telemetry Data]\n${JSON.stringify(telemetryData, null, 2)}`
      }

      // Build conversation history
      const messages = [
        {
          role: "system",
          content: `You are an expert debugging assistant helping developers solve complex bugs. You have access to blackbox debugging snippets and telemetry data. Provide clear, actionable advice and suggest specific debugging approaches. If the user's current approach isn't working, suggest alternative strategies or more advanced techniques.`,
        },
        ...chatMessages.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: contextPrompt,
        },
      ]

      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
      }
      let apiBody: any = {}

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: messages,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: messages,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(apiBody),
      })

      if (!response.ok) {
        let errorMessage = `Chat request failed with status ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          // Ignore parse error
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const assistantContent = data.choices[0].message.content

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
      }

      setChatMessages((prev) => [...prev, assistantMessage])

      toast({
        title: "Response Received",
        description: "AI has responded to your message.",
      })
    } catch (error: any) {
      console.error("[v0] Chat error:", error)
      toast({
        title: "Chat Failed",
        description: error.message || "Failed to send message. Check your API key and connection.",
        variant: "destructive",
      })
    } finally {
      setIsChatSending(false)
    }
  }

  const clearChatHistory = () => {
    setChatMessages([])
    localStorage.removeItem("autoblackbox_chat_history")
    toast({
      title: "Chat Cleared",
      description: "Chat history has been cleared.",
    })
  }

  // Anomaly Radar Functions
  const scanForAnomalies = async () => {
    if (!settings.apiKey || isRadarScanning) return

    setIsRadarScanning(true)
    console.log("Scanning for anomalies...")

    try {
      // Gather telemetry data
      const memoryLogs = localStorage.getItem("blackbox_memory_log")
      const fpsLogs = localStorage.getItem("blackbox_fps_log")
      const networkLogs = localStorage.getItem("blackbox_network_log")
      const videoLogs = localStorage.getItem("blackbox_video_log")

      const telemetryData = {
        memory: memoryLogs ? JSON.parse(memoryLogs).slice(-10) : [],
        fps: fpsLogs ? JSON.parse(fpsLogs).slice(-10) : [],
        network: networkLogs ? JSON.parse(networkLogs).slice(-10) : [],
        video: videoLogs ? JSON.parse(videoLogs).slice(-10) : [],
      }

      // Check if there's any data to analyze
      const hasData =
        telemetryData.memory.length > 0 ||
        telemetryData.fps.length > 0 ||
        telemetryData.network.length > 0 ||
        telemetryData.video.length > 0

      if (!hasData) {
        setIsRadarScanning(false)
        return
      }

      const prompt = `Analyze the following telemetry data and identify any anomalies or potential issues. Be specific and actionable.

Telemetry Data (last 10 entries):
${JSON.stringify(telemetryData, null, 2)}

Identify any:
1. Memory leaks or unusual growth patterns
2. FPS drops or rendering issues
3. Network failures, slow requests, or timeouts
4. Video playback problems or buffering issues
5. Any correlations between different metrics

For each anomaly found, provide:
- type: "memory" | "fps" | "network" | "video" | "general"
- severity: "low" | "medium" | "high" | "critical"
- title: Brief description (max 50 chars)
- description: Detailed explanation with specific data points

Return ONLY a JSON array of anomalies. If no anomalies found, return an empty array [].

Example format:
[
  {
    "type": "memory",
    "severity": "high",
    "title": "Memory leak detected",
    "description": "Heap usage increased by 45% in the last 5 minutes, from 120MB to 174MB. This suggests a memory leak in the application."
  }
]`

      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
      }
      let apiBody: any = {}

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert system monitoring assistant. Analyze telemetry data and identify anomalies. Always respond with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert system monitoring assistant. Analyze telemetry data and identify anomalies. Always respond with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(apiBody),
      })

      if (!response.ok) {
        throw new Error(`Radar scan failed with status ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      // Parse the response - it might be wrapped in an object or be an array directly
      let detectedAnomalies: any[] = []
      try {
        const parsed = JSON.parse(content)
        // Check if it's an array or an object with an anomalies property
        if (Array.isArray(parsed)) {
          detectedAnomalies = parsed
        } else if (parsed.anomalies && Array.isArray(parsed.anomalies)) {
          detectedAnomalies = parsed.anomalies
        } else if (Object.keys(parsed).length > 0) {
          // If it's a single anomaly object, wrap it in an array
          detectedAnomalies = [parsed]
        }
      } catch (e) {
        console.error("[v0] Failed to parse anomaly response:", e)
      }

      if (detectedAnomalies.length > 0) {
        const newAnomalies: Anomaly[] = detectedAnomalies.map((a) => ({
          id: Date.now().toString() + Math.random(),
          timestamp: Date.now(),
          type: a.type || "general",
          severity: a.severity || "medium",
          title: a.title || "Anomaly detected",
          description: a.description || "An anomaly was detected in the telemetry data.",
          data: telemetryData,
          dismissed: false,
        }))

        setAnomalies((prev) => [...newAnomalies, ...prev].slice(0, 50)) // Keep last 50 anomalies

        // Show notification for critical/high severity
        const criticalCount = newAnomalies.filter((a) => a.severity === "critical" || a.severity === "high").length
        if (criticalCount > 0) {
          toast({
            title: "Anomalies Detected",
            description: `${criticalCount} ${criticalCount === 1 ? "anomaly" : "anomalies"} detected. Check the radar panel.`,
            variant: "destructive",
          })
          setShowAnomalyPanel(true)
        }
      }
    } catch (error: any) {
      console.error("[v0] Radar scan error:", error)
    } finally {
      setIsRadarScanning(false)
    }
  }

  const dismissAnomaly = (id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)))
  }

  const clearAllAnomalies = () => {
    setAnomalies([])
    localStorage.removeItem("autoblackbox_anomalies")
    toast({
      title: "Anomalies Cleared",
      description: "All anomalies have been cleared.",
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/20"
      case "high":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20"
      case "medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      case "low":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20"
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500/20"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "memory":
        return <Database className="w-4 h-4" />
      case "fps":
        return <Activity className="w-4 h-4" />
      case "network":
        return <Wifi className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const activeAnomalies = anomalies.filter((a) => !a.dismissed)
  const criticalAnomalies = activeAnomalies.filter((a) => a.severity === "critical" || a.severity === "high")

  // Marketplace functions
  const fetchMarketplaceProbes = async () => {
    setIsLoadingMarketplace(true)
    try {
      // For demo purposes, using a mock marketplace
      // In production, this would fetch from: https://api.github.com/repos/[org]/probes/contents
      const mockProbes: MarketplaceProbe[] = [
        {
          name: "Web Vitals Monitor",
          description: "Track Core Web Vitals (LCP, FID, CLS, TTFB) for performance optimization",
          category: "Performance",
          author: "community",
          version: "1.0.0",
          downloads: 1250,
          rating: 4.8,
          code: `
// Web Vitals Monitoring Probe
(function() {
  const vitalsLog = [];
  const MAX_LOGS = 50;
  
  function captureWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitalsLog.push({
          timestamp: Date.now(),
          metric: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: lastEntry.renderTime < 2500 ? 'good' : lastEntry.renderTime < 4000 ? 'needs-improvement' : 'poor'
        });
        if (vitalsLog.length > MAX_LOGS) vitalsLog.shift();
        localStorage.setItem('blackbox_webvitals_log', JSON.stringify(vitalsLog));
        console.log('[BlackBox Web Vitals] LCP:', lastEntry.renderTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          vitalsLog.push({
            timestamp: Date.now(),
            metric: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: entry.processingStart - entry.startTime < 100 ? 'good' : entry.processingStart - entry.startTime < 300 ? 'needs-improvement' : 'poor'
          });
          if (vitalsLog.length > MAX_LOGS) vitalsLog.shift();
          localStorage.setItem('blackbox_webvitals_log', JSON.stringify(vitalsLog));
          console.log('[BlackBox Web Vitals] FID:', entry.processingStart - entry.startTime);
        });
      }).observe({ entryTypes: ['first-input'] });
      
      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        vitalsLog.push({
          timestamp: Date.now(),
          metric: 'CLS',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
        });
        if (vitalsLog.length > MAX_LOGS) vitalsLog.shift();
        localStorage.setItem('blackbox_webvitals_log', JSON.stringify(vitalsLog));
        console.log('[BlackBox Web Vitals] CLS:', clsValue);
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }
  
  window.__blackbox_webvitals = {
    getLogs: () => vitalsLog,
    clear: () => { vitalsLog.length = 0; localStorage.removeItem('blackbox_webvitals_log'); }
  };
  
  captureWebVitals();
})();
`,
        },
        {
          name: "WebGL Performance Tracker",
          description: "Monitor WebGL context, draw calls, and GPU performance metrics",
          category: "Graphics",
          author: "community",
          version: "1.2.0",
          downloads: 890,
          rating: 4.6,
          code: `
// WebGL Performance Monitoring Probe
(function() {
  const webglLog = [];
  const MAX_LOGS = 100;
  
  function monitorWebGL() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('[BlackBox WebGL] No canvas element found');
      return;
    }
    
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) {
      console.warn('[BlackBox WebGL] WebGL not supported');
      return;
    }
    
    // Intercept drawArrays and drawElements
    const originalDrawArrays = gl.drawArrays;
    const originalDrawElements = gl.drawElements;
    let drawCallCount = 0;
    
    gl.drawArrays = function(...args) {
      drawCallCount++;
      return originalDrawArrays.apply(this, args);
    };
    
    gl.drawElements = function(...args) {
      drawCallCount++;
      return originalDrawElements.apply(this, args);
    };
    
    // Capture metrics every second
    setInterval(() => {
      const data = {
        timestamp: Date.now(),
        drawCalls: drawCallCount,
        canvasSize: { width: canvas.width, height: canvas.height },
        contextAttributes: gl.getContextAttributes(),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
      };
      
      webglLog.push(data);
      if (webglLog.length > MAX_LOGS) webglLog.shift();
      
      localStorage.setItem('blackbox_webgl_log', JSON.stringify(webglLog));
      console.log('[BlackBox WebGL]', data);
      
      drawCallCount = 0; // Reset counter
    }, 1000);
  }
  
  window.__blackbox_webgl = {
    getLogs: () => webglLog,
    clear: () => { webglLog.length = 0; localStorage.removeItem('blackbox_webgl_log'); }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorWebGL);
  } else {
    monitorWebGL();
  }
})();
`,
        },
        {
          name: "WebSocket Connection Monitor",
          description: "Track WebSocket connections, messages, reconnections, and latency",
          category: "Network",
          author: "community",
          version: "1.1.0",
          downloads: 1450,
          rating: 4.9,
          code: `
// WebSocket Monitoring Probe
(function() {
  const wsLog = [];
  const MAX_LOGS = 200;
  
  const OriginalWebSocket = window.WebSocket;
  
  window.WebSocket = function(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);
    const connectionStart = Date.now();
    let messageCount = 0;
    let lastMessageTime = Date.now();
    
    ws.addEventListener('open', (event) => {
      const data = {
        timestamp: Date.now(),
        event: 'open',
        url: url,
        connectionTime: Date.now() - connectionStart,
        readyState: ws.readyState
      };
      wsLog.push(data);
      if (wsLog.length > MAX_LOGS) wsLog.shift();
      localStorage.setItem('blackbox_websocket_log', JSON.stringify(wsLog));
      console.log('[BlackBox WebSocket] Connection opened:', data);
    });
    
    ws.addEventListener('message', (event) => {
      messageCount++;
      const now = Date.now();
      const latency = now - lastMessageTime;
      lastMessageTime = now;
      
      const data = {
        timestamp: now,
        event: 'message',
        url: url,
        messageSize: event.data.length,
        messageCount: messageCount,
        latency: latency
      };
      wsLog.push(data);
      if (wsLog.length > MAX_LOGS) wsLog.shift();
      localStorage.setItem('blackbox_websocket_log', JSON.stringify(wsLog));
      console.log('[BlackBox WebSocket] Message received:', data);
    });
    
    ws.addEventListener('error', (event) => {
      const data = {
        timestamp: Date.now(),
        event: 'error',
        url: url,
        readyState: ws.readyState
      };
      wsLog.push(data);
      if (wsLog.length > MAX_LOGS) wsLog.shift();
      localStorage.setItem('blackbox_websocket_log', JSON.stringify(wsLog));
      console.error('[BlackBox WebSocket] Error:', data);
    });
    
    ws.addEventListener('close', (event) => {
      const data = {
        timestamp: Date.now(),
        event: 'close',
        url: url,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        totalMessages: messageCount
      };
      wsLog.push(data);
      if (wsLog.length > MAX_LOGS) wsLog.shift();
      localStorage.setItem('blackbox_websocket_log', JSON.stringify(wsLog));
      console.log('[BlackBox WebSocket] Connection closed:', data);
    });
    
    return ws;
  };
  
  window.__blackbox_websocket = {
    getLogs: () => wsLog,
    clear: () => { wsLog.length = 0; localStorage.removeItem('blackbox_websocket_log'); }
  };
})();
`,
        },
        {
          name: "Long Task Detector",
          description: "Identify and log JavaScript long tasks that block the main thread",
          category: "Performance",
          author: "community",
          version: "1.0.0",
          downloads: 720,
          rating: 4.7,
          code: `
// Long Task Detection Probe
(function() {
  const longTaskLog = [];
  const MAX_LOGS = 100;
  
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const data = {
          timestamp: Date.now(),
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
          attribution: entry.attribution ? entry.attribution.map(a => ({
            name: a.name,
            entryType: a.entryType,
            startTime: a.startTime,
            duration: a.duration,
            containerType: a.containerType,
            containerSrc: a.containerSrc,
            containerId: a.containerId,
            containerName: a.containerName
          })) : []
        };
        
        longTaskLog.push(data);
        if (longTaskLog.length > MAX_LOGS) longTaskLog.shift();
        
        localStorage.setItem('blackbox_longtask_log', JSON.stringify(longTaskLog));
        console.warn('[BlackBox Long Task] Detected:', data);
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
    
    window.__blackbox_longtask = {
      getLogs: () => longTaskLog,
      clear: () => { longTaskLog.length = 0; localStorage.removeItem('blackbox_longtask_log'); }
    };
  } else {
    console.warn('[BlackBox Long Task] PerformanceObserver not supported');
  }
})();
`,
        },
        {
          name: "IndexedDB Operations Tracker",
          description: "Monitor IndexedDB transactions, queries, and performance",
          category: "Storage",
          author: "community",
          version: "1.0.0",
          downloads: 540,
          rating: 4.5,
          code: `
// IndexedDB Monitoring Probe
(function() {
  const idbLog = [];
  const MAX_LOGS = 150;
  
  const originalOpen = indexedDB.open;
  
  indexedDB.open = function(name, version) {
    const request = originalOpen.call(this, name, version);
    const openStart = performance.now();
    
    request.addEventListener('success', () => {
      const data = {
        timestamp: Date.now(),
        operation: 'open',
        dbName: name,
        version: version,
        duration: performance.now() - openStart,
        success: true
      };
      idbLog.push(data);
      if (idbLog.length > MAX_LOGS) idbLog.shift();
      localStorage.setItem('blackbox_indexeddb_log', JSON.stringify(idbLog));
      console.log('[BlackBox IndexedDB] Database opened:', data);
      
      // Monitor transactions
      const db = request.result;
      const originalTransaction = db.transaction;
      
      db.transaction = function(storeNames, mode) {
        const transaction = originalTransaction.call(this, storeNames, mode);
        const txStart = performance.now();
        
        transaction.addEventListener('complete', () => {
          const txData = {
            timestamp: Date.now(),
            operation: 'transaction',
            dbName: name,
            stores: Array.isArray(storeNames) ? storeNames : [storeNames],
            mode: mode,
            duration: performance.now() - txStart,
            success: true
          };
          idbLog.push(txData);
          if (idbLog.length > MAX_LOGS) idbLog.shift();
          localStorage.setItem('blackbox_indexeddb_log', JSON.stringify(idbLog));
          console.log('[BlackBox IndexedDB] Transaction completed:', txData);
        });
        
        transaction.addEventListener('error', (event) => {
          const txData = {
            timestamp: Date.now(),
            operation: 'transaction',
            dbName: name,
            stores: Array.isArray(storeNames) ? storeNames : [storeNames],
            mode: mode,
            duration: performance.now() - txStart,
            success: false,
            error: event.target.error
          };
          idbLog.push(txData);
          if (idbLog.length > MAX_LOGS) idbLog.shift();
          localStorage.setItem('blackbox_indexeddb_log', JSON.stringify(txData));
          console.error('[BlackBox IndexedDB] Transaction error:', txData);
        });
        
        return transaction;
      };
    });
    
    request.addEventListener('error', () => {
      const data = {
        timestamp: Date.now(),
        operation: 'open',
        dbName: name,
        version: version,
        duration: performance.now() - openStart,
        success: false,
        error: request.error
      };
      idbLog.push(data);
      if (idbLog.length > MAX_LOGS) idbLog.shift();
      localStorage.setItem('blackbox_indexeddb_log', JSON.stringify(idbLog));
      console.error('[BlackBox IndexedDB] Database open error:', data);
    });
    
    return request;
  };
  
  window.__blackbox_indexeddb = {
    getLogs: () => idbLog,
    clear: () => { idbLog.length = 0; localStorage.removeItem('blackbox_indexeddb_log'); }
  };
})();
`,
        },
        {
          name: "Service Worker Monitor",
          description: "Track service worker lifecycle, cache operations, and sync events",
          category: "PWA",
          author: "community",
          version: "1.0.0",
          downloads: 680,
          rating: 4.6,
          code: `
// Service Worker Monitoring Probe
(function() {
  const swLog = [];
  const MAX_LOGS = 100;
  
  if ('serviceWorker' in navigator) {
    // Monitor registration
    navigator.serviceWorker.register = new Proxy(navigator.serviceWorker.register, {
      apply: function(target, thisArg, args) {
        const regStart = performance.now();
        const promise = Reflect.apply(target, thisArg, args);
        
        promise.then((registration) => {
          const data = {
            timestamp: Date.now(),
            event: 'register',
            scope: registration.scope,
            duration: performance.now() - regStart,
            success: true
          };
          swLog.push(data);
          if (swLog.length > MAX_LOGS) swLog.shift();
          localStorage.setItem('blackbox_serviceworker_log', JSON.stringify(swLog));
          console.log('[BlackBox Service Worker] Registered:', data);
          
          // Monitor state changes
          if (registration.installing) {
            registration.installing.addEventListener('statechange', (e) => {
              const stateData = {
                timestamp: Date.now(),
                event: 'statechange',
                state: e.target.state,
                scope: registration.scope
              };
              swLog.push(stateData);
              if (swLog.length > MAX_LOGS) swLog.shift();
              localStorage.setItem('blackbox_serviceworker_log', JSON.stringify(swLog));
              console.log('[BlackBox Service Worker] State changed:', stateData);
            });
          }
        }).catch((error) => {
          const data = {
            timestamp: Date.now(),
            event: 'register',
            duration: performance.now() - regStart,
            success: false,
            error: error.message
          };
          swLog.push(data);
          if (swLog.length > MAX_LOGS) swLog.shift();
          localStorage.setItem('blackbox_serviceworker_log', JSON.stringify(swLog));
          console.error('[BlackBox Service Worker] Registration failed:', data);
        });
        
        return promise;
      }
    });
    
    // Monitor controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const data = {
        timestamp: Date.now(),
        event: 'controllerchange',
        controller: navigator.serviceWorker.controller ? 'active' : 'none'
      };
      swLog.push(data);
      if (swLog.length > MAX_LOGS) swLog.shift();
      localStorage.setItem('blackbox_serviceworker_log', JSON.stringify(swLog));
      console.log('[BlackBox Service Worker] Controller changed:', data);
    });
    
    // Monitor messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = {
        timestamp: Date.now(),
        event: 'message',
        data: event.data
      };
      swLog.push(data);
      if (swLog.length > MAX_LOGS) swLog.shift();
      localStorage.setItem('blackbox_serviceworker_log', JSON.stringify(swLog));
      console.log('[BlackBox Service Worker] Message received:', data);
    });
  }
  
  window.__blackbox_serviceworker = {
    getLogs: () => swLog,
    clear: () => { swLog.length = 0; localStorage.removeItem('blackbox_serviceworker_log'); }
  };
})();
`,
        },
      ]

      setMarketplaceProbes(mockProbes)

      toast({
        title: "Marketplace Loaded",
        description: `Found ${mockProbes.length} community probes`,
      })
    } catch (error: any) {
      console.error("[v0] Failed to load marketplace:", error)
      toast({
        title: "Marketplace Error",
        description: "Failed to load community probes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMarketplace(false)
    }
  }

  const installProbe = (probe: MarketplaceProbe) => {
    if (installedProbes.includes(probe.name)) {
      toast({
        title: "Already Installed",
        description: `${probe.name} is already installed.`,
        variant: "destructive",
      })
      return
    }

    // Save probe code to localStorage
    const probeKey = `blackbox_probe_${probe.name.toLowerCase().replace(/\s+/g, "_")}`
    localStorage.setItem(probeKey, probe.code)

    // Add to installed list
    setInstalledProbes((prev) => [...prev, probe.name])

    toast({
      title: "Probe Installed",
      description: `${probe.name} has been installed. Copy the code from Templates to use it.`,
    })
  }

  const uninstallProbe = (probeName: string) => {
    const probeKey = `blackbox_probe_${probeName.toLowerCase().replace(/\s+/g, "_")}`
    localStorage.removeItem(probeKey)

    setInstalledProbes((prev) => prev.filter((name) => name !== probeName))

    toast({
      title: "Probe Uninstalled",
      description: `${probeName} has been removed.`,
    })
  }

  const filteredMarketplaceProbes =
    marketplaceFilter === "all" ? marketplaceProbes : marketplaceProbes.filter((p) => p.category === marketplaceFilter)

  const categories = ["all", ...Array.from(new Set(marketplaceProbes.map((p) => p.category)))]

  // Generate Code Fix Function for AI code-patch loop
  const generateCodeFix = async (targetAnomaly?: Anomaly) => {
    if (!settings.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your API key in settings.",
        variant: "destructive",
      })
      setActiveTab("settings")
      return
    }

    if (!currentSnippet && !targetAnomaly) {
      toast({
        title: "No Context",
        description: "Please generate a snippet or select an anomaly first.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingFix(true)
    setShowPatchPanel(true)

    try {
      // Gather current telemetry as baseline
      const memoryLogs = localStorage.getItem("blackbox_memory_log")
      const fpsLogs = localStorage.getItem("blackbox_fps_log")
      const networkLogs = localStorage.getItem("blackbox_network_log")
      const videoLogs = localStorage.getItem("blackbox_video_log")

      const telemetryBefore = {
        memory: memoryLogs ? JSON.parse(memoryLogs).slice(-5) : [],
        fps: fpsLogs ? JSON.parse(fpsLogs).slice(-5) : [],
        network: networkLogs ? JSON.parse(networkLogs).slice(-5) : [],
        video: videoLogs ? JSON.parse(videoLogs).slice(-5) : [],
      }

      const iteration = patchHistory.length + 1

      if (iteration > maxPatchIterations) {
        toast({
          title: "Max Iterations Reached",
          description: `Attempted ${maxPatchIterations} fixes. Consider manual intervention.`,
          variant: "destructive",
        })
        setIsGeneratingFix(false)
        return
      }

      // Build context for fix generation
      const anomalyContext = targetAnomaly
        ? `Anomaly Detected:\nType: ${targetAnomaly.type}\nSeverity: ${targetAnomaly.severity}\nTitle: ${targetAnomaly.title}\nDescription: ${targetAnomaly.description}\n\n`
        : ""

      const snippetContext = currentSnippet ? `Current Debugging Code:\n${currentSnippet.code}\n\n` : ""

      const previousAttempts =
        patchHistory.length > 0
          ? `Previous Fix Attempts:\n${patchHistory.map((p, i) => `Iteration ${p.iteration}: ${p.status} - ${p.improvement || "No improvement"}`).join("\n")}\n\n`
          : ""

      const prompt = `You are an expert debugging engineer. Generate a FIXED version of the code that resolves the detected issue.

${anomalyContext}${snippetContext}${previousAttempts}Current Telemetry Data:
${JSON.stringify(telemetryBefore, null, 2)}

Your task:
1. Analyze the anomaly and telemetry data
2. Identify the root cause of the issue
3. Generate COMPLETE, RUNNABLE JavaScript code that fixes the problem
4. Include proper error handling and edge case coverage
5. Add comments explaining the fix strategy

Requirements:
- The code must be production-ready and crash-resilient
- Include telemetry logging to verify the fix works
- Use the same localStorage keys for consistency
- Wrap everything in an IIFE to avoid global pollution

Return ONLY valid JavaScript code, no markdown formatting or explanations outside the code.`

      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
      }
      let apiBody: any = {}

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            {
              role: "system",
              content: settings.systemPrompt,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3, // Lower temperature for more deterministic fixes
          max_tokens: settings.maxTokens,
        }
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            {
              role: "system",
              content: settings.systemPrompt,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: settings.maxTokens,
        }
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(apiBody),
      })

      if (!response.ok) {
        throw new Error(`Fix generation failed with status ${response.status}`)
      }

      const data = await response.json()
      let fixedCode = data.choices[0].message.content

      // Clean up markdown code blocks if present
      fixedCode = fixedCode
        .replace(/```javascript\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      // Create patch object
      const patch: CodePatch = {
        id: Date.now().toString(),
        iteration,
        code: fixedCode,
        timestamp: Date.now(),
        telemetryBefore,
        status: "testing",
      }

      setCurrentPatch(patch)
      setPatchHistory((prev) => [...prev, patch])

      toast({
        title: "Fix Generated",
        description: `Iteration ${iteration}: Testing fix in sandbox...`,
      })

      // Execute the fix in sandbox
      executeInSandbox(fixedCode)

      // Wait for telemetry to update (5 seconds)
      setTimeout(async () => {
        // Gather telemetry after fix
        const memoryLogsAfter = localStorage.getItem("blackbox_memory_log")
        const fpsLogsAfter = localStorage.getItem("blackbox_fps_log")
        const networkLogsAfter = localStorage.getItem("blackbox_network_log")
        const videoLogsAfter = localStorage.getItem("blackbox_video_log")

        const telemetryAfter = {
          memory: memoryLogsAfter ? JSON.parse(memoryLogsAfter).slice(-5) : [],
          fps: fpsLogsAfter ? JSON.parse(fpsLogsAfter).slice(-5) : [],
          network: networkLogsAfter ? JSON.parse(networkLogsAfter).slice(-5) : [],
          video: videoLogsAfter ? JSON.parse(videoLogsAfter).slice(-5) : [],
        }

        // Analyze improvement
        const improvement = await analyzePatchImprovement(telemetryBefore, telemetryAfter, targetAnomaly)

        // Update patch with results
        const updatedPatch: CodePatch = {
          ...patch,
          telemetryAfter,
          improvement,
          status: improvement.includes("improved") || improvement.includes("fixed") ? "improved" : "failed",
        }

        setCurrentPatch(updatedPatch)
        setPatchHistory((prev) => prev.map((p) => (p.id === patch.id ? updatedPatch : p)))

        if (updatedPatch.status === "improved") {
          toast({
            title: "Fix Successful!",
            description: improvement,
          })

          // Update current snippet with the fix
          if (currentSnippet) {
            const updatedSnippet = {
              ...currentSnippet,
              code: fixedCode,
              analysis: `${currentSnippet.analysis || ""}\n\nAI-Generated Fix (Iteration ${iteration}):\n${improvement}`,
            }
            setCurrentSnippet(updatedSnippet)
            setSnippets((prev) => prev.map((s) => (s.id === currentSnippet.id ? updatedSnippet : s)))
          }
        } else {
          toast({
            title: "Fix Needs Refinement",
            description: `${improvement}. Iteration ${iteration}/${maxPatchIterations}`,
            variant: "destructive",
          })

          // Auto-retry if under max iterations
          if (iteration < maxPatchIterations) {
            setTimeout(() => {
              generateCodeFix(targetAnomaly)
            }, 2000)
          }
        }

        setIsGeneratingFix(false)
      }, 5000)
    } catch (error: any) {
      console.error("[v0] Fix generation error:", error)
      toast({
        title: "Fix Generation Failed",
        description: error.message || "Failed to generate fix. Please try again.",
        variant: "destructive",
      })
      setIsGeneratingFix(false)
    }
  }

  const analyzePatchImprovement = async (before: any, after: any, anomaly?: Anomaly): Promise<string> => {
    try {
      const prompt = `Compare the telemetry data before and after applying a code fix. Determine if the fix improved the situation.

${anomaly ? `Anomaly Detected:\nType: ${anomaly.type}\nSeverity: ${anomaly.severity}\nTitle: ${anomaly.title}\nDescription: ${anomaly.description}\n\n` : ""}Telemetry Before Fix:
${JSON.stringify(before, null, 2)}

Telemetry After Fix:
${JSON.stringify(after, null, 2)}

Analyze:
1. Did memory usage improve (decrease or stabilize)?
2. Did FPS improve (increase or stabilize)?
3. Did network performance improve (faster, fewer errors)?
4. Did video playback improve (less buffering, smoother)?
5. Are there any new issues introduced?

Provide a brief assessment (2-3 sentences) stating whether the fix:
- "Successfully improved" the metrics
- "Partially improved" some metrics
- "Failed to improve" or "Made things worse"

Be specific about which metrics changed and by how much.`

      let apiUrl = ""
      const apiHeaders: any = {
        "Content-Type": "application/json",
      }
      let apiBody: any = {}

      if (settings.provider === "groq") {
        apiUrl = "https://api.groq.com/openai/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert at analyzing performance metrics and determining if code changes improved system behavior.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions"
        apiHeaders["Authorization"] = `Bearer ${settings.apiKey}`
        apiBody = {
          model: settings.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert at analyzing performance metrics and determining if code changes improved system behavior.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(apiBody),
      })

      if (!response.ok) {
        return "Unable to analyze improvement - API error"
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error("[v0] Improvement analysis error:", error)
      return "Unable to analyze improvement - analysis failed"
    }
  }

  const clearPatchHistory = () => {
    setPatchHistory([])
    setCurrentPatch(null)
    toast({
      title: "Patch History Cleared",
      description: "All fix iterations have been cleared.",
    })
  }

  // COMMAND PALETTE HANDLER FUNCTIONS
  const handleClearAllLogs = () => {
    localStorage.removeItem("blackbox_memory_log")
    localStorage.removeItem("blackbox_fps_log")
    localStorage.removeItem("blackbox_network_log")
    localStorage.removeItem("blackbox_video_log")
    localStorage.removeItem("blackbox_webvitals_log") // Added clear for new probes
    localStorage.removeItem("blackbox_webgl_log")
    localStorage.removeItem("blackbox_websocket_log")
    localStorage.removeItem("blackbox_longtask_log")
    localStorage.removeItem("blackbox_indexeddb_log")
    localStorage.removeItem("blackbox_serviceworker_log")

    toast({
      title: "Logs Cleared",
      description: "All telemetry logs have been cleared.",
    })
  }

  // Regression Guard functions
  const calculateStatistics = (samples: number[]) => {
    if (samples.length === 0) return { mean: 0, stdDev: 0 }

    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length
    const stdDev = Math.sqrt(variance)

    return { mean, stdDev }
  }

  const extractMetricValue = (log: any, metricType: string): number => {
    switch (metricType) {
      case "memory":
        // Prioritize common keys, fall back to others
        return log.usedJSHeapSize ?? log.heapUsed ?? log.memory ?? 0
      case "fps":
        return log.fps ?? log.framesPerSecond ?? 0
      case "network":
        // Network duration can be found in fetch or XHR logs
        return log.duration ?? log.responseTime ?? log.latency ?? 0
      case "video":
        // Placeholder for video metrics, adjust based on actual data
        return log.bufferHealth ?? log.playbackQuality ?? 0
      default:
        return 0
    }
  }

  const captureBaseline = (snippetId: string | undefined) => {
    if (!snippetId) {
      toast({
        title: "Error",
        description: "Cannot capture baseline without a snippet ID.",
        variant: "destructive",
      })
      return
    }

    try {
      // Gather telemetry data
      const memoryLogs = localStorage.getItem("blackbox_memory_log")
      const fpsLogs = localStorage.getItem("blackbox_fps_log")
      const networkLogs = localStorage.getItem("blackbox_network_log")
      const videoLogs = localStorage.getItem("blackbox_video_log")

      // Use last 20 samples for baseline
      const memoryData = memoryLogs ? JSON.parse(memoryLogs).slice(-20) : []
      const fpsData = fpsLogs ? JSON.parse(fpsLogs).slice(-20) : []
      const networkData = networkLogs ? JSON.parse(networkLogs).slice(-20) : []
      const videoData = videoLogs ? JSON.parse(videoLogs).slice(-20) : []

      // Extract numeric values
      const memorySamples = memoryData.map((log: any) => extractMetricValue(log, "memory")).filter((v) => !isNaN(v))
      const fpsSamples = fpsData.map((log: any) => extractMetricValue(log, "fps")).filter((v) => !isNaN(v))
      const networkSamples = networkData.map((log: any) => extractMetricValue(log, "network")).filter((v) => !isNaN(v))
      const videoSamples = videoData.map((log: any) => extractMetricValue(log, "video")).filter((v) => !isNaN(v))

      // Calculate statistics
      const memoryStats = calculateStatistics(memorySamples)
      const fpsStats = calculateStatistics(fpsSamples)
      const networkStats = calculateStatistics(networkSamples)
      const videoStats = calculateStatistics(videoSamples)

      const baseline: RegressionBaseline = {
        snippetId,
        timestamp: Date.now(),
        metrics: {
          memory: { ...memoryStats, samples: memorySamples },
          fps: { ...fpsStats, samples: fpsSamples },
          network: { ...networkStats, samples: networkSamples },
          video: { ...videoStats, samples: videoSamples },
        },
      }

      // Replace existing baseline for this snippet or add new
      setRegressionBaselines((prev) => {
        const filtered = prev.filter((b) => b.snippetId !== snippetId)
        return [...filtered, baseline]
      })

      toast({
        title: "Baseline Captured",
        description: `Performance baseline set for snippet ${snippetId.slice(0, 8)}...`,
      })
    } catch (error) {
      console.error("[v0] Baseline capture error:", error)
      toast({
        title: "Baseline Capture Failed",
        description: "Unable to capture performance baseline.",
        variant: "destructive",
      })
    }
  }

  const checkForRegressions = (snippetId: string | undefined) => {
    if (!regressionGuardEnabled || !snippetId) return

    try {
      // Find baseline for this snippet
      const baseline = regressionBaselines.find((b) => b.snippetId === snippetId)
      if (!baseline) {
        console.log("[v0] No baseline found for snippet:", snippetId)
        return
      }

      // Gather current telemetry
      const memoryLogs = localStorage.getItem("blackbox_memory_log")
      const fpsLogs = localStorage.getItem("blackbox_fps_log")
      const networkLogs = localStorage.getItem("blackbox_network_log")
      const videoLogs = localStorage.getItem("blackbox_video_log")

      // Use last 5 samples for current check
      const memoryData = memoryLogs ? JSON.parse(memoryLogs).slice(-5) : []
      const fpsData = fpsLogs ? JSON.parse(fpsLogs).slice(-5) : []
      const networkData = networkLogs ? JSON.parse(networkLogs).slice(-5) : []
      const videoData = videoLogs ? JSON.parse(videoLogs).slice(-5) : []

      // Extract current values
      const currentMemory = memoryData.map((log: any) => extractMetricValue(log, "memory")).filter((v) => !isNaN(v))
      const currentFps = fpsData.map((log: any) => extractMetricValue(log, "fps")).filter((v) => !isNaN(v))
      const currentNetwork = networkData.map((log: any) => extractMetricValue(log, "network")).filter((v) => !isNaN(v))
      const currentVideo = videoData.map((log: any) => extractMetricValue(log, "video")).filter((v) => !isNaN(v))

      const alerts: RegressionAlert[] = []

      // Check each metric against baseline + 2σ threshold
      const checkMetric = (
        metricName: string,
        currentSamples: number[],
        baselineMean: number,
        baselineStdDev: number,
        higherIsBetter = false,
        zeroBaselineMeansNoData = false, // Flag for metrics where 0 is a valid data point vs. no data
      ) => {
        // Ensure we have enough data to make a meaningful comparison
        if (currentSamples.length === 0 || (baselineMean === 0 && zeroBaselineMeansNoData)) {
          return
        }

        const currentMean = currentSamples.reduce((sum, val) => sum + val, 0) / currentSamples.length
        // Use a small epsilon for stdDev to avoid division by zero if all samples are the same
        const epsilon = 1e-9
        const effectiveStdDev = baselineStdDev + epsilon

        // Calculate threshold: baseline +/- 2 standard deviations
        // For metrics where higher is better (e.g., FPS), a significant drop below baseline is a regression.
        // For metrics where lower is better (e.g., Memory, Latency), a significant increase above baseline is a regression.
        const threshold = higherIsBetter ? baselineMean - 2 * effectiveStdDev : baselineMean + 2 * effectiveStdDev

        const isRegression = higherIsBetter ? currentMean < threshold : currentMean > threshold

        if (isRegression) {
          const percentChange =
            baselineMean === 0 ? Number.POSITIVE_INFINITY : ((currentMean - baselineMean) / baselineMean) * 100
          const severity =
            Math.abs(percentChange) > 50 || percentChange === Number.POSITIVE_INFINITY ? "critical" : "warning"

          alerts.push({
            id: Date.now().toString() + Math.random(),
            timestamp: Date.now(),
            snippetId,
            metric: metricName,
            baseline: baselineMean,
            current: currentMean,
            threshold,
            severity,
            message: `${metricName.toUpperCase()} regression detected: ${percentChange > 0 ? "+" : ""}${
              percentChange === Number.POSITIVE_INFINITY ? "∞" : percentChange.toFixed(1) + "%"
            } from baseline (${baselineMean.toFixed(2)} → ${currentMean.toFixed(2)})`,
          })
        }
      }

      // Memory: higher is worse. Baseline of 0 indicates no baseline data, so any usage is technically an increase.
      checkMetric("memory", currentMemory, baseline.metrics.memory.mean, baseline.metrics.memory.stdDev, false, true)

      // FPS: higher is better. Baseline can be 0 if no FPS data was logged initially.
      checkMetric("fps", currentFps, baseline.metrics.fps.mean, baseline.metrics.fps.stdDev, true, true)

      // Network: higher is worse (duration/latency). Baseline of 0 means no network data initially.
      checkMetric(
        "network",
        currentNetwork,
        baseline.metrics.network.mean,
        baseline.metrics.network.stdDev,
        false,
        true,
      )

      // Video: higher is better (e.g., buffer health, quality score). Baseline can be 0.
      checkMetric("video", currentVideo, baseline.metrics.video.mean, baseline.metrics.video.stdDev, true, true)

      if (alerts.length > 0) {
        setRegressionAlerts((prev) => [...alerts, ...prev].slice(0, 50)) // Keep last 50 alerts

        // Show toast for critical regressions
        const criticalAlerts = alerts.filter((a) => a.severity === "critical")
        if (criticalAlerts.length > 0) {
          toast({
            title: "Performance Regression Detected!",
            description: `${criticalAlerts.length} critical ${criticalAlerts.length === 1 ? "regression" : "regressions"} detected. Check the regression panel.`,
            variant: "destructive",
          })
          setShowRegressionPanel(true)
        } else {
          toast({
            title: "Performance Warning",
            description: `${alerts.length} ${alerts.length === 1 ? "regression" : "regressions"} detected.`,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Regression check error:", error)
      toast({
        title: "Regression Check Failed",
        description: "An error occurred during the regression check.",
        variant: "destructive",
      })
    }
  }

  const dismissRegressionAlert = (alertId: string) => {
    setRegressionAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }

  const clearRegressionAlerts = () => {
    setRegressionAlerts([])
    toast({
      title: "Alerts Cleared",
      description: "All regression alerts have been cleared.",
    })
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ensure the message is from the same origin and contains the checkRegressions type
      if (event.origin !== window.location.origin || !event.data || event.data.type !== "checkRegressions") {
        return
      }

      if (event.data.snippetId) {
        checkForRegressions(event.data.snippetId)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [regressionBaselines, regressionGuardEnabled]) // Re-run listener if baselines or guard status change

  return (
    <div className="min-h-screen bg-background">
      <PWAInstallPrompt />

      {/* COMMAND PALETTE COMPONENT */}
      <SectionErrorBoundary sectionName="Command Palette">
        <CommandPalette
          onNavigate={setActiveTab}
          onToggleDarkMode={toggleDarkMode}
          onToggleRadar={() => setRadarEnabled(!radarEnabled)}
          onClearLogs={handleClearAllLogs}
          onGenerateSnippet={generateSnippet}
          onCopyCurrentSnippet={() => currentSnippet && copyToClipboard(currentSnippet.code)}
          onExportCurrentSnippet={() => currentSnippet && exportSnippet(currentSnippet)}
          onAnalyzeLogs={() => currentSnippet && analyzeLogs(currentSnippet)}
          onAttemptFix={() => generateCodeFix()}
          onOpenFAQ={() => setIsFaqOpen(true)}
          // Regression Guard Commands
          onToggleRegressionGuard={() => setRegressionGuardEnabled(!regressionGuardEnabled)}
          onCaptureBaseline={() => currentSnippet?.id && captureBaseline(currentSnippet.id)}
          onCheckRegressions={() => currentSnippet?.id && checkForRegressions(currentSnippet.id)}
          currentSnippet={currentSnippet}
          darkMode={settings.darkMode}
          radarEnabled={radarEnabled}
          regressionGuardEnabled={regressionGuardEnabled} // Pass regression guard state to CommandPalette
        />
      </SectionErrorBoundary>

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">bugLet</h1>
              <p className="text-xs text-muted-foreground">AI-Powered DebugScript generation and strategies</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* KEYBOARD SHORTCUT HINT */}
            <div className="hidden md:flex items-center gap-2 mr-4 text-sm text-muted-foreground">
              <kbd className="px-2 py-1 text-xs bg-muted rounded border">⌘K</kbd>
              <span>or</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded border">/</kbd>
              <span>for commands</span>
            </div>

            <div className="flex items-center gap-2 mr-2">
              <Button
                variant={radarEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setRadarEnabled(!radarEnabled)}
                className="relative"
              >
                <Radar className={`w-4 h-4 mr-2 ${isRadarScanning ? "animate-spin" : ""}`} />
                Radar {radarEnabled ? "ON" : "OFF"}
                {criticalAnomalies.length > 0 && (
                  <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                    {criticalAnomalies.length}
                  </Badge>
                )}
              </Button>

              {activeAnomalies.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAnomalyPanel(!showAnomalyPanel)}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {activeAnomalies.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {activeAnomalies.length > 9 ? "9+" : activeAnomalies.length}
                    </span>
                  )}
                </Button>
              )}
            </div>

            {/* Regression Guard Indicator */}
            {regressionGuardEnabled && regressionAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegressionPanel(!showRegressionPanel)}
                className="relative"
              >
                <Shield className="h-4 w-4 mr-1" />
                Regressions
                <Badge variant="destructive" className="ml-2">
                  {regressionAlerts.filter((a) => a.severity === "critical").length || regressionAlerts.length}
                </Badge>
              </Button>
            )}

            <Dialog open={isFaqOpen} onOpenChange={setIsFaqOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Telemetry & Probe System FAQ</DialogTitle>
                  <DialogDescription>Common questions about using bugLet for debugging</DialogDescription>
                </DialogHeader>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Can I customize the telemetry templates?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Yes! You can customize telemetry templates in several ways:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Copy any template from the Templates tab and modify the code to suit your needs</li>
                        <li>Adjust the capture frequency by changing the interval timers</li>
                        <li>Add custom data points to the captured objects</li>
                        <li>Modify the ring buffer size (MAX_LOGS) to store more or fewer snapshots</li>
                        <li>Change the localStorage keys to organize your data differently</li>
                      </ul>
                      <p className="text-sm text-muted-foreground mt-3">
                        The templates are production-ready starting points, but you have full control to adapt them to
                        your specific debugging needs.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>How do I add a new probe?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        To add a new probe (custom telemetry template):
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Go to the Generate tab and describe what you want to monitor</li>
                        <li>The AI will generate a custom probe based on your description</li>
                        <li>Review and test the generated code in the sandbox</li>
                        <li>Copy the code and integrate it into your application</li>
                        <li>The probe will automatically persist data to localStorage</li>
                      </ol>
                      <p className="text-sm text-muted-foreground mt-3">
                        Example: "Monitor WebSocket connection stability and message latency" will generate a probe for
                        you.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>
                      Can I add more probes besides memory, FPS, network, video, and snapshot?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        The built-in templates are just starting points. You can create probes for:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        <li>
                          <strong>User Interactions:</strong> Click patterns, scroll behavior, form interactions
                        </li>
                        <li>
                          <strong>WebGL/Canvas:</strong> GPU performance, draw calls, texture memory
                        </li>
                        <li>
                          <strong>WebRTC:</strong> Connection quality, packet loss, bandwidth
                        </li>
                        <li>
                          <strong>Service Workers:</strong> Cache hits/misses, sync events
                        </li>
                        <li>
                          <strong>Web Vitals:</strong> LCP, FID, CLS, TTFB
                        </li>
                        <li>
                          <strong>Custom Business Logic:</strong> Shopping cart operations, authentication flows
                        </li>
                        <li>
                          <strong>Third-party APIs:</strong> Payment gateway responses, analytics events
                        </li>
                      </ul>
                      <p className="text-sm text-muted-foreground mt-3">
                        Simply describe what you want to monitor in the Generate tab, and the AI will create a custom
                        probe for you.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>How do I make a probe persist after page reloads?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        All probes automatically persist to localStorage, making them crash-resilient. Here's how it
                        works:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Each probe saves data to a unique localStorage key (e.g., 'blackbox_memory_log')</li>
                        <li>Data survives page reloads, browser crashes, and even browser restarts</li>
                        <li>Ring buffers prevent unlimited growth by keeping only the most recent N entries</li>
                        <li>You can retrieve historical data even after a crash using localStorage.getItem()</li>
                      </ol>
                      <p className="text-sm text-muted-foreground mt-3">
                        To access persisted data: Open DevTools → Application → Local Storage → Select your domain →
                        Look for keys starting with 'blackbox_'
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>How do I share probes between devices?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">You can share probes in two main ways:</p>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">1. Share-link (no server required)</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                            <li>Export the probe as a base64-encoded JSON URL</li>
                            <li>Anyone with the link can import it directly into their app instance</li>
                            <li>Perfect for sharing with team members or across your own devices</li>
                          </ul>
                          <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-x-auto">
                            {`// Generate shareable link
const probe = { /* your probe config */ };
const encoded = btoa(JSON.stringify(probe));
const shareUrl = \`\${window.location.origin}?probe=\${encoded}\`;`}
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">2. Export/Import via file</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                            <li>Use the Export button to download probe as a .js file</li>
                            <li>Share the file via email, Slack, or version control</li>
                            <li>Import by copying the code into your application</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger>How do I export a probe as a base64 JSON URL?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Here's a complete example of creating shareable probe URLs:
                      </p>
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                        {`// 1. Create your probe configuration
const probeConfig = {
  name: "Memory Leak Detector",
  code: "/* your probe code */",
  telemetryTypes: ["memory"],
  description: "Monitors heap growth over time"
};

// 2. Encode to base64
const jsonString = JSON.stringify(probeConfig);
const base64Encoded = btoa(jsonString);

// 3. Create shareable URL
const shareUrl = \`\${window.location.origin}?probe=\${base64Encoded}\`;

// 4. Copy to clipboard
navigator.clipboard.writeText(shareUrl);

// 5. On receiving device, decode and import
const urlParams = new URLSearchParams(window.location.search);
const encodedProbe = urlParams.get('probe');
if (encodedProbe) {
  const decoded = JSON.parse(atob(encodedProbe));
  // Use the probe configuration
}`}
                      </pre>
                      <p className="text-sm text-muted-foreground mt-3">
                        This approach works entirely client-side with no server required, making it perfect for quick
                        sharing and collaboration.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-7">
                    <AccordionTrigger>Can I use this function in my own project?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Integrating bugLetbes into your project is straightforward:
                      </p>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Method 1: Direct Integration</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                            <li>Generate your probe in bugLet</li>
                            <li>Click "Copy Code" or "Export" to get the JavaScript</li>
                            <li>Add the code to your application's entry point (e.g., index.js, app.js)</li>
                            <li>The probe will start monitoring immediately</li>
                          </ol>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">Method 2: Dynamic Loading</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {`// Load probe dynamically when needed
async function loadProbe(probeUrl) {
  const script = document.createElement('script');
  script.src = probeUrl;
  script.async = true;
  document.head.appendChild(script);
}

// Usage
if (process.env.NODE_ENV === 'development') {
  loadProbe('/probes/memory-monitor.js');
}`}
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">Method 3: Conditional Debugging</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {`// Only enable probes for specific users or conditions
const enableDebugMode = 
  localStorage.getItem('debug_mode') === 'true' ||
  window.location.search.includes('debug=true');

if (enableDebugMode) {
  // Paste your probe code here
  (function() {
    // Memory monitoring probe
    // ...
  })();
}`}
                          </pre>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-8">
                    <AccordionTrigger>Can I use this function with other data types?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Yes! The probe system is flexible and can monitor any JavaScript data type or API. Examples:
                      </p>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Custom Objects</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {`// Monitor your application state
const stateLog = [];
function captureState() {
  stateLog.push({
    timestamp: Date.now(),
    userState: window.myApp.getUserState(),
    cartItems: window.myApp.cart.items.length,
    isAuthenticated: window.myApp.auth.isLoggedIn()
  });
}`}
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">Arrays and Collections</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {`// Monitor array growth and mutations
const originalPush = Array.prototype.push;
Array.prototype.push = function(...items) {
  console.log('[BlackBox] Array push:', items.length, 'items');
  return originalPush.apply(this, items);
};`}
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">Async Operations</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {`// Monitor Promise resolution times
const promiseLog = [];
const originalThen = Promise.prototype.then;
Promise.prototype.then = function(onFulfilled, onRejected) {
  const startTime = performance.now();
  return originalThen.call(this, 
    (value) => {
      promiseLog.push({
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        status: 'fulfilled'
      });
      return onFulfilled?.(value);
    },
    onRejected
  );
};`}
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2">DOM Mutations</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {`// Monitor DOM changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('[BlackBox] DOM mutation:', {
      type: mutation.type,
      target: mutation.target.tagName,
      addedNodes: mutation.addedNodes.length,
      removedNodes: mutation.removedNodes.length
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true
});`}
                          </pre>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-3">
                        The key principle: if you can access it in JavaScript, you can monitor it with a probe. Just
                        describe what you want to track in the Generate tab, and the AI will create the appropriate
                        monitoring code.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Need More Help?</h4>
                  <p className="text-sm text-muted-foreground">
                    Describe your specific debugging challenge in the Generate tab, and the AI will create a custom
                    solution tailored to your needs. The system is designed to handle everything from simple logging to
                    complex performance analysis.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {settings.darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {showAnomalyPanel && activeAnomalies.length > 0 && (
          <Card className="mb-6 border-2 border-orange-500/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Radar className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle>Anomaly Radar</CardTitle>
                    <CardDescription>
                      {activeAnomalies.length} active {activeAnomalies.length === 1 ? "anomaly" : "anomalies"} detected
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={clearAllAnomalies} variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                  <Button onClick={() => setShowAnomalyPanel(false)} variant="ghost" size="icon">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activeAnomalies.map((anomaly) => (
                    <div key={anomaly.id} className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(anomaly.type)}
                          <span className="font-semibold text-sm">{anomaly.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {anomaly.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs opacity-70">{new Date(anomaly.timestamp).toLocaleTimeString()}</span>
                          <Button
                            onClick={() => dismissAnomaly(anomaly.id)}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm opacity-90">{anomaly.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Regression Panel */}
        {showRegressionPanel && (
          <div className="fixed right-4 top-20 w-96 max-h-[600px] bg-card border rounded-lg shadow-lg z-50 overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Regression Guard</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearRegressionAlerts}>
                  Clear All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowRegressionPanel(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {regressionAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No regressions detected</p>
                  <p className="text-sm mt-1">Performance is within baseline thresholds</p>
                </div>
              ) : (
                regressionAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={alert.severity === "critical" ? "border-destructive" : "border-yellow-500"}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge
                          variant={alert.severity === "critical" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissRegressionAlert(alert.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium mb-2">{alert.message}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Baseline:</span>
                          <span className="font-mono">{alert.baseline.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current:</span>
                          <span className="font-mono">{alert.current.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Threshold (2σ):</span>
                          <span className="font-mono">{alert.threshold.toFixed(2)}</span>
                        </div>
                        <div className="text-xs mt-2">{new Date(alert.timestamp).toLocaleString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="p-3 border-t bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Guard Status:</span>
                <div className="flex items-center gap-2">
                  <span className={regressionGuardEnabled ? "text-green-600" : "text-gray-400"}>
                    {regressionGuardEnabled ? "Active" : "Disabled"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRegressionGuardEnabled(!regressionGuardEnabled)}
                    className="h-6 px-2"
                  >
                    {regressionGuardEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat
            </TabsTrigger>
            {/* Added Marketplace Tab Trigger */}
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <SectionErrorBoundary sectionName="Generate Tab">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Debugging Snippet</CardTitle>
                  <CardDescription>Describe the bug or issue you're facing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <Textarea
                      placeholder="e.g., My application crashes intermittently on the checkout page, possibly due to a memory leak or race condition."
                      value={bugDescription}
                      onChange={(e) => setBugDescription(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <Button
                      onClick={generateSnippet}
                      disabled={isGenerating || !bugDescription.trim() || !settings.apiKey}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Generate Snippet
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {currentSnippet && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <CardTitle>{currentSnippet.title}</CardTitle>
                        <CardDescription>Instructions and generated code for debugging.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {/* Baseline Capture Button */}
                        <Button variant="outline" size="sm" onClick={() => captureBaseline(currentSnippet.id)}>
                          <Shield className="h-4 w-4 mr-1" />
                          Set Baseline
                        </Button>
                        <Button onClick={() => copyToClipboard(currentSnippet.code)}>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy Code
                        </Button>
                        <Button onClick={() => exportSnippet(currentSnippet)} variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          Export as JS
                        </Button>
                        <Button onClick={() => executeInSandbox(currentSnippet.code)} variant="secondary">
                          Run in Sandbox
                        </Button>
                        <Button onClick={() => analyzeLogs(currentSnippet)} disabled={isAnalyzing} variant="outline">
                          {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Activity className="w-4 h-4 mr-2" />
                          )}
                          Analyze Logs
                        </Button>
                        {/* Button to trigger code fix generation */}
                        <Button onClick={() => generateCodeFix()} disabled={isGeneratingFix}>
                          {isGeneratingFix ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Attempt Fix
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          {currentSnippet.instructions.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Debugging Code:</h4>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          <code className="language-javascript">{currentSnippet.code}</code>
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </SectionErrorBoundary>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <SectionErrorBoundary sectionName="Chat Interface">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>AI Debugging Assistant</span>
                    <Button variant="outline" size="sm" onClick={clearChatHistory} disabled={chatMessages.length === 0}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      New Thread
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Discuss bugs, get debugging suggestions, and explore advanced approaches with AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chat Messages */}
                  <div
                    ref={chatScrollRef}
                    className="h-[500px] overflow-y-auto border border-border rounded-lg p-4 space-y-4 bg-muted/20"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Start a Debugging Conversation</h3>
                        <p className="text-sm max-w-md">
                          Ask questions about your bugs, discuss telemetry data, or get suggestions for advanced
                          debugging techniques. The AI can analyze your snippets and telemetry to provide targeted
                          advice.
                        </p>
                        <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setChatInput("How can I debug a memory leak in my application?")}
                          >
                            How can I debug a memory leak?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setChatInput("What's causing the FPS drops shown in my telemetry data?")}
                          >
                            Analyze my FPS drops
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setChatInput("Suggest alternative debugging approaches for intermittent bugs")
                            }
                          >
                            Help with intermittent bugs
                          </Button>
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border border-border"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {message.role === "assistant" && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                                <div
                                  className={`text-xs mt-2 ${
                                    message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                                  }`}
                                >
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              {message.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {isChatSending && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-4 bg-card border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                            </div>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Context Options */}
                  <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeSnippet"
                        checked={includeSnippet}
                        onChange={(e) => setIncludeSnippet(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <label htmlFor="includeSnippet" className="text-sm cursor-pointer">
                        Include latest snippet
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeTelemetry"
                        checked={includeTelemetry}
                        onChange={(e) => setIncludeTelemetry(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <label htmlFor="includeTelemetry" className="text-sm cursor-pointer">
                        Include telemetry data
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableWebSearch"
                        checked={enableWebSearch}
                        onChange={(e) => setEnableWebSearch(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                        disabled={!settings.tavilyApiKey}
                      />
                      <label
                        htmlFor="enableWebSearch"
                        className={`text-sm cursor-pointer ${!settings.tavilyApiKey ? "opacity-50" : ""}`}
                      >
                        Enable web search {!settings.tavilyApiKey && "(Tavily API key required)"}
                      </label>
                    </div>
                    {(includeSnippet || includeTelemetry || enableWebSearch) && (
                      <Badge variant="secondary" className="text-xs">
                        Enhanced context enabled
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Enable context options above to give the AI access to your latest debugging
                    data
                    {settings.tavilyApiKey ? " and real-time web search results" : ""}. Press Shift+Enter for new line,
                    Enter to send.
                  </div>
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <SectionErrorBoundary sectionName="Marketplace">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Probe Marketplace</CardTitle>
                      <CardDescription>Browse and install community-contributed debugging probes</CardDescription>
                    </div>
                    <Button onClick={fetchMarketplaceProbes} disabled={isLoadingMarketplace}>
                      {isLoadingMarketplace ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4 mr-2" />
                      )}
                      {marketplaceProbes.length === 0 ? "Load Probes" : "Refresh"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {marketplaceProbes.length > 0 && (
                    <div className="mb-6">
                      <div className="flex gap-2 flex-wrap">
                        {categories.map((category) => (
                          <Button
                            key={category}
                            variant={marketplaceFilter === category ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMarketplaceFilter(category)}
                            className="capitalize"
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {marketplaceProbes.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Probes Loaded</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Load Probes" to browse community debugging probes
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredMarketplaceProbes.map((probe) => {
                        const isInstalled = installedProbes.includes(probe.name)
                        return (
                          <Card key={probe.name} className="flex flex-col">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <CardTitle className="text-base">{probe.name}</CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                  {probe.category}
                                </Badge>
                              </div>
                              <CardDescription className="text-sm">{probe.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>Version: {probe.version}</span>
                                  <span>By {probe.author}</span>
                                </div>
                                {probe.downloads && (
                                  <div className="flex items-center justify-between">
                                    <span>{probe.downloads.toLocaleString()} downloads</span>
                                    {probe.rating && <span>★ {probe.rating}/5</span>}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="mt-auto flex gap-2">
                              {isInstalled ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 bg-transparent"
                                    onClick={() => copyToClipboard(probe.code)}
                                  >
                                    Copy Code
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => uninstallProbe(probe.name)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button className="w-full" size="sm" onClick={() => installProbe(probe)}>
                                  Install
                                </Button>
                              )}
                            </CardFooter>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {installedProbes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Installed Probes ({installedProbes.length})</CardTitle>
                    <CardDescription>Probes you've installed from the marketplace</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {installedProbes.map((probeName) => (
                        <Badge key={probeName} variant="secondary" className="px-3 py-1">
                          {probeName}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </SectionErrorBoundary>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <SectionErrorBoundary sectionName="Templates">
              <Card>
                <CardHeader>
                  <CardTitle>Telemetry Templates</CardTitle>
                  <CardDescription>
                    Pre-built JavaScript snippets for monitoring common performance and error indicators.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(TELEMETRY_TEMPLATES).map(([key, code]) => (
                      <Card key={key} className="flex flex-col">
                        <CardHeader>
                          <CardTitle className="capitalize">{key}</CardTitle>
                          <CardDescription>
                            {key === "memory" && "Monitors JavaScript heap usage."}
                            {key === "fps" && "Tracks frames per second and rendering performance."}
                            {key === "network" && "Logs fetch and XMLHttpRequest calls."}
                            {key === "video" && "Monitors video playback events and states."}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <pre className="text-sm overflow-hidden h-full whitespace-pre-wrap">
                            {code.trim().split("\n").slice(0, 8).join("\n")}...
                          </pre>
                        </CardContent>
                        <CardFooter className="mt-auto">
                          <Button onClick={() => copyTemplate(key)} className="w-full">
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Code
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <SectionErrorBoundary sectionName="Telemetry Viewer">
              <TelemetryViewer
                snippetId={currentSnippet?.id}
                onExport={(data) => {
                  toast({
                    title: "Data Exported",
                    description: "Telemetry data has been exported successfully.",
                  })
                }}
              />
            </SectionErrorBoundary>

            {/* Legacy localStorage logs - kept for backward compatibility */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Legacy Telemetry Logs</CardTitle>
                    <CardDescription>
                      View data collected by active telemetry probes. This data persists across sessions.
                    </CardDescription>
                  </div>
                  <Button onClick={handleClearAllLogs} variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Memory</CardTitle>
                      <CardDescription>Heap usage over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm overflow-x-auto p-2 bg-muted rounded">
                        {localStorage.getItem("blackbox_memory_log") || "No memory logs found."}
                      </pre>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>FPS</CardTitle>
                      <CardDescription>Frames per second metrics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm overflow-x-auto p-2 bg-muted rounded">
                        {localStorage.getItem("blackbox_fps_log") || "No FPS logs found."}
                      </pre>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Network</CardTitle>
                      <CardDescription>API request details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm overflow-x-auto p-2 bg-muted rounded">
                        {localStorage.getItem("blackbox_network_log") || "No network logs found."}
                      </pre>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Video</CardTitle>
                      <CardDescription>Video playback events.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm overflow-x-auto p-2 bg-muted rounded">
                        {localStorage.getItem("blackbox_video_log") || "No video logs found."}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <SectionErrorBoundary sectionName="Settings">
              <Card>
                <CardHeader>
                  <CardTitle>API & Model Settings</CardTitle>
                  <CardDescription>Configure your AI provider and API key.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="provider" className="block text-sm font-medium mb-1">
                        AI Provider
                      </label>
                      <select
                        id="provider"
                        value={settings.provider}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, provider: e.target.value as AppSettings["provider"] }))
                        }
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        <option value="groq">Groq</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="model" className="block text-sm font-medium mb-1">
                        Model
                      </label>
                      <div className="flex gap-2">
                        <select
                          id="model"
                          value={settings.model}
                          onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                          className="flex-1 p-2 border rounded-md bg-background"
                          disabled={isFetchingModels || availableModels.length === 0}
                        >
                          {isFetchingModels && <option disabled>Loading models...</option>}
                          {!isFetchingModels && availableModels.length === 0 && (
                            <option disabled>No models found</option>
                          )}
                          {availableModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                        <Button onClick={fetchModels} disabled={isFetchingModels || !settings.apiKey}>
                          {isFetchingModels ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Activity className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        id="apiKey"
                        value={settings.apiKey}
                        onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="Enter your API key"
                        className="w-full p-2 border rounded-md bg-background"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="tavilyApiKey" className="block text-sm font-medium mb-1">
                        Tavily API Key (Optional for Web Search)
                      </label>
                      <input
                        type="password"
                        id="tavilyApiKey"
                        value={settings.tavilyApiKey}
                        onChange={(e) => setSettings((prev) => ({ ...prev, tavilyApiKey: e.target.value }))}
                        placeholder="Enter your Tavily API key"
                        className="w-full p-2 border rounded-md bg-background"
                      />
                    </div>
                    <div>
                      <label htmlFor="temperature" className="block text-sm font-medium mb-1">
                        Temperature
                      </label>
                      <input
                        type="number"
                        id="temperature"
                        step="0.1"
                        min="0"
                        max="1"
                        value={settings.temperature}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, temperature: Number.parseFloat(e.target.value) }))
                        }
                        className="w-full p-2 border rounded-md bg-background"
                      />
                    </div>
                    <div>
                      <label htmlFor="maxTokens" className="block text-sm font-medium mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        id="maxTokens"
                        min="100"
                        value={settings.maxTokens}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, maxTokens: Number.parseInt(e.target.value) }))
                        }
                        className="w-full p-2 border rounded-md bg-background"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <TelemetrySettings />

              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the application's look and feel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <label htmlFor="darkModeToggle" className="text-sm font-medium">
                      Dark Mode
                    </label>
                    <Button
                      id="darkModeToggle"
                      variant="outline"
                      size="icon"
                      onClick={toggleDarkMode}
                      aria-label="Toggle Dark Mode"
                    >
                      {settings.darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </TabsContent>
        </Tabs>

        {/* Sandbox */}
        <SectionErrorBoundary sectionName="Sandbox">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sandbox Execution Environment</CardTitle>
              <CardDescription>Execute generated snippets safely in an isolated environment.</CardDescription>
            </CardHeader>
            <CardContent>
              <iframe ref={sandboxRef} className="w-full h-[300px] border rounded-md" title="Sandbox" />
            </CardContent>
          </Card>
        </SectionErrorBoundary>

        {/* Patch Panel */}
        {showPatchPanel && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Code Patching</CardTitle>
                  <CardDescription>
                    {isGeneratingFix
                      ? "Generating and testing code fixes..."
                      : currentPatch
                        ? `Iteration ${currentPatch.iteration}/${maxPatchIterations} - ${currentPatch.status}`
                        : "Iteratively attempt to fix issues."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={clearPatchHistory} variant="outline" size="sm" disabled={patchHistory.length === 0}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear History
                  </Button>
                  <Button onClick={() => setShowPatchPanel(false)} variant="ghost" size="icon">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isGeneratingFix ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 mb-4 animate-spin" />
                  <p className="text-lg font-semibold">Attempting to fix the issue...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment.</p>
                </div>
              ) : patchHistory.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {patchHistory.map((patch) => (
                      <Card
                        key={patch.id}
                        className={
                          patch.status === "improved"
                            ? "border-green-500/50"
                            : patch.status === "failed"
                              ? "border-red-500/50"
                              : "border-yellow-500/50"
                        }
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Iteration {patch.iteration} - Status:{" "}
                              <Badge
                                variant={
                                  patch.status === "improved"
                                    ? "success"
                                    : patch.status === "failed"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {patch.status}
                              </Badge>
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {new Date(patch.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <CardDescription>{patch.improvement || "Testing..."}</CardDescription>
                        </CardHeader>
                        {patch.code && (
                          <CardContent>
                            <h4 className="text-sm font-semibold mb-2">Generated Code:</h4>
                            <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                              <code>{patch.code}</code>
                            </pre>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <RefreshCw className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Fix</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select an anomaly from the Radar panel or generate a snippet and click "Attempt Fix".
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
