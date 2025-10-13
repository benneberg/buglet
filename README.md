# bugLet 🔍

**AI-Powered Crash-Resilient Debugging Assistant and generator**

bugLet is a sophisticated debugging tool that generates production-ready telemetry code, analyzes performance anomalies, and provides AI-assisted debugging guidance. Built for developers who need to solve complex bugs—even Heisenbugs that disappear when you try to debug them.

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

### 📊 Crash-Resilient Telemetry
- **Survives Browser Crashes**: All telemetry persists to localStorage before crashes occur
- **Ring Buffer Architecture**: Prevents memory bloat with configurable buffer sizes
- **Multiple Telemetry Types**: Memory, FPS, Network, Video playback monitoring
- **Custom Logging Endpoints**: Send telemetry to your own backend for centralized analysis

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

### 3. Generate Your First Snippet

1. Go to the **Generate** tab
2. Describe your bug (e.g., "Memory leak in video player after 30 minutes")
3. Click **Generate Debugging Snippet**
4. Review the generated code and instructions
5. Copy the code and integrate it into your application

### 4. Analyze Telemetry

1. After your code runs and collects data, return to AutoBlackBox Pro
2. Go to the **Logs** tab
3. View telemetry data with visual charts
4. Enable **Smart Anomaly Radar** for automatic analysis
5. Review detected anomalies and recommendations

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

### Telemetry Templates

AutoBlackBox Pro includes production-ready templates for:

- **MEMORY**: Heap size, used JS heap, memory limits
- **FPS**: Frame rate monitoring with performance.now()
- **NETWORK**: Request timing, payload sizes, error rates
- **VIDEO**: Playback quality, buffering, dropped frames
- **LONG_TASKS**: Detect tasks blocking the main thread >50ms
- **WEB_VITALS**: LCP, FID, CLS, TTFB metrics
- **WEBGL**: GPU memory, draw calls, shader compilation
- **WEBSOCKET**: Connection stability, message latency
- **INDEXEDDB**: Storage usage, transaction performance
- **SERVICE_WORKER**: Cache hit rates, update cycles

### AI Code-Patch Loop

Automatically generate and test fixes:

1. Generate a debugging snippet
2. Let it collect baseline telemetry
3. Click **Attempt Fix** when you detect an issue
4. AI generates a patched version
5. System tests it in sandbox
6. Compares before/after metrics
7. Iterates until improvement is detected

### Regression Guard

Protect against performance degradation:

1. Enable **Regression Guard** in settings
2. System captures baseline metrics for each snippet
3. Continuous monitoring compares new data to baseline
4. Alerts trigger when metrics exceed 2σ threshold
5. View detailed regression reports in the Regression Guard panel

### Command Palette

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) or `/` to open:

