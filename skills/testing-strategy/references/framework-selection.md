## Framework Selection

| Framework | Best for | Watch mode | ESM | Speed |
|-----------|----------|------------|-----|-------|
| **Vitest** | Vite/modern projects | ✅ native | ✅ | Fastest |
| **Jest** | Legacy/React projects | ✅ | ⚠️ config | Fast |
| **Playwright** | E2E, cross-browser | N/A | ✅ | Medium |
| **Cypress** | E2E, component testing | ✅ | ⚠️ | Slower |

**Default recommendation:** Vitest for unit/integration, Playwright for E2E.
