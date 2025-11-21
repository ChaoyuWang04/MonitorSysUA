/**
 * Evaluation Router
 *
 * tRPC router for campaign evaluation system (A2-A5)
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  calculateBaseline,
  updateAllBaselines,
  getSafetyBaseline,
} from "@/server/evaluation/wrappers/baseline-calculator";

export const evaluationRouter = createTRPCRouter({
  // ============================================================================
  // A2: Safety Baseline Endpoints
  // ============================================================================

  /**
   * Calculate safety baseline for a specific product/country/platform/channel
   */
  calculateBaseline: protectedProcedure
    .input(
      z.object({
        productName: z.string().min(1),
        countryCode: z.string().min(1),
        platform: z.string().default("Android"),
        channel: z.string().default("Google"),
        currentDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await calculateBaseline({
        productName: input.productName,
        countryCode: input.countryCode,
        platform: input.platform,
        channel: input.channel,
        currentDate: input.currentDate,
      });

      return result;
    }),

  /**
   * Batch update all safety baselines
   *
   * This should be triggered manually (or via cron) on the 1st of each month
   */
  updateAllBaselines: protectedProcedure
    .input(
      z.object({
        currentDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateAllBaselines(input.currentDate);
      return result;
    }),

  /**
   * Get safety baseline from database
   */
  getBaseline: protectedProcedure
    .input(
      z.object({
        productName: z.string(),
        countryCode: z.string(),
        platform: z.string().default("Android"),
        channel: z.string().default("Google"),
      })
    )
    .query(async ({ input }) => {
      const baseline = await getSafetyBaseline(
        input.productName,
        input.countryCode,
        input.platform,
        input.channel
      );

      return baseline;
    }),

  // ============================================================================
  // A3: Campaign Evaluation Endpoints
  // ============================================================================

  /**
   * Evaluate a single campaign
   */
  evaluateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        evaluationDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { evaluateCampaign } = await import(
        "@/server/evaluation/wrappers/campaign-evaluator"
      );

      const result = await evaluateCampaign(
        input.campaignId,
        input.evaluationDate
      );

      return result;
    }),

  /**
   * Batch evaluate all campaigns
   */
  evaluateAllCampaigns: protectedProcedure
    .input(
      z.object({
        evaluationDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { evaluateAllCampaigns } = await import(
        "@/server/evaluation/wrappers/campaign-evaluator"
      );

      const result = await evaluateAllCampaigns(input.evaluationDate);

      return result;
    }),

  /**
   * Get campaign evaluation history from database
   */
  getCampaignEvaluations: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { getCampaignEvaluations } = await import(
        "@/server/db/queries-evaluation"
      );

      const evaluations = await getCampaignEvaluations(
        input.campaignId,
        input.status,
        input.limit
      );

      return evaluations;
    }),

  // ============================================================================
  // A4: Creative Evaluation Endpoints
  // ============================================================================

  /**
   * Evaluate creative at D3
   */
  evaluateCreativeD3: protectedProcedure
    .input(
      z.object({
        creativeId: z.string(),
        campaignId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { evaluateCreativeD3 } = await import(
        "@/server/evaluation/wrappers/creative-evaluator"
      );

      const result = await evaluateCreativeD3(
        input.creativeId,
        input.campaignId
      );

      return result;
    }),

  /**
   * Evaluate creative at D7
   */
  evaluateCreativeD7: protectedProcedure
    .input(
      z.object({
        creativeId: z.string(),
        campaignId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { evaluateCreativeD7 } = await import(
        "@/server/evaluation/wrappers/creative-evaluator"
      );

      const result = await evaluateCreativeD7(
        input.creativeId,
        input.campaignId
      );

      return result;
    }),

  /**
   * Check if test campaign should be closed
   */
  checkCampaignClosure: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { checkCampaignClosure } = await import(
        "@/server/evaluation/wrappers/creative-evaluator"
      );

      const result = await checkCampaignClosure(input.campaignId);

      return result;
    }),

  /**
   * Get creative evaluation history from database
   */
  getCreativeEvaluations: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().optional(),
        creativeId: z.string().optional(),
        evaluationDay: z.enum(["D3", "D7"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { getCreativeEvaluations } = await import(
        "@/server/db/queries-evaluation"
      );

      const evaluations = await getCreativeEvaluations(
        input.campaignId,
        input.creativeId,
        input.evaluationDay,
        input.limit
      );

      return evaluations;
    }),

  // ============================================================================
  // A5: Operation Scoring Endpoints
  // ============================================================================

  /**
   * Evaluate operation (7 days after operation)
   */
  evaluateOperation: protectedProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { evaluateOperation } = await import(
        "@/server/evaluation/wrappers/operation-evaluator"
      );

      const result = await evaluateOperation(input.operationId);

      return result;
    }),

  /**
   * Get optimizer leaderboard
   */
  getOptimizerLeaderboard: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const { getOptimizerLeaderboard } = await import(
        "@/server/evaluation/wrappers/operation-evaluator"
      );

      const result = await getOptimizerLeaderboard(input.days, input.limit);

      return result;
    }),

  /**
   * Batch evaluate operations from 7 days ago
   *
   * This should be run daily (manually or via cron)
   */
  evaluateOperations7DaysAgo: protectedProcedure.mutation(async () => {
    const { evaluateOperations7DaysAgo } = await import(
      "@/server/evaluation/wrappers/operation-evaluator"
    );

    const result = await evaluateOperations7DaysAgo();

    return result;
  }),

  /**
   * Get operation scores from database
   */
  getOperationScores: protectedProcedure
    .input(
      z.object({
        optimizerEmail: z.string().optional(),
        campaignId: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { getOperationScores } = await import(
        "@/server/db/queries-evaluation"
      );

      const scores = await getOperationScores(
        input.optimizerEmail,
        input.campaignId,
        input.limit
      );

      return scores;
    }),
});
