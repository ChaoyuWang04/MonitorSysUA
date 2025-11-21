/**
 * A5: Operation Evaluator - TypeScript Wrapper
 *
 * Wraps Python operation_evaluator.py for use in Node.js/Next.js
 */

import { spawn } from "child_process";
import path from "path";

export interface OperationEvaluationResult {
  operation_id: number;
  campaign_id: string;
  campaign_name: string;
  optimizer_email: string;
  operation_type: string;
  operation_date: string;
  evaluation_date: string;
  actual_roas7: number;
  actual_ret7: number;
  baseline_roas7: number;
  baseline_ret7: number;
  roas_achievement_rate: number;
  ret_achievement_rate: number;
  min_achievement_rate: number;
  score: "优秀" | "合格" | "失败";
  error?: string;
}

export interface OptimizerStats {
  optimizer_email: string;
  total_operations: number;
  avg_roas_achievement: number;
  avg_ret_achievement: number;
  avg_min_achievement: number;
  excellent_count: number;
  excellent_rate: number;
  good_count: number;
  good_rate: number;
  failed_count: number;
  failed_rate: number;
}

export interface LeaderboardResult {
  period_days: number;
  start_date: string;
  end_date: string;
  total_optimizers: number;
  leaderboard: OptimizerStats[];
  error?: string;
}

export interface BatchEvaluationResult {
  success: boolean;
  target_date: string;
  total_operations: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    operation_id: number;
    optimizer?: string;
    score?: string;
    min_achievement_rate?: number;
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
 * Evaluate an operation 7 days after execution
 *
 * Calculates ROAS7/RET7 achievement rates 7 days post-operation and scores it.
 *
 * @param operationId - Operation ID from change_events table
 * @returns Operation evaluation result with score
 *
 * @example
 * ```typescript
 * const result = await evaluateOperation(12345);
 * console.log(`Optimizer: ${result.optimizer_email}`);
 * console.log(`Score: ${result.score}`);
 * console.log(`Achievement: ${result.min_achievement_rate}%`);
 * ```
 */
export async function evaluateOperation(
  operationId: number
): Promise<OperationEvaluationResult> {
  const input = {
    action: "evaluate",
    operationId,
  };

  return runPythonScript<OperationEvaluationResult>(
    "operation_evaluator.py",
    input
  );
}

/**
 * Get optimizer leaderboard
 *
 * Returns ranked list of optimizers based on their operation performance
 *
 * @param days - Look back period in days (default: 30)
 * @param limit - Maximum number of optimizers to return (default: 20)
 * @returns Leaderboard with optimizer statistics
 *
 * @example
 * ```typescript
 * const leaderboard = await getOptimizerLeaderboard(30, 10);
 * console.log(`Top 10 optimizers in last 30 days:`);
 * leaderboard.leaderboard.forEach((optimizer, index) => {
 *   console.log(`${index + 1}. ${optimizer.optimizer_email}`);
 *   console.log(`   Avg Achievement: ${optimizer.avg_min_achievement}%`);
 *   console.log(`   Excellent Rate: ${optimizer.excellent_rate}%`);
 * });
 * ```
 */
export async function getOptimizerLeaderboard(
  days: number = 30,
  limit: number = 20
): Promise<LeaderboardResult> {
  const input = {
    action: "leaderboard",
    days,
    limit,
  };

  return runPythonScript<LeaderboardResult>("operation_evaluator.py", input);
}

/**
 * Batch evaluate all operations from 7 days ago
 *
 * This should be run daily to evaluate operations that were made 7 days ago.
 *
 * @returns Batch evaluation summary
 *
 * @example
 * ```typescript
 * const result = await evaluateOperations7DaysAgo();
 * console.log(`Evaluated ${result.success_count} operations`);
 * console.log(`Failed: ${result.failed_count}`);
 * ```
 */
export async function evaluateOperations7DaysAgo(): Promise<BatchEvaluationResult> {
  const input = {
    action: "evaluate_7days_ago",
  };

  return runPythonScript<BatchEvaluationResult>(
    "operation_evaluator.py",
    input
  );
}

/**
 * Get operation scores from database (using existing queries)
 *
 * Note: This uses the existing Drizzle ORM queries, not Python
 */
export { getOperationScores, getOptimizerLeaderboard as getOptimizerLeaderboardFromDb } from "@/server/db/queries-evaluation";