- Navigate between tabs instantly
- Generate snippets without clicking
- Clear data and reset state
- Toggle dark mode
- Access settings quickly

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
  "type": "MEMORY" | "FPS" | "NETWORK" | "VIDEO",
  "timestamp": 1234567890,
  "data": { /* telemetry data */ }
}
\`\`\`

Configure in **Settings → Telemetry Configuration → Logging Endpoint**

### System Prompt Customization

Modify the AI's behavior by editing the system prompt in **Settings → Advanced → System Prompt**

Default prompt emphasizes:
- Senior-level debugging expertise
- Production-ready code generation
- Comprehensive error handling
- Performance optimization
- Edge case coverage

### Temperature & Token Settings

- **Temperature** (0.0-1.0): Lower = more focused, Higher = more creative
- **Max Tokens**: Longer responses need more tokens (default: 4000)

---

## 🎨 Customization

### Dark Mode

Toggle dark mode in settings or use the command palette (`Cmd+K` → "Toggle dark mode")

### Telemetry Buffer Size

Modify ring buffer size in generated code:

\`\`\`javascript
const MAX_BUFFER_SIZE = 100; // Adjust based on your needs
\`\`\`

### Anomaly Thresholds

Customize regression detection sensitivity by modifying the 2σ threshold in code.

---

## 🧪 Testing Checklist

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for comprehensive testing guide.

**Quick smoke test:**
1. ✅ Generate a snippet
2. ✅ View it in sandbox
3. ✅ Send a chat message
4. ✅ Enable anomaly radar
5. ✅ Browse marketplace
6. ✅ Open command palette (`Cmd+K`)

---

## 📚 Documentation

- **[Developer Guide](./DEVELOPER_GUIDE.md)**: Extend AutoBlackBox Pro with custom features
- **[Testing Checklist](./TESTING_CHECKLIST.md)**: Comprehensive testing scenarios
- **[Future Improvements](./FUTURE_IMPROVEMENTS.md)**: Roadmap and enhancement ideas
- **[TODO](./TODO.md)**: Development task tracking

---

## 🤝 Contributing

We welcome contributions! Areas where you can help:

- **New Telemetry Templates**: Add monitoring for new APIs or frameworks
- **Marketplace Probes**: Share your debugging probes with the community
- **AI Prompt Engineering**: Improve system prompts for better code generation
- **UI/UX Improvements**: Enhance the interface and user experience
- **Documentation**: Help others learn to use AutoBlackBox Pro effectively

---

## 🐛 Troubleshooting

### "Nothing happens when I click Generate"

- Check that you've entered a valid API key in Settings
- Click "Fetch Models" to ensure your model is available
- Check browser console for error messages
- Try a different model (some models get decommissioned)

### "Tavily search not working"

- Ensure you've added a Tavily API key in Settings
- Check that web search is enabled in the chat context options
- Verify your Tavily API key is valid at [tavily.com](https://tavily.com)

### "Telemetry not persisting"

- Check that localStorage is enabled in your browser
- Ensure you're not in private/incognito mode
- Verify the generated code is actually running in your app

### "Regression Guard not detecting issues"

- Ensure you've captured a baseline first (run snippet normally)
- Check that Regression Guard is enabled in settings
- Verify telemetry data is being collected properly

### "PWA not installing"

- PWA requires HTTPS (works on localhost for development)
- Check that service worker registered successfully
- Try a different browser (Chrome/Edge have best PWA support)

---

## 🌟 Use Cases

### Memory Leak Detection
Generate memory monitoring code, let it run for hours, analyze the trend graphs to identify leaks.

### Performance Regression Testing
Use Regression Guard to catch performance degradation before it reaches production.

### Intermittent Bug Hunting
Deploy crash-resilient telemetry to capture data even when bugs cause crashes.

### Mobile Performance Optimization
Monitor FPS and memory on mobile devices to optimize for lower-end hardware.

### Network Debugging
Track request timing, payload sizes, and error rates to optimize API calls.

### Video Playback Issues
Monitor buffering, dropped frames, and playback quality across devices.

---

## 📊 Recommended Workflows

### Workflow 1: New Bug Investigation
1. Describe bug in Generate tab
2. Copy generated code to your app
3. Reproduce the bug
4. Return to Logs tab to analyze telemetry
5. Enable Anomaly Radar for AI insights
6. Use Chat to discuss findings with AI

### Workflow 2: Performance Optimization
1. Generate baseline telemetry for your feature
2. Enable Regression Guard
3. Make code changes
4. Run telemetry again
5. Check for regression alerts
6. Use AI Code-Patch Loop if regressions detected

### Workflow 3: Production Monitoring
1. Generate telemetry with custom logging endpoint
2. Deploy to production
3. Monitor centralized logs
4. Use AutoBlackBox Pro to analyze exported data
5. Generate fixes with AI Code-Patch Loop

---

## 🔮 Future Enhancements

See [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) for detailed roadmap.

**Highlights:**
- Real-time collaboration for team debugging
- Browser extension for injecting telemetry into any site
- Integration with Sentry, Rollbar, and other error tracking services
- CI/CD integration for automated regression testing
- Video recording alongside telemetry capture
- Performance budgets with automatic alerts

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
