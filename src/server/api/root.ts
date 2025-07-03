import { postRouter } from "~/server/api/routers/post";
import { createTRPCRouter } from "~/server/api/trpc";
import { serverRouter } from "~/server/api/routers/server";
import { channelRouter } from "~/server/api/routers/channel";
import { messageRouter } from "~/server/api/routers/message";
import { userRouter } from "~/server/api/routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  server: serverRouter,
  channel: channelRouter,
  message: messageRouter,
  user: userRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
// Remove or replace this line if createCallerFactory is not available
// export const createCaller = createCallerFactory(appRouter);
