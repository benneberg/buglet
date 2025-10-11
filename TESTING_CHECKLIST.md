# AutoBlackBox Pro - Testing Checklist

Use this checklist before deploying or releasing new versions.

## Pre-Deployment Checklist

### Installation & Setup
- [ ] Fresh install works without errors
- [ ] All dependencies install correctly
- [ ] Development server starts successfully
- [ ] Production build completes without errors
- [ ] No console errors on initial load

### Core Features
- [ ] Generate debugging snippet with AI
- [ ] Execute snippet in sandbox
- [ ] Copy code to clipboard
- [ ] Export snippet as .js file
- [ ] Analyze logs with AI
- [ ] View telemetry data in Logs tab

### AI Features
- [ ] Chat interface sends and receives messages
- [ ] Context injection (snippet + telemetry) works
- [ ] Anomaly radar scans and detects issues
- [ ] Code-patch loop generates fixes
- [ ] Fix iterations work correctly (up to max)

### Regression Guard
- [ ] Capture baseline for snippet
- [ ] Detect regressions when metrics degrade
- [ ] Show regression alerts with correct severity
- [ ] Toast notifications for critical regressions
- [ ] Regression panel displays all alerts
- [ ] Toggle regression guard on/off

### Probe Marketplace
- [ ] Load community probes from marketplace
- [ ] Filter probes by category
- [ ] Install probes successfully
- [ ] Copy installed probe code
- [ ] Uninstall probes
- [ ] Installed probes persist across sessions

### PWA Functionality
- [ ] Install as PWA on desktop
- [ ] Install as PWA on mobile
- [ ] App works offline (airplane mode)
- [ ] Service worker caches assets correctly
- [ ] Update notification appears for new versions
- [ ] App icon appears in OS launcher

### Command Palette
- [ ] Open with Cmd+K / Ctrl+K
- [ ] Open with "/" key
- [ ] Search commands with fuzzy matching
- [ ] Navigate to different tabs
- [ ] Execute actions (generate, analyze, etc.)
- [ ] Keyboard navigation works (arrows, Enter, Escape)

### Settings & Configuration
- [ ] API key saves and persists
- [ ] Provider selection (Groq/OpenAI) works
- [ ] Fetch models from API
- [ ] Model selection persists
- [ ] Temperature and max tokens settings work
- [ ] Tavily API key (optional) saves
- [ ] Logging endpoint configuration works
- [ ] Dark mode toggle works and persists

### Data Persistence
- [ ] Snippets persist across page reloads
- [ ] Telemetry logs persist in localStorage
- [ ] Chat history persists
- [ ] Settings persist
- [ ] Anomalies persist
- [ ] Regression baselines persist
- [ ] Patch history persists
- [ ] Installed probes persist

### UI/UX
- [ ] Responsive design works on mobile
- [ ] Responsive design works on tablet
- [ ] Responsive design works on desktop
- [ ] Dark mode styling is correct
- [ ] Light mode styling is correct
- [ ] All buttons are clickable
- [ ] All forms are submittable
- [ ] Loading states show correctly
- [ ] Error messages are user-friendly
- [ ] Success messages appear appropriately

### Error Handling
- [ ] Invalid API key shows error
- [ ] Network errors are handled gracefully
- [ ] Empty inputs show validation messages
- [ ] Malformed API responses don't crash app
- [ ] localStorage quota exceeded is handled
- [ ] Missing telemetry data is handled

### Performance
- [ ] App loads in under 3 seconds
- [ ] No memory leaks after extended use
- [ ] Smooth scrolling in long lists
- [ ] No UI freezing during AI calls
- [ ] Sandbox execution doesn't block UI
- [ ] Large telemetry logs don't slow down app

### Accessibility
- [ ] Keyboard navigation works throughout
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Screen reader announces important changes
- [ ] Color contrast meets WCAG AA standards
- [ ] All images have alt text
- [ ] Form inputs have labels

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Security
- [ ] API keys not exposed in client code
- [ ] No sensitive data in console logs
- [ ] Sandbox execution is isolated
- [ ] No XSS vulnerabilities
- [ ] HTTPS enforced in production

## Regression Testing

After making changes, verify these scenarios still work:

### Scenario 1: First-Time User
1. Open app for first time
2. See empty state with helpful instructions
3. Configure API key in settings
4. Generate first snippet
5. Execute in sandbox
6. View telemetry logs
7. Analyze with AI

### Scenario 2: Power User Workflow
1. Open command palette (Cmd+K)
2. Generate snippet via command
3. Set baseline for regression guard
4. Execute snippet
5. Check for regressions
6. Use chat to discuss findings
7. Attempt automated fix
8. Verify fix improved metrics

### Scenario 3: Offline Usage
1. Install as PWA
2. Enable airplane mode
3. Open app (should load from cache)
4. Generate snippet (should work with cached assets)
5. Execute in sandbox
6. Collect telemetry
7. Re-enable network
8. Sync data if needed

### Scenario 4: Marketplace Usage
1. Open marketplace tab
2. Load community probes
3. Filter by category
4. Install a probe
5. Copy probe code
6. Execute probe
7. View probe telemetry
8. Uninstall probe

### Scenario 5: Debugging Session
1. Describe a bug (e.g., "memory leak")
2. Generate debugging snippet
3. Execute in sandbox
4. Wait for telemetry collection
5. Enable anomaly radar
6. Wait for scan (30s)
7. Review detected anomalies
8. Use chat to discuss with AI
9. Attempt automated fix
10. Verify improvement

## Performance Benchmarks

Target metrics:
- [ ] Initial page load: < 3s
- [ ] Time to interactive: < 5s
- [ ] Snippet generation: < 10s
- [ ] Sandbox execution: < 2s
- [ ] Anomaly scan: < 15s
- [ ] Chat response: < 10s
- [ ] Fix generation: < 15s

## Known Issues

Document any known issues here:
- Issue 1: [Description]
- Issue 2: [Description]

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Accessibility audit passed

**Tested by:** _______________
**Date:** _______________
**Version:** _______________
**Notes:** _______________
