# Operation Scores Flow (Frontend ↔ Backend)
```mermaid
flowchart LR
  subgraph UI[Frontend]
    Page[Operation Scores page<br/>app/dashboard/evaluation/operations]
    Recalc[Button: Recalculate scores]
    Leader[Optimizer Leaderboard tab]
  end

  subgraph TRPC[tRPC Router]
    GetScores[getOperationScores]
    RecalcRpc[recalculateOperationScores]
    LeaderRpc[getOptimizerLeaderboard]
  end

  subgraph DBQ[DB Queries / Wrappers]
    List[getOperationScores<br/>group by operation, stage anchor T+7→T+3→T+1]
    EvalAll[evaluateAllOperationsFromAF<br/>iterate change_events]
    EvalOne[evaluateOperationFromAF]
    Agg[getOperationCohortMetrics<br/>+ getBaselineMetrics]
    Upsert[createOperationScore<br/>upsert by operationId+stage<br/>+ update change_events.operation_scores]
    LegacyLeader[python operation_evaluator.py<br/>mock-era aggregation]
  end

  subgraph Data[Data Sources]
    CE[change_events<br/>operation context,<br/>field_changes]
    Ops[operation_score]
    AF[AppsFlyer cohort metrics<br/>af_cohort_metrics_daily]
    Baseline[baseline_metrics<br/>+ baseline_settings]
  end

  Page -->|load table| GetScores
  GetScores --> List
  List --> Ops
  List --> CE
  List --> Page

  Recalc --> RecalcRpc --> EvalAll --> EvalOne
  EvalOne --> CE
  EvalOne --> Agg
  Agg --> AF
  Agg --> Baseline
  EvalOne --> Upsert
  Upsert --> Ops
  Upsert --> CE
  EvalAll --> RecalcRpc
  RecalcRpc --> Page

  Leader --> LeaderRpc --> LegacyLeader --> Ops
  LegacyLeader --> Leader
```

Legend: Ops = `operation_score`; CE = `change_events`; Agg handles baseline + cohort retrieval; LegacyLeader = current leaderboard path (deprecated Python).
