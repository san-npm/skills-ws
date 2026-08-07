## Contents

- 📊 Progressive Profiling Strategy
- Data Collection Hierarchy
- Progressive Form Templates

## 📊 Progressive Profiling Strategy

> **Privacy/consent guardrail (read before collecting anything below).**
> Every field beyond what's strictly needed to provide the service is
> "additional" personal data. Under GDPR/UK-GDPR you need a **lawful basis**
> (usually legitimate interest or consent) and must honor **data
> minimization** and **purpose limitation**; under CPRA/US state laws you owe
> notice-at-collection and opt-out of "sharing/sale" for ad-tech use. Practical
> rules: (1) don't pre-check marketing consent — it must be a separate,
> unticked opt-in; (2) state *why* you're asking each item ("so we can
> recommend templates for your role"); (3) record consent + timestamp + the
> shown copy; (4) let users skip and edit later; (5) set a retention policy and
> delete what you stop using. This is general guidance, **not legal advice** —
> confirm your specifics with counsel/DPO.

### Data Collection Hierarchy

**Tier 1 - Essential (Step 1)**
- Email address (required for account)
- Password (security)
- First name (personalization)

**Tier 2 - Valuable (Step 2 or Post-signup)**
- Last name (full personalization)
- Company name (segmentation)
- Job title/role (targeting)

**Tier 3 - Enhancement (Onboarding/Usage)**
- Company size (market segmentation)
- Use case/goals (product customization)
- Industry (content personalization)
- Phone number (sales qualification)

```javascript
// Progressive Profiling Engine — self-contained and runnable. Every method it
// calls is defined here. The two integration seams are clearly marked:
//   - fetchEngagementSignals(): swap in your real analytics read.
//   - renderProgressiveForm(): swap in your real UI (the modal HTML below).
// Defaults are deliberately conservative so you only prompt engaged users.
class ProgressiveProfiler {
  constructor({ fetchEngagementSignals, renderProgressiveForm } = {}) {
    this.userProfile = {};
    this.collectorsQueue = [];
    this.completionTriggers = [
      'email_verified',
      'first_login',
      'feature_accessed',
      'time_threshold',
      'engagement_level',
    ];
    // Integration seams (optional). Provide your own; otherwise safe stubs run.
    this._fetchEngagementSignals = fetchEngagementSignals ||
      (async () => ({ engagementScore: 0, historicalCompletionRate: 0 }));
    this._renderProgressiveForm = renderProgressiveForm ||
      ((config) => console.debug('[progressive-profiler] render', config));
  }

  // Higher priority => prompt sooner. Delay is in milliseconds.
  calculateOptimalDelay(priority) {
    return { critical: 0, high: 5000, medium: 30000, low: 120000 }[priority] ?? 30000;
  }

  scheduleDataCollection(triggerEvent, dataPoints, priority = 'medium') {
    this.collectorsQueue.push({
      trigger: triggerEvent,
      dataPoints,
      priority,
      attempts: 0,
      maxAttempts: 3,
      delay: this.calculateOptimalDelay(priority),
    });
  }

  async onTriggerEvent(eventType, context) {
    const activeCollectors = this.collectorsQueue.filter(
      (c) => c.trigger === eventType && c.attempts < c.maxAttempts
    );

    for (const collector of activeCollectors) {
      const shouldCollect = await this.evaluateCollectionTiming(collector, context);
      if (shouldCollect) {
        this.presentDataCollectionForm(collector.dataPoints, collector.priority);
        collector.attempts++;
      }
    }
  }

  // Pull engagement + historical completion from YOUR analytics. The default
  // stub returns zeros so nothing is prompted until you wire this up.
  async calculateEngagementScore(userId) {
    const { engagementScore = 0 } = await this._fetchEngagementSignals(userId);
    return engagementScore; // expected 0..1
  }

  async getHistoricalCompletionRate(dataPoints) {
    const { historicalCompletionRate = 0 } =
      await this._fetchEngagementSignals(null, dataPoints);
    return historicalCompletionRate; // expected 0..1
  }

  async evaluateCollectionTiming(collector, context) {
    const engagementScore = await this.calculateEngagementScore(context.userId);
    const completionRate = await this.getHistoricalCompletionRate(collector.dataPoints);

    const sessionQuality = {
      timeOnSite: context.sessionDuration ?? 0,
      pageViews: context.pageViews ?? 0,
      interactions: context.interactions ?? 0,
    };

    // critical prompts bypass the engagement gate; everything else must clear it.
    if (collector.priority === 'critical') return true;
    return (
      engagementScore > 0.6 &&
      completionRate > 0.4 &&
      sessionQuality.timeOnSite > 300000 && // 5 minutes in ms
      sessionQuality.interactions > 3
    );
  }

  // Human-readable title derived from the fields requested (no PII).
  generateContextualTitle(dataPoints) {
    const labels = { company: 'company', role: 'role', companySize: 'team size',
      industry: 'industry', useCase: 'goals', phone: 'contact details' };
    const named = dataPoints.map((d) => labels[d] || d);
    return named.length
      ? `Tell us about your ${named.slice(0, 2).join(' and ')}`
      : 'Personalize your experience';
  }

  // Incentive copy scaled to how much you're asking; never a fake discount.
  selectIncentive(priority) {
    return {
      critical: 'Required to keep your account secure',
      high: 'Unlock personalized recommendations',
      medium: "We'll tailor your dashboard to your role",
      low: 'Optional — helps us improve your experience',
    }[priority] ?? 'Optional — you can skip this';
  }

  presentDataCollectionForm(dataPoints, priority) {
    const formConfig = {
      title: this.generateContextualTitle(dataPoints),
      fields: dataPoints,
      incentive: this.selectIncentive(priority),
      dismissible: priority !== 'critical', // never trap the user (see consent note)
      timing: priority === 'high' ? 'immediate' : 'delayed',
    };
    this.renderProgressiveForm(formConfig);
  }

  // Delegates to your UI (e.g. render the progressive modal template below).
  renderProgressiveForm(formConfig) {
    return this._renderProgressiveForm(formConfig);
  }
}

// Usage: inject your analytics + UI, then schedule collectors.
// const profiler = new ProgressiveProfiler({
//   fetchEngagementSignals: async (userId, dataPoints) => ({
//     engagementScore: await myAnalytics.engagement(userId),       // 0..1
//     historicalCompletionRate: await myAnalytics.completion(dataPoints), // 0..1
//   }),
//   renderProgressiveForm: (config) => mountModal(config),
// });
// profiler.scheduleDataCollection('feature_accessed', ['company', 'role'], 'high');
// await profiler.onTriggerEvent('feature_accessed', {
//   userId, sessionDuration: 360000, pageViews: 5, interactions: 6,
// });
```

