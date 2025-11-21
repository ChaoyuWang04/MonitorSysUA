/**
 * A3: Campaign Evaluator - TypeScript Wrapper
 *
 * Wraps Python campaign_evaluator.py for use in Node.js/Next.js
 */

import { spawn } from "child_process";
import path from "path";

export interface CampaignEvaluationResult {
  campaign_id: string;
  campaign_name: string;
  campaign_type: "test" | "mature";
  total_spend: number;
  actual_roas7: number;
  actual_ret7: number;
  baseline_roas7: number;
  baseline_ret7: number;
  roas_achievement_rate: number;
  ret_achievement_rate: number;
  min_achievement_rate: number;
  recommendation_type: string;
  recommendation_desc: string;
  status: "danger" | "warning" | "observation" | "healthy" | "excellent";
  action_options: ActionOption[];
  error?: string;
}

export interface ActionOption {
  type: string;
  label: string;
  options: Array<{
    value: string;
    description: string;
  }>;
}

export interface BatchEvaluationResult {
  success: boolean;
  evaluation_date: string;
  total_campaigns: number;
  success_count: number;
  failed_count: number;
  status_summary: {
    danger: number;
    warning: number;
    observation: number;
    healthy: number;
    excellent: number;
  };
  results: Array<{
    campaign_id: string;
    status?: string;
    min_achievement_rate?: number;
    recommendation?: string;
    error?: string;
  }>;
  error?: string;
}

/**
 * Run Python script and return parsed JSON output
 */
async function runPythonScript<T>(
  scriptName: string,
  input: Record<string, any>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      "server",
      "evaluation",
      "python",
      scriptName
    );

    const pythonProcess = spawn("python3", [scriptPath]);

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Python script exited with code ${code}\nStderr: ${stderrData}`
          )
        );
        return;
      }

      try {
        const result = JSON.parse(stdoutData);
        resolve(result);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Python output: ${error}\nOutput: ${stdoutData}\nStderr: ${stderrData}`
          )
        );
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    pythonProcess.stdin.write(JSON.stringify(input));
    pythonProcess.stdin.end();
  });
}

/**
 * Evaluate a single campaign
 *
 * Calculates ROAS7/RET7 achievement rates and generates recommendations
 *
 * @param campaignId - Campaign ID to evaluate
 * @param evaluationDate - Date to evaluate (default: today)
 * @returns Campaign evaluation result with recommendations
 *
 * @example
 * ```typescript
 * const result = await evaluateCampaign("campaign-123");
 * if (result.status === "danger") {
 *   console.log("⚠️ Campaign needs attention!");
 *   console.log(result.recommendation_desc);
 * }
 * ```
 */
export async function evaluateCampaign(
  campaignId: string,
  evaluationDate?: Date | string
): Promise<CampaignEvaluationResult> {
  // Handle both Date objects and date strings
  let dateStr: string | undefined;
  if (evaluationDate) {
    if (typeof evaluationDate === 'string') {
      dateStr = evaluationDate;
    } else {
      dateStr = evaluationDate.toISOString();
    }
  }

  const input = {
    action: "evaluate",
    campaignId,
    evaluationDate: dateStr,
  };

  return runPythonScript<CampaignEvaluationResult>(
    "campaign_evaluator.py",
    input
  );
}

/**
 * Batch evaluate all campaigns
 *
 * Evaluates all campaigns for a given date and returns summary statistics
 *
 * @param evaluationDate - Date to evaluate (default: today)
 * @returns Batch evaluation summary with status breakdown
 *
 * @example
 * ```typescript
 * const result = await evaluateAllCampaigns();
 * console.log(`Evaluated ${result.total_campaigns} campaigns`);
 * console.log(`Danger: ${result.status_summary.danger}`);
 * console.log(`Excellent: ${result.status_summary.excellent}`);
 * ```
 */
export async function evaluateAllCampaigns(
  evaluationDate?: Date
): Promise<BatchEvaluationResult> {
  const input = {
    action: "evaluate_all",
    evaluationDate: evaluationDate?.toISOString(),
  };

  return runPythonScript<BatchEvaluationResult>(
    "campaign_evaluator.py",
    input
  );
}

/**
 * Get campaign evaluations from database (using existing queries)
 *
 * Note: This uses the existing Drizzle ORM queries, not Python
 */
export { getCampaignEvaluations, createCampaignEvaluation } from "@/server/db/queries-evaluation";
