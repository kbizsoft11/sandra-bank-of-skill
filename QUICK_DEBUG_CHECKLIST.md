# Quick Debug Checklist - Auth Redirect Issue

## ✅ Pre-Flight Checks

### 1. Build Status
- [ ] Run `cd client && npm run build` - Should complete with exit code 0
- [ ] Run `cd server && npm run build` - Should complete with exit code 0
- [ ] No TypeScript errors shown
- [ ] No compilation warnings about guestGuard

### 2. Files Modified
Check these files exist and have correct content:
- [ ] `client/src/app/core/guards/guest.guard.ts` - Has async guard with logging
- [ ] `client/src/app/routes/auth.routes.ts` - Has `canActivate: [guestGuard]` on login route

### 3. Browser DevTools Console

When logged in and visiting `/auth/login`, you should see:

```
👥 [GUEST GUARD] Checking route: /auth/login
👥 [GUEST GUARD] isAuthenticated: true
👥 [GUEST GUARD] Token: eyJ...
👥 [GUEST GUARD] User is authenticated, waiting for user data to load...
👥 [GUEST GUARD] User role after load: (admin|company|employee)
👥 [GUEST GUARD] ❌ Authenticated user found, redirecting to: /(admin|company|employee)/dashboard
```

- [ ] See "👥 [GUEST GUARD]" logs in console
- [ ] See "isAuthenticated: true" message
- [ ] See role is recognized (admin, company, or employee)
- [ ] See redirect message with correct dashboard path

### 4. Network Tab Check
When visiting `/auth/login` while logged in:
- [ ] Should see `/auth/me` request (user data fetch)
- [ ] `/auth/me` request returns 200 with user data
- [ ] Then automatic redirect to `/admin/dashboard` (or company/employee)
- [ ] Final request goes to dashboard route

### 5. Storage Check
DevTools → Application → Storage:
- [ ] Either localStorage OR sessionStorage has `accessToken` key
- [ ] Token value is not empty
- [ ] Token format looks like JWT (has 3 parts separated by dots)

---

## 🔧 If Console Logs NOT Showing

**Problem:** You don't see "👥 [GUEST GUARD]" logs

**Steps to Fix:**
1. Hard refresh page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Close all tabs and reopen browser
4. Check console is actually showing (F12 → Console tab)
5. Check console filter isn't hiding logs (top-left filter should show "All levels")

**If Still Not Showing:**
- Verify file was saved: `cat client/src/app/core/guards/guest.guard.ts | grep "GUEST GUARD"`
- Verify routes file has guard: `cat client/src/app/routes/auth.routes.ts | grep "guestGuard"`
- Run build again: `npm run build` from client folder

---

## 🔍 If Redirect NOT Happening

**Problem:** You can still see login page when logged in

**Steps to Debug:**

### Check 1: Token Exists
```javascript
// Paste in DevTools Console:
localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
// Should return token string (starts with eyJ...)
// If null → token not saved, check login process
```

### Check 2: Authentication Status
```javascript
// If you can inject AuthService in console:
// This is harder but shows current state
console.log('Token:', authService.token())
console.log('Authenticated:', authService.isAuthenticated())
console.log('User:', authService.user())
console.log('Role:', authService.role())
```

### Check 3: Network Request
1. Open DevTools Network tab
2. Clear network history
3. Go to `/auth/login` while logged in
4. Look for requests:
   - Should see `/auth/me` request
   - Response should be 200 with user data
   - Should NOT see error 401

### Check 4: Guard Timing
```javascript
// The guard runs BEFORE component loads
// So you might see:
// 1. Brief login component flash
// 2. Then redirect to dashboard
// This is normal - guard is working
```

---

## 🚀 Step-by-Step Test

### Test 1: Clean Login Flow
```
1. Open DevTools → Application → Storage
2. Clear All Storage
3. Navigate to http://localhost:4200/auth/login
4. Should see login page ✅
5. Login with credentials
6. Should see dashboard ✅
7. Now you're authenticated
8. Go to step Test 2
```

### Test 2: Redirect Check
```
1. You should be on dashboard (authenticated)
2. Manually type in URL: http://localhost:4200/auth/login
3. Press Enter
4. Watch browser console
5. Should see "👥 [GUEST GUARD]" logs ✅
6. Should redirect to dashboard (notice URL change) ✅
7. You should NOT see login page ✅
```

### Test 3: New Tab Check
```
1. You're logged in on one tab
2. Open NEW browser tab
3. Type: http://localhost:4200/auth/login
4. Press Enter
5. Should redirect to dashboard ✅
(This means token was saved persistently)
```

---

## 📋 If Everything Looks OK But Still Not Working

**Provide These Details:**

1. **Screenshot of console logs** when visiting /auth/login while logged in
   - Use `Ctrl+Shift+J` to open console
   - Clear console
   - Navigate to /auth/login
   - Take screenshot of console output

2. **Network tab screenshot**
   - Open Network tab
   - Clear history
   - Navigate to /auth/login while logged in
   - Take screenshot showing requests

3. **Storage screenshot**
   - DevTools → Application → Storage
   - Show localStorage and sessionStorage
   - Verify 'accessToken' key exists

4. **Browser info**
   - Browser name and version
   - Operating system
   - Whether "Remember Me" was checked

5. **URL verification**
   - What URL do you see in address bar when clicking login?
   - Does it START to redirect then go back to login?
   - Or does it not redirect at all?

---

## ✅ Final Verification Checklist

Before saying "issue not resolved", verify:

- [ ] Did you do a HARD refresh (Ctrl+Shift+R)?
- [ ] Did you clear browser storage completely?
- [ ] Did you rebuild frontend (`npm run build`)?
- [ ] Are you looking at the BUILT version, not dev server?
- [ ] Do you see "👥 [GUEST GUARD]" logs in console?
- [ ] Is the token actually in storage (localStorage or sessionStorage)?
- [ ] Did you login successfully (can you access dashboard)?
- [ ] Did you try in a NEW browser tab?
- [ ] Did you try in incognito/private mode?

If ALL of above are YES and still not working → There may be a different issue.

---

**Last Resort:**
If nothing above works, try:
```bash
# Kill dev server
# Clear node_modules
rm -rf client/node_modules
# Reinstall
npm install (in client folder)
# Rebuild
npm run build
# Restart dev server
npm start
```

This is rarely needed but clears any corrupted cache.
