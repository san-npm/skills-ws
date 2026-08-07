## Contents

- 📊 Heatmap Interpretation Guide
- Click Heatmap Analysis
- Scroll Heatmap Insights

## 📊 Heatmap Interpretation Guide

### Click Heatmap Analysis

**High-Value Click Patterns**
1. **CTA engagement**: Primary buttons should show intense click density
2. **Navigation patterns**: Identify unexpected click areas indicating user confusion
3. **Dead zone identification**: Areas with zero clicks that consume prime real estate
4. **Mobile vs desktop**: Different interaction patterns requiring separate optimization

```javascript
// Consent-gated, sampled, PII-minimized click collection.
function trackHeatmapData() {
  if (!analyticsAllowed() || !SAMPLED) return;   // gate + sample
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-cro-element], a, button') || e.target;
    // Bucket coordinates into a coarse grid so we can't re-identify a precise gesture.
    const col = Math.floor((e.clientX / window.innerWidth) * 20);   // 20-col grid
    const row = Math.floor((e.clientY / window.innerHeight) * 40);  // 40-row grid
    gtag('event', 'heatmap_click', {
      // identifiers / coarse position only — never raw text the user typed
      cro_el: el.getAttribute?.('data-cro-element') || el.tagName.toLowerCase(),
      el_id: el.id || undefined,
      grid: `${col}:${row}`,
      vw: window.innerWidth,            // viewport size for desktop/mobile split
      vh: window.innerHeight,
      sid: sessionId(),                 // per-session, non-persistent
    });
  }, { passive: true });
}
```

### Scroll Heatmap Insights

**Scroll Depth Analysis Framework**
- **25% scroll**: Headline and hero effectiveness
- **50% scroll**: Content engagement and value demonstration
- **75% scroll**: Social proof and objection handling success
- **100% scroll**: Complete page engagement, form placement effectiveness

```javascript
// Consent-gated scroll depth, throttled, no leaky globals.
function trackScrollDepth() {
  if (!analyticsAllowed() || !SAMPLED) return;
  const milestones = [25, 50, 75, 100];
  const fired = new Set();               // local state, resets per page load
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {        // throttle: at most one calc per frame
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0
        ? Math.round((window.scrollY / scrollable) * 100) : 100;
      for (const m of milestones) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          gtag('event', 'scroll_depth', { depth: m, sid: sessionId() });
        }
      }
      if (fired.size === milestones.length) {
        window.removeEventListener('scroll', onScroll);   // done; stop listening
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}
```
