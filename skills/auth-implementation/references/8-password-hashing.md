## 8. Password Hashing

Use a memory-hard algorithm. **`argon2id` is the OWASP first choice**; `bcrypt` is an acceptable, widely-supported fallback (note bcrypt silently truncates inputs beyond 72 bytes — pre-hash with SHA-256 if you must allow long passphrases). Never roll your own.

```javascript
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

// argon2id (recommended) — OWASP 2026 baseline params
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456,   // 19 MiB (OWASP min); raise to 46–64 MiB on capable servers
  timeCost: 2,         // iterations
  parallelism: 1,
});
const valid = await argon2.verify(hash, password);

// bcrypt fallback (cost >=12 in 2026)
const bhash = await bcrypt.hash(password, 12);
const bvalid = await bcrypt.compare(password, bhash);
```

**Never:** MD5, SHA-1, plain SHA-256/512 (fast → brute-forceable), or any unsalted/un-stretched hash for passwords. Check new passwords against a breached-password list (e.g., HIBP k-anonymity range API) and enforce a sane minimum length over arbitrary complexity rules (NIST SP 800-63B).

---
