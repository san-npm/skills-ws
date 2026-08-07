## Contents

- Contract Testing
- Pact for Microservices
- Provider Verification

## Contract Testing

### Pact for Microservices

Consumer-driven contracts: the consumer defines what it needs, the provider verifies it can deliver.

> **Version-sensitive.** The `PactV4`/`MatchersV3` API below targets `@pact-foundation/pact` v12-v17. Pin the version (`npm i -D @pact-foundation/pact@^17`, requires Node 22+; use `@^15` on older Node) and check the [pact-js docs](https://github.com/pact-foundation/pact-js) before copying: the builder API has changed across majors (older code used `Pact`/`Matchers` and an `.addInteraction({...})` object form). If versions don't match, the `.withRequest(method, path)` and callback-`builder` signatures will differ.

```typescript
// consumer.pact.spec.ts — consumer side (@pact-foundation/pact v12+)
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike, string } = MatchersV3;

const provider = new PactV4({
  consumer: 'OrderService',
  provider: 'UserService',
});

test('get user by ID', async () => {
  await provider
    .addInteraction()
    .given('user 123 exists')
    .uponReceiving('a request for user 123')
    .withRequest('GET', '/api/users/123')
    .willRespondWith(200, (builder) => {
      builder
        .headers({ 'Content-Type': 'application/json' })
        .jsonBody({
          id: like(123),
          email: string('user@example.com'),
          orders: eachLike({ id: like(1), total: like(99.99) }),
        });
    })
    .executeTest(async (mockServer) => {
      const client = new UserClient(mockServer.url);
      const user = await client.getUser(123);
      expect(user.email).toBeDefined();
      expect(user.orders.length).toBeGreaterThan(0);
    });
});
```

### Provider Verification

```typescript
// provider.pact.spec.ts — provider side
import { Verifier } from '@pact-foundation/pact';

test('UserService satisfies OrderService contract', async () => {
  await new Verifier({
    providerBaseUrl: 'http://localhost:3001',
    pactBrokerUrl: process.env.PACT_BROKER_URL,
    provider: 'UserService',
    providerVersion: process.env.GIT_SHA,
    publishVerificationResult: true,
    stateHandlers: {
      'user 123 exists': async () => {
        await db.insert(users).values({ id: 123, email: 'user@example.com' });
      },
    },
  }).verifyProvider();
});
```

```bash
# Publish pacts to broker
npx pact-broker publish ./pacts --consumer-app-version=$GIT_SHA --broker-base-url=$PACT_BROKER_URL
# can-i-deploy check before releasing
npx pact-broker can-i-deploy --pacticipant=UserService --version=$GIT_SHA --to-environment=production
```
