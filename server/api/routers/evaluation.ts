/**
 * Evaluation Router
 *
 * tRPC router for campaign evaluation system (A2-A5)
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
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
  calculateBaseline: publicProcedure
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
  updateAllBaselines: publicProcedure
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
  getBaseline: publicProcedure
    .input(
      z.object({
        productName: z.string(),
        countryCode: z.string(),
        platform: z.string().default("Android"),
        channel: z.string().default("Google"),
      })
    )
    .query(async ({ input }) => {
      const baseline = await getSafetyBaseline({
        productName: input.productName,
        countryCode: input.countryCode,
        platform: input.platform,
        channel: input.channel,
      });

      return baseline;
    }),

  // ============================================================================
  // A3: Campaign Evaluation Endpoints
  // ============================================================================

  /**
   * Evaluate a single campaign
   */
  evaluateCampaign: publicProcedure
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
  evaluateAllCampaigns: publicProcedure
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
  getCampaignEvaluations: publicProcedure
    .input(
      z.object({
        accountId: z.number().optional(), // For future multi-account support
        campaignId: z.string().optional(),
        status: z.string().optional(),
        searchQuery: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { getCampaignEvaluations } = await import(
        "@/server/db/queries-evaluation"
      );

      const evaluations = await getCampaignEvaluations({
        campaignId: input.campaignId,
        status: input.status,
        page: input.page,
        pageSize: input.pageSize,
      });

      return evaluations;
    }),

  // ============================================================================
  // A4: Creative Evaluation Endpoints
  // ============================================================================

  /**
   * Evaluate creative at D3
   */
  evaluateCreativeD3: publicProcedure
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
  evaluateCreativeD7: publicProcedure
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
  checkCampaignClosure: publicProcedure
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
  getCreativeEvaluations: publicProcedure
    .input(
      z.object({
        accountId: z.number().optional(), // For future multi-account support
        campaignId: z.string().optional(),
        creativeId: z.string().optional(),
        evaluationDay: z.enum(["D3", "D7"]).optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { getCreativeEvaluations } = await import(
        "@/server/db/queries-evaluation"
      );

      const evaluations = await getCreativeEvaluations({
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        evaluationDay: input.evaluationDay,
        page: input.page,
        pageSize: input.pageSize,
      });

      return evaluations;
    }),

  // ============================================================================
  // A5: Operation Scoring Endpoints
  // ============================================================================

  /**
   * Evaluate operation (7 days after operation)
   */
  evaluateOperation: publicProcedure
    .input(
      z.object({
        operationId: z.number(),
        stages: z.array(z.enum(['T+1', 'T+3', 'T+7'])).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { evaluateOperationFromAF } = await import(
        "@/server/evaluation/wrappers/operation-evaluator"
      );

      const result = await evaluateOperationFromAF({
        operationId: input.operationId,
        stages: input.stages,
      });

      return result;
    }),

  /**
   * Get optimizer leaderboard
   */
  getOptimizerLeaderboard: publicProcedure
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
  evaluateOperations7DaysAgo: publicProcedure.mutation(async () => {
    const { evaluateOperations7DaysAgoFromAF } = await import(
      "@/server/evaluation/wrappers/operation-evaluator"
    );

    const result = await evaluateOperations7DaysAgoFromAF();

    return result;
  }),

  /**
   * Get operation scores from database
   */
  getOperationScores: publicProcedure
    .input(
      z.object({
        accountId: z.number().optional(), // For future multi-account support
        optimizerEmail: z.string().optional(),
        campaignId: z.string().optional(),
        scoreStage: z.enum(['T+1', 'T+3', 'T+7']).optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { getOperationScores } = await import(
        "@/server/db/queries-evaluation"
      );

      const scores = await getOperationScores({
        optimizerEmail: input.optimizerEmail,
        campaignId: input.campaignId,
        scoreStage: input.scoreStage,
        page: input.page,
        pageSize: input.pageSize,
      });

      return scores;
    }),
});
