import { authRouter } from "./router/auth";
import { collectionRouter } from "./router/collection";
import { commentRouter } from "./router/comment";
import { creatorRouter } from "./router/creator";
import { followRouter } from "./router/follow";
import { itemRouter } from "./router/item";
import { searchRouter } from "./router/search";
import { socialRouter } from "./router/social";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter: ReturnType<typeof createTRPCRouter> = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  collection: collectionRouter,
  item: itemRouter,
  follow: followRouter,
  social: socialRouter,
  comment: commentRouter,
  creator: creatorRouter,
  search: searchRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
