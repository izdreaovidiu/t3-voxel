import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "context" that is available to all resolvers.
 *
 */

// Define the user type
interface User {
  id: string;
  username: string | null;
  email: string;
  // Add other user fields as needed
}

// Define the auth context type
interface AuthContext {
  clerkId: string | null; // Clerk user ID
  userId: string | null;  // Prisma user ID
  user: User | null;
  isAuthenticated: boolean;
}

interface CreateContextOptions {
  headers: Headers;
  auth: AuthContext;
}

/**
 * This helper generates the "internals" for a tRPC context.
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    headers: opts.headers,
    auth: opts.auth,
    db,
  };
};

/**
 * This is the actual context you'll use in your router. It will be used to
 * process every request that goes through your tRPC endpoint.
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
}) => {
  try {
    console.log('Creating tRPC context...');
    
    // Get the auth from Clerk in App Router
    const clerkAuth = await auth();
    console.log('Clerk auth result:', { userId: clerkAuth.userId, sessionId: clerkAuth.sessionId });
    
    // Prepare the auth context
    const authContext: AuthContext = {
      clerkId: clerkAuth.userId || null,
      userId: null,
      user: null,
      isAuthenticated: !!clerkAuth.userId,
    };

    // Get the full user from the database if user is authenticated
    if (authContext.clerkId) {
      console.log('Looking up user in database with clerkId:', authContext.clerkId);
      
      let user = await db.user.findUnique({
        where: { clerkId: authContext.clerkId },
      });
      
      console.log('Database user lookup result:', user ? 'Found' : 'Not found');
      
      // If user doesn't exist, create them with Clerk user data
      // This handles the case where a user signs in for the first time
      if (!user) {
        try {
          console.log('Creating new user in database...');
          const clerkUser = await clerkClient.users.getUser(authContext.clerkId);
          
          user = await db.user.create({
            data: {
              clerkId: authContext.clerkId,
              username: clerkUser.username || clerkUser.firstName || `User_${authContext.clerkId.slice(-8)}`,
              email: clerkUser.emailAddresses[0]?.emailAddress || `${authContext.clerkId}@example.com`,
              avatar: clerkUser.imageUrl || null,
              status: 'ONLINE',
            },
          });
          console.log('User created successfully:', user.id);
        } catch (error) {
          console.error('Failed to create user:', error);
          // If creation fails, continue without user data
        }
      }
      
      if (user) {
        authContext.userId = user.id;
        authContext.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          // Add other user fields as needed
        };
        console.log('Auth context updated with user:', authContext.userId);
      }
    } else {
      console.log('No Clerk user ID found - user not authenticated');
    }

    console.log('tRPC context created successfully');
    return createInnerTRPCContext({
      headers: opts.headers,
      auth: authContext,
    });
  } catch (error) {
    console.error('Error creating TRPC context:', error);
    // Return a minimal context with just the database connection
    return createInnerTRPCContext({
      headers: opts.headers,
      auth: { 
        clerkId: null,
        userId: null, 
        user: null, 
        isAuthenticated: false 
      },
    });
  }
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
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

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.auth.isAuthenticated || !ctx.auth.clerkId) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "You must be logged in to access this resource" 
    });
  }

  if (!ctx.auth.userId || !ctx.auth.user) {
    throw new TRPCError({ 
      code: "NOT_FOUND", 
      message: "User profile not found. Please complete your profile setup." 
    });
  }

  return next({
    ctx: {
      ...ctx,
      // User is authenticated and user data is available
      auth: ctx.auth,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
