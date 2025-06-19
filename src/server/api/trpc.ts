import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getAuth } from "@clerk/nextjs/server";
import { db } from "~/server/db";

interface CreateContextOptions {
  headers: Headers;
  auth: ReturnType<typeof getAuth>;
}

export const createInnerTRPCContext = ({
  headers,
  auth,
}: CreateContextOptions) => {
  return {
    headers,
    auth,
    db,
  };
};

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const { req } = opts;
  const auth = getAuth(req);

  return createInnerTRPCContext({
    headers: req.headers,
    auth,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
