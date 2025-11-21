#!/usr/bin/env python3
"""
A2: Safety Baseline Calculator

Calculates ROAS7 and RET7 baselines based on data from 180 days ago (6 months prior).
This baseline represents the "passing grade" for campaign performance.
"""

import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from db_utils import get_db, format_output, read_input


class BaselineCalculator:
    """Calculate safety baselines for campaign evaluation"""

    def __init__(self):
        self.db = get_db()

    def calculate_baseline(
        self,
        product_name: str,
        country_code: str,
        platform: str = "Android",
        channel: str = "Google",
        current_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate baseline ROAS7 and RET7 for a specific product/country/platform/channel

        Args:
            product_name: Product name (e.g., "Solitaire")
            country_code: Country code (e.g., "US")
            platform: Platform (default: "Android")
            channel: Channel (default: "Google")
            current_date: Current date in ISO format (default: today)

        Returns:
            Dictionary containing:
            - baseline_roas7: float
            - baseline_ret7: float
            - reference_period: str (e.g., "2024-06")
            - total_spend: float
            - total_revenue: float
            - total_installs: int
            - total_d7_active: int
        """
        try:
            # Parse current date
            if current_date:
                current = datetime.fromisoformat(current_date.replace('Z', '+00:00'))
            else:
                current = datetime.now()

            # Calculate reference period (6 months ago)
            reference_date = current - timedelta(days=180)
            reference_period = reference_date.strftime("%Y-%m")

            # Calculate month boundaries
            year = reference_date.year
            month = reference_date.month
            month_start = f"{year}-{month:02d}-01"

            # Calculate last day of the month
            if month == 12:
                next_month = f"{year + 1}-01-01"
            else:
                next_month = f"{year}-{month + 1:02d}-01"

            with self.db:
                # Query campaign data for the reference period
                # This is Mock Data query - will use mock_campaign_performance table
                campaign_query = """
                    SELECT
                        COALESCE(SUM(total_spend), 0) as total_spend,
                        COALESCE(SUM(total_revenue), 0) as total_revenue,
                        COALESCE(SUM(total_installs), 0) as total_installs,
                        COALESCE(SUM(d7_active_users), 0) as total_d7_active
                    FROM mock_campaign_performance
                    WHERE product_name = %s
                      AND country_code = %s
                      AND platform = %s
                      AND channel = %s
                      AND date >= %s
                      AND date < %s
                """

                results = self.db.execute_query(
                    campaign_query,
                    (product_name, country_code, platform, channel, month_start, next_month)
                )

                if not results or len(results) == 0:
                    return {
                        "error": f"No data found for {product_name}/{country_code}/{platform}/{channel} in {reference_period}",
                        "baseline_roas7": None,
                        "baseline_ret7": None,
                        "reference_period": reference_period
                    }

                data = results[0]
                total_spend = float(data['total_spend'])
                total_revenue = float(data['total_revenue'])
                total_installs = int(data['total_installs'])
                total_d7_active = int(data['total_d7_active'])

                # Calculate baselines
                baseline_roas7 = (total_revenue / total_spend) if total_spend > 0 else 0.0
                baseline_ret7 = (total_d7_active / total_installs) if total_installs > 0 else 0.0

                return {
                    "baseline_roas7": round(baseline_roas7, 4),
                    "baseline_ret7": round(baseline_ret7, 4),
                    "reference_period": reference_period,
                    "total_spend": total_spend,
                    "total_revenue": total_revenue,
                    "total_installs": total_installs,
                    "total_d7_active": total_d7_active
                }

        except Exception as e:
            return {
                "error": str(e),
                "baseline_roas7": None,
                "baseline_ret7": None
            }

    def upsert_baseline(
        self,
        product_name: str,
        country_code: str,
        platform: str,
        channel: str,
        baseline_roas7: float,
        baseline_ret7: float,
        reference_period: str
    ) -> bool:
        """
        Insert or update baseline in safety_baseline table

        Args:
            product_name: Product name
            country_code: Country code
            platform: Platform
            channel: Channel
            baseline_roas7: Calculated ROAS7 baseline
            baseline_ret7: Calculated RET7 baseline
            reference_period: Reference period (e.g., "2024-06")

        Returns:
            True if successful, False otherwise
        """
        try:
            with self.db:
                query = """
                    INSERT INTO safety_baseline (
                        product_name, country_code, platform, channel,
                        baseline_roas7, baseline_ret7, reference_period, last_updated
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (product_name, country_code, platform, channel)
                    DO UPDATE SET
                        baseline_roas7 = EXCLUDED.baseline_roas7,
                        baseline_ret7 = EXCLUDED.baseline_ret7,
                        reference_period = EXCLUDED.reference_period,
                        last_updated = NOW()
                """

                return self.db.execute_update(
                    query,
                    (product_name, country_code, platform, channel,
                     baseline_roas7, baseline_ret7, reference_period)
                )

        except Exception as e:
            print(f"Upsert baseline error: {e}", file=sys.stderr, flush=True)
            return False

    def update_all_baselines(self, current_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Batch update baselines for all product/country/platform/channel combinations

        This should be run on the 1st of each month to update all baselines.

        Args:
            current_date: Current date in ISO format (default: today)

        Returns:
            Dictionary containing:
            - success: bool
            - updated_count: int
            - failed_count: int
            - results: List of update results
        """
        try:
            with self.db:
                # Query all unique combinations from mock data
                combo_query = """
                    SELECT DISTINCT
                        product_name,
                        country_code,
                        platform,
                        channel
                    FROM mock_campaign_performance
                    ORDER BY product_name, country_code, platform, channel
                """

                combinations = self.db.execute_query(combo_query)

                updated_count = 0
                failed_count = 0
                results = []

                for combo in combinations:
                    # Calculate baseline for this combination
                    baseline = self.calculate_baseline(
                        product_name=combo['product_name'],
                        country_code=combo['country_code'],
                        platform=combo['platform'],
                        channel=combo['channel'],
                        current_date=current_date
                    )

                    if 'error' not in baseline and baseline['baseline_roas7'] is not None:
                        # Upsert to database
                        success = self.upsert_baseline(
                            product_name=combo['product_name'],
                            country_code=combo['country_code'],
                            platform=combo['platform'],
                            channel=combo['channel'],
                            baseline_roas7=baseline['baseline_roas7'],
                            baseline_ret7=baseline['baseline_ret7'],
                            reference_period=baseline['reference_period']
                        )

                        if success:
                            updated_count += 1
                            results.append({
                                "product": combo['product_name'],
                                "country": combo['country_code'],
                                "platform": combo['platform'],
                                "channel": combo['channel'],
                                "baseline_roas7": baseline['baseline_roas7'],
                                "baseline_ret7": baseline['baseline_ret7'],
                                "status": "updated"
                            })
                        else:
                            failed_count += 1
                            results.append({
                                "product": combo['product_name'],
                                "country": combo['country_code'],
                                "status": "failed"
                            })
                    else:
                        failed_count += 1
                        results.append({
                            "product": combo['product_name'],
                            "country": combo['country_code'],
                            "status": "no_data",
                            "error": baseline.get('error', 'Unknown error')
                        })

                return {
                    "success": True,
                    "updated_count": updated_count,
                    "failed_count": failed_count,
                    "total_count": len(combinations),
                    "results": results
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "updated_count": 0,
                "failed_count": 0
            }


def main():
    """Main entry point for CLI usage"""
    # Read input from stdin (sent by TypeScript wrapper)
    input_data = read_input()

    calculator = BaselineCalculator()

    action = input_data.get('action', 'calculate')

    if action == 'calculate':
        # Calculate baseline for specific combination
        result = calculator.calculate_baseline(
            product_name=input_data.get('productName', 'Solitaire'),
            country_code=input_data.get('countryCode', 'US'),
            platform=input_data.get('platform', 'Android'),
            channel=input_data.get('channel', 'Google'),
            current_date=input_data.get('currentDate')
        )
    elif action == 'update_all':
        # Batch update all baselines
        result = calculator.update_all_baselines(
            current_date=input_data.get('currentDate')
        )
    else:
        result = {"error": f"Unknown action: {action}"}

    # Output result as JSON to stdout
    format_output(result)


if __name__ == "__main__":
    main()
