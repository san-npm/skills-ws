## Contents

- 10. MarkdownV2 Escaping <a name="markdownv2-escaping"></a>
- Characters That Must Be Escaped
- Escape Function
- Common Patterns

## 10. MarkdownV2 Escaping <a name="markdownv2-escaping"></a>

Telegram's MarkdownV2 requires escaping special characters. Get this wrong and your messages fail silently or look broken.

### Characters That Must Be Escaped

```
_ * [ ] ( ) ~ ` > # + - = | { } . !
```

### Escape Function

```ts
// src/lib/telegram-utils.ts

/**
 * Escape a string for Telegram MarkdownV2.
 * Use this for ANY user-generated or dynamic text inserted into MarkdownV2 messages.
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Escape text for use inside a MarkdownV2 code block (`` ` `` or ``` ``` ```).
 * Only ` and \ need escaping inside code blocks.
 */
export function escapeMarkdownV2Code(text: string): string {
  return text.replace(/([`\\])/g, "\\$1");
}

/**
 * Escape text for use inside a MarkdownV2 link URL.
 * Only ) and \ need escaping inside (...) of links.
 */
export function escapeMarkdownV2Url(url: string): string {
  return url.replace(/([)\\])/g, "\\$1");
}

// --- Usage examples ---

// Simple message with dynamic content
const username = "John_Doe";
const msg = `Hello, *${escapeMarkdownV2(username)}*\\!`;
// Result: "Hello, *John\_Doe*\!"

// Link with dynamic URL
const title = "My Page (v2)";
const url = "https://example.com/page?a=1&b=2";
const linkMsg = `[${escapeMarkdownV2(title)}](${escapeMarkdownV2Url(url)})`;

// Code block
const code = "const x = `hello`";
const codeMsg = `\`\`\`js\n${escapeMarkdownV2Code(code)}\n\`\`\``;
```

### Common Patterns

```ts
// Bold text with dynamic content
`*${escapeMarkdownV2(product.title)}*`

// Italic
`_${escapeMarkdownV2(text)}_`

// Strikethrough
`~${escapeMarkdownV2(text)}~`

// Inline code
`\`${escapeMarkdownV2Code(text)}\``

// Spoiler
`||${escapeMarkdownV2(text)}||`

// ⚠️ WRONG — will break if text contains special chars:
`*${product.title}*`

// ✅ CORRECT:
`*${escapeMarkdownV2(product.title)}*`
```

---
