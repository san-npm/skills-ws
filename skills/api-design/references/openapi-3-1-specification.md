## Contents

- OpenAPI 3.1 Specification
- Complete Example
- Validation Middleware from OpenAPI Spec

## OpenAPI 3.1 Specification

### Complete Example

```yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0
  description: User management API
  contact:
    email: api@example.com
  license:
    name: MIT

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

security:
  - bearerAuth: []

paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      tags: [Users]
      parameters:
        - name: cursor
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, suspended]
        - name: sort
          in: query
          schema:
            type: string
            default: -created_at
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                type: object
                required: [data, pagination]
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/CursorPagination'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimited'

    post:
      operationId: createUser
      summary: Create user
      tags: [Users]
      parameters:
        - name: Idempotency-Key
          in: header
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/User'
        '422':
          $ref: '#/components/responses/ValidationError'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    User:
      type: object
      required: [id, email, name, status, created_at]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        status:
          type: string
          enum: [active, inactive, suspended]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    CreateUserRequest:
      type: object
      required: [email, name]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        role:
          type: string
          enum: [user, admin]
          default: user

    CursorPagination:
      type: object
      properties:
        next_cursor:
          type: [string, "null"]
        has_more:
          type: boolean

    ProblemDetail:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri
        title:
          type: string
        status:
          type: integer
        detail:
          type: string
        code:
          type: string
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
              code:
                type: string

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
        RateLimit-Limit:        # IETF draft rate-limit headers (draft-ietf-httpapi-ratelimit-headers)
          schema:
            type: integer
        RateLimit-Remaining:
          schema:
            type: integer
        RateLimit-Reset:        # seconds until reset (delta), not epoch
          schema:
            type: integer
        X-RateLimit-Limit:      # legacy, optional
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
```

### Validation Middleware from OpenAPI Spec

```typescript
import { OpenApiValidator } from 'express-openapi-validator';

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true,
    validateResponses: process.env.NODE_ENV !== 'production',  // Dev only
    validateSecurity: false,  // Handle auth separately
  }),
);
```

---
