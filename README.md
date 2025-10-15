# BugLet

**AI-Powered Crash-Resilient Debugging Assistant**

BugLet is a sophisticated debugging tool that generates production-ready telemetry code, analyzes performance anomalies, and provides AI-assisted debugging guidance. Built for developers who need to solve complex bugs—even Heisenbugs that disappear when you try to debug them.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-purple.svg)

---

## ✨ Key Features

### 🤖 AI-Powered Snippet Generation
- **Intelligent Code Generation**: Uses Groq or OpenAI to generate production-ready debugging snippets
- **Context-Aware Templates**: Automatically selects appropriate telemetry templates based on bug description
- **Web Search Integration**: Optional Tavily integration for real-time debugging context from the web
- **Expert System Prompts**: Engineered prompts that guide AI to think like a senior debugging engineer

### 📊 Crash-Resilient Telemetry Data Bridge
- **Real-Time Data Collection**: Collect telemetry from your applications via REST API
- **Session Management**: Organize telemetry by sessions with device and environment metadata
- **Offline-First Storage**: Uses IndexedDB for crash-resilient data persistence
- **Ring Buffer Architecture**: Configurable buffer sizes prevent memory bloat
- **Blackbox Recorder**: Captures pre-crash data with automatic crash detection
- **Export & Import**: Download telemetry sessions as JSON for sharing or archival
- **Visual Analytics**: Charts and graphs for FPS, memory, network, and custom metrics

### 🎯 Smart Anomaly Detection
- **Automated Radar Scanning**: Continuously analyzes telemetry for anomalies using LLM
- **Severity Classification**: Categorizes issues as low, medium, high, or critical
- **Pattern Recognition**: Detects memory leaks, FPS drops, network bottlenecks, and more
- **Actionable Insights**: Provides specific recommendations for each detected anomaly

### 🔄 AI Code-Patch Loop
- **Automated Fix Generation**: AI generates patched code based on detected issues
- **Sandbox Testing**: Safely tests fixes in isolated iframe before deployment
- **Iterative Improvement**: Automatically retries until metrics improve
- **Telemetry Comparison**: Shows before/after analysis with improvement percentages

### 📈 Regression Guard
- **Statistical Analysis**: Uses 2σ threshold to detect performance regressions
- **Baseline Tracking**: Stores performance baselines for each snippet
- **Automatic Alerts**: Instant notifications when metrics degrade
- **Visual Indicators**: Color-coded status badges for quick assessment

### 🛒 Probe Marketplace
- **Community Probes**: Browse and install debugging probes for Web Vitals, WebGL, WebSocket, etc.
- **One-Click Installation**: Instantly add specialized monitoring capabilities
- **Category Filtering**: Find probes by type (Performance, Network, Graphics, Storage)
- **Ratings & Downloads**: See what the community recommends

### 💬 AI Chat Assistant
- **Conversational Debugging**: Discuss bugs and get expert advice from AI
- **Context Injection**: Include snippets and telemetry data in conversations
- **Web Search**: Enable Tavily to search for solutions in real-time
- **Persistent History**: Chat history saved across sessions

### ⚡ Power User Features
- **Command Palette**: Press `Cmd+K` or `/` for quick access to all features
- **Keyboard Navigation**: Full keyboard support for efficient workflows
- **Offline-First PWA**: Works without internet, installable as native app
- **Dark Mode**: Easy on the eyes during late-night debugging sessions

---

## 🚀 Quick Start

### 1. Get API Keys

