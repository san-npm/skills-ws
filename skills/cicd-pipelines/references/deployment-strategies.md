## Contents

- Deployment Strategies
- Blue-Green with GitHub Actions
- Canary (progressive traffic shift)

## Deployment Strategies

| Strategy | Downtime | Rollback Speed | Risk | Best For |
|---|---|---|---|---|
| **Rolling** | Zero | Minutes | Medium | Stateless services |
| **Blue-Green** | Zero | Instant (swap) | Low | Critical services |
| **Canary** | Zero | Fast (shift back) | Lowest | High-traffic APIs |
| **Recreate** | Yes | Slow | High | Dev/staging only |

### Blue-Green with GitHub Actions

```yaml
deploy:
  runs-on: ubuntu-24.04
  environment: production
  permissions: { id-token: write, contents: read }
  steps:
    - uses: actions/checkout@v6
    - name: Deploy to idle (green) slot
      run: ./deploy.sh green
    - name: Health check green before any traffic
      run: |
        for i in $(seq 1 30); do
          curl -fsS https://green.app.example/health && exit 0
          sleep 5
        done
        echo "green never became healthy"; exit 1
    - name: Swap traffic to green
      run: ./swap-traffic.sh green
    - name: Keep blue warm as instant rollback
      run: echo "Rollback = ./swap-traffic.sh blue (previous version still running)"
```

### Canary (progressive traffic shift)

```yaml
canary:
  runs-on: ubuntu-24.04
  environment: production
  steps:
    - uses: actions/checkout@v6
    - run: ./deploy.sh canary
    - name: Shift 5% → watch SLOs → 25% → 50% → 100%
      run: |
        for pct in 5 25 50 100; do
          ./set-weight.sh canary "$pct"
          sleep 120
          # Bail (and auto-rollback) if error rate / latency SLO breaches.
          ./check-slo.sh canary || { ./set-weight.sh canary 0; exit 1; }
        done
```
