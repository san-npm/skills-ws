## Contents

- Error Handling: RFC 9457 Problem Details
- Standard Error Response
- Error Handler Middleware
- Usage
- Error Response Examples

## Error Handling: RFC 9457 Problem Details

RFC 9457 (2023) obsoletes RFC 7807 — the wire format is unchanged, so the
object is still universally called "Problem Details" and uses the same
`application/problem+json` media type. Set that content type on error
responses so generic clients and gateways can parse them:

```typescript
res.type('application/problem+json');
```

### Standard Error Response

```typescript
// types/error.ts
interface ProblemDetail {
  type: string;          // URI reference identifying the error type
  title: string;         // Human-readable summary
  status: number;        // HTTP status code
  detail?: string;       // Human-readable explanation specific to this occurrence
  instance?: string;     // URI reference identifying this specific occurrence
  // Extensions
  errors?: FieldError[]; // Field-level validation errors
  code?: string;         // Machine-readable error code
  traceId?: string;      // For debugging
}

interface FieldError {
  field: string;
  message: string;
  code: string;
}
```

### Error Handler Middleware

```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public errors?: FieldError[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific error classes
class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'RESOURCE_NOT_FOUND', `${resource} with id '${id}' not found`);
  }
}

class ValidationError extends AppError {
  constructor(errors: FieldError[]) {
    super(422, 'VALIDATION_ERROR', 'Request validation failed', errors);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMITED', `Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}

// The error handler
function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      type: `https://api.example.com/errors/${err.code.toLowerCase()}`,
      title: err.code.replace(/_/g, ' ').toLowerCase(),
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      code: err.code,
      errors: err.errors,
      traceId: requestId,
    });
  }

  // Unexpected errors — log full details, return generic message
  req.log?.error({ err }, 'Unhandled error');

  res.status(500).json({
    type: 'https://api.example.com/errors/internal',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.originalUrl,
    code: 'INTERNAL_ERROR',
    traceId: requestId,
  });
}

app.use(errorHandler);
```

### Usage

```typescript
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) throw new NotFoundError('User', req.params.id);
  res.json({ data: user });
});

app.post('/api/v1/users', async (req, res) => {
  const errors: FieldError[] = [];
  if (!req.body.email) errors.push({ field: 'email', message: 'Email is required', code: 'REQUIRED' });
  if (!req.body.name) errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' });
  if (errors.length) throw new ValidationError(errors);

  const existing = await db.findUserByEmail(req.body.email);
  if (existing) throw new ConflictError('A user with this email already exists');

  const user = await db.createUser(req.body);
  res.status(201).json({ data: user });
});
```

### Error Response Examples

`404 Not Found`:

```json
{
  "type": "https://api.example.com/errors/resource_not_found",
  "title": "resource not found",
  "status": 404,
  "detail": "User with id 'abc-123' not found",
  "instance": "/api/v1/users/abc-123",
  "code": "RESOURCE_NOT_FOUND",
  "traceId": "req-xyz-789"
}
```

`422 Unprocessable Entity` with field-level errors:

```json
{
  "type": "https://api.example.com/errors/validation_error",
  "title": "validation error",
  "status": 422,
  "detail": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Must be a valid email address", "code": "INVALID_FORMAT" },
    { "field": "age", "message": "Must be at least 18", "code": "MIN_VALUE" }
  ]
}
```

---