### Progressive Form Templates

```html
<!-- Progressive Data Collection Modal -->
<div class="progressive-modal" data-priority="medium">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Personalize Your Experience</h3>
      <p>Help us show you the most relevant content</p>
      <button class="modal-close" onclick="dismissProgressive('later')">×</button>
    </div>
    
    <form class="progressive-form">
      <!-- Dynamic field insertion based on data tier -->
      <div class="field-group" data-tier="2">
        <label for="company">Company Name</label>
        <input type="text" 
               id="company" 
               name="company"
               placeholder="Where do you work?"
               autocomplete="organization">
      </div>
      
      <div class="field-group" data-tier="2">
        <label for="role">Your Role</label>
        <select id="role" name="role" autocomplete="organization-title">
          <option value="">Select your role</option>
          <option value="founder">Founder/CEO</option>
          <option value="marketing">Marketing Manager</option>
          <option value="sales">Sales Manager</option>
          <option value="developer">Developer</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="field-group" data-tier="3">
        <label for="company-size">Company Size</label>
        <div class="radio-group">
          <label><input type="radio" name="companySize" value="1-10"> 1-10 employees</label>
          <label><input type="radio" name="companySize" value="11-50"> 11-50 employees</label>
          <label><input type="radio" name="companySize" value="51-200"> 51-200 employees</label>
          <label><input type="radio" name="companySize" value="201+"> 201+ employees</label>
        </div>
      </div>
      
      <!-- Incentive messaging -->
      <div class="incentive-box">
        <div class="incentive-icon">🎯</div>
        <div class="incentive-text">
          <strong>Get personalized recommendations</strong>
          <span>We'll customize your dashboard based on your role</span>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-primary">
          Personalize My Experience
        </button>
        <button type="button" class="btn-secondary" onclick="dismissProgressive('skip')">
          Skip for Now
        </button>
      </div>
    </form>
  </div>
</div>
```
