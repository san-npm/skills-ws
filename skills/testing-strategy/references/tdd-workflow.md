## TDD Workflow

```
1. RED    → Write failing test that defines desired behavior
2. GREEN  → Write minimum code to pass
3. REFACTOR → Clean up, tests stay green
```

```typescript
// 1. RED
test('calculates tax for US orders', () => {
  expect(calculateTax({ subtotal: 100, region: 'US-CA' })).toBe(7.25);
});

// 2. GREEN — implement calculateTax
// 3. REFACTOR — extract tax rate lookup table
```
