## Mocking Patterns

```typescript
// ✅ Dependency injection (preferred)
function createOrderService(paymentGateway: PaymentGateway) {
  return { checkout: async (order) => paymentGateway.charge(order.total) };
}
test('charges payment', async () => {
  const mockGateway = { charge: vi.fn().mockResolvedValue({ success: true }) };
  const service = createOrderService(mockGateway);
  await service.checkout({ total: 50 });
  expect(mockGateway.charge).toHaveBeenCalledWith(50);
});

// ⚠️ Module mocking (use sparingly)
vi.mock('./payment', () => ({ charge: vi.fn() }));

// ❌ Avoid: mocking what you don't own (mock adapters instead)
```

**Mock hierarchy:** Spies → Stubs → Fakes → Full mocks. Use the lightest option.
