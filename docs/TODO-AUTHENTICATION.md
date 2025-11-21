# 🔐 Authentication Implementation TODO

**Status**: ⚠️ **TEMPORARY - No Authentication Currently Implemented**

**Date**: 2025-11-21

**Priority**: 🔴 **HIGH** (Required before production deployment)

---

## 📋 Current Situation

### What We Did (Temporary Solution)
- Replaced all `protectedProcedure` with `publicProcedure` in `server/api/routers/evaluation.ts`
- This was done to **unblock development** and fix build errors
- **ALL APIs are currently public and unprotected**

### Why This Is Temporary
- ✅ **Good for development**: Fast iteration, no login required
- ⚠️ **Not suitable for production**: Anyone can access/modify data
- ❌ **Security risk if deployed publicly**: No access control

---

## 🚨 Security Risks (Current State)

Without authentication, the following risks exist:

| Risk | Impact | Affected APIs |
|------|--------|---------------|
| **Unauthorized data access** | Anyone can view all campaign evaluations, operation scores, and baselines | All `query` procedures |
| **Unauthorized data modification** | Anyone can create/update/delete accounts and trigger evaluations | All `mutation` procedures |
| **Data integrity** | No audit trail of who made changes | All write operations |
| **Resource abuse** | Unlimited API calls, potential DoS | All endpoints |

---

## 🛡️ APIs That Need Protection

### High Priority (Write Operations)

These APIs modify data and should be protected **immediately** before production:

#### Account Management (`server/api/routers/accounts.ts`)
- ✅ `list` - Can stay public (or protect for privacy)
- ✅ `getById` - Can stay public (or protect for privacy)
- ❌ `create` - **MUST protect** (only admins should create accounts)
- ❌ `update` - **MUST protect** (only admins should update accounts)
- ❌ `delete` - **MUST protect** (only admins should delete accounts)

#### Evaluation System (`server/api/routers/evaluation.ts`)
All 13 procedures currently use `publicProcedure` and should be protected:

**A2: Safety Baseline** (3 procedures)
- ❌ `calculateBaseline` - Triggers expensive calculations
- ❌ `updateAllBaselines` - Batch operation, should be admin-only
- ❌ `getBaseline` - Read operation, can stay public or protect

**A3: Campaign Evaluation** (3 procedures)
- ❌ `evaluateCampaign` - Triggers evaluation logic
- ❌ `evaluateAllCampaigns` - Batch operation, expensive
- ❌ `getCampaignEvaluations` - Read operation, protect for privacy

**A4: Creative Evaluation** (4 procedures)
- ❌ `evaluateCreativeD3` - Triggers evaluation logic
- ❌ `evaluateCreativeD7` - Triggers evaluation logic
- ❌ `checkCampaignClosure` - Business logic check
- ❌ `getCreativeEvaluations` - Read operation, protect for privacy

**A5: Operation Scoring** (3 procedures)
- ❌ `evaluateOperation` - Triggers scoring logic
- ❌ `getOptimizerLeaderboard` - Read operation, can stay public or protect
- ❌ `evaluateOperations7DaysAgo` - Batch operation, should be cron-only
- ❌ `getOperationScores` - Read operation, protect for privacy

#### Event Syncing (`server/api/routers/events.ts`)
- ✅ `list` - Can stay public (or protect for privacy)
- ❌ `sync` - **MUST protect** (triggers Google Ads API calls, expensive)
- ✅ `getById` - Can stay public (or protect for privacy)

#### Statistics (`server/api/routers/stats.ts`)
- ✅ `overview` - Can stay public (or protect for privacy)
- ✅ `multiAccountOverview` - Can stay public (or protect for privacy)

---

## 🔨 Implementation Guide

### Step 1: Choose Authentication Strategy

**Recommended Options:**

#### Option A: NextAuth.js (Easiest)
```bash
npm install next-auth
```
- Pros: Built for Next.js, supports multiple providers
- Cons: Requires session management
- Time: ~4-6 hours

#### Option B: Clerk (Fastest)
```bash
npm install @clerk/nextjs
```
- Pros: Drop-in solution, beautiful UI, user management
- Cons: Paid service for scale
- Time: ~2-3 hours

#### Option C: Custom JWT (Most Control)
```bash
npm install jsonwebtoken bcrypt
```
- Pros: Full control, no external dependencies
- Cons: More code to write and maintain
- Time: ~8-10 hours

### Step 2: Add User Table to Database Schema

**File**: `server/db/schema.ts`

