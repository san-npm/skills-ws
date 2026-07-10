---
name: accounting-finance
description: "Operator finance for SMEs/startups: GAAP/IFRS P&L, 13-week cash/runway forecasting, SaaS unit economics (NRR/GRR/CAC payback), chart of accounts, monthly close, bank reconciliation, ASC 606/IFRS 15 revenue recognition, VAT/sales-tax checklists. Use when building a P&L/budget, forecasting cash, setting up bookkeeping, or checking invoicing/VAT."
---

# Accounting & Finance

> **Not tax, legal, or audit advice.** This skill encodes general operator practice and standard frameworks (US GAAP, IFRS, ASC 606/IFRS 15, EU VAT). Rates, thresholds, registration triggers, and filing rules change and are jurisdiction-specific. **Before filing anything or relying on a number for a board, lender, investor, or tax authority, have it reviewed by a qualified accountant/tax advisor** licensed in the relevant jurisdiction. Route any edge case — multi-state US nexus, cross-border digital services, equity/SAFE accounting, R&D capitalization, transfer pricing, M&A, or revenue-recognition judgment calls — to a professional. Treat every concrete rate/threshold below as **"verify before use."**

> **Sibling skills (don't duplicate — cross-link):** country-level tax depth → `eu-tax-accounting` (all 27 EU member states: corporate, VAT, payroll, deadlines). Billing/dunning/usage metering implementation → `saas-billing` (Express/Node) or `stripe-billing` (Next.js). Pricing/packaging → `pricing-optimization`. GTM funnel/forecasting → `revenue-operations`. Churn/retention cohort analysis → `retention-analytics`. EU regulatory (GDPR, contracts, entity) → `eu-legal-compliance`.

---

## 1. P&L Structure (GAAP / IFRS)

Standard multi-step income statement. **Key rule: define what OpEx contains so D&A is counted exactly once.** Below, operating expenses are stated *excluding* depreciation & amortization (the "ex-D&A" convention common in SaaS reporting); D&A is its own line. EBITDA then equals operating income + D&A with no double-count. If your accounting system buckets D&A *inside* OpEx, drop the separate D&A line and compute EBITDA = operating income + D&A (added back), not by re-subtracting it.

| # | Line item | Calculation | Watch for |
|---|-----------|-------------|-----------|
| 1 | **Revenue (net)** | Recognized per ASC 606/IFRS 15 (§6), net of refunds/credits | Recognized ≠ billed ≠ cash collected. Don't book deferred revenue as revenue. |
| 2 | **COGS / Cost of revenue** | Hosting/infra, third-party API/usage fees, payment processing, customer support & success delivery, onboarding/implementation labor | SaaS COGS typically 15–30% of revenue. Keep R&D and S&M *out* of COGS. |
| 3 | **Gross profit** | Revenue − COGS | SaaS target gross margin 70–85%. |
| 4 | **Operating expenses (ex-D&A)** | Sales & Marketing + Research & Development + General & Administrative | Allocate fully-loaded headcount (salary + employer taxes + benefits) to the right function. |
| 5 | **EBITDA** | Gross profit − OpEx(ex-D&A) | Proxy for operating cash generation; ignores capex, financing, tax. |
| 6 | **Depreciation & amortization** | Capitalized assets + capitalized software/intangibles amortization | Pure non-cash; never in COGS *and* here. |
| 7 | **Operating income (EBIT)** | EBITDA − D&A | GAAP operating result. |
| 8 | **Net interest** | Interest expense − interest income | |
| 9 | **Pre-tax income (EBT)** | EBIT − net interest ± other | |
| 10 | **Income tax expense** | Current + deferred tax | Tax expense (accrual) ≠ tax *paid* (cash). |
| 11 | **Net income** | EBT − income tax | Bottom line. |

> **EBITDA vs Adjusted EBITDA:** "Adjusted EBITDA" further adds back stock-based compensation, one-time/restructuring items, and M&A costs. Always label which one you're showing and footnote the add-backs — investors discount unexplained adjustments. **Rule of 40** (growth % + FCF or EBITDA margin % ≥ 40) is a common SaaS health check, not a GAAP metric.

**Monthly P&L review checklist**
- [ ] Recognized revenue reconciles to the billing system and the deferred-revenue roll-forward (§6), not just to cash.
- [ ] COGS contains only cost-of-delivery; S&M/R&D/G&A are not leaking into it.
- [ ] Headcount fully loaded (salary + employer payroll tax + benefits) and allocated to the correct function.
- [ ] One-time/non-recurring items flagged and excluded from run-rate and from EBITDA→Adjusted EBITDA.
- [ ] D&A counted once (per the convention you chose above).
- [ ] MoM and YoY comparatives included; material variances explained (§8).
- [ ] Accruals booked for incurred-but-unbilled expenses (the close, §5).

---

## 2. Cash Flow Forecasting

### 13-week rolling direct cash forecast (the operator standard)

Forecast **cash in/out**, not accruals. Rebuild weekly from the bank balance.

```
Week | Start cash | + AR collected | + Other in | − Payroll | − Vendors/AP | − Tax/VAT | − Debt svc | = End cash
1    | 150,000    | 45,000         | 0          | 30,000    | 8,000        | 0         | 0          | 157,000
2    | 157,000    | 12,000         | 0          | 0         | 5,000        | 0         | 2,500      | 161,500
3    | 161,500    | 28,000         | 5,000      | 30,000    | 9,000        | 14,000    | 0          | 141,500
...
13   | ...
```

**Rules**
- Use **cash collected** (apply realistic AR collection lag: e.g. net-30 invoices land in week 5–6, with a haircut for late payers), not revenue recognized.
- Payroll on **actual** pay dates (semi-monthly/biweekly/monthly) including employer taxes; biweekly = 26 pay runs/yr (two 3-paycheck months).
- VAT/sales-tax remittances and corporate-tax instalments on **statutory due dates** — these are large, lumpy, and easy to forget.
- Model AP on actual vendor terms; don't assume everything clears in the booking week.
- Flag any week where ending cash dips below a **defined floor** (e.g. ≥ 2 months of operating burn or a debt covenant minimum).
- Keep a low/base/high collections scenario for any week with concentrated customer risk.

### Burn & runway

```
Gross burn   = total operating cash OUT in the month (exclude one-offs / financing)
Net burn     = gross burn − cash revenue collected      (the number that actually depletes the bank)
Runway (mo)  = current cash balance / average forward NET burn   (use a 3-month trailing avg, not a single noisy month)
```

> **Runway is a trigger to plan, not a script.** A short runway with predictable recurring revenue, an open credit line, and a near-term profitability path is very different from a short runway with lumpy revenue and no debt access. Weigh: revenue predictability & retention (§3), fundraising-market conditions, debt availability and **covenants**, the path/time-to-default-or-breakeven, dilution at the current valuation, and the owners'/board's risk tolerance. Generally start serious fundraising **9–12 months** before zero cash (a raise commonly takes 3–6 months), and pre-model the cost-cut lever you'd pull if a round slips — but the right move is situational; pressure-test it with the board/CFO.

---

## 3. SaaS / Subscription Unit Economics

### MRR / ARR movement schedule (single source of truth for "growth quality")

```
                         Month
Beginning MRR            100,000
+ New (new logos)         12,000
+ Expansion (upsell)       6,000
+ Reactivation             1,000
− Contraction (downsell)  (3,000)
− Churned (lost logos)    (5,000)
= Ending MRR             111,000
ARR = Ending MRR × 12 =  1,332,000
```

- **Quick Ratio** = (New + Expansion + Reactivation) / (Contraction + Churned). > 4 is strong; < 1 means you're losing ground.
- Reconcile this schedule to the deferred-revenue roll-forward (§6) and to recognized revenue (§1) every month.

### Retention — measure *logo* and *revenue* separately

| Metric | Formula | Read it as |
|--------|---------|-----------|
| **Logo (customer) churn** | Customers lost in period / customers at start | Counts accounts, ignores size. |
| **Gross Revenue Retention (GRR)** | (Start MRR − contraction − churn) / Start MRR | Caps at 100%. Excludes expansion → pure leakage. Best-in-class ≥ 90% (SMB) / ≥ 95% (enterprise). |
| **Net Revenue Retention (NRR/NDR)** | (Start MRR − contraction − churn + expansion) / Start MRR | Can exceed 100%. > 110% = healthy expansion engine; > 120% = elite. |
| **Logo retention** | 1 − logo churn | High logo churn + high NRR ⇒ a few big accounts carry you (concentration risk). |

### CAC, LTV, payback — state your assumptions or the numbers lie

| Metric | Formula | Notes / pitfalls |
|--------|---------|------------------|
| **Blended CAC** | All S&M / *all* new customers (incl. organic) | Flatters efficiency; use for company-level view. |
| **Paid CAC** | Paid S&M / customers from paid channels | The number that matters for scaling spend. |
| **CAC payback (months)** | CAC / (new MRR per customer × **gross margin %**) | Use *gross-margin-adjusted* MRR, not raw price. < 12 mo good (SMB), < 18–24 mo acceptable (enterprise). |
| **LTV** | (ARPA × gross margin %) / **churn rate** | Use *revenue* churn for $-LTV; on negative net churn this formula blows up — switch to a finite cohort horizon (e.g. 36-month discounted cohort value). |
| **LTV : CAC** | LTV / CAC | ≥ 3:1 healthy; ≫ 5:1 may mean you're under-investing in growth. |
| **Magic number** | Net new ARR / prior-quarter S&M | > 0.75 efficient; account for **sales-cycle lag** (spend in Q1 closes in Q2). |

> **Common mistakes:** mixing gross vs net churn; forgetting gross-margin adjustment in payback/LTV; counting organic logos in *paid* CAC; ignoring the S&M→revenue timing lag; using a single month's churn (annualize a multi-month cohort). For deep cohort/retention curves see `retention-analytics`.

---

## 4. Bookkeeping Automation, Chart of Accounts & the Monthly Close

The biggest leverage point: a clean **chart of accounts (COA)** + a repeatable **close** + automated **bank feeds** + **approval controls**.

### 4a. Chart of accounts (SMB/SaaS starter — numeric ranges)

Group by the P&L/balance-sheet line it rolls into so reporting is automatic.

| Range | Type | Example accounts |
|-------|------|------------------|
| 1000–1999 | **Assets** | 1000 Operating bank · 1010 Savings/reserve · 1100 Accounts receivable · 1200 Prepaid expenses · 1500 Fixed assets · 1510 Accumulated depreciation (contra) · 1600 Capitalized software |
| 2000–2999 | **Liabilities** | 2000 Accounts payable · 2100 Credit cards · 2200 Accrued expenses · 2300 **Deferred revenue** · 2400 Sales-tax/VAT payable · 2500 Payroll liabilities · 2700 Loans/notes payable |
| 3000–3999 | **Equity** | 3000 Common stock/share capital · 3100 Additional paid-in capital · 3200 Retained earnings |
| 4000–4999 | **Revenue** | 4000 Subscription revenue · 4100 Usage/overage revenue · 4200 Services/onboarding · 4900 Refunds & credits (contra) |
| 5000–5999 | **COGS** | 5000 Hosting/infrastructure · 5100 Third-party API/usage · 5200 Payment processing fees · 5300 Support & success (delivery) · 5400 Implementation labor |
| 6000–7999 | **Operating expenses** | 6000 Salaries & wages · 6010 Employer payroll taxes · 6020 Benefits · 6100 Sales & marketing · 6200 R&D/software dev (non-capitalized) · 6300 Rent & facilities · 6400 SaaS tools/subscriptions · 6500 Professional fees (legal/accounting) · 6600 Travel · 6700 Depreciation & amortization |
| 8000–9999 | **Other** | 8000 Interest income · 9000 Interest expense · 9500 Income tax expense |

**Rules:** keep it shallow (use classes/tags/departments for dimensions, not 200 accounts); never expense to a bank/AP account; reserve a contra account for refunds; reconcile **2300 Deferred revenue** to the §6 roll-forward and **2400 Sales-tax/VAT payable** to filed returns.

### 4b. Bank-feed reconciliation workflow

1. Connect bank/credit-card **feeds** (Plaid/native) into the ledger (QuickBooks Online, Xero, NetSuite, Wave).
2. Set **bank rules** to auto-categorize recurring lines (payroll provider → 6000/6010; Stripe payout → split fee 5200 vs gross; AWS → 5000).
3. **Match** feed transactions to existing invoices/bills; create from rules only when unmatched.
4. Clear the bank rec so **ledger balance = bank statement balance** every month; investigate any unreconciled item — never "plug" it.
5. Reconcile the **Stripe/PSP payout**: gross charges − processing fees − refunds = net deposit; book fees to 5200, not as a revenue contra.

### 4c. Monthly close checklist (target: business-day +5)

- [ ] All bank & credit-card accounts reconciled to statements (4b).
- [ ] AR aging reviewed; bad-debt reserve assessed.
- [ ] AP complete; **accruals** booked for incurred-but-unbilled costs (cut-off).
- [ ] Prepaids amortized (insurance, annual SaaS tools).
- [ ] Depreciation/amortization run for the period.
- [ ] **Deferred-revenue roll-forward** posted; revenue recognized per ASC 606/IFRS 15 (§6).
- [ ] Payroll fully recorded incl. employer taxes and PTO accrual.
- [ ] Sales-tax/VAT liability reconciled to returns/registers.
- [ ] Intercompany/owner transactions cleared (no personal expenses in the company ledger).
- [ ] Flux/variance review vs prior month, budget, and forecast (§8); lock the period.

### 4d. Approval controls, receipt capture & audit trail (segregation of duties)

- **Separate** who *requests*, *approves*, and *pays* — no single person initiates and disburses (fraud control). In tiny teams compensate with owner review of the bank feed + dual sign-off above a threshold.
- **Spend authorization matrix:** e.g. < €500 manager · €500–5k department head · > €5k founder/CFO · > €25k board. Document and enforce in the AP/expense tool.
- **Receipt capture:** require an itemized receipt per expense (Ramp/Brex/Pleo/Expensify auto-OCR and attach); enforce a per-transaction documentation rule for tax substantiation.
- **Audit trail:** keep an immutable, time-stamped log of who entered/edited/approved each transaction; restrict ledger admin; never share logins. Retain records per jurisdiction (commonly **7–10 years**; verify locally).
- **Month-end lock:** close the prior period so posted entries can't be silently altered; corrections go through dated adjusting entries.

---

## 5. Invoicing & Accounts Receivable

### Invoice/dunning workflow

1. Contract signed → create invoice/subscription record.
2. Invoice issued → send on billing date with a payment link.
3. Track **aging** by terms (net 15/30/60).
4. Overdue dunning sequence (tune by segment; soften for strategic accounts):
   - Day 1 past due: friendly reminder + link.
   - Day 7: second notice.
   - Day 14: escalate to account owner.
   - Day 30: final notice; assess late fee (if contractually allowed) and collections.

> For automated dunning, retries, and payment-failure recovery on Stripe, use `saas-billing`/`stripe-billing` — don't hand-roll it.

### What a compliant invoice contains

Exact mandatory fields are **jurisdiction- and transaction-specific** (and differ for a *full* VAT invoice vs a *simplified* receipt below a local threshold). General good practice:

- Unique sequential invoice number; issue date (and tax point/supply date if different); due date.
- Supplier legal name, address, and **tax/VAT/company registration number where the supplier is registered**.
- Customer name and address.
- Line items: description, quantity, unit price; subtotal; tax rate(s) and tax amount per rate; total payable; currency.
- Payment terms and remittance/bank details.

> **The customer's VAT number is NOT universally required.** It is required (and must be valid) when you apply the **EU B2B reverse charge / intra-Community supply** — without a verified buyer VAT ID you generally cannot zero-rate (validate via **VIES**). But many customers (consumers, non-VAT-registered small businesses, non-EU buyers) have no VAT number, and that is fine. Likewise, *your* VAT number only appears if you are VAT-registered. Don't block invoicing on a VAT field that doesn't apply. Confirm the exact field set for your country with `eu-tax-accounting` or a local accountant.

---

## 6. Revenue Recognition (ASC 606 / IFRS 15)

**5-step model:** (1) identify the contract → (2) identify distinct performance obligations → (3) determine the transaction price → (4) allocate price to obligations (by standalone selling price) → (5) recognize revenue as/when each obligation is satisfied.

**SaaS patterns**

| Arrangement | Recognition |
|-------------|-------------|
| Monthly subscription | Ratably as service is delivered (each month). |
| Annual prepaid (e.g. €12,000 upfront) | €1,000/mo recognized; remainder sits in **deferred revenue (2300)**. |
| Multi-element (license + implementation + support) | Allocate price across distinct obligations by standalone selling price; recognize each on its own pattern. |
| Setup/onboarding fee | Defer and recognize over the period it relates to (often the contract/expected-life) unless it's a distinct obligation delivered upfront. |
| Usage/consumption | Recognize as usage occurs. |

### Deferred-revenue roll-forward (must tie to the balance sheet and §3)

```
Beginning deferred revenue        80,000
+ Billings (new + renewals)       30,000
− Revenue recognized this period  (26,000)
= Ending deferred revenue         84,000
```

> Multi-element allocation, contract modifications, variable consideration, and capitalized contract costs (ASC 340-40) involve **judgment** — get auditor/accountant sign-off before relying on the policy externally.

---

## 7. Tax Compliance Checklists

> **All rates/thresholds: "verify before use."** Jurisdiction-specific; they change. This is not tax advice — confirm with a qualified advisor and file via the official authority. For 27-country EU depth, use `eu-tax-accounting`.

### 7a. EU VAT

| Scenario | Treatment |
|----------|-----------|
| B2B, same EU country | Charge local VAT. |
| B2B, cross-border EU (valid buyer VAT ID) | **Reverse charge** — 0% on the invoice; buyer self-accounts. Validate the ID via **VIES**; note "reverse charge" on the invoice. |
| B2C goods/services within EU | Charge the **destination** country's rate; report via **OSS** (or IOSS for ≤ €150 imported goods). |
| **B2C digital services** (TBE: telecom, broadcasting, e-services) | Taxed where the **customer** is; charge that country's rate; report via OSS. (No small intra-EU threshold for cross-border digital B2C beyond the €10k pan-EU micro-threshold for goods+TBE.) |
| Sale to non-EU customer | Often outside EU VAT — **but the destination country's VAT/GST/sales tax may apply and may require local registration** (see 7d). Don't assume "no tax." |

> **OSS / IOSS:** register in one EU country to report all EU B2C (OSS) / low-value imports (IOSS), avoiding many separate registrations. Standard rates change — verify each at the national tax authority (links in `eu-tax-accounting`).

| Country (standard VAT, **as of Jun 2026 — verify**) | Rate | Official source |
|------|------|-----------------|
| Luxembourg | 17% | guichet.public.lu / AED |
| Germany | 19% | bzst.de |
| France | 20% | impots.gouv.fr |
| Netherlands | 21% | belastingdienst.nl |
| Spain | 21% | agenciatributaria.es |
| Italy | 22% | agenziaentrate.gov.it |
| Ireland | 23% | revenue.ie |

EU-wide consolidated/standard-rate list: European Commission *Taxes in Europe Database* / VAT rates page. **Re-verify before invoicing.**

### 7b. EU e-invoicing & digital reporting (ViDA) — 2026 readiness

Structured (machine-readable) e-invoicing and near-real-time digital reporting are being mandated unevenly across the EU and under **VAT in the Digital Age (ViDA)**, which also extends **deemed-supplier** VAT rules to platforms/marketplaces. Indicative B2B timeline (**verify per country**): **Germany** Jan 2025 (must *receive*), issuance phasing in ~2027–2028; **Belgium** Jan 2026 (B2B); **France** Sep 2026 (must *receive*), Sep 2027 (must *issue*, large/mid first). Use formats like EN 16931 / Peppol BIS / Factur-X (ZUGFeRD) / FatturaPA (Italy, already live). Action: confirm dates and formats per country in `eu-tax-accounting`, and ensure your billing tool can emit a compliant structured invoice.

### 7c. UK VAT (post-Brexit, separate from EU)

- Standard rate **20%** (verify at gov.uk); registration threshold historically **£90k** taxable turnover (verify current figure).
- **Making Tax Digital (MTD):** VAT returns must be filed via MTD-compatible software with digital record-keeping.
- B2B sales to UK from abroad and low-value imports have specific rules; UK is **not** in EU OSS — UK VAT is handled separately.

### 7d. US sales tax / SaaS nexus

- The US has **no VAT**; sales tax is **state (and local)**, ~45 states + DC, each with its own rules and rates.
- **Economic nexus** (post-*Wayfair*): you can owe collection in a state with no physical presence once you cross its sales/transaction threshold — a common one is **$100,000 in sales or 200 transactions/yr**, but **thresholds, the "200 transactions" prong, and whether SaaS is taxable all vary by state — verify each**. (Many states dropped the transaction count; some never tax SaaS; a few always do.)
- Steps: track sales by state → monitor each threshold → register where you have nexus → collect at the correct combined (state+county+city+district) rate → file/remit on each state's cadence. Tools: Stripe Tax, Avalara, TaxJar, Anrok automate calc/registration/filing.
- **Marketplace facilitator laws:** if you sell *through* a marketplace (Amazon/App Store/etc.), the **platform** often collects and remits sales tax on your behalf — but you may still have filing obligations; confirm per state.

### 7e. Payroll tax

- Withhold and remit employee income tax + employee/employer **social/payroll contributions** on each pay run; deposit on the statutory schedule (penalties for late deposits are steep).
- US: federal income tax withholding + FICA (Social Security/Medicare, employee & employer) + FUTA + state withholding/SUTA; file (e.g.) Form 941 quarterly and W-2s annually — **verify current forms/limits**.
- EU/UK: employer social security + PAYE-type withholding vary by country; see `eu-tax-accounting` per state.
- **Worker classification (employee vs contractor) is a high-risk audit area** — misclassification creates back-tax and penalty exposure; get advice.

### 7f. Corporate income tax

- Tax **expense** (accrual, on the P&L) differs from tax **paid** (cash); most jurisdictions require **estimated/instalment** payments during the year — model these in the cash forecast (§2).
- Track **deferred tax** (timing differences) and any usable **loss carryforwards**; R&D credits/incentives may apply.
- EU corporate rates range widely (e.g. Ireland 12.5%, Germany ~30% effective) — see `eu-tax-accounting`; **verify** before relying.

### 7g. Vendor / contractor information reporting

- **US 1099:** generally issue **1099-NEC** for ≥ **$2,000/yr** (raised from $600 for tax years beginning after 2025; may be inflation-adjusted from 2027) paid to US non-corporate contractors (collect a **W-9** before paying); **1099-K** is issued by payment processors/marketplaces; **verify the current dollar threshold** (it has been changing). Foreign contractors: collect **W-8BEN/W-8BEN-E** instead.
- **EU/UK:** equivalents include **DAC7** (platform reporting of seller income) and local contractor-reporting/withholding rules — confirm per country.

---

## 8. Budget vs Actual (variance analysis)

Both the **Variance** and **% Var** columns below use a single **favorable(+) / unfavorable(−)** convention — the *raw* arithmetic delta is shown separately so the two columns never disagree on sign:

| Category | Budget | Actual | Raw Δ (Actual−Budget) | Variance (F/U) | % Var (F/U) | Flag |
|----------|--------|--------|-----------------------|----------------|-------------|------|
| Revenue | 100,000 | 95,000 | −5,000 | −5,000 (unfavorable) | −5% | Review |
| COGS | 25,000 | 23,000 | −2,000 | +2,000 (favorable) | +8% | OK |
| Marketing | 30,000 | 38,000 | +8,000 | −8,000 (unfavorable) | −27% | Alert |
| R&D | 40,000 | 41,000 | +1,000 | −1,000 (slightly unfavorable) | −2.5% | OK |

> **Sign convention (the one rule that prevents misreads):** for a **revenue/income** line, actual *above* budget is favorable; for a **cost/expense** line, actual *below* budget is favorable. So COGS coming in €2,000 under budget is **+€2,000 favorable** even though the raw `Actual−Budget` is −€2,000 — that is why the "Raw Δ" and "Variance (F/U)" columns can have opposite signs for cost lines. Pick the F/U convention for *both* the amount and the % and apply it to every row so the table can't be misread. `% Var (F/U)` = |Actual−Budget| / Budget, signed favorable/unfavorable.

**Rules**
- Flag variances > **10%** for review, > **20%** for action.
- Always explain **WHY** (price vs volume vs timing), not just the delta.
- Distinguish **timing** variances (will reverse) from **permanent** ones (reforecast).
- Reforecast at least quarterly off actuals; feed the result back into the cash forecast (§2) and the MRR schedule (§3).
