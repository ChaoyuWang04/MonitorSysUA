import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import {
  getAccounts,
  getAccountById,
  getAccountByCustomerId,
  createAccount,
  updateAccount,
  deleteAccount,
} from '@/server/db/queries'

export const accountsRouter = createTRPCRouter({
  // List all accounts (optionally filter by active status)
  list: publicProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getAccounts(input)
    }),

  // Get a single account by ID
  getById: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const account = await getAccountById(input.id)
      if (!account) {
        throw new Error('Account not found')
      }
      return account
    }),

  // Create a new account (manual account addition)
  create: publicProcedure
    .input(z.object({
      customerId: z.string().regex(/^\d{10}$/, 'Customer ID must be exactly 10 digits'),
      name: z.string().min(1, 'Account name is required'),
      currency: z.string().optional(),
      timeZone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check if account with this customer ID already exists
      const existing = await getAccountByCustomerId(input.customerId)
      if (existing) {
        throw new Error(`Account with customer ID ${input.customerId} already exists`)
      }

      const account = await createAccount({
        customerId: input.customerId,
        name: input.name,
        currency: input.currency,
        timeZone: input.timeZone,
        isActive: true,
      })

      return {
        success: true,
        account,
        message: `Account "${account.name}" created successfully`,
      }
    }),

  // Update an account
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      currency: z.string().optional(),
      timeZone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input

      const account = await updateAccount(id, updates)
      if (!account) {
        throw new Error('Account not found')
      }

      return {
        success: true,
        account,
        message: `Account "${account.name}" updated successfully`,
      }
    }),

  // Soft delete an account (set isActive = false)
  delete: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const account = await deleteAccount(input.id)
      if (!account) {
        throw new Error('Account not found')
      }

      return {
        success: true,
        account,
        message: `Account "${account.name}" deactivated successfully`,
      }
    }),
})
