## Contents

- Preview Text Optimization
- Rules
- Formula: Subject + Preview = Complete Thought
- Implementation

## Preview Text Optimization

Preview text is the most underutilized email real estate. It appears after the subject line on mobile and desktop.

### Rules

- **Length:** 40-130 characters (varies by client, front-load the good stuff)
- **Don't repeat** the subject line
- **Complement** the subject — expand, add context, or create a 1-2 punch
- **Avoid** the dreaded "View this email in your browser" default

### Formula: Subject + Preview = Complete Thought

```
Subject: Your cart is waiting
Preview: Plus, free shipping if you order today →

Subject: 5 mistakes killing your conversion rate
Preview: #3 cost us $47K last quarter.

Subject: Welcome to [Product]
Preview: Here's your first step (takes 2 min).

Subject: Quick question, [Name]
Preview: Hit reply — I read every one.
```

### Implementation

```html
<!-- Hidden preview text -->
<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;
max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
  Your preview text here.
  <!-- Pad with whitespace to prevent body text from showing -->
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  <!-- Repeat ~100 times -->
</div>
```

---
