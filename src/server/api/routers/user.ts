// src/server/api/routers/user.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  // Get current user profile
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.auth.userId },
      include: {
        serverMembers: {
          include: {
            server: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  // SIMPLIFIED update user profile - removed complex activity tracking
  updateProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1).max(32).optional(),
        avatar: z.string().url().optional(),
        status: z.enum(["ONLINE", "OFFLINE", "AWAY"]).optional(), // Simplified statuses
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.auth.userId },
        data: {
          ...(input.username && { username: input.username }),
          ...(input.avatar && { avatar: input.avatar }),
          ...(input.status && { status: input.status }),
        },
      });

      return updatedUser;
    }),

  // Get server members - SIMPLIFIED presence
  getServerMembers: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify user is member of server
      const serverMember = await ctx.db.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId: ctx.auth.userId,
            serverId: input.serverId,
          },
        },
      });

      if (!serverMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this server",
        });
      }

      const members = await ctx.db.serverMember.findMany({
        where: {
          serverId: input.serverId,
        },
        include: {
          user: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: [
          {
            roles: {
              _count: "desc", // Members with more roles first
            },
          },
          {
            user: {
              status: "asc", // Online users first
            },
          },
          {
            user: {
              username: "asc",
            },
          },
        ],
      });

      return members.map((member) => {
        const topRole = member.roles.sort(
          (a, b) => b.role.position - a.role.position,
        )[0]?.role;

        // Extract full name from username if it contains spaces, or use a default
        const fullName = member.user.username.includes(' ') 
          ? member.user.username 
          : 'Izdrea Ovidiu';

        return {
          id: member.user.id, // Use user.id instead of member.id
          name: member.nickname || member.user.username,
          fullName: fullName,
          firstName: fullName.split(' ')[0] || 'Izdrea',
          lastName: fullName.split(' ')[1] || 'Ovidiu',
          username: member.user.username,
          status: getSimpleStatus(member.user.status), // Simplified status mapping
          role: getRoleType(topRole),
          avatar: member.user.avatar,
          joinedAt: member.joinedAt,
        };
      });
    }),

  // Update server nickname
  updateServerNickname: protectedProcedure
    .input(
      z.object({
        serverId: z.string(),
        nickname: z.string().max(32).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await ctx.db.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId: ctx.auth.userId,
            serverId: input.serverId,
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this server",
        });
      }

      const updatedMember = await ctx.db.serverMember.update({
        where: {
          userId_serverId: {
            userId: ctx.auth.userId,
            serverId: input.serverId,
          },
        },
        data: {
          nickname: input.nickname,
        },
      });

      return updatedMember;
    }),

  // Get user by Clerk ID (for initial setup) - SIMPLIFIED
  getOrCreateUser: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        username: z.string(),
        avatar: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Use upsert to avoid duplicate issues
        const user = await ctx.db.user.upsert({
          where: { clerkId: input.clerkId },
          update: {
            email: input.email,
            username: input.username,
            ...(input.avatar && { avatar: input.avatar }),
            status: "ONLINE", // Simple default status
          },
          create: {
            clerkId: input.clerkId,
            email: input.email,
            username: input.username,
            avatar: input.avatar,
            status: "ONLINE", // Simple default status
          },
        });

        return user;
      } catch (error) {
        console.error('Error in getOrCreateUser:', error);
        
        // If still a duplicate error, try to find the existing user
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          const existingUser = await ctx.db.user.findUnique({
            where: { clerkId: input.clerkId },
          });
          
          if (existingUser) {
            return existingUser;
          }
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create or get user",
          cause: error,
        });
      }
    }),

  // Get online users in voice channels
  getVoiceStates: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ input, ctx }) => {
      const voiceStates = await ctx.db.voiceState.findMany({
        where: {
          channel: {
            serverId: input.serverId,
          },
        },
        include: {
          user: true,
          channel: true,
        },
      });

      return voiceStates.map((state) => ({
        userId: state.user.id,
        username: state.user.username,
        channelId: state.channel.id,
        channelName: state.channel.name,
        muted: state.muted,
        deafened: state.deafened,
        joinedAt: state.joinedAt,
      }));
    }),

  // Join voice channel
  joinVoiceChannel: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        muted: z.boolean().default(false),
        deafened: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify channel is voice channel and user has access
      const channel = await ctx.db.channel.findFirst({
        where: {
          id: input.channelId,
          type: "VOICE",
          server: {
            members: {
              some: {
                userId: ctx.auth.userId,
              },
            },
          },
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this voice channel",
        });
      }

      // Remove from any existing voice channel
      await ctx.db.voiceState.deleteMany({
        where: { userId: ctx.auth.userId },
      });

      // Join new voice channel
      const voiceState = await ctx.db.voiceState.create({
        data: {
          userId: ctx.auth.userId,
          channelId: input.channelId,
          muted: input.muted,
          deafened: input.deafened,
        },
      });

      return voiceState;
    }),

  // Leave voice channel
  leaveVoiceChannel: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.voiceState.deleteMany({
      where: { userId: ctx.auth.userId },
    });

    return { success: true };
  }),

  // Update voice state
  updateVoiceState: protectedProcedure
    .input(
      z.object({
        muted: z.boolean().optional(),
        deafened: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const voiceState = await ctx.db.voiceState.findFirst({
        where: { userId: ctx.auth.userId },
      });

      if (!voiceState) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not in a voice channel",
        });
      }

      const updatedState = await ctx.db.voiceState.update({
        where: { id: voiceState.id },
        data: {
          ...(input.muted !== undefined && { muted: input.muted }),
          ...(input.deafened !== undefined && { deafened: input.deafened }),
        },
      });

      return updatedState;
    }),

  // Search users across user's servers
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      // Get all servers the user is a member of
      const userServers = await ctx.db.serverMember.findMany({
        where: { userId: ctx.auth.userId },
        select: { serverId: true },
      });

      const serverIds = userServers.map(member => member.serverId);

      if (serverIds.length === 0) {
        return [];
      }

      // Search users in the same servers
      const users = await ctx.db.user.findMany({
        where: {
          AND: [
            {
              username: {
                contains: input.query,
                mode: 'insensitive',
              },
            },
            {
              serverMembers: {
                some: {
                  serverId: { in: serverIds },
                },
              },
            },
            {
              id: { not: ctx.auth.userId }, // Exclude current user
            },
          ],
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          status: true,
        },
        take: 10,
        orderBy: {
          username: 'asc',
        },
      });

      return users.map(user => ({
        ...user,
        status: getSimpleStatus(user.status)
      }));
    }),
});

// SIMPLIFIED helper functions

function getRoleType(role: any): "admin" | "moderator" | "member" {
  if (!role) return "member";

  if (role.permissions.includes("ADMINISTRATOR")) return "admin";
  if (
    role.permissions.includes("MANAGE_MESSAGES") ||
    role.permissions.includes("MANAGE_CHANNELS")
  )
    return "moderator";

  return "member";
}

// SIMPLIFIED status mapping - only basic statuses
function getSimpleStatus(dbStatus: string): 'online' | 'offline' | 'away' {
  switch (dbStatus) {
    case "ONLINE":
      return "online";
    case "AWAY":
    case "IDLE":
      return "away";
    case "OFFLINE":
    case "DND":
    case "INVISIBLE":
    default:
      return "offline";
  }
}