**Required:**
- **Groq API Key** (recommended, free tier available): [console.groq.com](https://console.groq.com)
- **OR OpenAI API Key**: [platform.openai.com](https://platform.openai.com)

**Optional:**
- **Tavily API Key** (for web search): [tavily.com](https://tavily.com)

### 2. Configure Settings

1. Click the **Settings** tab
2. Enter your API key
3. Select your AI provider (Groq or OpenAI)
4. Click **Fetch Models** to load available models
5. (Optional) Add Tavily API key for web search capabilities
6. (Optional) Configure a logging endpoint URL for centralized telemetry

### 3. Instrument Your Application

**Option A: Generate Debugging Snippet**
1. Go to the **Generate** tab
2. Describe your bug (e.g., "Memory leak in video player after 30 minutes")
3. Copy the code and integrate it into your application

**Option B: Use Telemetry Data Bridge**
1. Add the telemetry collector to your app:

\`\`\`javascript
// In your application
const sessionId = 'my-app-session-' + Date.now();

async function sendTelemetry(type, data) {
  await fetch('http://localhost:3000/api/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      type,
      data,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    })
  });
}

// Collect memory telemetry
setInterval(() => {
  if (performance.memory) {
    sendTelemetry('MEMORY', {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    });
  }
}, 5000);
\`\`\`

2. View collected data in the **Logs** tab under "Telemetry Viewer"
3. Use the **Blackbox Recorder** for crash-resilient logging

---

## 📖 Usage Guide

### Generating Debugging Snippets

The AI generates production-ready code based on your bug description. The more specific you are, the better the results:

**Good descriptions:**
- "Memory leak in React component after 1000 re-renders"
- "FPS drops to 15fps when rendering 500+ canvas elements"
- "Network requests timing out after 30 seconds on slow connections"
- "Video playback stutters every 10 seconds on mobile devices"

**What you get:**
- Complete, copy-paste ready JavaScript code
- Telemetry templates for relevant metrics
- Step-by-step integration instructions
- Crash-resilient logging that survives browser crashes

### Using the AI Chat

The chat assistant helps you think through complex debugging scenarios:

1. **Ask questions**: "How do I debug a race condition?"
2. **Analyze data**: Enable "Include telemetry data" to let AI analyze your metrics
3. **Get alternatives**: "My current approach isn't working, what else can I try?"
4. **Web search**: Enable web search to find solutions from Stack Overflow, GitHub, etc.

### Telemetry Data Bridge

The telemetry data bridge allows you to collect and analyze data from your applications in real-time:

**Collecting Data:**
1. Instrument your app with telemetry collection code
2. Send data to `/api/collect` endpoint
3. View data in the Telemetry Viewer tab

**Session Management:**
- Each session has a unique ID
- Sessions include metadata (device, browser, URL)
- Filter and search across multiple sessions

**Blackbox Recorder:**
- Automatically captures pre-crash data
- Uses ring buffer to limit memory usage
- Detects crashes via heartbeat monitoring
- Preserves last N data points before crash

**Export & Import:**
- Download sessions as `.buglet-session.json`
- Share sessions with team members
- Import sessions for analysis

---

## 🏗️ Architecture

### Data Flow

\`\`\`
User Input → AI (Groq/OpenAI) → Code Generation → Sandbox Testing → Telemetry Collection → Analysis → Insights
                    ↓
              Tavily Search (optional)
                    ↓
              Web Context
\`\`\`

### Storage Strategy

- **localStorage**: Snippets, settings, chat history, telemetry data, baselines
- **IndexedDB**: Sessions and data points for offline-first storage
- **Ring Buffer**: Prevents memory bloat (configurable size)
- **Crash Resilience**: Data persists before crashes via synchronous localStorage writes

### Security Considerations

- API keys stored in localStorage (client-side only)
- Sandbox iframe for safe code execution
- No server-side storage of sensitive data
- Optional external logging endpoint (user-controlled)

---

## 🔧 Advanced Configuration

### Custom Logging Endpoint

Send telemetry to your own backend:

\`\`\`javascript
// Your endpoint should accept POST requests with JSON body:
{
  "sessionId": "string",
  "type": "MEMORY" | "FPS" | "NETWORK" | "CUSTOM",
  "data": { /* telemetry data */ }
}
\`\`\`

Configure in **Settings → Telemetry Configuration → Logging Endpoint**

### Telemetry Data Bridge Configuration

Configure the telemetry system in **Settings → Telemetry Configuration**:

- **Collection Mode**: Push (REST API), Pull (polling), or Live (WebSocket)
- **Buffer Size**: Number of data points to keep in memory (default: 1000)
- **Batch Size**: Number of points to send per request (default: 10)
- **Flush Interval**: How often to send batched data (default: 5000ms)
- **Retention Period**: How long to keep old data (default: 7 days)
- **Privacy Mode**: Anonymize sensitive data before storage

**Crash-Resilient Blackbox:**
- **Ring Buffer Size**: Maximum data points before crash (default: 100)
- **Heartbeat Interval**: How often to check for crashes (default: 1000ms)
- **Auto-Recovery**: Automatically load pre-crash data on restart

---

## 📄 License

MIT License - feel free to use in personal and commercial projects.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Groq](https://groq.com) - Fast AI inference
- [OpenAI](https://openai.com) - GPT models
- [Tavily](https://tavily.com) - Web search API
- [Chart.js](https://www.chartjs.org) - Data visualization

---

## 💡 Tips & Best Practices

### Writing Good Bug Descriptions
- Include specific metrics: "Memory grows from 50MB to 500MB"
- Mention timing: "After 30 minutes" or "Every 10 seconds"
- Specify environment: "On mobile Safari" or "In production only"
- Describe user actions: "When user scrolls rapidly"

### Optimizing Telemetry Collection
- Use appropriate intervals (don't collect every frame for memory)
- Implement ring buffers to prevent memory bloat
- Send data to backend periodically, not on every measurement
- Use requestIdleCallback for non-critical telemetry

### Effective AI Chat Usage
- Start with specific questions
- Include context (snippets, telemetry) when relevant
- Enable web search for researching unfamiliar errors
- Ask for alternative approaches if stuck

### Regression Guard Best Practices
- Capture baselines during normal operation (not during bugs)
- Run multiple baseline captures for statistical significance
- Adjust 2σ threshold if you get too many false positives
- Review regression alerts promptly to catch issues early

---

## 📞 Support

- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join the community to share debugging stories
- **Documentation**: Check the docs folder for detailed guides

---

**Happy Debugging! 🐛🔍**

*AutoBlackBox Pro - Because bugs don't wait for convenient debugging sessions.*
