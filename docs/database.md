# Database Schema

## Overview
- **ORM**: Drizzle ORM 0.44.7
- **Database**: PostgreSQL 16-alpine (Docker, port 5433)
- **Migration**: Atlas (ariga.io)
- **Schema File**: `server/db/schema.ts`

## Tables (14 total)

### Core Tables

#### `accounts`
Multi-account Google Ads support.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| customerId | varchar(10) | Google Ads customer ID (unique) |
| name | varchar(255) | Account display name |
| currency | varchar(3) | Account currency (default: USD) |
| timeZone | varchar(50) | Account timezone |
| isActive | boolean | Soft delete flag (default: true) |
| createdAt | timestamp | Record creation time |
| lastSyncedAt | timestamp | Last sync timestamp |

#### `change_events`
Google Ads operation logs.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| accountId | uuid (FK) | Reference to accounts |
| timestamp | timestamp | Event timestamp |
| userEmail | varchar(255) | Operator email |
| resourceType | varchar(100) | Resource type (CAMPAIGN, AD_GROUP, etc) |
| operationType | varchar(50) | Operation type (CREATE, UPDATE, REMOVE) |
| resourceName | text | Google Ads resource name |
| clientType | varchar(50) | Client application type |
| campaign | varchar(255) | Campaign name (nullable) |
| adGroup | varchar(255) | Ad group name (nullable) |
| summary | text | English summary |
| summaryZh | text | Chinese summary |
| fieldChanges | jsonb | Detailed field changes |
| changedFieldsPaths | text[] | Changed field paths array |

**Unique**: (accountId, timestamp, resourceName, userEmail)
**Indexes**: accountId, accountTimestamp, timestamp, userEmail, campaign

### Evaluation Tables

#### `safety_baseline`
180-day performance baseline for campaigns.
| Column | Type | Description |
|--------|------|-------------|
| productName | varchar(100) | Product identifier |
| countryCode | varchar(10) | Country code |
| platform | varchar(20) | Platform (iOS/Android) |
| channel | varchar(50) | Marketing channel |
| baselineRoas7 | decimal(10,4) | 7-day ROAS baseline |
| baselineRet7 | decimal(10,4) | 7-day retention baseline |
| calculatedAt | timestamp | Calculation timestamp |

**Unique**: (productName, countryCode, platform, channel)

#### `campaign_evaluation`
Campaign performance assessment results.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| campaignId | varchar(50) | Campaign identifier |
| campaignName | varchar(255) | Campaign display name |
| evaluationDate | date | Evaluation date |
| campaignType | varchar(20) | test / mature |
| totalSpend | decimal(18,2) | Total spend |
| actualRoas7 | decimal(10,4) | Actual 7-day ROAS |
| actualRet7 | decimal(10,4) | Actual 7-day retention |
| baselineRoas7 | decimal(10,4) | Baseline ROAS |
| baselineRet7 | decimal(10,4) | Baseline retention |
| roasAchievementRate | decimal(10,4) | ROAS achievement % |
| retAchievementRate | decimal(10,4) | Retention achievement % |
| minAchievementRate | decimal(10,4) | Min of both rates |
| status | varchar(20) | Status (excellent/healthy/observation/warning/danger) |
| recommendationType | varchar(50) | Recommendation type |

#### `creative_evaluation`
Creative performance for test campaigns.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| creativeId | varchar(50) | Creative identifier |
| creativeName | varchar(255) | Creative display name |
| campaignId | varchar(50) | Parent campaign |
| evaluationDay | varchar(5) | D3 / D7 |
| evaluationDate | date | Evaluation date |
| impressions | integer | Total impressions |
| installs | integer | Total installs |
| cvr | decimal(8,4) | Conversion rate |
| actualCpi | decimal(10,4) | Actual CPI |
| actualRoas | decimal(10,4) | Actual ROAS |
| maxCpiThreshold | decimal(10,4) | CPI threshold |
| minRoasThreshold | decimal(10,4) | ROAS threshold |
| creativeStatus | varchar(20) | Status |

#### `operation_score`
Optimizer operation effectiveness tracking.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| operationId | uuid (FK) | Reference to change_events |
| campaignId | varchar(50) | Campaign identifier |
| optimizerEmail | varchar(255) | Optimizer email |
| operationType | varchar(50) | Operation type |
| operationDate | date | Operation date |
| evaluationDate | date | Evaluation date (7 days after) |
| actualRoas7 | decimal(10,4) | Post-operation ROAS |
| actualRet7 | decimal(10,4) | Post-operation retention |
| baselineRoas7 | decimal(10,4) | Baseline ROAS |
| baselineRet7 | decimal(10,4) | Baseline retention |
| roasAchievementRate | decimal(10,4) | ROAS achievement % |
| retAchievementRate | decimal(10,4) | Retention achievement % |
| score | varchar(20) | excellent/qualified/failed |

#### `optimizer_leaderboard`
Optimizer performance ranking.
| Column | Type | Description |
|--------|------|-------------|
| optimizerEmail | varchar(255) (PK) | Optimizer email |
| totalOperations | integer | Total operations |
| excellentCount | integer | Score >= 110% |
| qualifiedCount | integer | Score 85-110% |
| failedCount | integer | Score < 85% |
| successRate | decimal(8,4) | Success rate % |

### AppsFlyer Tables

#### `af_events`
IAP + Ad Revenue events from AppsFlyer.
| Column | Type | Description |
|--------|------|-------------|
| eventId | varchar(64) (PK) | MD5 hash of event |
| appId | varchar(50) | App identifier |
| appsflyerId | varchar(100) | AppsFlyer user ID |
| eventName | varchar(50) | iap_purchase / af_ad_revenue |
| eventTime | timestamp | Event timestamp |
| installDate | date | User install date |
| daysSinceInstall | integer | Days since install |
| eventRevenueUsd | decimal(18,6) | Revenue in USD |
| geo | varchar(10) | Country code |
| mediaSource | varchar(100) | Attribution source |
| campaign | varchar(255) | Campaign name |
| campaignId | varchar(100) | Campaign ID |

#### `af_cohort_kpi_daily`
Cohort retention and KPI aggregation.
| Column | Type | Description |
|--------|------|-------------|
| appId | varchar(50) | App identifier |
| mediaSource | varchar(100) | Attribution source |
| campaign | varchar(255) | Campaign name |
| geo | varchar(10) | Country code |
| installDate | date | Cohort install date |
| daysSinceInstall | integer | Days since install (0-7) |
| installs | integer | Install count |
| costUsd | decimal(18,6) | Cost in USD |
| retentionRate | decimal(8,4) | Retention rate |

**Unique**: (appId, mediaSource, campaign, geo, installDate, daysSinceInstall)

#### `af_sync_log`
Sync operation audit log.
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment |
| syncType | varchar(20) | events / cohort_kpi / baseline |
| dateRangeStart | date | Sync start date |
| dateRangeEnd | date | Sync end date |
| status | varchar(20) | running / success / failed |
| recordsProcessed | integer | Records processed |
| errorMessage | text | Error message (if failed) |
| startedAt | timestamp | Sync start time |
| completedAt | timestamp | Sync completion time |

### Mock Data Tables

#### `mock_campaign_performance`
Synthetic campaign data for testing evaluation system.

#### `mock_creative_performance`
Synthetic creative data for testing evaluation system.

## Migration Commands
```bash
just db-status      # Check migration status
just db-diff "name" # Generate new migration
just db-apply       # Apply pending migrations
just db-studio      # Open Drizzle Studio
```
