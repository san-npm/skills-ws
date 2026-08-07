## Contents

- 4. Tool Schema Design (JSON Schema)
- Schema Best Practices

## 4. Tool Schema Design (JSON Schema)

Every MCP tool declares its input via JSON Schema. The Zod-based approach in TS auto-generates this, but understand the underlying schema:

```json
{
  "name": "screenshot",
  "description": "Capture a screenshot of a webpage. Returns a PNG image.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "format": "uri",
        "description": "Full URL to capture (must include https://)"
      },
      "width": {
        "type": "integer",
        "minimum": 320,
        "maximum": 3840,
        "default": 1280,
        "description": "Viewport width in pixels"
      },
      "height": {
        "type": "integer",
        "minimum": 240,
        "maximum": 2160,
        "default": 720,
        "description": "Viewport height in pixels"
      },
      "fullPage": {
        "type": "boolean",
        "default": false,
        "description": "Whether to capture the full scrollable page"
      },
      "format": {
        "type": "string",
        "enum": ["png", "jpeg", "webp"],
        "default": "png",
        "description": "Output image format"
      }
    },
    "required": ["url"],
    "additionalProperties": false
  }
}
```

### Schema Best Practices

1. **Always include `description`** on every property — LLMs use these to decide parameter values
2. **Use `enum` for constrained choices** — prevents hallucinated values
3. **Set sensible `default` values** — reduces required params, better UX
4. **Use `format` hints** — `"uri"`, `"email"`, `"date-time"` help validation
5. **Mark `additionalProperties: false`** — strict schema prevents junk input
6. **Keep tool count < 20** — too many tools confuse model selection; split into multiple servers if needed

---
