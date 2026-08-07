## 5. Passport.js Strategies

`Invalid email` vs `Invalid password` are different responses, which lets an attacker enumerate accounts. **Return one generic message** and run the password compare even when the user is missing (constant-ish work) so timing doesn't leak existence either.

```javascript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import argon2 from 'argon2';

// A precomputed dummy argon2 hash so we do equivalent work when the user doesn't exist.
const DUMMY_HASH = process.env.DUMMY_ARGON2_HASH; // generate once: argon2.hash('not-a-real-password')

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    const user = await db.findUserByEmail(String(email).trim().toLowerCase());
    const hash = user?.hashedPassword ?? DUMMY_HASH;
    const valid = await argon2.verify(hash, password).catch(() => false);
    if (!user || !valid) {
      return done(null, false, { message: 'Invalid credentials' }); // generic; no enumeration
    }
    return done(null, user);
  }
));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value;
  let user = await db.findUserByGoogleId(profile.id);
  if (!user) {
    user = await db.createUser({ googleId: profile.id, email, name: profile.displayName });
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => done(null, await db.findUserById(id)));
```

Also add **account lockout / progressive delay** after repeated failures (see §10 rate limiting) and **audit-log** auth events (login success/failure, password change, MFA enrollment) with user id, IP, and timestamp.

---
