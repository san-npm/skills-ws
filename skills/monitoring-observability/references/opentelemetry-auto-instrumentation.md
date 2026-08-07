## Contents

- OpenTelemetry: Auto-Instrumentation
- Node.js Setup
- Custom Spans
- Python Auto-Instrumentation

## OpenTelemetry: Auto-Instrumentation

### Node.js Setup

> **APIs below target OpenTelemetry JS 2.x** (the line shipping since early 2025). The biggest gotcha vs. 1.x: the `Resource` class is no longer exported — use the `resourceFromAttributes()` / `defaultResource()` functions. If you're on 1.x and can't upgrade yet, swap those for `new Resource({...})`.

```typescript
// tracing.ts — the SDK must start BEFORE any instrumented library is required.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
// OTel JS 2.x: build the Resource with the helper, not `new Resource(...)`.
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  // merge over the default resource so process/host/SDK attributes are kept.
  resource: defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'api',
      [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '0.0.0',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
    }),
  ),
  // Point at the Collector's OTLP/HTTP ingress (otel-collector:4318), not Tempo directly.
  // OTEL_EXPORTER_OTLP_ENDPOINT should be the BASE url; the SDK appends /v1/traces etc.
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // ignoreIncomingRequestHook replaces the removed ignoreIncomingPaths option.
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) =>
          ['/healthz', '/ready', '/metrics'].includes(req.url ?? ''),
      },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => { void sdk.shutdown(); });
```

**Loading it early enough is the part everyone gets wrong.** Auto-instrumentation works by monkey-patching modules as they're `require()`d, so the SDK must `.start()` *before* `http`, `pg`, `express`, etc. are first loaded. `import './tracing'` at the top of `index.ts` is **not** reliable: ES module imports are hoisted and evaluated together, so a sibling `import express` can run first. Load it out-of-band instead:

```bash
# CommonJS / ts-node: --require runs the file before your app module loads
node --require ./dist/tracing.js dist/index.js

# Native ESM (Node 18.19+/20.6+): --import is the ESM-safe equivalent of --require
node --import ./dist/tracing.js dist/index.js

# Or via env var (handy in Dockerfiles / k8s) — no code change to the entrypoint:
NODE_OPTIONS="--require ./dist/tracing.js" node dist/index.js
```

Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` (base URL) in the environment.

**Framework caveats — auto-instrumentation often can't run "before everything":**

- **Next.js:** don't use this bootstrap. Next has first-class OTel support: `npm i @vercel/otel` and export `register()` from `instrumentation.ts` at the project root. Next runs it in the Node runtime before request handling. (See sibling skill `nextjs-architecture`.)
- **Serverless (Lambda):** use the OTel Lambda layer / `AWS_LAMBDA_EXEC_WRAPPER`, not a long-lived `NodeSDK`; the process freezes between invocations and a `PeriodicExportingMetricReader` won't flush.
- **Bundled apps (esbuild/webpack):** bundling defeats `require`-time patching. Mark instrumented deps `external`, or use a build-time OTel plugin.

### Custom Spans

```typescript
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service');

async function processPayment(orderId: string, amount: number) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    try {
      span.setAttributes({
        'payment.order_id': orderId,
        'payment.amount': amount,
        'payment.currency': 'USD',
      });

      // Nested span for the Stripe API call. Use PaymentIntents (the current API);
      // the legacy Charges API is not the default for new integrations.
      const result = await tracer.startActiveSpan('payment.stripe.payment_intent', async (stripeSpan) => {
        try {
          const intent = await stripe.paymentIntents.create({
            amount,                 // already in the smallest currency unit (cents)
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
          });
          stripeSpan.setAttributes({
            'stripe.payment_intent_id': intent.id,
            'stripe.status': intent.status,
          });
          return intent;
        } catch (err) {
          // catch is `unknown` in TS strict mode — narrow before reading .message.
          const message = err instanceof Error ? err.message : String(err);
          stripeSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          stripeSpan.recordException(err as Error);
          throw err;
        } finally {
          stripeSpan.end();
        }
      });

      span.setAttributes({ 'payment.status': 'success' });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Python Auto-Instrumentation

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # Auto-install instrumentations
```

```bash
# Run with auto-instrumentation
opentelemetry-instrument \
  --service_name my-service \
  --exporter_otlp_endpoint http://localhost:4318 \
  python app.py
```

```python
# Custom spans in Python
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")

def process_payment(order_id: str, amount: float):
    with tracer.start_as_current_span("payment.process") as span:
        span.set_attribute("payment.order_id", order_id)
        span.set_attribute("payment.amount", amount)

        # Use PaymentIntents (current API), not the legacy Charge.create.
        with tracer.start_as_current_span("payment.stripe.payment_intent") as stripe_span:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # smallest currency unit (cents)
                currency="usd",
                automatic_payment_methods={"enabled": True},
            )
            stripe_span.set_attribute("stripe.payment_intent_id", intent.id)
            stripe_span.set_attribute("stripe.status", intent.status)
            return intent
```

---
