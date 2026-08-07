## 11. QA / debug checklist (run before declaring tracking "live")

- [ ] **DebugView** (Admin → DebugView, with GTM Preview or the GA Debugger on) shows each event **once** with the expected parameters — no duplicate `page_view`/`purchase`.
- [ ] **Realtime** report shows the event and its key-event flag within ~30s.
- [ ] **Key events** are marked for genuine outcomes only; `purchase` carries `currency` + `value` + a unique `transaction_id`.
- [ ] **Consent**: in GTM Preview, confirm tags are **blocked** before acceptance and **fire** after; all four CMP signals flip on `update`.
- [ ] **Ecommerce**: `dataLayer.push({ ecommerce: null })` precedes each ecommerce push; items array populated.
- [ ] **UTMs**: run the §6.6 QA query — no uppercase/spaces in `source`/`medium`, no null campaigns on paid hits, no internal links carrying UTMs.
- [ ] **Custom dimensions** registered for every parameter you report on (unregistered params won't appear in the GA4 UI).
- [ ] **BigQuery** link active; a `SELECT … _TABLE_SUFFIX = yesterday` query returns rows and the `purchase` revenue ties out to billing within tolerance.
- [ ] **Measurement Protocol** events validated against `/debug/mp/collect` and carrying a matching `client_id` (no orphan sessions).
- [ ] **No PII** anywhere in parameters/user properties (spot-check `event_params` and `user_properties` in BigQuery).

---
