#!/usr/bin/env python3
"""
A5: Operation Evaluator

Evaluates optimizer operations 7 days after execution.
Generates optimizer leaderboards based on operation performance.
"""

import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from db_utils import get_db, format_output, read_input


class OperationEvaluator:
    """Evaluate optimizer operations and generate leaderboards"""

    def __init__(self):
        self.db = get_db()

    def evaluate_operation(self, operation_id: int) -> Dict[str, Any]:
        """
        Evaluate an operation 7 days after execution

        Args:
            operation_id: Operation ID from change_events table

        Returns:
            Dictionary containing:
            - operation_id: int
            - campaign_id: str
            - optimizer_email: str
            - operation_type: str
            - operation_date: str
            - evaluation_date: str
            - actual_roas7: float
            - actual_ret7: float
            - baseline_roas7: float
            - baseline_ret7: float
            - roas_achievement_rate: float
            - ret_achievement_rate: float
            - min_achievement_rate: float
            - score: "优秀" | "合格" | "失败"
        """
        try:
            with self.db:
                # 1. Get operation record
                operation_query = """
                    SELECT
                        id,
                        user_email,
                        resource_type,
                        summary,
                        timestamp,
                        resource_name as campaign_name,
                        campaign as campaign_id
                    FROM change_events
                    WHERE id = %s
                    LIMIT 1
                """

                operation_results = self.db.execute_query(operation_query, (operation_id,))

                if not operation_results or len(operation_results) == 0:
                    return {
                        "error": f"Operation {operation_id} not found",
                        "operation_id": operation_id
                    }

                operation = operation_results[0]

                operation_date = operation['timestamp']
                evaluation_date = operation_date + timedelta(days=7)
                evaluation_date_str = evaluation_date.strftime("%Y-%m-%d")
                operation_date_str = operation_date.strftime("%Y-%m-%d")

                campaign_id = operation['campaign_id']
                optimizer_email = operation['user_email']

                # Determine operation type from summary
                summary = operation['summary']
                if 'Budget' in summary:
                    operation_type = 'BUDGET_UPDATE'
                elif 'tROAS' in summary or 'ROAS' in summary:
                    operation_type = 'TROAS_UPDATE'
                elif 'status' in summary.lower():
                    operation_type = 'STATUS_CHANGE'
                else:
                    operation_type = 'OTHER'

                # 2. Get campaign performance data 7 days after operation
                performance_query = """
                    SELECT
                        actual_roas7,
                        actual_ret7,
                        product_name,
                        country_code,
                        platform,
                        channel
                    FROM mock_campaign_performance
                    WHERE campaign_id = %s
                      AND date = %s
                    LIMIT 1
                """

                performance_results = self.db.execute_query(
                    performance_query,
                    (campaign_id, evaluation_date_str)
                )

                if not performance_results or len(performance_results) == 0:
                    return {
                        "error": f"No performance data found for campaign {campaign_id} on {evaluation_date_str}",
                        "operation_id": operation_id
                    }

                performance = performance_results[0]
                actual_roas7 = float(performance['actual_roas7'])
                actual_ret7 = float(performance['actual_ret7'])

                # 3. Get baseline at operation time
                baseline_query = """
                    SELECT baseline_roas7, baseline_ret7
                    FROM safety_baseline
                    WHERE product_name = %s
                      AND country_code = %s
                      AND platform = %s
                      AND channel = %s
                    LIMIT 1
                """

                baseline_results = self.db.execute_query(
                    baseline_query,
                    (performance['product_name'], performance['country_code'],
                     performance['platform'], performance['channel'])
                )

                if not baseline_results or len(baseline_results) == 0:
                    return {
                        "error": "No baseline found",
                        "operation_id": operation_id
                    }

                baseline = baseline_results[0]
                baseline_roas7 = float(baseline['baseline_roas7'])
                baseline_ret7 = float(baseline['baseline_ret7'])

                # 4. Calculate achievement rates
                roas_achievement_rate = (actual_roas7 / baseline_roas7 * 100) if baseline_roas7 > 0 else 0.0
                ret_achievement_rate = (actual_ret7 / baseline_ret7 * 100) if baseline_ret7 > 0 else 0.0
                min_achievement_rate = min(roas_achievement_rate, ret_achievement_rate)

                # 5. Determine score
                if min_achievement_rate >= 110:
                    score = "优秀"
                elif min_achievement_rate >= 85:
                    score = "合格"
                else:
                    score = "失败"

                # 6. Save to database
                self.save_operation_score(
                    operation_id=operation_id,
                    campaign_id=campaign_id,
                    optimizer_email=optimizer_email,
                    operation_type=operation_type,
                    operation_date=operation_date_str,
                    evaluation_date=evaluation_date_str,
                    actual_roas7=actual_roas7,
                    actual_ret7=actual_ret7,
                    baseline_roas7=baseline_roas7,
                    baseline_ret7=baseline_ret7,
                    roas_achievement_rate=roas_achievement_rate,
                    ret_achievement_rate=ret_achievement_rate
                )

                return {
                    "operation_id": operation_id,
                    "campaign_id": campaign_id,
                    "campaign_name": operation['campaign_name'],
                    "optimizer_email": optimizer_email,
                    "operation_type": operation_type,
                    "operation_date": operation_date_str,
                    "evaluation_date": evaluation_date_str,
                    "actual_roas7": actual_roas7,
                    "actual_ret7": actual_ret7,
                    "baseline_roas7": baseline_roas7,
                    "baseline_ret7": baseline_ret7,
                    "roas_achievement_rate": round(roas_achievement_rate, 2),
                    "ret_achievement_rate": round(ret_achievement_rate, 2),
                    "min_achievement_rate": round(min_achievement_rate, 2),
                    "score": score
                }

        except Exception as e:
            print(f"Operation evaluation error: {e}", file=sys.stderr, flush=True)
            return {
                "error": str(e),
                "operation_id": operation_id
            }

    def save_operation_score(
        self,
        operation_id: int,
        campaign_id: str,
        optimizer_email: str,
        operation_type: str,
        operation_date: str,
        evaluation_date: str,
        actual_roas7: float,
        actual_ret7: float,
        baseline_roas7: float,
        baseline_ret7: float,
        roas_achievement_rate: float,
        ret_achievement_rate: float
    ) -> bool:
        """Save operation score to database"""
        try:
            query = """
                INSERT INTO operation_score (
                    operation_id, campaign_id, optimizer_email, operation_type,
                    operation_date, evaluation_date,
                    actual_roas7, actual_ret7,
                    baseline_roas7, baseline_ret7,
                    roas_achievement_rate, ret_achievement_rate,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """

            return self.db.execute_update(
                query,
                (operation_id, campaign_id, optimizer_email, operation_type,
                 operation_date, evaluation_date,
                 actual_roas7, actual_ret7,
                 baseline_roas7, baseline_ret7,
                 roas_achievement_rate, ret_achievement_rate)
            )

        except Exception as e:
            print(f"Save operation score error: {e}", file=sys.stderr, flush=True)
            return False

    def get_optimizer_leaderboard(
        self,
        days: int = 30,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Get optimizer leaderboard based on operation performance

        Args:
            days: Look back period in days (default: 30)
            limit: Maximum number of optimizers to return (default: 20)

        Returns:
            Dictionary containing:
            - period_days: int
            - leaderboard: List of optimizer stats
        """
        try:
            with self.db:
                # Calculate date range
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days)
                start_date_str = start_date.strftime("%Y-%m-%d")

                # Get optimizer statistics
                leaderboard_query = """
                    SELECT
                        optimizer_email,
                        COUNT(*) as total_operations,
                        AVG(roas_achievement_rate) as avg_roas_achievement,
                        AVG(ret_achievement_rate) as avg_ret_achievement,
                        AVG(LEAST(roas_achievement_rate, ret_achievement_rate)) as avg_min_achievement,
                        COUNT(CASE WHEN LEAST(roas_achievement_rate, ret_achievement_rate) >= 110 THEN 1 END) as excellent_count,
                        COUNT(CASE WHEN LEAST(roas_achievement_rate, ret_achievement_rate) >= 85 AND LEAST(roas_achievement_rate, ret_achievement_rate) < 110 THEN 1 END) as good_count,
                        COUNT(CASE WHEN LEAST(roas_achievement_rate, ret_achievement_rate) < 85 THEN 1 END) as failed_count
                    FROM operation_score
                    WHERE operation_date >= %s
                    GROUP BY optimizer_email
                    ORDER BY avg_min_achievement DESC
                    LIMIT %s
                """

                leaderboard = self.db.execute_query(
                    leaderboard_query,
                    (start_date_str, limit)
                )

                # Format results
                results = []
                for row in leaderboard:
                    total_ops = int(row['total_operations'])
                    excellent = int(row['excellent_count'])
                    good = int(row['good_count'])
                    failed = int(row['failed_count'])

                    results.append({
                        "optimizer_email": row['optimizer_email'],
                        "total_operations": total_ops,
                        "avg_roas_achievement": round(float(row['avg_roas_achievement']), 2),
                        "avg_ret_achievement": round(float(row['avg_ret_achievement']), 2),
                        "avg_min_achievement": round(float(row['avg_min_achievement']), 2),
                        "excellent_count": excellent,
                        "excellent_rate": round(excellent / total_ops * 100, 1) if total_ops > 0 else 0.0,
                        "good_count": good,
                        "good_rate": round(good / total_ops * 100, 1) if total_ops > 0 else 0.0,
                        "failed_count": failed,
                        "failed_rate": round(failed / total_ops * 100, 1) if total_ops > 0 else 0.0
                    })

                return {
                    "period_days": days,
                    "start_date": start_date_str,
                    "end_date": end_date.strftime("%Y-%m-%d"),
                    "total_optimizers": len(results),
                    "leaderboard": results
                }

        except Exception as e:
            print(f"Leaderboard error: {e}", file=sys.stderr, flush=True)
            return {
                "error": str(e)
            }

    def evaluate_operations_7days_ago(self) -> Dict[str, Any]:
        """
        Batch evaluate all operations from 7 days ago

        This should be run daily to evaluate operations that were made 7 days ago.

        Returns:
            Summary of evaluation results
        """
        try:
            # Calculate target date (7 days ago)
            target_date = datetime.now() - timedelta(days=7)
            target_date_str = target_date.strftime("%Y-%m-%d")

            with self.db:
                # Get all operations from 7 days ago that haven't been evaluated
                operations_query = """
                    SELECT ce.id
                    FROM change_events ce
                    LEFT JOIN operation_score os ON ce.id = os.operation_id
                    WHERE DATE(ce.timestamp) = %s
                      AND os.id IS NULL
                      AND ce.resource_type IN ('CAMPAIGN_BUDGET', 'CAMPAIGN')
                    ORDER BY ce.id
                """

                operations = self.db.execute_query(operations_query, (target_date_str,))

                results = []
                success_count = 0
                failed_count = 0

                for op in operations:
                    operation_id = op['id']
                    evaluation = self.evaluate_operation(operation_id)

                    if 'error' not in evaluation:
                        success_count += 1
                        results.append({
                            "operation_id": operation_id,
                            "optimizer": evaluation['optimizer_email'],
                            "score": evaluation['score'],
                            "min_achievement_rate": evaluation['min_achievement_rate']
                        })
                    else:
                        failed_count += 1
                        results.append({
                            "operation_id": operation_id,
                            "error": evaluation['error']
                        })

                return {
                    "success": True,
                    "target_date": target_date_str,
                    "total_operations": len(operations),
                    "success_count": success_count,
                    "failed_count": failed_count,
                    "results": results
                }

        except Exception as e:
            print(f"Batch evaluation error: {e}", file=sys.stderr, flush=True)
            return {
                "success": False,
                "error": str(e)
            }


def main():
    """Main entry point for CLI usage"""
    input_data = read_input()

    evaluator = OperationEvaluator()

    action = input_data.get('action')

    if action == 'evaluate':
        # Evaluate single operation
        result = evaluator.evaluate_operation(
            operation_id=input_data.get('operationId')
        )
    elif action == 'leaderboard':
        # Get optimizer leaderboard
        result = evaluator.get_optimizer_leaderboard(
            days=input_data.get('days', 30),
            limit=input_data.get('limit', 20)
        )
    elif action == 'evaluate_7days_ago':
        # Batch evaluate operations from 7 days ago
        result = evaluator.evaluate_operations_7days_ago()
    else:
        result = {"error": f"Unknown action: {action}"}

    format_output(result)


if __name__ == "__main__":
    main()
