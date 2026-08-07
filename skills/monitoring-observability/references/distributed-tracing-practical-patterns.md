## Contents

- Distributed Tracing: Practical Patterns
- Span Naming Conventions
- Sampling Strategies
- Context Propagation Across Services

## Distributed Tracing: Practical Patterns

### Span Naming Conventions

```
# Good — consistent, searchable, useful for aggregation
http.request GET /api/users/:id
db.query SELECT users
cache.get user:profile:123
queue.publish order.created
payment.stripe.charge
email.send welcome

# Bad — too specific (high cardinality) or too vague
GET /api/users/12345          ← every user ID creates a unique span
processRequest                ← useless for filtering
doStuff                       ← really?
```

### Sampling Strategies

**Head vs. tail — know which one you can actually use.** A *head* sampler decides at span **start**, before the request has run. At that moment the status code, latency, and most attributes don't exist yet — so a head sampler **cannot** "always keep errors." The common ask ("keep 10% of traffic but 100% of errors and slow requests") is a *tail* decision: it must run after the trace finishes, in the **OTel Collector's `tail_sampling` processor**, never in the SDK.

| | Head sampling (SDK) | Tail sampling (Collector) |
|---|---|---|
| Decides | at trace start | after trace completes |
| Can key on errors/latency? | No (not known yet) | Yes |
| Cost | cheap, no buffering | buffers all spans in memory until decision |
| Where | app process | collector (needs all spans of a trace at one collector) |

**Head sampling — the one thing it's good for (cheap, uniform rate):**

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Keep 10% of root traces; ALWAYS honor an upstream service's decision so a
// trace is either fully kept or fully dropped across services. Set on NodeSDK
// via `sampler:` (or env: OTEL_TRACES_SAMPLER=parentbased_traceidratio,
// OTEL_TRACES_SAMPLER_ARG=0.1).
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});
```

**Tail sampling — keep all errors + slow traces, downsample the boring ones.** This lives in the Collector (the `otel-collector` service above; the `-contrib` image has this processor). Apps export 100% to the collector; the collector decides what to keep:

```yaml
# otel/collector.yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }

processors:
  # Buffer spans per trace, then apply policies once the trace is complete.
  # Size memory: num_traces ≈ expected_new_traces_per_sec × decision_wait × ~2.
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      # 1) Keep every errored trace (status now known — this is the whole point of tail).
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      # 2) Keep every slow trace (> 1s end-to-end).
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      # 3) Otherwise keep a 10% probabilistic sample.
      - name: sample-the-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }              # in-cluster plaintext; use TLS across trust boundaries
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write   # Prometheus 3.x remote-write receiver

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      exporters: [prometheusremotewrite]
```

> **Scaling caveat:** tail sampling requires *all spans of a trace to reach the same collector instance*. With more than one collector you need a two-tier setup — a routing/load-balancing layer that hashes on `trace_id` (the `loadbalancing` exporter) feeding a pool of tail-sampling collectors. A single replica is fine until you outgrow its memory.

### Context Propagation Across Services

```typescript
// Service A — outgoing HTTP request
import { context, propagation } from '@opentelemetry/api';

async function callServiceB() {
  const headers: Record<string, string> = {};
  // Inject trace context into outgoing headers
  propagation.inject(context.active(), headers);

  const response = await fetch('http://service-b/api/data', { headers });
  return response.json();
}

// Service B — incoming request (auto-instrumented by OTel HTTP instrumentation)
// The trace context is automatically extracted from incoming headers
// No manual code needed — just ensure both services use OTel
```

---
