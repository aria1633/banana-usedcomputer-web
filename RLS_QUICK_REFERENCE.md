# RLS Issues - Quick Reference Card

## The One-Line Problem
**Using API key as Bearer token breaks RLS policies** because RLS checks `auth.uid` (only in JWT), not the API key.

---

## What's Wrong (Found 8+ times)
```typescript
'Authorization': `Bearer ${supabaseKey}`  // WRONG! API key is not a JWT
```

## What's Correct
```typescript
'Authorization': `Bearer ${accessToken}`  // RIGHT! JWT has auth.uid
```

---

## Files with Issues

| File | Issues | Priority |
|------|--------|----------|
| `lib/services/sell-request.service.ts` | 8 | P1 (3), P2 (5) |
| `lib/services/transaction.service.ts` | 2 | P1 (2) |
| `lib/services/auth.service.ts` | 1 | P3 |
| `lib/services/admin.service.ts` | 0 | SAFE ✓ |
| `lib/services/user.service.ts` | 0 | SAFE ✓ |
| `lib/services/product.service.ts` | 0 | SAFE ✓ |
| `lib/services/storage.service.ts` | 0 | CORRECT ✓ |

---

## Critical Methods to Fix (P1)

### 1. SellRequest.getMySellRequests() - Line 179
```typescript
// BROKEN
static async getMySellRequests(userId: string): Promise<SellRequest[]> {
  // Uses: 'Authorization': `Bearer ${supabaseKey}`  ❌
}

// FIXED
static async getMySellRequests(userId: string, accessToken: string): Promise<SellRequest[]> {
  // Uses: 'Authorization': `Bearer ${accessToken}`  ✓
}
```

### 2. Transaction.getTransactionsByWholesaler() - Line 96
```typescript
// BROKEN
static async getTransactionsByWholesaler(
  wholesalerId: string,
  status?: TransactionStatus
): Promise<Transaction[]> {
  // Missing Authorization header entirely  ❌
}

// FIXED
static async getTransactionsByWholesaler(
  wholesalerId: string,
  status?: TransactionStatus,
  accessToken: string
): Promise<Transaction[]> {
  // Uses: 'Authorization': `Bearer ${accessToken}`  ✓
}
```

### 3. Transaction.getTransaction() - Line 246
```typescript
// BROKEN
static async getTransaction(transactionId: string): Promise<Transaction | null> {
  // Missing Authorization header  ❌
}

// FIXED
static async getTransaction(
  transactionId: string, 
  accessToken?: string
): Promise<Transaction | null> {
  // Uses: 'Authorization': `Bearer ${accessToken}`  ✓
}
```

---

## High Priority Methods (P2)

```typescript
// Fix these 5 methods in sell-request.service.ts:
getAllSellRequests()       // Line 140
getSellRequest()          // Line 89
getOffers()              // Line 337
getWonOffers()           // Line 651 (also needs accessToken parameter)
getWonOffersCount()      // Line 702 (also needs accessToken parameter)

// Remove wrong: 'Authorization': `Bearer ${supabaseKey}`
// Add correct: 'Authorization': `Bearer ${accessToken}` (or none for public)
```

---

## Pattern Reference

### Pattern A: Public Reads (No Auth)
```typescript
// Option 1: Use fetch wrapper (BEST)
const data = await get<T>('/rest/v1/table', { requireAuth: false });

// Option 2: Raw fetch, no Authorization header
fetch(url, {
  headers: {
    'apikey': key,
    'Content-Type': 'application/json',
  }
});
```

### Pattern B: Protected Reads (Auth Required)
```typescript
// Option 1: Use fetch wrapper (BEST)
const data = await get<T>('/rest/v1/table', { requireAuth: true });

// Option 2: Raw fetch with JWT token
fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,  // JWT token
    'apikey': key,
    'Content-Type': 'application/json',
  }
});
```

### Pattern C: Optional Auth
```typescript
const headers = {
  'apikey': key,
  'Content-Type': 'application/json',
};

if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}

fetch(url, { headers });
```

### Pattern D: NEVER DO THIS
```typescript
'Authorization': `Bearer ${apiKey}`  // API key is NOT a JWT token!
```

---

## Why This Matters

RLS Policy Example:
```sql
create policy "Users see own data"
  on my_table
  for select
  using (auth.uid = user_id);
```

What happens:
- With correct JWT Bearer token: `auth.uid` is set → Policy works ✓
- With API key Bearer token: `auth.uid` is undefined → Policy fails ✗
- Without Authorization header: `auth.uid` is undefined → Policy fails ✗

---

## Impact When Broken

| Method | Impact |
|--------|--------|
| getMySellRequests() | Users see empty list instead of their requests |
| getWonOffers() | Wholesalers see empty list instead of their offers |
| getTransactionsByWholesaler() | Wholesalers see empty list instead of transactions |
| getTransaction() | Returns null instead of transaction details |
| Count methods | Return 0 instead of actual count |

---

## Caller Updates Needed

After fixing method signatures to include `accessToken`, update all callers:

```typescript
// Search for these patterns and update:

// getMySellRequests
const requests = await SellRequestService.getMySellRequests(userId, accessToken);

// getTransactionsByWholesaler
const txns = await TransactionService.getTransactionsByWholesaler(id, status, accessToken);

// getTransaction
const txn = await TransactionService.getTransaction(id, accessToken);

// getWonOffers
const won = await SellRequestService.getWonOffers(id, accessToken);

// getWonOffersCount
const count = await SellRequestService.getWonOffersCount(id, accessToken);
```

---

## Total Work

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Fix critical methods | 2h | CRITICAL |
| Phase 2: Fix high priority methods | 2-3h | HIGH |
| Phase 3: Cleanup | 1h | MEDIUM |
| Testing | 2-3h | REQUIRED |
| **TOTAL** | **~8h** | |

---

## Testing Checklist

- [ ] getMySellRequests() returns user's requests
- [ ] getAllSellRequests() returns open requests
- [ ] getSellRequest() returns request details
- [ ] getOffers() returns offers for request
- [ ] getWonOffers() returns wholesaler's won offers
- [ ] getTransactionsByWholesaler() returns transactions
- [ ] getTransaction() returns transaction details
- [ ] All count methods return correct numbers
- [ ] No 403 Forbidden errors in browser
- [ ] RLS policies working correctly
- [ ] Different users see different data

---

## Key Files to Review

```
/lib/services/
├── sell-request.service.ts     (8 issues - Lines 89, 140, 179, 337, 552, 601, 651, 702)
├── transaction.service.ts      (2 issues - Lines 96-105, 246-255)
├── auth.service.ts             (1 issue - Line 104)
├── admin.service.ts            (SAFE ✓)
├── user.service.ts             (SAFE ✓)
├── product.service.ts          (SAFE ✓)
└── storage.service.ts          (SAFE ✓)

/lib/utils/
└── fetch.ts                    (Reference for correct wrapper pattern)
```

---

## Remember

1. API key goes in `apikey` header only
2. JWT token goes in `Authorization` header as `Bearer ${token}`
3. Never mix them up
4. When in doubt, use the fetch wrapper
5. Test with RLS policies enabled

