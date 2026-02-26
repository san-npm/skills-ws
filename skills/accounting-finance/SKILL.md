---
name: accounting-finance
description: "Financial modeling, bookkeeping automation, invoicing workflows, tax compliance checklists, and P&L analysis for SMEs and startups."
---

# Accounting & Finance

## Workflow

### 1. P&L Structure

| Line item | Calculation | Watch for |
|-----------|-------------|-----------|
| Revenue | MRR × months + one-time | Revenue recognition timing |
| COGS | Hosting + support + onboarding | Should be < 30% of revenue for SaaS |
| Gross margin | Revenue - COGS | Target: 70-80% for SaaS |
| Operating expenses | Sales + Marketing + R&D + G&A | Break down by department |
| EBITDA | Gross margin - OpEx | Profitability indicator |
| Net income | EBITDA - interest - taxes - depreciation | Bottom line |

**Monthly P&L review checklist:**
- [ ] Revenue matches billing system (reconcile ±1%)
- [ ] COGS categorized correctly (not mixed with OpEx)
- [ ] Headcount costs allocated to correct department
- [ ] One-time costs flagged and excluded from run-rate
- [ ] MoM and YoY comparison included

### 2. Cash Flow Forecasting

**13-week rolling forecast (the standard):**

```
Week | Starting cash | + Revenue collected | - Payroll | - Vendors | - Tax | = Ending cash
1    | 150,000       | 45,000              | 30,000   | 8,000    | 0     | 157,000
2    | 157,000       | 12,000              | 0        | 5,000    | 0     | 164,000
...
```

**Key rules:**
- Use cash collected, not revenue recognized
- Payroll on actual pay dates (biweekly or monthly)
- Include tax payments on due dates
- Flag weeks where ending cash < 2 months of burn
- Update weekly — stale forecasts are useless

**Burn rate calculation:**
```
Monthly burn = Total cash spent in month (excluding one-time)
Runway (months) = Current cash balance / Monthly burn
```

Runway < 6 months = fundraise or cut costs immediately.

### 3. Unit Economics

| Metric | Formula | SaaS benchmark |
|--------|---------|----------------|
| CAC | Total sales & marketing spend / New customers | Varies by segment |
| LTV | ARPU × Gross margin % × (1 / Monthly churn rate) | 3-5x CAC minimum |
| LTV:CAC | LTV / CAC | > 3:1 healthy |
| Payback period | CAC / (ARPU × Gross margin %) | < 12 months |
| Magic number | Net new ARR / Prior quarter S&M spend | > 0.75 = efficient |

### 4. Invoice Automation

**Invoice workflow:**
1. Contract signed → create invoice record
2. Invoice generated → send on billing date
3. Payment due → track aging (net 30/60)
4. Overdue → automated reminder sequence:
   - Day 1 past due: friendly reminder
   - Day 7: second notice with payment link
   - Day 14: escalation to account manager
   - Day 30: final notice, flag for collections

**Invoice must include:**
- Unique invoice number (sequential)
- Your company legal name, address, VAT number
- Client company name, address, VAT number
- Line items with descriptions, quantities, unit prices
- Subtotal, tax rate, tax amount, total
- Payment terms and bank details
- Issue date and due date

### 5. EU VAT Compliance

| Scenario | VAT treatment |
|----------|---------------|
| B2B within same EU country | Charge local VAT |
| B2B cross-border EU | Reverse charge (0% VAT, buyer reports) |
| B2C within EU | Charge destination country VAT rate (OSS) |
| B2C outside EU | No EU VAT |
| B2B outside EU | No VAT (export) |

**OSS (One-Stop Shop)** — register in one EU country, report all EU B2C sales there.

**VAT rates (major markets):**

| Country | Standard rate |
|---------|-------------|
| Luxembourg | 17% |
| France | 20% |
| Germany | 19% |
| Netherlands | 21% |
| Spain | 21% |
| Italy | 22% |
| Ireland | 23% |

### 6. Revenue Recognition (ASC 606 / IFRS 15)

**5-step model:**
1. Identify the contract
2. Identify performance obligations
3. Determine transaction price
4. Allocate price to obligations
5. Recognize revenue when obligation is satisfied

**SaaS specifics:**
- Monthly subscription: recognize monthly as service delivered
- Annual prepayment: recognize 1/12 each month (rest is deferred revenue)
- Setup fees: defer and recognize over contract term (usually)
- Usage-based: recognize as usage occurs

### 7. Budget vs Actual

**Variance analysis template:**

| Category | Budget | Actual | Variance | % Var | Flag |
|----------|--------|--------|----------|-------|------|
| Revenue | 100,000 | 95,000 | -5,000 | -5% | Review |
| COGS | 25,000 | 23,000 | +2,000 | -8% | OK |
| Marketing | 30,000 | 38,000 | -8,000 | +27% | Alert |
| R&D | 40,000 | 41,000 | -1,000 | +3% | OK |

**Rules:**
- Flag variances > 10% for review
- Flag variances > 20% for immediate action
- Always explain WHY, not just WHAT
- Reforecast quarterly based on actuals