```typescript
import { pgTable, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'), // Only for custom auth
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'admin', 'user', 'viewer'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

**Migration**:
```bash
npm run db:generate
npm run db:migrate
```

### Step 3: Create Authentication Middleware

**File**: `server/api/trpc.ts`

```typescript
import { TRPCError } from '@trpc/server'

/**
 * Protected procedure - Requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ next, ctx }) => {
  // Get session from request (implementation depends on auth strategy)
  const session = await getSession(ctx.req)

  if (!session || !session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: session.user,
      session,
    },
  })
})

/**
 * Admin-only procedure - Requires admin role
 */
export const adminProcedure = protectedProcedure.use(async ({ next, ctx }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to access this resource'
    })
  }

  return next({ ctx })
})
```

### Step 4: Replace publicProcedure with protectedProcedure

**File**: `server/api/routers/evaluation.ts`

```diff
- import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
+ import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const evaluationRouter = createTRPCRouter({
-  calculateBaseline: publicProcedure
+  calculateBaseline: protectedProcedure
    .input(...)
    .mutation(async ({ input }) => { ... }),

-  updateAllBaselines: publicProcedure
+  updateAllBaselines: adminProcedure  // Admin-only for batch operations
    .input(...)
    .mutation(async ({ input }) => { ... }),

  // ... repeat for all procedures
})
```

**Do this for**:
- `server/api/routers/evaluation.ts` (13 procedures)
- `server/api/routers/accounts.ts` (create, update, delete)
- `server/api/routers/events.ts` (sync)

### Step 5: Add Login UI

**File**: `app/login/page.tsx` (create new file)

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react' // or your auth solution
import { Box, TextField, Button, Card, CardContent, Typography } from '@mui/material'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    await signIn('credentials', { email, password })
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Login to MonitorSysUA</Typography>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleLogin}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}
```

### Step 6: Protect Frontend Routes

**File**: `app/(dashboard)/layout.tsx`

```typescript
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth' // or your auth solution

export default async function DashboardLayout({ children }) {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  return (
    // ... existing layout code
  )
}
```

### Step 7: Add User Context Provider

**File**: `lib/contexts/auth-context.tsx` (create new file)

```typescript
'use client'

import { createContext, useContext } from 'react'
import { useSession } from 'next-auth/react' // or your auth solution

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  role: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  const value = {
    user: session?.user || null,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    role: session?.user?.role || null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Step 8: Update Root Layout

**File**: `app/layout.tsx`

```diff
+ import { AuthProvider } from '@/lib/contexts/auth-context'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
+         <AuthProvider>
            {children}
+         </AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
```

---

## 📊 Estimated Work Breakdown

| Task | Time | Priority |
|------|------|----------|
| Choose & setup auth solution | 2-3h | 🔴 High |
| Add user/session tables | 1h | 🔴 High |
| Create authentication middleware | 2h | 🔴 High |
| Replace publicProcedure → protectedProcedure | 30min | 🔴 High |
| Build login page | 2h | 🔴 High |
| Add route protection | 1h | 🔴 High |
| Create auth context provider | 1h | 🟡 Medium |
| Add user menu (logout, profile) | 1h | 🟡 Medium |
| Write tests | 2h | 🟡 Medium |
| Documentation | 1h | 🟢 Low |

**Total**: ~13-15 hours

---

## ✅ Testing Checklist

After implementing authentication:

- [ ] Unauthenticated users are redirected to login
- [ ] Login works with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Protected API routes return 401 for unauthenticated requests
- [ ] Protected API routes work for authenticated requests
- [ ] Admin-only routes return 403 for non-admin users
- [ ] Session persists across page reloads
- [ ] Logout clears session and redirects to login
- [ ] tRPC calls include auth context
- [ ] Error messages are user-friendly

---

## 📚 References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Clerk Documentation](https://clerk.com/docs)
- [tRPC Authentication](https://trpc.io/docs/server/middlewares#authorization)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)

---

## 🔔 Reminder

**Before deploying to production:**
1. ✅ Implement authentication (this document)
2. ✅ Add environment-based feature flags
3. ✅ Set up proper CORS configuration
4. ✅ Add rate limiting
5. ✅ Review all API endpoints for security
6. ✅ Add logging and monitoring
7. ✅ Conduct security audit

**Questions?**
- Review this document before implementing
- Consider your deployment timeline
- Evaluate auth solution based on team expertise and budget

---

**Last Updated**: 2025-11-21
**Status**: 📝 Planning Phase
**Next Step**: Choose authentication strategy and begin implementation
