# RLS Authentication Issues Analysis Report

## Executive Summary

This analysis found **CRITICAL RLS authentication issues** in the codebase that could cause data access failures. Several service methods are using the API key as a Bearer token instead of actual user JWT tokens, which will cause Supabase RLS policies to reject requests.

---

## Critical Findings

### 1. SELL-REQUEST SERVICE: CRITICAL MISUSE OF API KEY AS BEARER TOKEN

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/sell-request.service.ts`

#### Issue 1.1: getSellRequest() - Line 89
**Severity:** HIGH  
**Method:** GET  
**Request Type:** Single resource query  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG: Using API key instead of JWT token!
},
```

**Problem:** This method uses `Bearer ${supabaseKey}` which is incorrect. The API key should NEVER be used as a Bearer token. This will cause RLS policies checking `auth.uid` to fail because there's no valid JWT.

**Likely RLS Policy:** If this table has RLS policies checking `auth.uid == seller_id`, this will return no results even if the row matches the query.

---

#### Issue 1.2: getAllSellRequests() - Line 140
**Severity:** HIGH  
**Method:** GET  
**Request Type:** List query with filter  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG: Using API key instead of JWT token!
},
```

**Problem:** Same issue as 1.1. Public read operations that are visible to all users shouldn't use RLS authentication at all, but if they do, this will fail.

---

#### Issue 1.3: getMySellRequests() - Line 179
**Severity:** CRITICAL  
**Method:** GET  
**Request Type:** Filtered list query (filtered by seller_id)  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG: Using API key instead of JWT token!
},
```

**Problem:** This method is specifically designed to return only the current user's sell requests. Using the API key as Bearer token will cause RLS policies to fail:
- RLS policy likely checks: `auth.uid == seller_id`
- With API key as Bearer token, `auth.uid` will be undefined
- Result: Returns empty array instead of user's sell requests

**Expected Fix:** Should receive `accessToken` parameter and use actual user JWT token

---

#### Issue 1.4: getOffers() - Line 337
**Severity:** MEDIUM  
**Method:** GET  
**Request Type:** Filtered list query  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG: Using API key instead of JWT token!
},
```

**Problem:** Same as above issues. If there are RLS policies on purchase_offers table filtering by buyer/seller, this will fail.

---

#### Issue 1.5: getWonOffers() - Line 651
**Severity:** HIGH  
**Method:** GET  
**Request Type:** Filtered list query (filtered by wholesaler_id)  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG: Using API key instead of JWT token!
},
```

**Problem:** Returns offers where `is_selected=true`. If RLS policies check ownership (e.g., `auth.uid == wholesaler_id`), this will fail or return no results.

---

#### Issue 1.6: getOfferCount() - Line 552
**Severity:** MEDIUM  
**Method:** HEAD (Count query)  
**Request Type:** Count query with filter  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG!
  'Prefer': 'count=exact',
},
```

**Problem:** If the underlying collection has RLS policies, this count will be inaccurate. It might return 0 when results should exist.

---

#### Issue 1.7: getOpenSellRequestCount() - Line 601
**Severity:** MEDIUM  
**Method:** HEAD (Count query)  
**Request Type:** Count query  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG!
  'Prefer': 'count=exact',
},
```

---

#### Issue 1.8: getWonOffersCount() - Line 702
**Severity:** HIGH  
**Method:** HEAD (Count query)  
**Request Type:** Count query with owner filter  

```typescript
headers: {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,  // WRONG!
  'Prefer': 'count=exact',
},
```

**Problem:** This counts the wholesaler's won offers. With incorrect Bearer token, RLS policies won't recognize the user and will return 0.

---

### 2. TRANSACTION SERVICE: MISSING AUTHORIZATION HEADER (PARTIALLY FIXED)

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/transaction.service.ts`

#### Issue 2.1: getTransactionsByWholesaler() - Lines 96-105
**Severity:** CRITICAL  
**Method:** GET  
**Request Type:** Filtered list query (filtered by wholesaler_id)  

```typescript
const response = await fetch(
  `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?${queryParams}`,
  {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
      // MISSING: 'Authorization': `Bearer ${accessToken}`
    },
  }
);
```

**Problem:** This method queries transactions filtered by `wholesaler_id` but doesn't send the Authorization header. If RLS policies check `auth.uid == wholesaler_id`, this will return null/empty.

**Expected Fix:** This method should either:
- Accept `accessToken` parameter and add Authorization header
- OR be called only from authenticated contexts where token is available

---

#### Issue 2.2: getTransaction() - Lines 246-255
**Severity:** HIGH  
**Method:** GET  
**Request Type:** Single resource by ID  

```typescript
const response = await fetch(
  `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?id=eq.${transactionId}`,
  {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
      // MISSING: Authorization header
    },
  }
);
```

**Problem:** Same issue. If RLS policies protect transaction access, this will fail to return data even if the transaction exists.

---

### 3. PROPER USAGE (REFERENCE)

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/transaction.service.ts`

