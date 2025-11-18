import { createTRPCRouter } from './trpc'
import { eventsRouter } from './routers/events'
import { statsRouter } from './routers/stats'
import { accountsRouter } from './routers/accounts'

export const appRouter = createTRPCRouter({
  accounts: accountsRouter, // NEW: Accounts management
  events: eventsRouter,
  stats: statsRouter,
})

export type AppRouter = typeof appRouter
