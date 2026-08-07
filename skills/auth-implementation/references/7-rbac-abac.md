## Contents

- 7. RBAC & ABAC
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)

## 7. RBAC & ABAC

### Role-Based Access Control (RBAC)

```typescript
const PERMISSIONS = {
  admin: ['read', 'write', 'delete', 'manage_users', 'manage_billing'],
  editor: ['read', 'write'],
  viewer: ['read'],
} as const;

type Role = keyof typeof PERMISSIONS;
type Permission = (typeof PERMISSIONS)[Role][number];

function requirePermission(permission: Permission) {
  return (req, res, next) => {
    const userRole = req.user?.role as Role | undefined;
    const perms = (userRole && PERMISSIONS[userRole]) || [];
    if (!perms.includes(permission)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.delete('/api/posts/:id', requirePermission('delete'), deletePost);
app.get('/api/posts', requirePermission('read'), listPosts);
```

### Attribute-Based Access Control (ABAC)

```typescript
interface PolicyContext {
  user: { id: string; role: string; department: string };
  resource: { ownerId: string; type: string; status: string; department?: string };
  action: string;
}

function evaluatePolicy(ctx: PolicyContext): boolean {
  if (ctx.user.role === 'admin') return true;
  // Owners can edit their own resources
  if (ctx.action === 'edit' && ctx.resource.ownerId === ctx.user.id) return true;
  // Editors can edit published resources in their own department
  if (ctx.action === 'edit' && ctx.user.role === 'editor'
      && ctx.resource.status === 'published'
      && ctx.resource.department === ctx.user.department) return true;
  return false; // default-deny
}
```

**Default-deny** is the rule: if no policy explicitly allows the action, reject. Always enforce authorization **server-side per request** — never trust a client-sent role/permission, and re-check ownership on every mutating route (most IDOR bugs are a missing per-object check).

---
