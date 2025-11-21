#!/usr/bin/env python3
"""
A3: Campaign Evaluator

Evaluates campaign performance based on ROAS7 and RET7 achievement rates.
Generates recommendations and action options for optimizers.
"""

import sys
from datetime import datetime
from typing import Dict, Any, List, Optional
from db_utils import get_db, format_output, read_input


class CampaignEvaluator:
    """Evaluate campaign performance and generate recommendations"""

    # Campaign type thresholds
    TEST_CAMPAIGN_THRESHOLD = 1000.0  # Total spend < $1000 = test campaign

    # Achievement rate thresholds
    DANGER_THRESHOLD = 60.0  # < 60% = danger
    WARNING_THRESHOLD = 85.0  # 60-85% = warning
    OBSERVATION_THRESHOLD = 100.0  # 85-100% = observation
    HEALTHY_THRESHOLD = 110.0  # 100-110% = healthy, >= 110% = excellent

    def __init__(self):
        self.db = get_db()

    def evaluate_campaign(
        self,
        campaign_id: str,
        evaluation_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a single campaign

        Args:
            campaign_id: Campaign ID
            evaluation_date: Evaluation date in ISO format (default: today)

        Returns:
            Dictionary containing:
            - campaign_id: str
            - campaign_name: str
            - campaign_type: "test" | "mature"
            - total_spend: float
            - actual_roas7: float
            - actual_ret7: float
            - baseline_roas7: float
            - baseline_ret7: float
            - roas_achievement_rate: float (%)
            - ret_achievement_rate: float (%)
            - min_achievement_rate: float (%)
            - recommendation_type: str
            - status: "danger" | "warning" | "observation" | "healthy" | "excellent"
            - action_options: List of available actions
        """
        try:
            # Parse evaluation date
            if evaluation_date:
                eval_date = datetime.fromisoformat(evaluation_date.replace('Z', '+00:00'))
            else:
                eval_date = datetime.now()

            eval_date_str = eval_date.strftime("%Y-%m-%d")

            with self.db:
                # 1. Get campaign basic info and performance data
                campaign_query = """
                    SELECT
                        campaign_id,
                        campaign_name,
                        product_name,
                        country_code,
                        platform,
                        channel,
                        total_spend,
                        actual_roas7,
                        actual_ret7
                    FROM mock_campaign_performance
                    WHERE campaign_id = %s
                      AND date = %s
                    LIMIT 1
                """

                campaign_results = self.db.execute_query(campaign_query, (campaign_id, eval_date_str))

                if not campaign_results or len(campaign_results) == 0:
                    return {
                        "error": f"Campaign {campaign_id} not found for date {eval_date_str}",
                        "campaign_id": campaign_id
                    }

                campaign = campaign_results[0]

                # 2. Determine campaign type
                total_spend = float(campaign['total_spend'])
                campaign_type = "test" if total_spend < self.TEST_CAMPAIGN_THRESHOLD else "mature"

                # 3. Get safety baseline
                baseline_query = """
                    SELECT baseline_roas7, baseline_ret7, reference_period
                    FROM safety_baseline
                    WHERE product_name = %s
                      AND country_code = %s
                      AND platform = %s
                      AND channel = %s
                    LIMIT 1
                """

                baseline_results = self.db.execute_query(
                    baseline_query,
                    (campaign['product_name'], campaign['country_code'],
                     campaign['platform'], campaign['channel'])
                )

                if not baseline_results or len(baseline_results) == 0:
                    return {
                        "error": f"No baseline found for {campaign['product_name']}/{campaign['country_code']}",
                        "campaign_id": campaign_id
                    }

                baseline = baseline_results[0]
                baseline_roas7 = float(baseline['baseline_roas7'])
                baseline_ret7 = float(baseline['baseline_ret7'])

                # 4. Calculate achievement rates
                actual_roas7 = float(campaign['actual_roas7'])
                actual_ret7 = float(campaign['actual_ret7'])

                roas_achievement_rate = (actual_roas7 / baseline_roas7 * 100) if baseline_roas7 > 0 else 0.0
                ret_achievement_rate = (actual_ret7 / baseline_ret7 * 100) if baseline_ret7 > 0 else 0.0

                # Use minimum achievement rate (bucket effect - weakest link determines overall health)
                min_achievement_rate = min(roas_achievement_rate, ret_achievement_rate)

                # 5. Generate recommendation
                recommendation = self.generate_recommendation(min_achievement_rate)
                status = self.get_status(min_achievement_rate)

                # 6. Generate action options
                action_options = self.generate_action_options(recommendation['type'])

                # 7. Save evaluation to database
                self.save_evaluation(
                    campaign_id=campaign_id,
                    campaign_name=campaign['campaign_name'],
                    evaluation_date=eval_date_str,
                    campaign_type=campaign_type,
                    total_spend=total_spend,
                    actual_roas7=actual_roas7,
                    actual_ret7=actual_ret7,
                    baseline_roas7=baseline_roas7,
                    baseline_ret7=baseline_ret7,
                    roas_achievement_rate=roas_achievement_rate,
                    ret_achievement_rate=ret_achievement_rate,
                    min_achievement_rate=min_achievement_rate,
                    recommendation_type=recommendation['type'],
                    status=status
                )

                return {
                    "campaign_id": campaign_id,
                    "campaign_name": campaign['campaign_name'],
                    "campaign_type": campaign_type,
                    "total_spend": total_spend,
                    "actual_roas7": actual_roas7,
                    "actual_ret7": actual_ret7,
                    "baseline_roas7": baseline_roas7,
                    "baseline_ret7": baseline_ret7,
                    "roas_achievement_rate": round(roas_achievement_rate, 2),
                    "ret_achievement_rate": round(ret_achievement_rate, 2),
                    "min_achievement_rate": round(min_achievement_rate, 2),
                    "recommendation_type": recommendation['type'],
                    "recommendation_desc": recommendation['description'],
                    "status": status,
                    "action_options": action_options
                }

        except Exception as e:
            print(f"Campaign evaluation error: {e}", file=sys.stderr, flush=True)
            return {
                "error": str(e),
                "campaign_id": campaign_id
            }

    def generate_recommendation(self, min_achievement_rate: float) -> Dict[str, str]:
        """
        Generate recommendation based on achievement rate

        Args:
            min_achievement_rate: Minimum of ROAS and RET achievement rates

        Returns:
            Dictionary with type and description
        """
        if min_achievement_rate < self.DANGER_THRESHOLD:
            return {
                "type": "关停",
                "description": "达成率低于60%，严重亏损，建议立即关停campaign"
            }
        elif min_achievement_rate < self.WARNING_THRESHOLD:
            return {
                "type": "保守缩量",
                "description": "达成率60-85%，表现不佳，建议减少投入观察变化"
            }
        elif min_achievement_rate < self.OBSERVATION_THRESHOLD:
            return {
                "type": "继续观察",
                "description": "达成率85-100%，接近及格线，保持现状等待更多数据"
            }
        elif min_achievement_rate < self.HEALTHY_THRESHOLD:
            return {
                "type": "保守扩量或观察",
                "description": "达成率100-110%，表现达标，可小幅增加投入测试"
            }
        else:
            return {
                "type": "激进扩量",
                "description": "达成率≥110%，表现优异，建议大幅增加投入"
            }

    def get_status(self, min_achievement_rate: float) -> str:
        """Get status label based on achievement rate"""
        if min_achievement_rate < self.DANGER_THRESHOLD:
            return "danger"
        elif min_achievement_rate < self.WARNING_THRESHOLD:
            return "warning"
        elif min_achievement_rate < self.OBSERVATION_THRESHOLD:
            return "observation"
        elif min_achievement_rate < self.HEALTHY_THRESHOLD:
            return "healthy"
        else:
            return "excellent"

    def generate_action_options(self, recommendation_type: str) -> List[Dict[str, Any]]:
        """
        Generate action options based on recommendation type

        Args:
            recommendation_type: Type of recommendation

        Returns:
            List of action option groups
        """
        if recommendation_type in ["激进扩量", "保守扩量或观察"]:
            # Scale up actions
            return [
                {
                    "type": "budget",
                    "label": "提高预算",
                    "options": [
                        {"value": "+1%", "description": "试探性调整"},
                        {"value": "+3%", "description": "标准调整"},
                        {"value": "+5%", "description": "激进调整"},
                        {"value": "custom", "description": "自定义"}
                    ]
                },
                {
                    "type": "troas",
                    "label": "降低tROAS",
                    "options": [
                        {"value": "-1%", "description": "试探性调整"},
                        {"value": "-3%", "description": "标准调整"},
                        {"value": "-5%", "description": "激进调整"},
                        {"value": "custom", "description": "自定义"}
                    ]
                },
                {
                    "type": "none",
                    "label": "暂不调整",
                    "options": [{"value": "observe", "description": "继续观察"}]
                }
            ]
        elif recommendation_type in ["保守缩量", "继续观察"]:
            # Scale down or observe actions
            return [
                {
                    "type": "budget",
                    "label": "降低预算",
                    "options": [
                        {"value": "-1%", "description": "试探性调整"},
                        {"value": "-3%", "description": "标准调整"},
                        {"value": "-5%", "description": "激进调整"},
                        {"value": "custom", "description": "自定义"}
                    ]
                },
                {
                    "type": "troas",
                    "label": "提高tROAS",
                    "options": [
                        {"value": "+1%", "description": "试探性调整"},
                        {"value": "+3%", "description": "标准调整"},
                        {"value": "+5%", "description": "激进调整"},
                        {"value": "custom", "description": "自定义"}
                    ]
                },
                {
                    "type": "pause",
                    "label": "暂停campaign",
                    "options": [{"value": "pause", "description": "立即暂停"}]
                },
                {
                    "type": "none",
                    "label": "继续观察",
                    "options": [{"value": "observe", "description": "暂不调整"}]
                }
            ]
        else:  # 关停
            return [
                {
                    "type": "pause",
                    "label": "暂停campaign",
                    "options": [{"value": "pause", "description": "立即暂停"}]
                },
                {
                    "type": "none",
                    "label": "继续观察",
                    "options": [{"value": "observe", "description": "暂不调整，再观察"}]
                }
            ]

    def save_evaluation(
        self,
        campaign_id: str,
        campaign_name: str,
        evaluation_date: str,
        campaign_type: str,
        total_spend: float,
        actual_roas7: float,
        actual_ret7: float,
        baseline_roas7: float,
        baseline_ret7: float,
        roas_achievement_rate: float,
        ret_achievement_rate: float,
        min_achievement_rate: float,
        recommendation_type: str,
        status: str
    ) -> bool:
        """Save evaluation result to database"""
        try:
            query = """
                INSERT INTO campaign_evaluation (
                    campaign_id, campaign_name, evaluation_date, campaign_type,
                    total_spend, actual_roas7, actual_ret7,
                    baseline_roas7, baseline_ret7,
                    roas_achievement_rate, ret_achievement_rate, min_achievement_rate,
                    recommendation_type, status, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """

            return self.db.execute_update(
                query,
                (campaign_id, campaign_name, evaluation_date, campaign_type,
                 total_spend, actual_roas7, actual_ret7,
                 baseline_roas7, baseline_ret7,
                 roas_achievement_rate, ret_achievement_rate, min_achievement_rate,
                 recommendation_type, status)
            )

        except Exception as e:
            print(f"Save evaluation error: {e}", file=sys.stderr, flush=True)
            return False

    def evaluate_all_campaigns(self, evaluation_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Batch evaluate all campaigns

        Args:
            evaluation_date: Evaluation date (default: today)

        Returns:
            Summary of evaluation results
        """
        try:
            # Parse evaluation date
            if evaluation_date:
                eval_date = datetime.fromisoformat(evaluation_date.replace('Z', '+00:00'))
            else:
                eval_date = datetime.now()

            eval_date_str = eval_date.strftime("%Y-%m-%d")

            with self.db:
                # Get all campaigns for the evaluation date
                campaigns_query = """
                    SELECT DISTINCT campaign_id
                    FROM mock_campaign_performance
                    WHERE date = %s
                    ORDER BY campaign_id
                """

                campaigns = self.db.execute_query(campaigns_query, (eval_date_str,))

                results = []
                success_count = 0
                failed_count = 0

                for campaign in campaigns:
                    campaign_id = campaign['campaign_id']
                    evaluation = self.evaluate_campaign(campaign_id, evaluation_date)

                    if 'error' not in evaluation:
                        success_count += 1
                        results.append({
                            "campaign_id": campaign_id,
                            "status": evaluation['status'],
                            "min_achievement_rate": evaluation['min_achievement_rate'],
                            "recommendation": evaluation['recommendation_type']
                        })
                    else:
                        failed_count += 1
                        results.append({
                            "campaign_id": campaign_id,
                            "error": evaluation['error']
                        })

                # Group by status
                status_summary = {
                    "danger": len([r for r in results if r.get('status') == 'danger']),
                    "warning": len([r for r in results if r.get('status') == 'warning']),
                    "observation": len([r for r in results if r.get('status') == 'observation']),
                    "healthy": len([r for r in results if r.get('status') == 'healthy']),
                    "excellent": len([r for r in results if r.get('status') == 'excellent'])
                }

                return {
                    "success": True,
                    "evaluation_date": eval_date_str,
                    "total_campaigns": len(campaigns),
                    "success_count": success_count,
                    "failed_count": failed_count,
                    "status_summary": status_summary,
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

    evaluator = CampaignEvaluator()

    action = input_data.get('action', 'evaluate')

    if action == 'evaluate':
        # Evaluate single campaign
        result = evaluator.evaluate_campaign(
            campaign_id=input_data.get('campaignId'),
            evaluation_date=input_data.get('evaluationDate')
        )
    elif action == 'evaluate_all':
        # Batch evaluate all campaigns
        result = evaluator.evaluate_all_campaigns(
            evaluation_date=input_data.get('evaluationDate')
        )
    else:
        result = {"error": f"Unknown action: {action}"}

    format_output(result)


if __name__ == "__main__":
    main()
