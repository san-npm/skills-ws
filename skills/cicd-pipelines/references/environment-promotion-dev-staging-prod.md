## Environment Promotion (dev → staging → prod)

```yaml
# Trigger chain: push to main → dev → staging (auto) → prod (manual approval)
deploy-dev:
  if: github.ref == 'refs/heads/main'
  environment: dev
  permissions: { id-token: write, contents: read }

deploy-staging:
  needs: deploy-dev
  environment: staging
  permissions: { id-token: write, contents: read }

deploy-prod:
  needs: deploy-staging
  environment: production   # set "Required reviewers" + a wait timer on this environment
  permissions: { id-token: write, contents: read }
```
