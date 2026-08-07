## Contents

- 6. Invoicing Requirements
- Mandatory E-Invoicing by Country
- Required Invoice Fields — EU VAT Directive Art. 226
- Credit Notes

## 6. Invoicing Requirements

### Mandatory E-Invoicing by Country

*Last verified: Jun 2026. Dates and turnover thresholds in this area have slipped repeatedly — treat every date as provisional and confirm at the national authority before building integrations.*

| Country | System | Status (Jun 2026) | Format |
|---------|--------|--------|--------|
| Italy | SDI (Sistema di Interscambio) | Mandatory since 2019 (B2B, B2G; B2C and former-flat-rate taxpayers now in scope) | FatturaPA (XML) |
| France | Chorus Pro (B2G) + PDP partner platforms (B2B) | B2G since 2020. **B2B: from Sep 1, 2026 ALL companies must be able to *receive*; *issuing* obligation phases Sep 2026 (large/mid) → Sep 2027 (SME/micro).** Mandatory e-reporting alongside. | Factur-X (hybrid PDF/XML), UBL, CII |
| Germany | XRechnung (B2G) | B2G since 2020. **B2B *receive* mandatory since Jan 1, 2025**; *issue* phases in 2027 (turnover > €800K) and 2028 (all). EN 16931 format from 2025. | XRechnung (UBL/CII), ZUGFeRD ≥2.x |
| Spain | FACe (B2G); Crea y Crece + VeriFactu (B2B) | B2G mandatory. **Crea y Crece B2B royal decree adopted Mar 24, 2026**; phase-in counts from a Ministerial Order: ~12 months later for turnover > €8M (est. 2027), ~24 months for the rest (est. 2028). **VeriFactu** certified-software obligation: Jan 1, 2027 (CIT taxpayers) / Jul 1, 2027 (IRPF). Confirm at [AEAT](https://sede.agenciatributaria.gob.es/). | Facturae (XML) |
| Poland | KSeF (Krajowy System e-Faktur) | **Live: Phase 1 from Feb 1, 2026** (taxpayers with 2024 gross sales > PLN 200M); **Phase 2 from Apr 1, 2026** (all VAT-registered); micro-sellers from Jan 1, 2027. **2026 is a penalty grace period — enforcement/fines from Jan 1, 2027.** | KSeF (FA structured XML) |
| Belgium | Peppol (B2G + B2B) | B2G mandatory. **B2B mandatory since Jan 1, 2026** (structured e-invoices via Peppol). | Peppol BIS (EN 16931) |
| Romania | RO e-Factura, RO e-Transport | B2B mandatory since 2024 (broadened to all domestic B2B + e-reporting); B2C e-invoicing also phased in. | CIUS-RO (UBL-based) |

**ViDA (VAT in the Digital Age, Directive (EU) 2025/516).** Adopted 2025; phases roll out from Jul 2028 to 2035. Key pillars: (1) **digital reporting + mandatory structured e-invoicing for intra-EU B2B** from 1 Jul 2030 (EN 16931; existing domestic reporting systems must align by 1 Jan 2035), removing the need for prior derogations; (2) **platform economy**: deemed-supplier VAT rules for short-term accommodation and passenger transport platforms from 1 Jul 2028 (member states may defer to 1 Jan 2030); (3) **single VAT registration**: wider OSS plus mandatory reverse charge from 1 Jul 2028, avoiding multiple registrations. Member states may mandate domestic e-invoicing without EU derogation already. Track at [EU ViDA](https://taxation-customs.ec.europa.eu/taxation/vat/vat-digital-age-vida_en).

### Required Invoice Fields — EU VAT Directive Art. 226

Every VAT invoice must contain:
1. Date of issue
2. Sequential invoice number (unique)
3. VAT identification number of the supplier
4. VAT identification number of the customer (for reverse charge or intra-community supplies)
5. Full name and address of supplier and customer
6. Quantity and nature of goods / extent and nature of services
7. Date of supply (if different from invoice date)
8. Taxable amount per rate/exemption
9. VAT rate applied
10. VAT amount payable (in the currency of the member state)
11. In case of exemption or reverse charge: reference to the relevant provision (e.g., "Exempt — Art. 138 Directive 2006/112/EC" for intra-community supply)

### Credit Notes
- Must reference the original invoice number and date
- Must include the reason for the credit
- Reduces the taxable amount and VAT reported in the period the credit note is issued
- Some countries require sequential numbering separate from invoices (e.g., France: "Avoir" series)

---
