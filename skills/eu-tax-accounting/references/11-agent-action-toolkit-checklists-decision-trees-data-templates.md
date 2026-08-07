## Contents

- 11. Agent Action Toolkit (checklists, decision trees, data templates)
- 11.1 Country verification checklist (run before quoting ANY figure)
- 11.2 VAT registration decision tree
- 11.3 OSS / IOSS workflow
- 11.4 Invoice validation checklist (EU VAT Directive Art. 226)
- 11.5 Payroll data needed to onboard an employee, by jurisdiction
- 11.6 Questions to ask a local accountant / tax adviser

## 11. Agent Action Toolkit (checklists, decision trees, data templates)

Use these to produce concrete, defensible outputs instead of one-off opinions. Every output should end with "verify with the official authority / a local adviser before acting."

### 11.1 Country verification checklist (run before quoting ANY figure)

For each country in scope, confirm the **current-year** value and source:

- [ ] **Corporate tax**: standard rate, SME/reduced bracket, local surcharges/min tax, fiscal-year rule → national authority + PwC summary
- [ ] **VAT**: standard + applicable reduced rate for the *specific goods/services*, domestic registration threshold, return frequency, ESL/Intrastat → TEDB + national authority
- [ ] **Payroll**: employer + employee rates, **this year's** contribution ceiling(s), accident-risk class, collective-agreement add-ons → social-security authority
- [ ] **Filing**: CIT deadline (with the entity's actual FY end), VAT periods, annual-accounts deadline + register, e-invoicing obligation date for the entity's size
- [ ] **Cross-border**: WHT on the specific payment, treaty + directive relief conditions, Pillar Two / CFC / PE exposure, DAC6 hallmarks
- [ ] **Record the source URL and the date checked** next to every number you report.

### 11.2 VAT registration decision tree

```
START: a taxable supply is being made.
1. Is the customer in the SAME country as your establishment?
   └─ Yes → register/charge per domestic rules (mind the domestic small-business threshold; EU SME scheme may exempt up to €100K EU-wide).
2. Cross-border to ANOTHER EU country?
   ├─ B2B services (general rule, Art. 44)? → REVERSE CHARGE: invoice 0% VAT, customer self-accounts. Verify customer's VAT no. on VIES; quote "Reverse charge — Art. 196 Directive 2006/112/EC".
   ├─ B2B goods, dispatched intra-EU to a VAT-registered buyer? → intra-Community supply, 0%-rated if conditions + VIES valid; buyer accounts for acquisition VAT. File EC Sales List.
   ├─ B2C goods or B2C digital/telecom/broadcast services?
   │    ├─ Total cross-border B2C < €10,000/yr (all EU combined)? → charge HOME-country VAT.
   │    └─ ≥ €10,000? → charge DESTINATION-country VAT → register for OSS (one return) instead of 27 local registrations.
   └─ B2C non-digital services? → place-of-supply rules vary by service (land, events, transport, etc.) — check Arts. 44–59 before charging.
3. Importing goods ≤ €150 to EU consumers from outside the EU? → use IOSS (collect destination VAT at checkout, monthly return; non-EU sellers need an EU intermediary).
4. Selling via a marketplace/platform? → the platform may be "deemed supplier" (and increasingly so under ViDA) — confirm who is liable.
ALWAYS: validate counterpart VAT numbers on VIES; keep evidence of customer location (2 non-contradictory items for digital).
```

### 11.3 OSS / IOSS workflow

1. **Confirm threshold**: cross-border B2C goods + digital services > €10,000/yr combined → destination VAT applies.
2. **Choose scheme**: EU-established → **Union OSS**; non-EU selling digital to EU consumers → **Non-Union OSS**; imports ≤ €150 → **IOSS**.
3. **Register** in ONE member state (your establishment, or for IOSS via an intermediary) through its OSS portal; obtain the OSS/IOSS ID.
4. **Apply destination rates** per customer country (use the TEDB rates; keep them updated).
5. **File**: OSS quarterly (by end of month after quarter-end); IOSS monthly. Pay the whole EU liability via the one portal.
6. **Keep records 10 years**; reconcile OSS sales to your VAT return so you don't double-count domestic vs. OSS supplies.
7. **Don't** put domestic sales in OSS, and **don't** reclaim input VAT through OSS (reclaim via normal return or 8th/13th Directive refund).

### 11.4 Invoice validation checklist (EU VAT Directive Art. 226)

- [ ] Sequential unique invoice number; date of issue; date of supply (if different)
- [ ] Supplier full name, address **and VAT number**
- [ ] Customer name/address; **customer VAT number** if reverse charge or intra-EU supply
- [ ] Per line: quantity/nature of goods or extent/nature of services
- [ ] Taxable amount per rate; VAT rate(s); VAT amount in the member state's currency
- [ ] Correct legend where no VAT is charged, e.g. "Reverse charge — Art. 196 Directive 2006/112/EC" (B2B services) or "Exempt — Art. 138 Directive 2006/112/EC" (intra-Community supply of goods)
- [ ] If under a margin/cash scheme, the required scheme note
- [ ] **Structured/e-invoice format** where mandated (Italy SDI, Poland KSeF, Belgium Peppol, Germany/France phase-in) — a PDF alone may be non-compliant
- [ ] Credit notes reference the original invoice number + date and the reason

### 11.5 Payroll data needed to onboard an employee, by jurisdiction

Minimum data set to compute gross-to-net and employer cost (collect per country):
- Entity's **employer registration / social-security number** in that country (and a local payroll registration — required *before* the first payday)
- Employee tax ID, social-security number, residency/tax-class, family situation
- **Applicable collective bargaining agreement** (drives minimum wage, 13th/14th month, allowances)
- Gross salary, variable pay, benefits-in-kind, pension scheme
- **Current-year contribution rates + ceiling** (from §3, re-verified), accident-insurance **risk class**
- Withholding/PAYE method (cumulative vs. non-cumulative), local payroll-filing calendar
- Mandatory insurances (e.g. accident, occupational pension) and any regional levy
- Posted-worker / A1 certificate if the person works cross-border (avoid double social-security charging)

### 11.6 Questions to ask a local accountant / tax adviser

1. What is the **exact current-year** CIT rate, SME bracket and any minimum/turnover tax for my entity type?
2. Do my activities/people here create a **permanent establishment** or change my tax residence?
3. What are **all** my registration obligations (CIT, VAT, payroll, local taxes) and their deadlines for my fiscal year?
4. Which VAT rate applies to my specific products/services, and do I need OSS/IOSS or local registration?
5. What **e-invoicing / digital-reporting** obligation applies to me and from when?
6. What's the **fully-loaded employer cost** for a hire at salary X, including ceilings, risk class and the collective agreement?
7. Do **WHT, the Parent-Subsidiary / Interest & Royalties Directives, or a treaty** apply to my cross-border flows, and what conditions/forms are required?
8. Am I in scope for **Pillar Two, CFC, DAC6/DAC7/DAC8 or transfer-pricing** documentation?
9. What **substance** do I need to defend any holding/IP benefit, and what's the GAAR/anti-abuse risk?
10. What **statutory audit / annual-accounts filing** thresholds and formats apply, and when?

---
