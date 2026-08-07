## 5. CI/CD — GitHub Actions to ECS

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS
on:
  push:
    branches: [main]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        # Use a current LTS. Node 24 is Active LTS (through Oct 2026); Node 22
        # moved to Maintenance LTS in Oct 2025 (security fixes to Apr 2027);
        # Node 20 is end of life (Apr 2026), do not use. Match this to the
        # runtime in your Dockerfile.
        with: { node-version: 24, cache: npm }
      - run: npm ci && npm test && npm run lint && npm run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7

      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-deploy
          aws-region: us-east-1

      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr

      - name: Build and push
        id: build
        env:
          ECR_REGISTRY: ${{ steps.ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build --cache-from $ECR_REGISTRY/myapp:latest \
            -t $ECR_REGISTRY/myapp:$IMAGE_TAG -t $ECR_REGISTRY/myapp:latest .
          docker push $ECR_REGISTRY/myapp:$IMAGE_TAG
          docker push $ECR_REGISTRY/myapp:latest
          echo "image=$ECR_REGISTRY/myapp:$IMAGE_TAG" >> $GITHUB_OUTPUT

      # Requires a `myapp-production-migrate` task definition with a `migrate`
      # container that has DATABASE_URL injected as an ECS secret (valueFrom the
      # same Secrets Manager secret as the app) and the SAME task/execution roles
      # as the app. Register it in Terraform (a second aws_ecs_task_definition with
      # the migrate command), or reuse the app task def and only override the
      # command as below. SUBNETS/SG secrets must each be a JSON-array-safe,
      # COMMA-separated list with NO spaces, e.g. subnet-aaa,subnet-bbb — the CLI
      # parses subnets=[a,b]. Quote them if a single value to avoid shell globbing.
      - name: Run migrations
        env:
          # comma-separated, no spaces: "subnet-aaa,subnet-bbb,subnet-ccc"
          SUBNETS: ${{ secrets.PRIVATE_SUBNET_IDS }}
          SG: ${{ secrets.ECS_SECURITY_GROUP_ID }}
        run: |
          set -euo pipefail
          NETCFG="awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SG}],assignPublicIp=DISABLED}"
          TASK_ARN=$(aws ecs run-task --cluster myapp-production \
            --task-definition myapp-production-migrate --launch-type FARGATE \
            --network-configuration "$NETCFG" \
            --overrides '{"containerOverrides":[{"name":"migrate","command":["npx","prisma","migrate","deploy"]}]}' \
            --query 'tasks[0].taskArn' --output text)
          aws ecs wait tasks-stopped --cluster myapp-production --tasks "$TASK_ARN"
          EXIT=$(aws ecs describe-tasks --cluster myapp-production --tasks "$TASK_ARN" \
            --query 'tasks[0].containers[?name==`migrate`].exitCode | [0]' --output text)
          [ "$EXIT" = "0" ] || { echo "migration exited $EXIT"; exit 1; }

      # Register the new task-definition revision (shared by both deploy styles).
      - name: Register task definition
        id: taskdef
        run: |
          set -euo pipefail
          TASK_DEF=$(aws ecs describe-task-definition --task-definition myapp-production --query 'taskDefinition')
          NEW_DEF=$(echo "$TASK_DEF" | jq --arg IMG "${{ steps.build.outputs.image }}" \
            '.containerDefinitions[0].image = $IMG | del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)')
          NEW_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_DEF" --query 'taskDefinition.taskDefinitionArn' --output text)
          echo "arn=$NEW_ARN" >> "$GITHUB_OUTPUT"

      # --- Deploy variant A: CodeDeploy blue/green (matches section 2a) ---
      # update-service is REJECTED on a CODE_DEPLOY-controlled service, so drive
      # the deploy through CodeDeploy with an AppSpec that names the new revision.
      - name: Deploy (CodeDeploy blue/green)
        run: |
          set -euo pipefail
          APPSPEC=$(jq -n --arg TD "${{ steps.taskdef.outputs.arn }}" '{
            version: "0.0",
            Resources: [{ TargetService: { Type: "AWS::ECS::Service", Properties: {
              TaskDefinition: $TD,
              LoadBalancerInfo: { ContainerName: "app", ContainerPort: 3000 }
            }}}]
          }')
          DEP_ID=$(aws deploy create-deployment \
            --application-name myapp-production \
            --deployment-group-name myapp-production \
            --revision "revisionType=AppSpecContent,appSpecContent={content='$APPSPEC'}" \
            --query 'deploymentId' --output text)
          aws deploy wait deployment-successful --deployment-id "$DEP_ID"

      # --- Deploy variant B: ECS rolling (use INSTEAD of A if you chose 2b) ---
      # - name: Deploy (ECS rolling)
      #   run: |
      #     aws ecs update-service --cluster myapp-production --service myapp-production \
      #       --task-definition ${{ steps.taskdef.outputs.arn }} --force-new-deployment
      #     aws ecs wait services-stable --cluster myapp-production --services myapp-production

      - name: Verify
        run: |
          set -euo pipefail
          for i in {1..5}; do
            [ "$(curl -so /dev/null -w '%{http_code}' https://api.example.com/health)" = "200" ] && break
            [ "$i" = "5" ] && { echo "health check never returned 200"; exit 1; }
            sleep 2
          done
```

---