#### Good Examples (For Reference):

**createTransaction() - Lines 56-68** ✓ CORRECT
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,  // ✓ Correct: Using actual JWT token
  'apikey': supabaseKey,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
},
```

**getTransactionByOfferId() - Lines 125-140** ✓ CORRECT (With Optional Token)
```typescript
const headers: Record<string, string> = {
  'apikey': supabaseKey,
  'Content-Type': 'application/json',
};

if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;  // ✓ Correct: Conditional JWT
}
```

This is the correct pattern when token might be optional.

---

### 4. ADMIN SERVICE: RELIES ON WRAPPER FUNCTION

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/admin.service.ts`

**Status:** ✓ SAFE (Uses fetch utility wrapper)

This service uses the `get()` and `patch()` functions from `/lib/utils/fetch.ts`, which automatically handle Authorization headers. These are safe IF:
- The wrapper is used consistently
- `requireAuth: true` is set for protected operations

---

### 5. USER SERVICE: RELIES ON WRAPPER FUNCTION

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/user.service.ts`

**Status:** ✓ SAFE (Uses fetch utility wrapper)

This service also uses the fetch wrapper with `requireAuth: true` options, which is the correct pattern.

---

### 6. PRODUCT SERVICE: RELIES ON WRAPPER FUNCTION

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/product.service.ts`

**Status:** ✓ SAFE (Uses fetch utility wrapper)

Correctly uses the fetch wrapper utilities with proper auth requirements.

---

