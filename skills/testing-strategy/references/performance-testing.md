## Contents

- Performance Testing
- k6 Load Testing
- Artillery Configuration
- Setting SLOs (Service Level Objectives)

## Performance Testing

### k6 Load Testing

```javascript
// load-test.js — staged ramp with SLOs
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderDuration = new Trend('order_create_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp to 50 VUs
    { duration: '5m', target: 50 },   // sustained load
    { duration: '2m', target: 200 },  // spike test
    { duration: '5m', target: 200 },  // sustained spike
    { duration: '2m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],  // SLO: p95 < 500ms
    errors: ['rate<0.01'],                             // SLO: <1% error rate
    order_create_duration: ['p(95)<800'],              // custom metric SLO
  },
};

export default function () {
  group('API Health', () => {
    const health = http.get('http://localhost:3000/api/health');
    check(health, { 'health 200': (r) => r.status === 200 });
  });

  group('Create Order', () => {
    const payload = JSON.stringify({
      items: [{ sku: 'LOAD-TEST', qty: 1 }],
    });
    const res = http.post('http://localhost:3000/api/orders', payload, {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    });
    orderDuration.add(res.timings.duration);
    errorRate.add(res.status !== 201);
    check(res, {
      'order created': (r) => r.status === 201,
      'has order id': (r) => JSON.parse(r.body).id !== undefined,
    });
  });

  sleep(1);
}
```

```bash
# Run locally
k6 run load-test.js
# Run with cloud output
k6 run --out cloud load-test.js
# Run with specific VUs (override stages)
k6 run --vus 100 --duration 5m load-test.js
```

### Artillery Configuration

```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Spike"
  plugins:
    ensure: {}
  ensure:
    thresholds:
      - http.response_time.p95: 500
      - http.response_time.p99: 1500

scenarios:
  - name: "Browse and order"
    flow:
      - get:
          url: "/api/products"
          capture:
            - json: "$[0].id"
              as: "productId"
      - think: 2
      - post:
          url: "/api/orders"
          json:
            items:
              - sku: "{{ productId }}"
                qty: 1
          expect:
            - statusCode: 201
```

```bash
npx artillery run artillery.yml
npx artillery run --output report.json artillery.yml
npx artillery report report.json  # generates HTML report
```

### Setting SLOs (Service Level Objectives)

| Metric | Target | Measurement | Alert |
|--------|--------|-------------|-------|
| Availability | 99.9% (8.7h/year downtime) | Uptime monitor | Page on breach |
| Latency p50 | <100ms | APM / k6 | Warn at 150ms |
| Latency p95 | <500ms | APM / k6 | Alert at 750ms |
| Latency p99 | <1500ms | APM / k6 | Page at 2000ms |
| Error rate | <0.1% | Error tracking | Alert at 0.5% |
| Throughput | >1000 rps | Load test baseline | Warn at 800 rps |

```javascript
// k6 thresholds as SLO enforcement
export const options = {
  thresholds: {
    http_req_duration: [
      { threshold: 'p(50)<100', abortOnFail: false },
      { threshold: 'p(95)<500', abortOnFail: true },   // hard SLO
      { threshold: 'p(99)<1500', abortOnFail: true },
    ],
    http_req_failed: [
      { threshold: 'rate<0.001', abortOnFail: true },   // 99.9% success
    ],
  },
};
```

**Performance testing cadence:**
- **Pre-release:** Full staged load test against staging
- **Weekly:** Smoke test (low load, verify SLOs still hold)
- **Post-incident:** Reproduce load conditions that caused the incident
