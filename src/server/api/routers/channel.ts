// src/server/api/routers/channel.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const channelRouter = createTRPCRouter({
  // Get channels for a server
  getServerChannels: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify user is member of server
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

      const channels = await ctx.db.channel.findMany({
        where: {
          serverId: input.serverId,
        },
        include: {
          category: true,
          _count: {
            select: {
              messages: {
                where: {
                  // Count unread messages (simplified - you might want to track last read)
                  createdAt: {
                    gt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
          },
          voiceStates: {
            include: {
              user: true,
            },
          },
        },
        orderBy: [{ categoryId: "asc" }, { position: "asc" }],
      });

      // Group channels by category
      const categorizedChannels = channels.reduce(
        (acc, channel) => {
          const categoryName = channel.category?.name || "GENERAL";

          if (!acc[categoryName]) {
            acc[categoryName] = [];
          }

          const channelData = {
            id: channel.id,
            name: channel.name,
            type: channel.type.toLowerCase(),
            category: categoryName,
            emoji: getChannelEmoji(channel.name, channel.type),
            unread:
              channel.type === "TEXT" ? channel._count.messages : undefined,
            users:
              channel.type === "VOICE" ? channel.voiceStates.length : undefined,
          };

          acc[categoryName].push(channelData);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      return categorizedChannels;
    }),

  // Get channel by ID
  getChannelById: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ input, ctx }) => {
      const channel = await ctx.db.channel.findFirst({
        where: {
          id: input.channelId,
          server: {
            members: {
              some: {
                userId: ctx.auth.userId,
              },
            },
          },
        },
        include: {
          server: true,
          category: true,
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel not found or you don't have access",
        });
      }

      return channel;
    }),

  // Create channel
  createChannel: protectedProcedure
    .input(
      z.object({
        serverId: z.string(),
        name: z.string().min(1).max(100),
        type: z.enum(["TEXT", "VOICE", "VIDEO", "ANNOUNCEMENT"]),
        categoryId: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission (server owner or admin)
      const server = await ctx.db.server.findFirst({
        where: {
          id: input.serverId,
          OR: [
            { ownerId: ctx.auth.userId },
            {
              members: {
                some: {
                  userId: ctx.auth.userId,
                  roles: {
                    some: {
                      role: {
                        permissions: {
                          has: "MANAGE_CHANNELS",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      });

      if (!server) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to create channels in this server",
        });
      }

      // Get the next position
      const lastChannel = await ctx.db.channel.findFirst({
        where: {
          serverId: input.serverId,
          categoryId: input.categoryId,
        },
        orderBy: { position: "desc" },
      });

      const channel = await ctx.db.channel.create({
        data: {
          name: input.name,
          type: input.type,
          description: input.description,
          serverId: input.serverId,
          categoryId: input.categoryId,
          position: (lastChannel?.position ?? -1) + 1,
        },
      });

      return channel;
    }),

  // Update channel
  updateChannel: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check permissions
      const channel = await ctx.db.channel.findFirst({
        where: {
          id: input.channelId,
          server: {
            OR: [
              { ownerId: ctx.auth.userId },
              {
                members: {
                  some: {
                    userId: ctx.auth.userId,
                    roles: {
                      some: {
                        role: {
                          permissions: {
                            has: "MANAGE_CHANNELS",
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this channel",
        });
      }

      const updatedChannel = await ctx.db.channel.update({
        where: { id: input.channelId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.categoryId !== undefined && {
            categoryId: input.categoryId,
          }),
        },
      });

      return updatedChannel;
    }),

  // Delete channel
  deleteChannel: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const channel = await ctx.db.channel.findFirst({
        where: {
          id: input.channelId,
          server: {
            OR: [
              { ownerId: ctx.auth.userId },
              {
                members: {
                  some: {
                    userId: ctx.auth.userId,
                    roles: {
                      some: {
                        role: {
                          permissions: {
                            has: "MANAGE_CHANNELS",
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this channel",
        });
      }

      await ctx.db.channel.delete({
        where: { id: input.channelId },
      });

      return { success: true };
    }),

  // Create category
  createCategory: protectedProcedure
    .input(
      z.object({
        serverId: z.string(),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check permissions
      const server = await ctx.db.server.findFirst({
        where: {
          id: input.serverId,
          OR: [
            { ownerId: ctx.auth.userId },
            {
              members: {
                some: {
                  userId: ctx.auth.userId,
                  roles: {
                    some: {
                      role: {
                        permissions: {
                          has: "MANAGE_CHANNELS",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      });

      if (!server) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to create categories in this server",
        });
      }

      const category = await ctx.db.category.create({
        data: {
          name: input.name,
          serverId: input.serverId,
        },
      });

      return category;
    }),

  // Search channels across user's servers
  searchChannels: protectedProcedure
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

      // Search channels in user's servers
      const channels = await ctx.db.channel.findMany({
        where: {
          serverId: { in: serverIds },
          name: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          category: true,
        },
        take: 10,
        orderBy: {
          name: 'asc',
        },
      });

      return channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        serverId: channel.serverId,
        server: channel.server,
        category: channel.category,
        description: channel.description,
      }));
    }),
});

// Helper function to get channel emoji based on name and type
function getChannelEmoji(name: string, type: string): string {
  if (type === "VOICE") {
    if (name.toLowerCase().includes("music")) return "🎵";
    if (name.toLowerCase().includes("gaming")) return "🎮";
    if (name.toLowerCase().includes("study")) return "📚";
    return "🔊";
  }

  // Text channels
  if (name.toLowerCase().includes("welcome")) return "👋";
  if (name.toLowerCase().includes("announcement")) return "📢";
  if (name.toLowerCase().includes("general")) return "💬";
  if (name.toLowerCase().includes("random")) return "🎲";
  if (name.toLowerCase().includes("meme")) return "😂";
  if (name.toLowerCase().includes("screenshot")) return "📸";

  return "💬";
}
