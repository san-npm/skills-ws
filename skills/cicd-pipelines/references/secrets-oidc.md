## Secrets & OIDC

Prefer **OIDC over long-lived static cloud keys**: the workflow mints a short-lived token at runtime, so there is no secret to leak or rotate. `id-token: write` is required for OIDC and must be granted explicitly (it is *not* in the `contents: read` default).

```yaml
# Repository / org secrets (Settings -> Secrets and variables -> Actions)
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

jobs:
  # Environment-scoped secrets + manual gate. Secrets here are isolated from CI jobs.
  deploy:
    environment: production        # add "Required reviewers" + secrets on this environment
    permissions:
      id-token: write              # mint the OIDC token
      contents: read
    steps:
      # OIDC — no stored cloud keys. Configure the trust policy on the cloud side
      # to only accept tokens from THIS repo + ref (and ideally THIS environment).
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy
          aws-region: us-east-1
      - run: ./deploy.sh
```

**Trust-policy scoping (do this — a wildcard `repo:*` subject is a takeover risk):**

```jsonc
// AWS IAM trust policy condition — bind to exactly your repo, ref, and environment
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:environment:production"
  }
}
```

**Secret rules:**
- Never `echo`/`print` a secret; GitHub masks known values but interpolation can defeat masking.
- Never pass secrets into actions triggered by `pull_request` from forks (use `pull_request_target` only with extreme care — it runs with write scope against untrusted code).
- Prefer the auto-provisioned `GITHUB_TOKEN` (scoped, short-lived) over a PAT. If you need a PAT, use a fine-grained token with minimal repo/permission scope and a short expiry.
- Rotate any unavoidable static credential on a schedule and alert on use from unexpected IPs (`step-security/harden-runner@v2` can enforce egress allowlists).
