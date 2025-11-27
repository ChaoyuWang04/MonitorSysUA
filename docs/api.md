# API Documentation

## Overview
MonitorSysUA uses tRPC 11.7.1 for type-safe API communication. All procedures use Zod validation.

**Base URL**: `/api/trpc`
**Authentication**: None (internal use)

## Routers

### 1. Accounts Router (`accounts`)
Multi-account Google Ads management.

| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| `list` | query | `{ isActive?: boolean }` | `Account[]` |
| `getById` | query | `{ id: string }` | `Account` |
| `create` | mutation | `{ customerId: string, name: string }` | `Account` |
| `update` | mutation | `{ id, name?, isActive?, currency?, timeZone? }` | `Account` |
| `delete` | mutation | `{ id: string }` | `{ success: boolean }` |

### 2. Events Router (`events`)
Google Ads change event management.

| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| `list` | query | `{ accountId, page?, pageSize?, filters? }` | `{ events, total, page, pageSize }` |
| `sync` | mutation | `{ accountId: string, days?: number }` | `{ count: number, account: Account }` |
| `getById` | query | `{ id: string }` | `ChangeEvent` |

**Filters**: `operationType`, `resourceType`, `userEmail`, `search`

### 3. Stats Router (`stats`)
Dashboard statistics.

| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| `overview` | query | `{ accountId: string }` | `OverviewStats` |
| `multiAccountOverview` | query | none | `MultiAccountStats` |

### 4. Evaluation Router (`evaluation`)
Campaign performance evaluation system.

#### A2: Safety Baseline
| Procedure | Type | Description |
|-----------|------|-------------|
| `calculateBaseline` | mutation | Calculate ROAS7/RET7 baseline for dimensions |
| `updateAllBaselines` | mutation | Monthly batch baseline update |
| `getBaseline` | query | Retrieve stored baseline |

#### A3: Campaign Evaluation
| Procedure | Type | Description |
|-----------|------|-------------|
| `evaluateCampaign` | mutation | Single campaign evaluation |
| `evaluateAllCampaigns` | mutation | Batch campaign evaluation |
| `getCampaignEvaluations` | query | Query evaluations with filters |

#### A4: Creative Evaluation
| Procedure | Type | Description |
|-----------|------|-------------|
| `evaluateCreativeD3` | mutation | Day 3 creative check |
| `evaluateCreativeD7` | mutation | Day 7 creative check |
| `checkCampaignClosure` | query | Test campaign closure decision |
| `getCreativeEvaluations` | query | Query creative evaluations |

#### A5: Operation Scoring
| Procedure | Type | Description |
|-----------|------|-------------|
| `evaluateOperation` | mutation | Score single operation (7 days after) |
| `evaluateOperations7DaysAgo` | mutation | Daily batch scoring job |
| `getOperationScores` | query | Query operation scores |
| `getOptimizerLeaderboard` | query | Optimizer ranking |

## Response Format

**Success**:
```typescript
{ success: true, data: T, message?: string }
```

**Error**:
```typescript
{ success: false, error: { code: string, message: string, details?: any } }
```

## Types

```typescript
interface Account {
  id: string;
  customerId: string;
  name: string;
  currency: string;
  timeZone: string;
  isActive: boolean;
  createdAt: Date;
  lastSyncedAt: Date | null;
}

interface ChangeEvent {
  id: string;
  accountId: string;
  timestamp: Date;
  userEmail: string;
  resourceType: string;
  operationType: string;
  resourceName: string;
  campaign: string | null;
  adGroup: string | null;
  summary: string;
  summaryZh: string;
  fieldChanges: Record<string, any>;
}
```
