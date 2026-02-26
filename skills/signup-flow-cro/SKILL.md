---
name: signup-flow-cro
description: "Optimize signup, registration, account creation, or trial activation flows for higher conversion."
---

# Signup Flow CRO v2

## Signup Form Optimization

### Field Reduction
Every additional field reduces conversion 5-10%. Minimum viable signup:
- **Best**: Email only (or social login)
- **Good**: Email + password
- **Acceptable**: Email + password + name
- **Risky**: Email + password + name + company + phone

Ask everything else AFTER signup (progressive profiling).

### Social Login
Offer in order of conversion impact:
1. Google (highest adoption)
2. GitHub (dev tools)
3. Apple (mobile apps)
4. Microsoft (enterprise)
5. SSO/SAML (enterprise, behind "Enterprise login" link)

Place social login ABOVE email form (most users prefer it).

### Password UX
- Show password strength indicator (real-time)
- Allow show/hide password toggle
- Minimum 8 chars, no arbitrary rules (no "must include uppercase + number + symbol")
- Support password managers (proper autocomplete attributes)

### Email Verification
- Don't block access before verification (let them in, remind later)
- Verification email within 10 seconds
- Clear subject: "Verify your {Product} email"
- One-click verification button (no codes to type)
- Resend option visible after 30 seconds
- Fallback: magic link or code entry

## Multi-Step Forms
When you MUST collect more info:
1. Step 1: Email + password (create account)
2. Step 2: Role + company size (personalize experience)
3. Step 3: Use case or goals (tailor onboarding)

Rules:
- Show progress indicator
- Allow skipping non-essential steps
- Save progress (don't lose data on back button)
- Each step has value for the user (personalization, not just your data collection)

## Post-Signup Handoff
Within 5 seconds of signup:
- Redirect to first-value action (not empty dashboard)
- Welcome modal with 1-2 question setup wizard
- Start onboarding checklist

## References

- references/signup-patterns.md — Signup form patterns and examples
- references/friction-checklist.md — 25-point friction audit
