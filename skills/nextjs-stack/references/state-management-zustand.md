## State Management (Zustand)

```typescript
// src/hooks/use-store.ts
import { create } from 'zustand';
interface AppStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
export const useStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

**Rule:** Use Server Components for server data. Zustand for client-only UI state (modals, sidebars, filters). Don't sync server data into Zustand.
