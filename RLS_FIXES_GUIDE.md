# RLS Authentication Issues - Fix Implementation Guide

## Quick Reference: The Problem

```typescript
// WRONG - Found in sell-request.service.ts and other files
'Authorization': `Bearer ${supabaseKey}`  // API key as Bearer token!

// CORRECT - What should be used
'Authorization': `Bearer ${accessToken}` // User JWT token
```

The API key is meant for the `apikey` header only, never as a Bearer token.

---

## Issue 1: SellRequest.getMySellRequests() - CRITICAL

**File:** `/lib/services/sell-request.service.ts` (Lines 166-200)

### Current Code (BROKEN):
```typescript
static async getMySellRequests(userId: string): Promise<SellRequest[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?seller_id=eq.${userId}&order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,  // BUG: Using API key!
        },
      }
    );
    // ... rest of code
  }
}
```

### Problem:
- Returns empty array for authenticated users
- RLS policy `auth.uid == seller_id` cannot match because auth.uid is undefined
- User sees no sell requests even though they exist

### Fix:
```typescript
static async getMySellRequests(userId: string, accessToken: string): Promise<SellRequest[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?seller_id=eq.${userId}&order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,  // FIX: Use JWT token
          'Content-Type': 'application/json',
        },
      }
    );
    // ... rest of code
  }
}
```

### Where to Update Callers:
Search for calls to `getMySellRequests()` and pass the `accessToken`:
```typescript
// Before
const requests = await SellRequestService.getMySellRequests(userId);

// After
const requests = await SellRequestService.getMySellRequests(userId, accessToken);
```

---

## Issue 2: SellRequest.getAllSellRequests() - HIGH

**File:** `/lib/services/sell-request.service.ts` (Lines 127-161)

### Current Code (BROKEN):
```typescript
static async getAllSellRequests(): Promise<SellRequest[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?status=eq.${SellRequestStatus.OPEN}&order=created_at.desc`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,  // BUG!
      },
    }
  );
  // ...
}
```

### Problem:
- Public read endpoint but using wrong Bearer token
- If RLS policies exist, will fail to return data

### Fix Option A (Use Fetch Wrapper - Recommended):
```typescript
static async getAllSellRequests(): Promise<SellRequest[]> {
  try {
    const data = await get<any[]>(
      `/rest/v1/${this.SELL_REQUESTS_COLLECTION}?status=eq.${SellRequestStatus.OPEN}&order=created_at.desc`,
      { requireAuth: false }  // Public read
    );
    return data.map((item: any) => this.mapToSellRequest(item));
  } catch (error) {
    // ... error handling
  }
}
```

### Fix Option B (Raw Fetch with Correct Headers):
```typescript
static async getAllSellRequests(): Promise<SellRequest[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?status=eq.${SellRequestStatus.OPEN}&order=created_at.desc`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        // Remove the Authorization header entirely for public reads
      },
    }
  );
  // ...
}
```

---

## Issue 3: SellRequest.getSellRequest() - HIGH

**File:** `/lib/services/sell-request.service.ts` (Lines 76-122)

### Fix Option A (Use Fetch Wrapper - Recommended):
```typescript
static async getSellRequest(requestId: string): Promise<SellRequest | null> {
  try {
    const data = await get<any[]>(
      `/rest/v1/${this.SELL_REQUESTS_COLLECTION}?id=eq.${requestId}`,
      { requireAuth: false }  // Public read
    );
    // ...
  } catch (error) {
    // ...
  }
}
```

### Fix Option B (Raw Fetch):
```typescript
static async getSellRequest(requestId: string): Promise<SellRequest | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.SELL_REQUESTS_COLLECTION}?id=eq.${requestId}`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        // Remove wrong Authorization header
      },
    }
  );
  // ...
}
```

---

## Issue 4: SellRequest.getOffers() - MEDIUM

**File:** `/lib/services/sell-request.service.ts` (Lines 324-358)

### Same Fix as getSellRequest():
```typescript
static async getOffers(sellRequestId: string): Promise<PurchaseOffer[]> {
  const data = await get<any[]>(
    `/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?sell_request_id=eq.${sellRequestId}&order=offer_price.desc`,
    { requireAuth: false }
  );
  return data.map((item: any) => this.mapToPurchaseOffer(item));
}
```

---

## Issue 5: SellRequest.getWonOffers() - HIGH

**File:** `/lib/services/sell-request.service.ts` (Lines 637-684)

### Current Code (BROKEN):
```typescript
static async getWonOffers(wholesalerId: string): Promise<Array<PurchaseOffer & { sellRequest: SellRequest }>> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?wholesaler_id=eq.${wholesalerId}&is_selected=eq.true&order=created_at.desc`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,  // BUG!
      },
    }
  );
  // ...
}
```

### Problem:
- Returns wholesaler's won offers
- Using API key prevents RLS from identifying the wholesaler
- Returns empty array instead of their won offers

