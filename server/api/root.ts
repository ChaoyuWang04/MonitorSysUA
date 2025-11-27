import { createTRPCRouter } from './trpc'
import { eventsRouter } from './routers/events'
import { statsRouter } from './routers/stats'
import { accountsRouter } from './routers/accounts'
import { evaluationRouter } from './routers/evaluation'
import { appsflyerRouter } from './routers/appsflyer'

export const appRouter = createTRPCRouter({
  accounts: accountsRouter, // Accounts management
  events: eventsRouter,
  stats: statsRouter,
  evaluation: evaluationRouter, // Evaluation system (A2-A5)
  appsflyer: appsflyerRouter, // AppsFlyer cohort data (Phase 4)
})

export type AppRouter = typeof appRouter
