## Contents

- Authorization: RBAC and ABAC
- Role-Based Access Control
- Attribute-Based Access Control with Casbin

## Authorization: RBAC and ABAC

### Role-Based Access Control

```typescript
// Simple RBAC middleware
type Role = 'user' | 'editor' | 'admin' | 'superadmin';

const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  editor: 1,
  admin: 2,
  superadmin: 3,
};

function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role as Role;
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Permission-based (more granular)
type Permission = 'users:read' | 'users:write' | 'users:delete' | 'posts:read' | 'posts:write';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: ['posts:read'],
  editor: ['posts:read', 'posts:write'],
  admin: ['users:read', 'users:write', 'posts:read', 'posts:write'],
  superadmin: ['users:read', 'users:write', 'users:delete', 'posts:read', 'posts:write'],
};

function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = ROLE_PERMISSIONS[req.user.role as Role] || [];
    const hasAll = permissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

app.delete('/api/users/:id', requirePermission('users:delete'), deleteUserHandler);
```

### Attribute-Based Access Control with Casbin

```typescript
import { newEnforcer } from 'casbin';

// model.conf
// [request_definition]
// r = sub, obj, act
// [policy_definition]
// p = sub, obj, act
// [role_definition]
// g = _, _
// [policy_effect]
// e = some(where (p.eft == allow))
// [matchers]
// m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act

const enforcer = await newEnforcer('model.conf', 'policy.csv');

// policy.csv:
// p, admin, /api/users, GET
// p, admin, /api/users, POST
// p, admin, /api/users, DELETE
// p, editor, /api/posts, GET
// p, editor, /api/posts, POST
// g, alice, admin
// g, bob, editor

async function casbinAuth(req: Request, res: Response, next: NextFunction) {
  const allowed = await enforcer.enforce(req.user.id, req.path, req.method);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

---
