# AutoBlackBox Pro - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Extending the Tool](#extending-the-tool)
3. [Adding New Features](#adding-new-features)
4. [Testing Strategy](#testing-strategy)
5. [Deployment](#deployment)

---

## Architecture Overview

AutoBlackBox Pro is built as a single-page Next.js application with the following key components:

### Core Technologies
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Component library
- **localStorage** - Client-side persistence
- **Service Workers** - Offline-first PWA capabilities

### Key Features
1. **AI-Powered Snippet Generation** - Uses Groq/OpenAI to generate debugging code
2. **Telemetry Templates** - Pre-built monitoring probes for memory, FPS, network, video
3. **Smart Anomaly Radar** - Automated LLM-based anomaly detection
4. **AI Chat Interface** - Conversational debugging assistance
5. **Probe Marketplace** - Community-contributed debugging probes
6. **AI Code-Patch Loop** - Automated fix generation and testing
7. **Regression Guard** - Statistical performance monitoring (2σ threshold)
8. **Command Palette** - Keyboard-driven navigation (Cmd+K)
9. **PWA Support** - Installable, offline-capable application

### Data Flow
\`\`\`
User Input → AI API (Groq/OpenAI) → Generated Code → Sandbox Execution → Telemetry Collection → localStorage → Analysis → Insights
\`\`\`

### State Management
All state is managed using React hooks (`useState`, `useEffect`, `useRef`) with localStorage persistence for:
- Settings (API keys, preferences)
- Snippets (generated debugging code)
- Telemetry logs (memory, FPS, network, video)
- Chat history
- Anomalies
- Regression baselines
- Patch history

---

## Extending the Tool

### 1. Add a New Telemetry Probe

**Step 1: Define the Template**

Add your probe to the `TELEMETRY_TEMPLATES` object in `app/page.tsx`:

\`\`\`typescript
const TELEMETRY_TEMPLATES = {
  // ... existing templates ...
  
  customProbe: `
// Custom Probe Description
(function() {
  const customLog = [];
  const MAX_LOGS = 100;
  
  function captureCustomData() {
    const data = {
      timestamp: Date.now(),
      // Your custom metrics here
      customMetric: performance.now(),
      // Add more data points
    };
    
    customLog.push(data);
    if (customLog.length > MAX_LOGS) customLog.shift();
    
    // Persist to localStorage
    try {
      localStorage.setItem('blackbox_custom_log', JSON.stringify(customLog));
    } catch(e) {
      console.warn('[BlackBox] Failed to persist custom log:', e);
    }
    
    console.log('[BlackBox Custom]', data);
    return data;
  }
  
  // Expose API
  window.__blackbox_custom = {
    capture: captureCustomData,
    getLogs: () => customLog,
    clear: () => { 
      customLog.length = 0; 
      localStorage.removeItem('blackbox_custom_log'); 
    }
  };
  
  // Auto-capture (adjust interval as needed)
  setInterval(captureCustomData, 5000);
  captureCustomData(); // Initial capture
})();
`
};
\`\`\`

**Step 2: Update Template Selection Logic**

Modify the `selectTelemetryTemplates` function to include your probe:

\`\`\`typescript
const selectTelemetryTemplates = (description: string): string[] => {
  const lower = description.toLowerCase()
  const templates: string[] = []

  // ... existing conditions ...

  if (lower.includes("custom") || lower.includes("your-keyword")) {
    templates.push("customProbe")
  }

  return templates
}
\`\`\`

**Step 3: Add UI for the Template**

Add a card in the Templates tab:

\`\`\`tsx
<Card key="customProbe" className="flex flex-col">
  <CardHeader>
    <CardTitle>Custom Probe</CardTitle>
    <CardDescription>
      Description of what your probe monitors
    </CardDescription>
  </CardHeader>
  <CardContent className="flex-grow">
    <pre className="text-sm overflow-hidden h-full whitespace-pre-wrap">
      {TELEMETRY_TEMPLATES.customProbe.trim().split("\n").slice(0, 8).join("\n")}...
    </pre>
  </CardContent>
  <CardFooter className="mt-auto">
    <Button onClick={() => copyTemplate("customProbe")} className="w-full">
      Copy Code
    </Button>
  </CardFooter>
</Card>
\`\`\`

**Step 4: Add Log Viewer**

Add a card in the Logs tab to display your probe's data:

\`\`\`tsx
<Card>
  <CardHeader>
    <CardTitle>Custom Probe</CardTitle>
    <CardDescription>Your custom metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <pre className="text-sm overflow-x-auto p-2 bg-muted rounded">
      {localStorage.getItem("blackbox_custom_log") || "No custom logs found."}
    </pre>
  </CardContent>
</Card>
\`\`\`

---

### 2. Add a New Chat Command

The chat interface uses natural language, but you can add specialized commands:

**Step 1: Extend the Chat Message Handler**

Modify the `sendChatMessage` function to detect commands:

\`\`\`typescript
const sendChatMessage = async () => {
  // ... existing validation ...

  // Check for special commands
  if (chatInput.startsWith("/")) {
    const command = chatInput.slice(1).toLowerCase()
    
    switch(command) {
      case "analyze":
        // Trigger analysis
        if (currentSnippet) {
          await analyzeLogs(currentSnippet)
        }
        return
      
      case "fix":
        // Trigger fix generation
        await generateCodeFix()
        return
      
      case "baseline":
        // Capture baseline
        if (currentSnippet?.id) {
          captureBaseline(currentSnippet.id)
        }
        return
      
      // Add your custom command here
      case "custom":
        // Your custom logic
        toast({
          title: "Custom Command",
          description: "Executing custom command..."
        })
        return
    }
  }

  // ... rest of chat logic ...
}
\`\`\`

**Step 2: Add Command Documentation**

Update the chat interface to show available commands:

\`\`\`tsx
<div className="text-xs text-muted-foreground">
  <strong>Commands:</strong> /analyze, /fix, /baseline, /custom
</div>
\`\`\`

---

### 3. Add a New View (Tab)

**Step 1: Add Tab Trigger**

In the `TabsList`, add your new tab:

\`\`\`tsx
<TabsList className="grid w-full grid-cols-7 mb-6">
  {/* ... existing tabs ... */}
  <TabsTrigger value="custom" className="flex items-center gap-2">
    <YourIcon className="w-4 h-4" />
    Custom
  </TabsTrigger>
</TabsList>
\`\`\`

**Step 2: Add Tab Content**

Create the content for your tab:

\`\`\`tsx
<Tabs>
  <TabsContent value="custom" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Custom View</CardTitle>
        <CardDescription>
          Description of your custom view
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Your custom content here */}
        <div className="space-y-4">
          {/* Add your UI components */}
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
\`\`\`

**Step 3: Add State Management**

If your view needs state, add it to the component:

\`\`\`typescript
const [customState, setCustomState] = useState<YourType>(initialValue)

// Persist to localStorage if needed
useEffect(() => {
  const saved = localStorage.getItem("autoblackbox_custom_state")
  if (saved) {
    setCustomState(JSON.parse(saved))
  }
}, [])

useEffect(() => {
  if (customState) {
    localStorage.setItem("autoblackbox_custom_state", JSON.stringify(customState))
  }
}, [customState])
\`\`\`

**Step 4: Add Command Palette Integration**

Update the `CommandPalette` component to include navigation to your view:

\`\`\`tsx
// In components/command-palette.tsx
{
  id: "nav-custom",
  label: "Go to Custom View",
  category: "Navigation",
  action: () => onNavigate("custom"),
  keywords: ["custom", "view", "your", "keywords"]
}
\`\`\`

---

### 4. Override LLM Prompt Logic

**Customize System Prompts**

The system prompt is stored in `DEFAULT_SYSTEM_PROMPT`. You can:

**Option 1: Modify the Default**

Edit the `DEFAULT_SYSTEM_PROMPT` constant in `app/page.tsx`:

\`\`\`typescript
const DEFAULT_SYSTEM_PROMPT = `You are an expert senior debugging engineer...
[Add your custom instructions here]
...`
\`\`\`

**Option 2: Add Dynamic Prompt Modification**

Create a function to modify prompts based on context:

\`\`\`typescript
const buildContextualPrompt = (basePrompt: string, context: any): string => {
  let prompt = basePrompt
  
  // Add context-specific instructions
  if (context.hasMemoryIssue) {
    prompt += "\n\nFocus on memory leak detection and heap analysis."
  }
  
  if (context.hasPerformanceIssue) {
    prompt += "\n\nPrioritize performance optimization and bottleneck identification."
  }
  
  // Add telemetry context
  if (context.telemetryData) {
    prompt += `\n\nCurrent Telemetry:\n${JSON.stringify(context.telemetryData, null, 2)}`
  }
  
  return prompt
}

// Use in API calls
const contextualPrompt = buildContextualPrompt(settings.systemPrompt, {
  hasMemoryIssue: bugDescription.toLowerCase().includes("memory"),
  hasPerformanceIssue: bugDescription.toLowerCase().includes("slow"),
  telemetryData: getCurrentTelemetry()
})
\`\`\`

**Option 3: Add Prompt Templates**

Create multiple prompt templates for different scenarios:

\`\`\`typescript
const PROMPT_TEMPLATES = {
  debugging: `You are an expert debugging engineer...`,
  performance: `You are a performance optimization specialist...`,
  security: `You are a security auditing expert...`,
  accessibility: `You are an accessibility compliance expert...`
}

// Allow users to select template in settings
const [promptTemplate, setPromptTemplate] = useState<keyof typeof PROMPT_TEMPLATES>("debugging")

// Use selected template
const systemPrompt = PROMPT_TEMPLATES[promptTemplate]
\`\`\`

---

## Testing Strategy

### Manual Testing Checklist

#### Core Functionality
- [ ] **Generate Snippet**
  - [ ] Enter bug description and click "Generate Snippet"
  - [ ] Verify snippet is generated with title, instructions, and code
  - [ ] Verify telemetry templates are correctly selected based on keywords
  - [ ] Test with different bug descriptions (memory, FPS, network, video)

- [ ] **Execute in Sandbox**
  - [ ] Click "Run in Sandbox" on a generated snippet
  - [ ] Verify code executes without errors
  - [ ] Check sandbox output for console logs
  - [ ] Verify telemetry data is written to localStorage

- [ ] **Copy & Export**
  - [ ] Click "Copy Code" and verify clipboard contains code
  - [ ] Click "Export as JS" and verify file downloads
  - [ ] Open exported file and verify content is correct

#### AI Features
- [ ] **Chat Interface**
  - [ ] Send a message and verify AI responds
  - [ ] Enable "Include latest snippet" and verify context is sent
  - [ ] Enable "Include telemetry data" and verify data is included
  - [ ] Test "New Thread" button clears history
  - [ ] Verify chat history persists across page reloads

- [ ] **Anomaly Radar**
  - [ ] Enable radar and wait for scan (30s interval)
  - [ ] Verify anomalies are detected and displayed
  - [ ] Check that critical anomalies trigger notifications
  - [ ] Test dismissing individual anomalies
  - [ ] Test "Clear All" button

- [ ] **Code-Patch Loop**
  - [ ] Click "Attempt Fix" on a snippet with anomalies
  - [ ] Verify fix is generated and executed in sandbox
  - [ ] Check that telemetry is compared before/after
  - [ ] Verify improvement analysis is displayed
  - [ ] Test multiple iterations (up to max)

#### Regression Guard
- [ ] **Baseline Capture**
  - [ ] Generate a snippet and run it
  - [ ] Click "Set Baseline" button
  - [ ] Verify baseline is saved to localStorage
  - [ ] Check that baseline includes mean and stdDev for all metrics

- [ ] **Regression Detection**
  - [ ] Capture baseline with normal telemetry
  - [ ] Simulate performance degradation (modify telemetry data)
  - [ ] Run snippet again and verify regression is detected
  - [ ] Check that regression alert appears with correct severity
  - [ ] Verify toast notification for critical regressions

- [ ] **Regression Panel**
  - [ ] Open regression panel when alerts exist
  - [ ] Verify alerts show baseline, current, and threshold values
  - [ ] Test dismissing individual alerts
  - [ ] Test "Clear All" button
  - [ ] Toggle regression guard on/off

#### Probe Marketplace
- [ ] **Load Marketplace**
  - [ ] Click "Load Probes" button
  - [ ] Verify community probes are displayed
  - [ ] Check that probe cards show name, description, category, version

- [ ] **Install Probe**
  - [ ] Click "Install" on a probe
  - [ ] Verify probe is added to installed list
  - [ ] Check that probe code is saved to localStorage
  - [ ] Verify "Copy Code" button works for installed probes

- [ ] **Filter Probes**
  - [ ] Click category filters (Performance, Graphics, Network, etc.)
  - [ ] Verify only probes in selected category are shown
  - [ ] Test "all" filter shows all probes

- [ ] **Uninstall Probe**
  - [ ] Click uninstall button on an installed probe
  - [ ] Verify probe is removed from installed list
  - [ ] Check that probe code is removed from localStorage

#### PWA Features
- [ ] **Install as PWA**
  - [ ] Open app in Chrome/Edge
  - [ ] Look for install prompt or use browser menu
  - [ ] Install app and verify it opens in standalone window
  - [ ] Check that app icon appears in OS app launcher

- [ ] **Offline Mode**
  - [ ] Install app as PWA
  - [ ] Enable airplane mode or disconnect network
  - [ ] Verify app still loads and functions
  - [ ] Test generating snippets (should work with cached assets)
  - [ ] Verify telemetry collection still works offline

- [ ] **Service Worker Updates**
  - [ ] Deploy a new version of the app
  - [ ] Reload the app and check for update notification
  - [ ] Click "Refresh" button and verify new version loads

#### Command Palette
- [ ] **Open Palette**
  - [ ] Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  - [ ] Verify command palette opens
  - [ ] Press "/" key and verify palette opens
  - [ ] Press Escape and verify palette closes

- [ ] **Search Commands**
  - [ ] Type "generate" and verify matching commands appear
  - [ ] Type "dark" and verify dark mode toggle appears
  - [ ] Test fuzzy search (e.g., "gen snip" matches "Generate Snippet")

- [ ] **Execute Commands**
  - [ ] Select "Generate Snippet" and press Enter
  - [ ] Verify it navigates to Generate tab
  - [ ] Test "Toggle Dark Mode" command
  - [ ] Test "Clear All Logs" command
  - [ ] Test "Capture Baseline" command

#### Settings & Persistence
- [ ] **API Configuration**
  - [ ] Enter API key and select provider (Groq/OpenAI)
  - [ ] Click "Fetch Models" and verify models load
  - [ ] Select a model from dropdown
  - [ ] Verify settings persist after page reload

- [ ] **Logging Endpoint**
  - [ ] Enter a logging endpoint URL
  - [ ] Generate and run a snippet
  - [ ] Verify telemetry is sent to endpoint (check network tab)

- [ ] **Dark Mode**
  - [ ] Toggle dark mode on
  - [ ] Verify UI switches to dark theme
  - [ ] Reload page and verify dark mode persists

#### Data Persistence
- [ ] **localStorage Persistence**
  - [ ] Generate multiple snippets
  - [ ] Close browser tab
  - [ ] Reopen app and verify snippets are still there
  - [ ] Check that telemetry logs persist
  - [ ] Verify chat history persists
  - [ ] Check that settings persist

- [ ] **Clear Data**
  - [ ] Use "Clear All Logs" command
  - [ ] Verify all telemetry logs are removed
  - [ ] Check that snippets and settings remain intact

#### Error Handling
- [ ] **Invalid API Key**
  - [ ] Enter invalid API key
  - [ ] Try to generate snippet
  - [ ] Verify error message is displayed
  - [ ] Check that error is user-friendly

- [ ] **Network Errors**
  - [ ] Disconnect network
  - [ ] Try to generate snippet
  - [ ] Verify appropriate error message
  - [ ] Reconnect and verify functionality resumes

- [ ] **Malformed Responses**
  - [ ] (Requires mocking) Test with malformed API responses
  - [ ] Verify app doesn't crash
  - [ ] Check that error is caught and displayed

### Automated Testing (Future)

For production deployments, consider adding:

1. **Unit Tests** (Jest + React Testing Library)
   \`\`\`typescript
   // Example test
   describe('generateSnippet', () => {
     it('should generate snippet with correct telemetry templates', () => {
       const description = "memory leak in checkout page"
       const templates = selectTelemetryTemplates(description)
       expect(templates).toContain("memory")
     })
   })
   \`\`\`

2. **Integration Tests** (Playwright)
   \`\`\`typescript
   // Example test
   test('should generate and execute snippet', async ({ page }) => {
     await page.goto('http://localhost:3000')
     await page.fill('textarea', 'memory leak')
     await page.click('button:has-text("Generate Snippet")')
     await expect(page.locator('pre code')).toBeVisible()
   })
   \`\`\`

3. **E2E Tests** (Playwright)
   \`\`\`typescript
   // Example test
   test('full debugging workflow', async ({ page }) => {
     // Generate snippet
     // Execute in sandbox
     // Analyze logs
     // Verify results
   })
   \`\`\`

---

## Deployment

### Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Production Build
\`\`\`bash
npm run build
npm start
\`\`\`

### Deploy to Vercel
\`\`\`bash
vercel deploy
\`\`\`

### Environment Variables
Create a `.env.local` file:
\`\`\`
# Optional: Pre-configure API keys (not recommended for security)
NEXT_PUBLIC_DEFAULT_GROQ_KEY=your_key_here
NEXT_PUBLIC_DEFAULT_OPENAI_KEY=your_key_here
\`\`\`

### PWA Configuration
The app is already configured as a PWA with:
- `public/manifest.json` - App manifest
- `public/sw.js` - Service worker
- `app/layout.tsx` - PWA meta tags

To customize:
1. Edit `public/manifest.json` for app name, icons, colors
2. Modify `public/sw.js` for caching strategy
3. Update icons in `public/` directory

---

## Best Practices

### Security
- Never commit API keys to version control
- Store API keys in localStorage (client-side only)
- Use environment variables for server-side keys
- Validate all user inputs before processing
- Sanitize code before executing in sandbox

### Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Lazy load heavy components
- Optimize images and assets
- Use service worker caching strategically

### Accessibility
- Ensure keyboard navigation works everywhere
- Add ARIA labels to interactive elements
- Maintain sufficient color contrast
- Test with screen readers
- Support reduced motion preferences

### Code Quality
- Follow TypeScript strict mode
- Use ESLint and Prettier
- Write descriptive variable names
- Add comments for complex logic
- Keep functions small and focused

---

## Troubleshooting

### Common Issues

**Issue: Snippets not generating**
- Check API key is valid
- Verify model is available
- Check browser console for errors
- Ensure network connection is active

**Issue: Telemetry not collecting**
- Verify snippet was executed in sandbox
- Check localStorage for data
- Ensure browser allows localStorage
- Check for JavaScript errors in console

**Issue: PWA not installing**
- Verify HTTPS is enabled (required for PWA)
- Check manifest.json is valid
- Ensure service worker is registered
- Try different browser (Chrome/Edge recommended)

**Issue: Regression guard not detecting issues**
- Verify baseline was captured
- Check that telemetry data exists
- Ensure regression guard is enabled
- Verify metrics have changed significantly (>2σ)

---

## Contributing

To contribute to AutoBlackBox Pro:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the checklist above
5. Submit a pull request with detailed description

---

## License

MIT License - See LICENSE file for details
