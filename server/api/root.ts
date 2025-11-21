import { createTRPCRouter } from './trpc'
import { eventsRouter } from './routers/events'
import { statsRouter } from './routers/stats'
import { accountsRouter } from './routers/accounts'
import { evaluationRouter } from './routers/evaluation'

export const appRouter = createTRPCRouter({
  accounts: accountsRouter, // NEW: Accounts management
  events: eventsRouter,
  stats: statsRouter,
  evaluation: evaluationRouter, // NEW: Evaluation system (A2-A5)
})

export type AppRouter = typeof appRouter
