## Deployment Pipeline: Complete Production Workflow

Two things make `kubectl`/registry steps actually runnable on a GitHub-hosted runner and are missing from most copy-pasted examples:

1. **Auth + tooling on every deploy job.** A hosted runner has no kubeconfig and no cluster network route. You must (a) get cloud credentials — OIDC is preferred over long-lived keys — (b) fetch a kubeconfig (`aws eks update-kubeconfig` / `gcloud container clusters get-credentials` / `az aks get-credentials`), and (c) ensure `kubectl` exists (`azure/setup-kubectl`). The factored-out `_kube-deploy` reusable job below does all three so the example stays DRY.
2. **One immutable image reference, computed once.** Compute the digest-or-SHA tag in `build` and pass it through job `outputs`; every deploy job consumes that exact string. Never re-derive `:${{ github.sha }}` in a deploy job while `metadata-action` produced a *different* tag (e.g. a short SHA) — that's how you "deploy" a tag that was never pushed.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false  # Never cancel a running production deploy

permissions:
  contents: read
  packages: write   # push to GHCR
  id-token: write   # OIDC for cloud auth + keyless cosign

jobs:
  test:
    # ci.yml MUST declare `on: workflow_call` (see the CI section) or this fails to resolve.
    uses: ./.github/workflows/ci.yml
    with:
      run-e2e: true
    secrets: inherit

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      # The single source of truth for "what we deploy": image@sha256 digest.
      image: ${{ steps.out.outputs.image }}
    steps:
      - uses: actions/checkout@v7

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Login to GHCR
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,format=long,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Pin to immutable digest
        id: out
        # Prefer the pushed digest over any tag — tags are mutable, digests are not.
        run: echo "image=ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}" >> "$GITHUB_OUTPUT"

  # ---- Reusable in-cluster deploy job: auth -> kubeconfig -> kubectl. ----
  # Realistically this lives in your org `.github` repo; shown inline for clarity.
  deploy-staging:
    needs: build
    uses: ./.github/workflows/_kube-deploy.yml
    with:
      environment: staging
      namespace: staging
      deployment: app
      image: ${{ needs.build.outputs.image }}
      base-url: https://staging.example.com
    secrets: inherit

  approve-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Configure required reviewers under Settings → Environments
    steps:
      - run: echo "Production deployment approved"

  deploy-canary:
    needs: [build, approve-production]
    uses: ./.github/workflows/_kube-deploy.yml
    with:
      environment: production
      namespace: production
      deployment: app-canary
      image: ${{ needs.build.outputs.image }}
      analyze: true            # gate on metrics before promoting
    secrets: inherit

  deploy-production:
    needs: [build, deploy-canary]
    uses: ./.github/workflows/_kube-deploy.yml
    with:
      environment: production
      namespace: production
      deployment: app
      image: ${{ needs.build.outputs.image }}
      base-url: https://app.example.com
    secrets: inherit
```

```yaml
# .github/workflows/_kube-deploy.yml — the reusable deploy unit
name: kube-deploy
on:
  workflow_call:
    inputs:
      environment: { type: string, required: true }
      namespace:   { type: string, required: true }
      deployment:  { type: string, required: true }
      image:       { type: string, required: true }   # full image@sha256 digest
      base-url:    { type: string, default: '' }
      analyze:     { type: boolean, default: false }

permissions:
  contents: read
  id-token: write   # OIDC -> cloud, no stored kube creds

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v7

      # 1) Cloud auth via OIDC (EKS example; swap for GKE/AKS as needed).
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      # 2) kubectl binary + 3) cluster kubeconfig.
      # Pin kubectl within +/-1 minor of your cluster's control plane (skew policy).
      - uses: azure/setup-kubectl@v5
        with: { version: '${{ vars.KUBECTL_VERSION }}' }   # e.g. 'v1.33.x' for a 1.32/1.33 cluster
      - name: Configure kubeconfig
        run: aws eks update-kubeconfig --name ${{ vars.EKS_CLUSTER }} --region ${{ vars.AWS_REGION }}
      # GKE alt: google-github-actions/get-gke-credentials@v2
      # AKS alt: az aks get-credentials --resource-group RG --name CLUSTER

      - name: Roll out
        run: |
          kubectl set image deployment/${{ inputs.deployment }} \
            app=${{ inputs.image }} --namespace=${{ inputs.namespace }}
          kubectl rollout status deployment/${{ inputs.deployment }} \
            --namespace=${{ inputs.namespace }} --timeout=300s

      # Canary metric gate. The runner is OUTSIDE the cluster, so do NOT curl an
      # in-cluster `http://prometheus:9090`. Use one of:
      #   - a controller that analyzes for you (Argo Rollouts / Flagger), or
      #   - your managed/external metrics API (Datadog, Grafana Cloud, AMP), or
      #   - `kubectl port-forward` to reach in-cluster Prometheus over localhost.
      - name: Analyze canary (port-forward to in-cluster Prometheus)
        if: inputs.analyze
        run: |
          kubectl -n monitoring port-forward svc/prometheus 9090:9090 &
          PF_PID=$!; trap 'kill $PF_PID' EXIT
          for i in $(seq 1 30); do
            ERROR_RATE=$(curl -s "http://localhost:9090/api/v1/query" \
              --data-urlencode 'query=sum(rate(http_requests_total{status=~"5..",deployment="canary"}[1m])) / sum(rate(http_requests_total{deployment="canary"}[1m]))' \
              | jq -r '.data.result[0].value[1] // "0"')
            if awk "BEGIN{exit !(${ERROR_RATE:-0} > 0.05)}"; then
              echo "Canary error rate ${ERROR_RATE} exceeds 5% — rolling back"
              kubectl rollout undo deployment/${{ inputs.deployment }} --namespace=${{ inputs.namespace }}
              exit 1
            fi
            echo "Canary healthy (error rate: ${ERROR_RATE})"; sleep 10
          done

      - name: Smoke tests
        if: inputs.base-url != ''
        run: |
          curl --retry 5 --retry-all-errors --retry-delay 3 -sf "${{ inputs.base-url }}/healthz"
          npm ci && npm run test:smoke -- --base-url="${{ inputs.base-url }}"

      - name: Auto-rollback + notify on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/${{ inputs.deployment }} --namespace=${{ inputs.namespace }} || true
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"${{ inputs.environment }}/${{ inputs.deployment }} deploy failed — auto-rolled back\"}"
```

> **Prefer a progressive-delivery controller over hand-rolled canary bash.** [Argo Rollouts](https://argoproj.github.io/rollouts/) (`Rollout` CRD with `analysis` templates) and [Flagger](https://flagger.app/) automate traffic shifting, metric analysis (Prometheus/Datadog), and automatic rollback in-cluster — so your pipeline just pushes the digest and watches `kubectl argo rollouts status`. The bash gate above is the from-scratch fallback when you have no controller.

---