### 7. STORAGE SERVICE: CORRECTLY IMPLEMENTED

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/storage.service.ts`

**Status:** ✓ CORRECT

All methods correctly use `Authorization: Bearer ${accessToken}` with actual JWT tokens:
- uploadImage() - Line 120 ✓
- uploadImages() - Line 186 ✓
- deleteImage() - Line 247 ✓
- deleteImages() - Line 296 ✓

---

### 8. AUTH SERVICE: MIXED PATTERNS

**File:** `/Volumes/WD_BLACK/Project_doing/banana_usedcomputer_web/lib/services/auth.service.ts`

#### Issue 8.1: signUp() - Line 104
**Severity:** MEDIUM  

```typescript
'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,  // WRONG: Using API key!
```

This is during signup when user doesn't exist yet. The API key should be used, but NOT as a Bearer token. The format is wrong.

**Status:** This might work because signup endpoint might not check Bearer token format, but it's incorrect practice.

---

## Root Cause Analysis

The main issue is **mixing two authentication approaches**:

1. **Incorrect Pattern (Found):**
   ```typescript
   'Authorization': `Bearer ${supabaseKey}`  // API key as Bearer token - WRONG!
   ```

2. **Correct Pattern (Should Use):**
   ```typescript
   'Authorization': `Bearer ${accessToken}`  // User JWT token - CORRECT!
   ```

3. **Fetch Wrapper Pattern (Recommended):**
   ```typescript
   await get('/rest/v1/users', { requireAuth: true })  // Wrapper handles everything
   ```

---

## Impact Assessment

### What Will Break:

1. **getMySellRequests()** - Will return empty array for authenticated users
2. **getWonOffers()** - Will return empty array for wholesalers
3. **getTransactionsByWholesaler()** - Will return empty array
4. **getTransaction()** - Will return null even if transaction exists
5. **All count operations** - Will return 0 instead of actual counts
6. **getSellRequest()** - Might fail or return incomplete data

### Services That Are Safe:

1. ProductService - Uses wrapper correctly
2. AdminService - Uses wrapper correctly
3. UserService - Uses wrapper correctly
4. StorageService - Uses JWT tokens correctly
5. TransactionService.createTransaction - Uses JWT correctly
6. TransactionService.getTransactionByOfferId - Uses JWT correctly (when provided)

---

## Recommended Fixes

### Priority 1 - CRITICAL (Fix Immediately):

1. **sell-request.service.ts - getMySellRequests()**
   - Add `accessToken` parameter
   - Use correct Authorization header: `Bearer ${accessToken}`
   - Update all callers to pass accessToken

2. **transaction.service.ts - getTransactionsByWholesaler()**
   - Add `accessToken` parameter (optional or required)
   - Add Authorization header when token available

3. **transaction.service.ts - getTransaction()**
   - Add `accessToken` parameter
   - Add Authorization header

### Priority 2 - HIGH (Fix Next):

4. **sell-request.service.ts - getAllSellRequests()**
   - Remove the incorrect `Bearer ${supabaseKey}`
   - Either use wrapper function or pass actual JWT token

5. **sell-request.service.ts - getSellRequest()**
   - Same fix as getAllSellRequests

6. **sell-request.service.ts - getOffers()**
   - Same fix

7. **sell-request.service.ts - getWonOffers()**
   - Add `accessToken` parameter
   - Use correct Bearer token

8. **All count methods in sell-request.service.ts**
   - Fix API key Bearer token issue

### Priority 3 - MEDIUM (Cleanup):

9. **auth.service.ts - signUp()**
   - Remove `Authorization: Bearer ${SUPABASE_ANON_KEY}`
   - Auth endpoint doesn't need it

---

## Best Practices

Going Forward:

1. **Use the Fetch Wrapper:**
   ```typescript
   const data = await get('/rest/v1/users', { requireAuth: true });
   ```
   This is preferred - wrapper handles all auth automatically.

2. **For Raw Fetch - Always Use JWT:**
   ```typescript
   'Authorization': `Bearer ${accessToken}`  // Never use API key here!
   ```

3. **When Token Is Optional:**
   ```typescript
   const headers = { 'apikey': supabaseKey };
   if (accessToken) {
     headers['Authorization'] = `Bearer ${accessToken}`;
   }
   ```

4. **Never Do This:**
   ```typescript
   'Authorization': `Bearer ${supabaseKey}`  // NEVER!
   ```

---

## Testing Recommendations

1. Test getMySellRequests() with authenticated user - should return user's requests
2. Test getTransactionsByWholesaler() - should return wholesaler's transactions
3. Test getWonOffers() - should return won offers, not empty array
4. Test count operations - verify actual counts are returned
5. Verify RLS policies are properly blocking unauthorized access
6. Check browser console logs for 403 Forbidden errors (RLS violations)

---

## Summary Table

| Service | Method | Line | Issue | Severity | Status |
|---------|--------|------|-------|----------|--------|
| SellRequest | getSellRequest | 89 | Wrong Bearer token (API key) | HIGH | UNFIXED |
| SellRequest | getAllSellRequests | 140 | Wrong Bearer token (API key) | HIGH | UNFIXED |
| SellRequest | getMySellRequests | 179 | Wrong Bearer token (API key) | CRITICAL | UNFIXED |
| SellRequest | getOffers | 337 | Wrong Bearer token (API key) | MEDIUM | UNFIXED |
| SellRequest | getWonOffers | 651 | Wrong Bearer token (API key) | HIGH | UNFIXED |
| SellRequest | getOfferCount | 552 | Wrong Bearer token (API key) | MEDIUM | UNFIXED |
| SellRequest | getOpenSellRequestCount | 601 | Wrong Bearer token (API key) | MEDIUM | UNFIXED |
| SellRequest | getWonOffersCount | 702 | Wrong Bearer token (API key) | HIGH | UNFIXED |
| Transaction | getTransactionsByWholesaler | 96-105 | Missing Authorization header | CRITICAL | UNFIXED |
| Transaction | getTransaction | 246-255 | Missing Authorization header | HIGH | UNFIXED |
| Transaction | createTransaction | 56-68 | Uses correct JWT token | - | CORRECT ✓ |
| Transaction | getTransactionByOfferId | 125-140 | Uses correct JWT token (optional) | - | CORRECT ✓ |
| Auth | signUp | 104 | Uses API key as Bearer token | MEDIUM | UNFIXED |
| Admin | (all) | - | Uses wrapper function | - | SAFE ✓ |
| User | (all) | - | Uses wrapper function | - | SAFE ✓ |
| Product | (all) | - | Uses wrapper function | - | SAFE ✓ |
| Storage | (all) | - | Uses correct JWT tokens | - | CORRECT ✓ |

---

## Total Issues Found

- **CRITICAL:** 2
- **HIGH:** 7
- **MEDIUM:** 4
- **SAFE/CORRECT:** 3 services

**Total Issues to Fix:** 13

