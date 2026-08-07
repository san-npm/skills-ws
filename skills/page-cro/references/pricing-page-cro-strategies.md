## Contents

- 🏷️ Pricing Page CRO Strategies
- Pricing Table Optimization
- Urgency & Scarcity Ethics Framework

## 🏷️ Pricing Page CRO Strategies

### Pricing Table Optimization

```html
<!-- Three-Tier Pricing with Psychological Anchoring -->
<div class="pricing-table" data-cro-element="pricing">
  <!-- Decoy option (high price anchor) -->
  <div class="pricing-card pricing-basic">
    <h3>Basic</h3>
    <div class="price">$99<span>/month</span></div>
    <ul class="features">
      <li>5 pages analyzed</li>
      <li>Basic recommendations</li>
      <li>Email support</li>
    </ul>
    <button class="btn-secondary">Get Started</button>
  </div>
  
  <!-- Most popular (target option) -->
  <div class="pricing-card pricing-pro featured">
    <div class="popular-badge">Most Popular</div>
    <h3>Professional</h3>
    <div class="price">
      <span class="price-strike">$299</span>
      $199<span>/month</span>
    </div>
    <ul class="features">
      <li>✓ Unlimited page analysis</li>
      <li>✓ Custom recommendations</li>
      <li>✓ A/B testing setup</li>
      <li>✓ Priority support</li>
      <li>✓ Monthly strategy calls</li>
    </ul>
    <button class="btn-primary">Start Free Trial</button>
    <p class="guarantee">30-day money-back guarantee</p>
  </div>
  
  <!-- Premium option (establishes value) -->
  <div class="pricing-card pricing-enterprise">
    <h3>Enterprise</h3>
    <div class="price">$499<span>/month</span></div>
    <ul class="features">
      <li>Everything in Pro</li>
      <li>Dedicated CRO manager</li>
      <li>Weekly optimization reviews</li>
      <li>Custom integrations</li>
    </ul>
    <button class="btn-secondary">Contact Sales</button>
  </div>
</div>
```

### Urgency & Scarcity Ethics Framework

**Ethical Urgency Tactics**
1. **Limited-time bonuses**: Real deadlines for additional value
2. **Seasonal relevance**: Holiday sales, end-of-quarter budget cycles
3. **Capacity constraints**: Genuine service limitations
4. **Price increase notifications**: Advance warning of legitimate price changes

```html
<!-- Ethical Urgency Implementation.
     The deadline is set SERVER-SIDE to a REAL campaign end and rendered, never hardcoded
     in the client and never reset when it passes. Use a future ISO timestamp from your CMS. -->
<div class="urgency-banner ethical" data-expires="{{ promo.endsAtISO }}">
  <div class="urgency-content">
    <span class="urgency-label">{{ promo.label }}</span>
    <p>{{ promo.offer }}</p> <!-- e.g. "Get 3 months free when you start before the date below" -->
    <div class="countdown" data-countdown="{{ promo.endsAtISO }}" aria-live="polite">
      <!-- JS fills these from data-countdown; when it hits zero, HIDE the offer (don't loop). -->
      <span class="countdown-days">--</span> days
      <span class="countdown-hours">--</span> hours left
    </div>
  </div>
</div>
```
```javascript
// Honest countdown: drives from a real future timestamp and removes the offer at expiry.
function startCountdown(el) {
  const end = Date.parse(el.dataset.countdown);
  if (Number.isNaN(end)) return;
  const tick = () => {
    const ms = end - Date.now();
    if (ms <= 0) {                                   // genuinely expired: take the offer down
      el.closest('.urgency-banner')?.remove();       // NEVER reset to fake "15 days" again
      return clearInterval(timer);
    }
    el.querySelector('.countdown-days').textContent  = Math.floor(ms / 86400000);
    el.querySelector('.countdown-hours').textContent = Math.floor((ms % 86400000) / 3600000);
  };
  const timer = setInterval(tick, 60000); tick();
}
document.querySelectorAll('.countdown[data-countdown]').forEach(startCountdown);
```
```html
<!-- Capacity-Based Scarcity — only if the number is TRUE and tied to real capacity. -->
<div class="capacity-notice">
  <p>⚡ Only {{ onboarding.slotsLeft }} onboarding slots left this month</p>
  <small>We cap new clients to protect delivery quality.</small>
</div>
```

**Unethical Practices to Avoid**
- ❌ Fake countdown timers that reset
- ❌ Artificial scarcity with unlimited inventory  
- ❌ False claims about pricing or availability
- ❌ High-pressure tactics without genuine time constraints
