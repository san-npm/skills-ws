## Architecture Overview

```
                    ┌─────────────┐
                    │  Route 53   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ CloudFront  │──── S3 (static assets)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     ALB     │  (public subnets)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
         │ECS Task│  │ECS Task│  │ECS Task│  (private subnets)
         └────┬───┘  └────┬───┘  └────┬───┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │   RDS       │  (isolated subnets)
                    │  Primary +  │
                    │  Read Replica│
                    └─────────────┘
```

---
