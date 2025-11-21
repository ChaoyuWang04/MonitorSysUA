/**
 * A4: Creative Evaluator - TypeScript Wrapper
 *
 * Wraps Python creative_evaluator.py for use in Node.js/Next.js
 */

import { spawn } from "child_process";
import path from "path";

export interface CreativeEvaluationD3Result {
  creative_id: string;
  creative_name: string;
  campaign_id: string;
  evaluation_day: "D3";
  impressions: number;
  installs: number;
  actual_cpi: number;
  actual_roas: number;
  max_cpi_threshold: number;
  min_roas_threshold: number;
  creative_status: "不及格" | "测试中";
  reason: string;
  error?: string;
}

export interface CreativeEvaluationD7Result {
  creative_id: string;
  creative_name: string;
  campaign_id: string;
  evaluation_day: "D7";
  impressions: number;
  installs: number;
  cvr: number;
  actual_cpi: number;
  actual_roas: number;
  max_cpi_threshold: number;
  min_roas_threshold: number;
  excellent_cvr_threshold: number;
  creative_status: "不及格" | "及格" | "出量好素材";
  reason: string;
  cpi_pass: boolean;
  roas_pass: boolean;
  cvr_excellent: boolean;
  error?: string;
}

export interface CampaignClosureCheckResult {
  campaign_id: string;
  should_close: boolean;
  reason: string;
  total_creatives: number;
  evaluated_creatives: number;
  passed_creatives: number;
  failed_creatives: number;
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
 * Evaluate creative at D3
 *
 * Checks CPI and ROAS3 against thresholds. Fails creatives with:
 * - CPI > max_cpi_threshold
 * - ROAS3 < min_roas_d3
 *
 * @param creativeId - Creative ID
 * @param campaignId - Campaign ID
 * @returns D3 evaluation result
 *
 * @example
 * ```typescript
 * const result = await evaluateCreativeD3("creative-123", "campaign-456");
 * if (result.creative_status === "不及格") {
 *   console.log(`Creative failed D3: ${result.reason}`);
 * }
 * ```
 */
export async function evaluateCreativeD3(
  creativeId: string,
  campaignId: string
): Promise<CreativeEvaluationD3Result> {
  const input = {
    action: "evaluate_d3",
    creativeId,
    campaignId,
  };

  return runPythonScript<CreativeEvaluationD3Result>(
    "creative_evaluator.py",
    input
  );
}

/**
 * Evaluate creative at D7
 *
 * Checks CPI, ROAS7, and CVR. Classifies creatives as:
 * - 出量好素材: CPI + ROAS7 pass + CVR excellent
 * - 及格: CPI + ROAS7 pass
 * - 不及格: Otherwise
 *
 * @param creativeId - Creative ID
 * @param campaignId - Campaign ID
 * @returns D7 evaluation result
 *
 * @example
 * ```typescript
 * const result = await evaluateCreativeD7("creative-123", "campaign-456");
 * if (result.creative_status === "出量好素材") {
 *   console.log("⭐ High-volume creative found!");
 *   console.log(`CVR: ${result.cvr * 100}%`);
 * }
 * ```
 */
export async function evaluateCreativeD7(
  creativeId: string,
  campaignId: string
): Promise<CreativeEvaluationD7Result> {
  const input = {
    action: "evaluate_d7",
    creativeId,
    campaignId,
  };

  return runPythonScript<CreativeEvaluationD7Result>(
    "creative_evaluator.py",
    input
  );
}

/**
 * Check if test campaign should be closed
 *
 * Returns true if all creatives have been evaluated at D7 and none passed.
 *
 * @param campaignId - Campaign ID
 * @returns Campaign closure recommendation
 *
 * @example
 * ```typescript
 * const check = await checkCampaignClosure("campaign-456");
 * if (check.should_close) {
 *   console.log("⚠️ Recommend closing campaign:");
 *   console.log(check.reason);
 * }
 * ```
 */
export async function checkCampaignClosure(
  campaignId: string
): Promise<CampaignClosureCheckResult> {
  const input = {
    action: "check_closure",
    campaignId,
  };

  return runPythonScript<CampaignClosureCheckResult>(
    "creative_evaluator.py",
    input
  );
}

/**
 * Get creative evaluations from database (using existing queries)
 *
 * Note: This uses the existing Drizzle ORM queries, not Python
 */
export { getCreativeEvaluations } from "@/server/db/queries-evaluation";
