#!/usr/bin/env python3
"""
A4: Creative Evaluator

Evaluates creative performance for test campaigns at D3 and D7.
Identifies high-performing creatives for scaling.
"""

import sys
from datetime import datetime
from typing import Dict, Any, List, Optional
from db_utils import get_db, format_output, read_input


class CreativeEvaluator:
    """Evaluate creative performance for test campaigns"""

    def __init__(self):
        self.db = get_db()

    def evaluate_creative_d3(
        self,
        creative_id: str,
        campaign_id: str
    ) -> Dict[str, Any]:
        """
        D3 Evaluation: CPI + ROAS3

        Args:
            creative_id: Creative ID
            campaign_id: Campaign ID

        Returns:
            Dictionary containing:
            - creative_id: str
            - creative_name: str
            - campaign_id: str
            - evaluation_day: "D3"
            - impressions: int
            - installs: int
            - actual_cpi: float
            - actual_roas: float
            - max_cpi_threshold: float
            - min_roas_threshold: float
            - creative_status: "不及格" | "测试中"
            - reason: str
        """
        try:
            with self.db:
                # Get creative performance data
                creative_query = """
                    SELECT
                        creative_id,
                        creative_name,
                        campaign_id,
                        product_name,
                        country_code,
                        platform,
                        channel,
                        impressions,
                        installs,
                        cpi,
                        roas_d3,
                        spend
                    FROM mock_creative_performance
                    WHERE creative_id = %s
                      AND campaign_id = %s
                    LIMIT 1
                """

                creative_results = self.db.execute_query(
                    creative_query,
                    (creative_id, campaign_id)
                )

                if not creative_results or len(creative_results) == 0:
                    return {
                        "error": f"Creative {creative_id} not found in campaign {campaign_id}",
                        "creative_id": creative_id
                    }

                creative = creative_results[0]

                # Get creative test baseline (thresholds)
                baseline_query = """
                    SELECT
                        max_cpi,
                        min_roas_d3,
                        min_roas_d7,
                        excellent_cvr
                    FROM creative_test_baseline
                    WHERE product_name = %s
                      AND country_code = %s
                      AND platform = %s
                      AND channel = %s
                    LIMIT 1
                """

                baseline_results = self.db.execute_query(
                    baseline_query,
                    (creative['product_name'], creative['country_code'],
                     creative['platform'], creative['channel'])
                )

                if not baseline_results or len(baseline_results) == 0:
                    return {
                        "error": f"No creative baseline found for {creative['product_name']}/{creative['country_code']}",
                        "creative_id": creative_id
                    }

                baseline = baseline_results[0]
                max_cpi = float(baseline['max_cpi'])
                min_roas_d3 = float(baseline['min_roas_d3'])

                # Get actual metrics
                actual_cpi = float(creative['cpi'])
                actual_roas = float(creative['roas_d3'])
                impressions = int(creative['impressions'])
                installs = int(creative['installs'])

                # Evaluate D3
                if actual_cpi > max_cpi:
                    creative_status = "不及格"
                    reason = f"CPI ${actual_cpi:.2f} 超过阈值 ${max_cpi:.2f}"
                elif actual_roas < min_roas_d3:
                    creative_status = "不及格"
                    reason = f"ROAS3 {actual_roas*100:.2f}% 低于阈值 {min_roas_d3*100:.2f}%"
                else:
                    creative_status = "测试中"
                    reason = "D3表现合格，继续观察到D7"

                # Save evaluation
                self.save_creative_evaluation(
                    creative_id=creative_id,
                    creative_name=creative['creative_name'],
                    campaign_id=campaign_id,
                    evaluation_day="D3",
                    impressions=impressions,
                    installs=installs,
                    cvr=None,  # CVR only calculated at D7
                    actual_cpi=actual_cpi,
                    actual_roas=actual_roas,
                    max_cpi_threshold=max_cpi,
                    min_roas_threshold=min_roas_d3,
                    creative_status=creative_status
                )

                return {
                    "creative_id": creative_id,
                    "creative_name": creative['creative_name'],
                    "campaign_id": campaign_id,
                    "evaluation_day": "D3",
                    "impressions": impressions,
                    "installs": installs,
                    "actual_cpi": actual_cpi,
                    "actual_roas": actual_roas,
                    "max_cpi_threshold": max_cpi,
                    "min_roas_threshold": min_roas_d3,
                    "creative_status": creative_status,
                    "reason": reason
                }

        except Exception as e:
            print(f"D3 evaluation error: {e}", file=sys.stderr, flush=True)
            return {
                "error": str(e),
                "creative_id": creative_id
            }

    def evaluate_creative_d7(
        self,
        creative_id: str,
        campaign_id: str
    ) -> Dict[str, Any]:
        """
        D7 Evaluation: CPI + ROAS7 + CVR

        Determines final creative status:
        - 出量好素材: CPI合格 + ROAS7合格 + CVR >= excellent_cvr
        - 及格: CPI合格 + ROAS7合格
        - 不及格: 其他

        Args:
            creative_id: Creative ID
            campaign_id: Campaign ID

        Returns:
            Dictionary with evaluation results
        """
        try:
            with self.db:
                # Get creative performance data
                creative_query = """
                    SELECT
                        creative_id,
                        creative_name,
                        campaign_id,
                        product_name,
                        country_code,
                        platform,
                        channel,
                        impressions,
                        installs,
                        cpi,
                        roas_d7,
                        cvr,
                        spend
                    FROM mock_creative_performance
                    WHERE creative_id = %s
                      AND campaign_id = %s
                    LIMIT 1
                """

                creative_results = self.db.execute_query(
                    creative_query,
                    (creative_id, campaign_id)
                )

                if not creative_results or len(creative_results) == 0:
                    return {
                        "error": f"Creative {creative_id} not found in campaign {campaign_id}",
                        "creative_id": creative_id
                    }

                creative = creative_results[0]

                # Get creative test baseline
                baseline_query = """
                    SELECT
                        max_cpi,
                        min_roas_d7,
                        excellent_cvr
                    FROM creative_test_baseline
                    WHERE product_name = %s
                      AND country_code = %s
                      AND platform = %s
                      AND channel = %s
                    LIMIT 1
                """

                baseline_results = self.db.execute_query(
                    baseline_query,
                    (creative['product_name'], creative['country_code'],
                     creative['platform'], creative['channel'])
                )

                if not baseline_results or len(baseline_results) == 0:
                    return {
                        "error": f"No creative baseline found",
                        "creative_id": creative_id
                    }

                baseline = baseline_results[0]
                max_cpi = float(baseline['max_cpi'])
                min_roas_d7 = float(baseline['min_roas_d7'])
                excellent_cvr = float(baseline['excellent_cvr'])

                # Get actual metrics
                actual_cpi = float(creative['cpi'])
                actual_roas = float(creative['roas_d7'])
                actual_cvr = float(creative['cvr'])
                impressions = int(creative['impressions'])
                installs = int(creative['installs'])

                # Evaluate D7
                cpi_pass = actual_cpi <= max_cpi
                roas_pass = actual_roas >= min_roas_d7
                cvr_excellent = actual_cvr >= excellent_cvr

                if cpi_pass and roas_pass and cvr_excellent:
                    creative_status = "出量好素材"
                    reason = "CPI、ROAS7、CVR全部达标，建议同步到成熟campaign"
                elif cpi_pass and roas_pass:
                    creative_status = "及格"
                    reason = "CPI和ROAS7达标，但CVR未达到出量标准"
                else:
                    creative_status = "不及格"
                    reasons = []
                    if not cpi_pass:
                        reasons.append(f"CPI ${actual_cpi:.2f} > ${max_cpi:.2f}")
                    if not roas_pass:
                        reasons.append(f"ROAS7 {actual_roas*100:.2f}% < {min_roas_d7*100:.2f}%")
                    reason = "；".join(reasons)

                # Save evaluation
                self.save_creative_evaluation(
                    creative_id=creative_id,
                    creative_name=creative['creative_name'],
                    campaign_id=campaign_id,
                    evaluation_day="D7",
                    impressions=impressions,
                    installs=installs,
                    cvr=actual_cvr,
                    actual_cpi=actual_cpi,
                    actual_roas=actual_roas,
                    max_cpi_threshold=max_cpi,
                    min_roas_threshold=min_roas_d7,
                    creative_status=creative_status
                )

                return {
                    "creative_id": creative_id,
                    "creative_name": creative['creative_name'],
                    "campaign_id": campaign_id,
                    "evaluation_day": "D7",
                    "impressions": impressions,
                    "installs": installs,
                    "cvr": actual_cvr,
                    "actual_cpi": actual_cpi,
                    "actual_roas": actual_roas,
                    "max_cpi_threshold": max_cpi,
                    "min_roas_threshold": min_roas_d7,
                    "excellent_cvr_threshold": excellent_cvr,
                    "creative_status": creative_status,
                    "reason": reason,
                    "cpi_pass": cpi_pass,
                    "roas_pass": roas_pass,
                    "cvr_excellent": cvr_excellent
                }

        except Exception as e:
            print(f"D7 evaluation error: {e}", file=sys.stderr, flush=True)
            return {
                "error": str(e),
                "creative_id": creative_id
            }

    def check_campaign_closure(self, campaign_id: str) -> Dict[str, Any]:
        """
        Check if test campaign should be closed

        A test campaign should be closed if:
        - All creatives have completed D7 evaluation
        - None of the creatives passed

        Args:
            campaign_id: Campaign ID

        Returns:
            Dictionary containing:
            - should_close: bool
            - reason: str
            - total_creatives: int
            - evaluated_creatives: int
            - passed_creatives: int
            - failed_creatives: int
        """
        try:
            with self.db:
                # Get all D7 evaluations for this campaign
                eval_query = """
                    SELECT
                        creative_id,
                        creative_status
                    FROM creative_evaluation
                    WHERE campaign_id = %s
                      AND evaluation_day = 'D7'
                    ORDER BY created_at DESC
                """

                evaluations = self.db.execute_query(eval_query, (campaign_id,))

                # Get total creatives in campaign (from mock data)
                total_query = """
                    SELECT COUNT(DISTINCT creative_id) as total
                    FROM mock_creative_performance
                    WHERE campaign_id = %s
                """

                total_results = self.db.execute_query(total_query, (campaign_id,))
                total_creatives = int(total_results[0]['total']) if total_results else 0

                evaluated_creatives = len(evaluations)
                passed_creatives = len([
                    e for e in evaluations
                    if e['creative_status'] in ['及格', '出量好素材']
                ])
                failed_creatives = evaluated_creatives - passed_creatives

                # Determine if should close
                all_evaluated = evaluated_creatives >= total_creatives
                none_passed = passed_creatives == 0

                should_close = all_evaluated and none_passed

                if should_close:
                    reason = f"所有{total_creatives}个素材已完成D7评价，无一及格，建议关停整个campaign"
                elif not all_evaluated:
                    reason = f"还有{total_creatives - evaluated_creatives}个素材未完成D7评价"
                else:
                    reason = f"有{passed_creatives}个素材及格或优秀，campaign可继续运行"

                return {
                    "campaign_id": campaign_id,
                    "should_close": should_close,
                    "reason": reason,
                    "total_creatives": total_creatives,
                    "evaluated_creatives": evaluated_creatives,
                    "passed_creatives": passed_creatives,
                    "failed_creatives": failed_creatives
                }

        except Exception as e:
            print(f"Campaign closure check error: {e}", file=sys.stderr, flush=True)
            return {
                "error": str(e),
                "campaign_id": campaign_id
            }

    def save_creative_evaluation(
        self,
        creative_id: str,
        creative_name: str,
        campaign_id: str,
        evaluation_day: str,
        impressions: int,
        installs: int,
        cvr: Optional[float],
        actual_cpi: float,
        actual_roas: float,
        max_cpi_threshold: float,
        min_roas_threshold: float,
        creative_status: str
    ) -> bool:
        """Save creative evaluation to database"""
        try:
            query = """
                INSERT INTO creative_evaluation (
                    creative_id, creative_name, campaign_id, evaluation_day,
                    evaluation_date, impressions, installs, cvr,
                    actual_cpi, actual_roas,
                    max_cpi_threshold, min_roas_threshold,
                    creative_status, created_at
                )
                VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """

            return self.db.execute_update(
                query,
                (creative_id, creative_name, campaign_id, evaluation_day,
                 impressions, installs, cvr,
                 actual_cpi, actual_roas,
                 max_cpi_threshold, min_roas_threshold,
                 creative_status)
            )

        except Exception as e:
            print(f"Save creative evaluation error: {e}", file=sys.stderr, flush=True)
            return False


def main():
    """Main entry point for CLI usage"""
    input_data = read_input()

    evaluator = CreativeEvaluator()

    action = input_data.get('action')

    if action == 'evaluate_d3':
        result = evaluator.evaluate_creative_d3(
            creative_id=input_data.get('creativeId'),
            campaign_id=input_data.get('campaignId')
        )
    elif action == 'evaluate_d7':
        result = evaluator.evaluate_creative_d7(
            creative_id=input_data.get('creativeId'),
            campaign_id=input_data.get('campaignId')
        )
    elif action == 'check_closure':
        result = evaluator.check_campaign_closure(
            campaign_id=input_data.get('campaignId')
        )
    else:
        result = {"error": f"Unknown action: {action}"}

    format_output(result)


if __name__ == "__main__":
    main()
