## 8. CDK Alternative

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';

export class ProductionStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3, natGateways: 3,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 20 },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 20 },
        { name: 'Isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 20 },
      ],
    });

    const db = new rds.DatabaseCluster(this, 'Database', {
      // CDK v2. The AuroraPostgresEngineVersion enum often lags AWS's released
      // minors, so prefer `.of()` with an explicit supported version (see the
      // RDS module note in section 3). Use `VER_16_x`/`VER_17_x` if present in
      // your aws-cdk-lib version.
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.of('16.8', '16'),
      }),
      serverlessV2MinCapacity: 2, serverlessV2MaxCapacity: 16,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      readers: [rds.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true })],
      vpc, vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      backup: { retention: cdk.Duration.days(35) },
      deletionProtection: true, storageEncrypted: true,
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      vpc, taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cpu: 512, memoryLimitMiB: 1024, desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('.'),
        containerPort: 3000,
        secrets: { DATABASE_URL: ecs.Secret.fromSecretsManager(db.secret!, 'url') },
        environment: { NODE_ENV: 'production' },
      },
      circuitBreaker: { rollback: true },
    });

    const scaling = service.service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 10 });
    scaling.scaleOnCpuUtilization('Cpu', { targetUtilizationPercent: 65 });
    scaling.scaleOnRequestCount('Req', { requestsPerTarget: 1000, targetGroup: service.targetGroup });
    db.connections.allowDefaultPortFrom(service.service);
  }
}
```

---
