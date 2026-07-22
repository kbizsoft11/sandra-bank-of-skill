# Debug Auth Redirect Issue - Step by Step

## 🔍 Complete Diagnosis Process

### Step 1: Check if You're Actually Logged In

**Open browser console (F12 → Console tab) and paste:**

```javascript
// Check if token exists in storage
const localToken = localStorage.getItem('accessToken');
const sessionToken = sessionStorage.getItem('accessToken');

console.log('localStorage.accessToken:', localToken ? 'EXISTS' : 'EMPTY');
console.log('sessionStorage.accessToken:', sessionToken ? 'EXISTS' : 'EMPTY');
console.log('Token value:', localToken || sessionToken);
```

**What to expect:**
- If you just logged in with "Remember Me" checked:
  - Should see: `localStorage.accessToken: EXISTS`
  - Should see a token starting with `eyJ`
  
- If you just logged in WITHOUT "Remember Me":
  - Should see: `sessionStorage.accessToken: EXISTS`
  - Should see a token starting with `eyJ`

- If you see EMPTY for both:
  - **Problem:** You're not actually logged in
  - **Solution:** Go back and login properly

---

### Step 2: Verify Guard is Running

**Still in console, navigate to login page:**

```javascript
// Step 1: Clear console (Ctrl+L or click clear icon)
// Step 2: Copy & paste this:
window.location.href = '/auth/login';
```

**Then immediately look at console**

**What to expect:**
You should see logs like:
```
👥 [GUEST GUARD] Checking route: /auth/login
👥 [GUEST GUARD] isAuthenticated: true
👥 [GUEST GUARD] Token: eyJ...
```

**If you DON'T see any logs:**
- The guard is NOT running
- This means `canActivate: [guestGuard]` is not in the routes
- **Problem:** auth.routes.ts not updated
- **Fix:** Check `client/src/app/routes/auth.routes.ts` line 25 should have `canActivate: [guestGuard],`

---

### Step 3: Check What the Guard Sees

**After navigating in Step 2, look for these logs:**

```
👥 [GUEST GUARD] isAuthenticated: true/false
👥 [GUEST GUARD] Token: (token string or null)
```

**If `isAuthenticated: false` but token EXISTS in storage:**
- **Problem:** Token isn't being read from storage
- **Reason:** AuthService constructor didn't run properly
- **Fix:** Hard refresh (Ctrl+Shift+R) and try again

**If `isAuthenticated: true` but you DON'T see redirect logs:**
- **Problem:** Guard is waiting for user role but gets stuck
- **Look for:** `👥 [GUEST GUARD] User role after load:`
- **If missing:** User role isn't loading
- **Check:** Look for `👤 [AUTH SERVICE]` logs

---

### Step 4: Check User Role Loading

**In console, look for auth service logs:**

```
👤 [AUTH SERVICE] Constructor called
👤 [AUTH SERVICE] Token exists: true/false
👤 [AUTH SERVICE] Token exists but no user, loading...
```

**Then look for these logs (might take a moment):**

```
👤 [AUTH SERVICE] ✅ User loaded successfully: {...}
```

**If you see error instead:**

```
👤 [AUTH SERVICE] ❌ Error loading user: {...}
```

- **Problem:** Backend rejected the token
- **Reason:** Token is expired or invalid
- **Fix:** Logout completely and login again
  - Clear storage: `localStorage.clear(); sessionStorage.clear();`
  - Refresh page
  - Login again

---

### Step 5: Complete Guard Redirect Check

**Look for the FINAL guard logs:**

```
👥 [GUEST GUARD] User role after load: admin
👥 [GUEST GUARD] ❌ Authenticated user found, redirecting to: /admin/dashboard
```

**If you see these:**
- Guard IS working ✅
- Browser SHOULD redirect
- If NOT redirecting → Browser issue or cache problem

**If you see:**

```
👥 [GUEST GUARD] User role after load: undefined
👥 [GUEST GUARD] ⚠️ No role found for authenticated user, denying access
```

- **Problem:** User role couldn't be determined
- **Reason:** API didn't return user role
- **Fix:** Check backend `/auth/me` endpoint returns role in response

---

## 🚀 Step-by-Step Test with Full Instructions

### Test A: Initial Login (From Scratch)

**Prerequisites:** Browser with cleared storage

```
1. Open DevTools (F12)
2. Go to Storage tab
3. Clear all storage
4. Refresh page
5. Go to http://localhost:4200/auth/login
6. Should see login page ✅
7. Enter credentials
8. Click login
9. Should see dashboard ✅
10. Note: Now you're authenticated ✅
```

### Test B: Navigation After Login

**Prerequisites:** You just completed Test A

```
1. You should be on dashboard
2. Open Console tab (F12)
3. Clear console (Ctrl+L)
4. Manually type in address bar: http://localhost:4200/auth/login
5. Press Enter
6. Watch console
7. Should see these logs appear:
   - 👥 [GUEST GUARD] Checking route: /auth/login
   - 👥 [GUEST GUARD] isAuthenticated: true
   - 👥 [GUEST GUARD] User role after load: (admin/company/employee)
   - 👥 [GUEST GUARD] ❌ Authenticated user found, redirecting to: /(admin|company|employee)/dashboard
8. Browser URL should change to dashboard URL ✅
9. Page should show dashboard ✅
```