### Fix:
```typescript
static async getWonOffers(wholesalerId: string, accessToken: string): Promise<Array<PurchaseOffer & { sellRequest: SellRequest }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Now with proper authentication
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?wholesaler_id=eq.${wholesalerId}&is_selected=eq.true&order=created_at.desc`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,  // FIX: Use JWT token
        'Content-Type': 'application/json',
      },
    }
  );
  // ...
}
```

---

## Issue 6: SellRequest Count Methods - MEDIUM

**File:** `/lib/services/sell-request.service.ts`

### getOfferCount() - Line 539
```typescript
// BEFORE (BROKEN)
static async getOfferCount(sellRequestId: string): Promise<number> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?sell_request_id=eq.${sellRequestId}`,
    {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,  // BUG!
        'Prefer': 'count=exact',
      },
    }
  );
  // ...
}

// AFTER (FIX)
static async getOfferCount(sellRequestId: string): Promise<number> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?sell_request_id=eq.${sellRequestId}`,
    {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
        // Remove the wrong Authorization header
      },
    }
  );
  // ...
}
```

### getOpenSellRequestCount() - Line 588
```typescript
// Same fix as getOfferCount() - remove the wrong Authorization header
```

### getWonOffersCount() - Line 689
```typescript
// BEFORE (BROKEN)
static async getWonOffersCount(wholesalerId: string): Promise<number> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?wholesaler_id=eq.${wholesalerId}&is_selected=eq.true`,
    {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,  // BUG!
        'Prefer': 'count=exact',
      },
    }
  );
  // ...
}

// AFTER (FIX) - Add accessToken parameter
static async getWonOffersCount(wholesalerId: string, accessToken: string): Promise<number> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.PURCHASE_OFFERS_COLLECTION}?wholesaler_id=eq.${wholesalerId}&is_selected=eq.true`,
    {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,  // FIX: Use JWT token
        'Prefer': 'count=exact',
      },
    }
  );
  // ...
}
```

---

## Issue 7: Transaction.getTransactionsByWholesaler() - CRITICAL

**File:** `/lib/services/transaction.service.ts` (Lines 83-113)

### Current Code (BROKEN):
```typescript
static async getTransactionsByWholesaler(
  wholesalerId: string,
  status?: TransactionStatus
): Promise<Transaction[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let queryParams = `wholesaler_id=eq.${wholesalerId}&order=created_at.desc`;
  if (status) {
    queryParams += `&status=eq.${status}`;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        // MISSING: Authorization header!
      },
    }
  );
  // ...
}
```

### Problem:
- Method is specifically for getting a wholesaler's transactions
- Without auth header, RLS policies can't identify the user
- Returns empty array even though transactions exist

### Fix:
```typescript
static async getTransactionsByWholesaler(
  wholesalerId: string,
  status?: TransactionStatus,
  accessToken: string  // ADD: accessToken parameter
): Promise<Transaction[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let queryParams = `wholesaler_id=eq.${wholesalerId}&order=created_at.desc`;
  if (status) {
    queryParams += `&status=eq.${status}`;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,  // FIX: Add JWT token
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
    }
  );
  // ...
}
```

### Update Callers:
```typescript
// Before
const transactions = await TransactionService.getTransactionsByWholesaler(wholesalerId);

// After
const transactions = await TransactionService.getTransactionsByWholesaler(
  wholesalerId, 
  status, 
  accessToken  // Pass the JWT token
);
```

---

## Issue 8: Transaction.getTransaction() - HIGH

**File:** `/lib/services/transaction.service.ts` (Lines 242-267)

### Current Code (BROKEN):
```typescript
static async getTransaction(transactionId: string): Promise<Transaction | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  // ...
}
```

### Fix:
```typescript
static async getTransaction(transactionId: string, accessToken?: string): Promise<Transaction | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Content-Type': 'application/json',
  };

  // Add auth header if token provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${this.TRANSACTIONS_COLLECTION}?id=eq.${transactionId}`,
    {
      method: 'GET',
      headers,
    }
  );
  // ...
}
```

---

## Issue 9: Auth.signUp() - MEDIUM

**File:** `/lib/services/auth.service.ts` (Lines 99-117)

### Current Code (WRONG):
```typescript
const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,  // Wrong format!
    'Prefer': 'return=minimal',
  },
  body: JSON.stringify({
    uid: uid,
    email: userEmail,
    // ...
  }),
});
```

### Problem:
- During signup, user doesn't exist yet
- API key should not be used as Bearer token
- Auth endpoint might ignore it, but it's incorrect practice

### Fix:
```typescript
const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    // Remove the Authorization header - not needed for signup
    'Prefer': 'return=minimal',
  },
  body: JSON.stringify({
    uid: uid,
    email: userEmail,
    // ...
  }),
});
```

---

## Summary: Pattern Reference

### Pattern 1: Public Reads (No Auth Needed)
```typescript
// Use fetch wrapper
const data = await get('/rest/v1/table', { requireAuth: false });

// OR raw fetch without Authorization header
fetch(url, {
  headers: {
    'apikey': key,
    'Content-Type': 'application/json',
  }
})
```

### Pattern 2: Protected Operations (Auth Required)
```typescript
// Use fetch wrapper (preferred)
const data = await get('/rest/v1/table', { requireAuth: true });

// OR raw fetch WITH JWT token
fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,  // User JWT
    'apikey': key,
    'Content-Type': 'application/json',
  }
})
```

### Pattern 3: Optional Auth
```typescript
const headers = {
  'apikey': key,
  'Content-Type': 'application/json',
};

if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}

fetch(url, { headers })
```

### Pattern 4: NEVER DO THIS
```typescript
// WRONG - API key is NOT a JWT
'Authorization': `Bearer ${apiKey}`
```

---

## Testing Checklist

After making fixes:

- [ ] Test getMySellRequests() - should return user's requests
- [ ] Test getAllSellRequests() - should return open requests
- [ ] Test getSellRequest() - should return single request details
- [ ] Test getOffers() - should return offers for a request
- [ ] Test getWonOffers() - should return wholesaler's won offers
- [ ] Test getTransactionsByWholesaler() - should return transactions
- [ ] Test getTransaction() - should return transaction details
- [ ] Test all count operations - should return correct numbers
- [ ] Check browser console - no 403 Forbidden errors
- [ ] Verify RLS policies are working correctly
- [ ] Test with different users - should see different data

