## Contents

- API Versioning
- URL Versioning (Preferred for Public APIs)
- Header Versioning (Alternative)
- Deprecation Strategy
- Versioning Timeline

## API Versioning

### URL Versioning (Preferred for Public APIs)

```
/api/v1/users
/api/v2/users
```

Simple, explicit, easy to route. The pragmatic choice.

### Header Versioning (Alternative)

```
Accept: application/vnd.myapi.v2+json
```

More "RESTful" but harder to test (can't just paste a URL).

### Deprecation Strategy

```typescript
// middleware/deprecation.ts
function deprecationWarning(sunset: string, alternative: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // RFC 9745: the value is a structured-field Date (@unix-timestamp), not a
    // boolean. Using the sunset date satisfies RFC 9745's rule that Sunset must
    // not be earlier than Deprecation; pass a separate deprecation date if the
    // API was deprecated before the sunset.
    res.setHeader('Deprecation', `@${Math.floor(new Date(sunset).getTime() / 1000)}`);
    res.setHeader('Sunset', sunset);  // RFC 8594
    res.setHeader('Link', `<${alternative}>; rel="successor-version"`);
    next();
  };
}

// Usage: Sunset must be an HTTP-date (RFC 8594 / RFC 9110), in the future
app.get('/api/v1/users',
  deprecationWarning('Wed, 01 Jul 2026 00:00:00 GMT', '/api/v2/users'),
  v1UserHandler,
);
```

### Versioning Timeline

```
v1 released → v2 released → v1 deprecated (6 month warning) → v1 sunset (returns 410 Gone)
```

---