**If Step 7 doesn't show those logs:**
- Go back to "Step 2: Verify Guard is Running"

---

## 🔧 Common Issues & Exact Fixes

### Issue 1: Login page still appears after authentication

**Diagnosis:**
1. Copy-paste from "Step 1" - check token in storage
2. Copy-paste from "Step 2" - check guard logs

**If token EXISTS but guard doesn't redirect:**
- Hard refresh: `Ctrl+Shift+R`
- Clear cache: DevTools → Network → Disable cache (check box)
- Try again

**If token DOESN'T exist:**
- You're not actually logged in
- Login process failed
- Try: `localStorage.clear(); sessionStorage.clear();` then login again

### Issue 2: Logs don't show in console

**Solution:**
```
1. F12 → Console
2. Filter dropdown (top left) → set to "All levels"
3. Make sure "Preserve log" is checked
4. Refresh page
5. Look again
```

### Issue 3: Redirect happens briefly then goes back to login

**Diagnosis:**
- Token is invalid/expired
- Backend `/auth/me` returning error

**Fix:**
```javascript
// In console:
localStorage.clear();
sessionStorage.clear();
window.location.href = '/auth/login';
// Login again fresh
```

### Issue 4: Different behavior each time

**Cause:** Browser cache inconsistency

**Fix:**
1. DevTools → Network tab
2. Check "Disable cache"
3. Refresh page
4. Hard refresh: Ctrl+Shift+R
5. Close DevTools
6. Try again

---

## 📋 Exact Expected Behavior

### When NOT logged in visiting /auth/login:
```
✅ See login page
✅ Can enter credentials  
✅ Can click login button
No redirect should happen
```

**Console logs:**
```
👥 [GUEST GUARD] Checking route: /auth/login
👥 [GUEST GUARD] isAuthenticated: false
👥 [GUEST GUARD] ✅ Not authenticated, allowing access to login page
```

### When LOGGED IN visiting /auth/login:
```
✅ Browser redirects (URL changes in address bar)
✅ See dashboard instead of login
❌ NOT allowed to see login page
Redirect should happen automatically
```

**Console logs:**
```
👥 [GUEST GUARD] Checking route: /auth/login
👥 [GUEST GUARD] isAuthenticated: true
👥 [GUEST GUARD] Token: eyJ...
👥 [GUEST GUARD] User is authenticated, waiting for user data to load...
👤 [AUTH SERVICE] ✅ User loaded successfully: {_id: "...", role: "admin", ...}
👥 [GUEST GUARD] User role after load: admin
👥 [GUEST GUARD] ❌ Authenticated user found, redirecting to: /admin/dashboard
```

---

## 📝 Screenshot Checklist

If none of the above works, take these screenshots and provide them:

1. **Screenshot of console when NOT logged in, visiting /auth/login**
   - Take screenshot
   - Save as: `not_logged_in_console.png`

2. **Screenshot of console when LOGGED IN, visiting /auth/login**
   - Login first
   - Go to /auth/login
   - Take screenshot of console
   - Save as: `logged_in_console.png`

3. **Screenshot of Storage/DevTools**
   - DevTools → Application → Storage
   - Show localStorage and sessionStorage
   - Save as: `storage_screenshot.png`

4. **What URL do you end up on?**
   - If redirect works: `/admin/dashboard` ✅
   - If doesn't work: `/auth/login` ❌
   - Take screenshot and note

---

## 🎯 Final Verification

Before declaring the issue exists, verify ALL of these:

- [ ] Hard refreshed page (Ctrl+Shift+R) - YES
- [ ] Cleared browser cache - YES
- [ ] Cleared storage (localStorage and sessionStorage) - YES
- [ ] Logged in successfully (can access dashboard) - YES
- [ ] Can see token in storage (localStorage or sessionStorage has 'accessToken') - YES
- [ ] Manually typed /auth/login in address bar - YES
- [ ] Waited 2 seconds for redirect - YES
- [ ] Checked console for "👥 [GUEST GUARD]" logs - YES
- [ ] Verified logs show "isAuthenticated: true" - YES

If ALL are YES and you STILL see login page → Follow "📝 Screenshot Checklist" section

---

## 🆘 If Everything Still Fails

Provide this info:

1. **Console output** (copy-paste the text, not screenshot)
2. **Storage screenshot** showing if token exists
3. **What you see** when visiting /auth/login while logged in
4. **Browser type** (Chrome, Firefox, Safari, Edge)
5. **OS** (Windows, Mac, Linux)
6. **Did you:**
   - [ ] Run `npm run build` in client folder?
   - [ ] Restart dev server?
   - [ ] Clear npm cache (`npm cache clean --force`)?
   - [ ] Delete node_modules and reinstall?

---

**Version:** 1.0
**Last Updated:** July 21, 2026
