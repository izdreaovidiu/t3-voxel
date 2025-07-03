// src/server/api/routers/message.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const messageRouter = createTRPCRouter({
  // Get messages for a channel
  getChannelMessages: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(), // For pagination
      }),
    )
    .query(async ({ input, ctx }) => {
      // Verify user has access to this channel
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
      });

      if (!channel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this channel",
        });
      }

      const messages = await ctx.db.message.findMany({
        take: input.limit + 1, // Take one extra to check if there are more
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          channelId: input.channelId,
        },
        include: {
          author: {
            include: {
              serverMembers: {
                where: {
                  serverId: channel.serverId,
                },
                include: {
                  roles: {
                    include: {
                      role: true,
                    },
                  },
                },
              },
            },
          },
          reactions: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      // Transform messages to match frontend format
      const transformedMessages = messages.reverse().map((message) => {
        const serverMember = message.author.serverMembers[0];
        const topRole = serverMember?.roles.sort(
          (a, b) => b.role.position - a.role.position,
        )[0]?.role;

        // Group reactions by emoji
        const reactionMap = new Map<
          string,
          { emoji: string; count: number; users: string[] }
        >();
        message.reactions.forEach((reaction) => {
          const existing = reactionMap.get(reaction.emoji);
          if (existing) {
            existing.count++;
            existing.users.push(reaction.user.username);
          } else {
            reactionMap.set(reaction.emoji, {
              emoji: reaction.emoji,
              count: 1,
              users: [reaction.user.username],
            });
          }
        });

        return {
          id: message.id,
          user: serverMember?.nickname || message.author.username,
          avatar: message.author.avatar,
          time: formatMessageTime(message.createdAt),
          content: message.content,
          role: getRoleType(topRole),
          reactions: Array.from(reactionMap.values()),
          edited: message.edited,
          editedAt: message.editedAt,
          authorId: message.author.id,
        };
      });

      return {
        messages: transformedMessages,
        nextCursor,
      };
    }),

  // Send message
  sendMessage: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and can send messages
      const channel = await ctx.db.channel.findFirst({
        where: {
          id: input.channelId,
          type: "TEXT", // Only text channels can receive messages
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
        },
      });

      if (!channel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to send messages in this channel",
        });
      }

      const message = await ctx.db.message.create({
        data: {
          content: input.content,
          authorId: ctx.auth.userId,
          channelId: input.channelId,
        },
        include: {
          author: {
            include: {
              serverMembers: {
                where: {
                  serverId: channel.serverId,
                },
                include: {
                  roles: {
                    include: {
                      role: true,
                    },
                  },
                },
              },
            },
          },
          reactions: true,
        },
      });

      // Transform for real-time broadcast
      const serverMember = message.author.serverMembers[0];
      const topRole = serverMember?.roles.sort(
        (a, b) => b.role.position - a.role.position,
      )[0]?.role;

      return {
        id: message.id,
        user: serverMember?.nickname || message.author.username,
        avatar: message.author.avatar,
        time: formatMessageTime(message.createdAt),
        content: message.content,
        role: getRoleType(topRole),
        reactions: [],
        edited: false,
        authorId: message.author.id,
      };
    }),

  // Edit message
  editMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify message belongs to user
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          authorId: ctx.auth.userId,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own messages",
        });
      }

      const updatedMessage = await ctx.db.message.update({
        where: { id: input.messageId },
        data: {
          content: input.content,
          edited: true,
          editedAt: new Date(),
        },
      });

      return updatedMessage;
    }),

  // Delete message
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          OR: [
            { authorId: ctx.auth.userId }, // User can delete their own messages
            {
              channel: {
                server: {
                  OR: [
                    { ownerId: ctx.auth.userId }, // Server owner can delete any message
                    {
                      members: {
                        some: {
                          userId: ctx.auth.userId,
                          roles: {
                            some: {
                              role: {
                                permissions: {
                                  has: "MANAGE_MESSAGES",
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
            },
          ],
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this message",
        });
      }

      await ctx.db.message.delete({
        where: { id: input.messageId },
      });

      return { success: true };
    }),

  // Add reaction to message
  addReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access to the channel
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          channel: {
            server: {
              members: {
                some: {
                  userId: ctx.auth.userId,
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this message",
        });
      }

      // Create reaction (will be ignored if already exists due to unique constraint)
      try {
        const reaction = await ctx.db.messageReaction.create({
          data: {
            messageId: input.messageId,
            userId: ctx.auth.userId,
            emoji: input.emoji,
          },
        });
        return reaction;
      } catch (error) {
        // Reaction already exists
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already reacted with this emoji",
        });
      }
    }),

  // Remove reaction from message
  removeReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const reaction = await ctx.db.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId: input.messageId,
            userId: ctx.auth.userId,
            emoji: input.emoji,
          },
        },
      });

      if (!reaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reaction not found",
        });
      }

      await ctx.db.messageReaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId: input.messageId,
            userId: ctx.auth.userId,
            emoji: input.emoji,
          },
        },
      });

      return { success: true };
    }),
});

// Helper functions
function formatMessageTime(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);

  if (now.toDateString() === messageDate.toDateString()) {
    // Same day - show time
    return `Today at ${messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (now.getTime() - messageDate.getTime() < 24 * 60 * 60 * 1000) {
    // Yesterday
    return `Yesterday at ${messageDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    // Older - show date and time
    return (
      messageDate.toLocaleDateString() +
      " at " +
      messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
}

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
