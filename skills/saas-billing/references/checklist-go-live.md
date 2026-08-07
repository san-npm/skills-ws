## Checklist: Go-Live

- [ ] Webhook endpoint registered in Stripe Dashboard (not just CLI)
- [ ] Webhook signing secret in production env vars
- [ ] All essential events selected in webhook config
- [ ] Idempotency implemented (processed_events table)
- [ ] Raw body parsing before `express.json()`
- [ ] API version pinned
- [ ] Test mode cards verified for all flows
- [ ] Dunning emails configured
- [ ] Customer portal configured
- [ ] Grace period logic for failed payments
- [ ] API keys hashed in database
- [ ] Rate limiting on API and webhook endpoints
- [ ] Success URL does NOT provision (webhooks do)
- [ ] `metadata.user_id` set on checkout sessions and subscriptions
- [ ] Error monitoring/alerting on webhook failures
- [ ] Stripe CLI webhook forwarding tested locally
