/**
 * A2: Safety Baseline Calculator - TypeScript Wrapper
 *
 * Wraps Python baseline_calculator.py for use in Node.js/Next.js
 */

import { spawn } from "child_process";
import path from "path";

export interface BaselineResult {
  baseline_roas7: number | null;
  baseline_ret7: number | null;
  reference_period: string;
  total_spend?: number;
  total_revenue?: number;
  total_installs?: number;
  total_d7_active?: number;
  error?: string;
}

export interface UpdateAllBaselinesResult {
  success: boolean;
  updated_count: number;
  failed_count: number;
  total_count: number;
  results: Array<{
    product: string;
    country: string;
    platform?: string;
    channel?: string;
    baseline_roas7?: number;
    baseline_ret7?: number;
    status: string;
    error?: string;
  }>;
  error?: string;
}

export interface CalculateBaselineParams {
  productName: string;
  countryCode: string;
  platform?: string;
  channel?: string;
  currentDate?: Date;
}

/**
 * Run Python script and return parsed JSON output
 *
 * @param scriptName - Python script filename
 * @param input - Input data to pass to Python script via stdin
 * @returns Parsed output from Python script
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

    // Collect stdout
    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    // Collect stderr
    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    // Handle process exit
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
        // Parse JSON output from stdout
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

    // Handle process errors
    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    // Send input data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(input));
    pythonProcess.stdin.end();
  });
}

/**
 * Calculate safety baseline for a specific product/country/platform/channel
 *
 * This calculates ROAS7 and RET7 baselines based on data from 180 days ago.
 *
 * @param params - Calculation parameters
 * @returns Baseline calculation result
 *
 * @example
 * ```typescript
 * const baseline = await calculateBaseline({
 *   productName: "Solitaire",
 *   countryCode: "US",
 *   platform: "Android",
 *   channel: "Google"
 * });
 * console.log(baseline.baseline_roas7); // e.g., 0.45
 * console.log(baseline.baseline_ret7);  // e.g., 0.38
 * ```
 */
export async function calculateBaseline(
  params: CalculateBaselineParams
): Promise<BaselineResult> {
  const input = {
    action: "calculate",
    productName: params.productName,
    countryCode: params.countryCode,
    platform: params.platform || "Android",
    channel: params.channel || "Google",
    currentDate: params.currentDate?.toISOString(),
  };

  return runPythonScript<BaselineResult>("baseline_calculator.py", input);
}

/**
 * Batch update all safety baselines
 *
 * This should be run on the 1st of each month to update all product/country/platform/channel baselines.
 *
 * @param currentDate - Current date (optional, defaults to now)
 * @returns Update results with success/failure counts
 *
 * @example
 * ```typescript
 * const result = await updateAllBaselines();
 * console.log(`Updated: ${result.updated_count}, Failed: ${result.failed_count}`);
 * ```
 */
export async function updateAllBaselines(
  currentDate?: Date
): Promise<UpdateAllBaselinesResult> {
  const input = {
    action: "update_all",
    currentDate: currentDate?.toISOString(),
  };

  return runPythonScript<UpdateAllBaselinesResult>(
    "baseline_calculator.py",
    input
  );
}

/**
 * Get baseline from database (using existing queries-evaluation.ts)
 *
 * Note: This is a TypeScript-only function that doesn't call Python.
 * It uses the existing Drizzle ORM queries.
 */
export { getSafetyBaseline, upsertSafetyBaseline } from "@/server/db/queries-evaluation";
