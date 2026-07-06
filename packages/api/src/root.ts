import { authRouter } from "./router/auth";
import { collectionRouter } from "./router/collection";
import { commentRouter } from "./router/comment";
import { itemRouter } from "./router/item";
import { socialRouter } from "./router/social";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  collection: collectionRouter,
  item: itemRouter,
  social: socialRouter,
  comment: commentRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
// export the router
