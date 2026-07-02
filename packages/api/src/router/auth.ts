import type { TRPCRouterRecord } from "@trpc/server";

import { publicProcedure } from "../trpc";

export const authRouter = {
  // Expose the better-auth session to the client (logged-in or null)
  getSession: publicProcedure.query(({ ctx }) => ctx.session),
} satisfies TRPCRouterRecord;
