import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const serverRouter = createTRPCRouter({
  // Test route to verify database connection
  testConnection: publicProcedure.query(async ({ ctx }) => {
    console.log('testConnection called');
    console.log('ctx object keys:', Object.keys(ctx));
    console.log('ctx.db available:', !!ctx.db);
    
    if (!ctx.db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available in context",
      });
    }
    
    try {
      const userCount = await ctx.db.user.count();
      return { success: true, userCount, hasDb: true };
    } catch (error) {
      console.error('Database query failed:', error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database query failed",
      });
    }
  }),

  // Test route to verify tRPC and auth are working
  testAuth: protectedProcedure.query(async ({ ctx }) => {
    console.log('testAuth called');
    return {
      success: true,
      clerkId: ctx.auth.clerkId,
      userId: ctx.auth.userId,
      username: ctx.auth.user?.username,
      timestamp: new Date().toISOString(),
    };
  }),

  // Get all servers for the current user
  getUserServers: protectedProcedure.query(async ({ ctx }) => {
    console.log('getUserServers called with context:', {
      clerkId: ctx.auth.clerkId,
      userId: ctx.auth.userId,
      isAuthenticated: ctx.auth.isAuthenticated,
      hasUser: !!ctx.auth.user
    });
    
    if (!ctx.auth.userId) {
      console.error('Prisma User ID is missing in context');
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID is missing in context',
      });
    }

    try {
      console.log('Querying servers for user:', ctx.auth.userId);
      
      const servers = await ctx.db.server.findMany({
        where: {
          members: {
            some: {
              userId: ctx.auth.userId,
            },
          },
        },
        include: {
          _count: {
            select: {
              members: true,
              channels: true,
            },
          },
          members: {
            where: {
              user: {
                status: {
                  in: ["ONLINE", "IDLE", "DND"],
                },
              },
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      console.log(`Found ${servers.length} servers for user`);
      
      const serverData = servers.map((server) => ({
        id: server.id,
        name: server.name,
        description: server.description,
        icon: server.icon || "🎮",
        color: server.color,
        glowColor: server.glowColor,
        members: server._count.members,
        online: server.members.length,
        channels: server._count.channels,
        notifications: 0,
      }));
      
      console.log('Returning server data:', serverData.length);
      return serverData;
    } catch (error) {
      console.error('Error fetching user servers:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch servers',
        cause: error,
      });
    }
  }),

  // Get server by ID with full details
  getServerById: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.auth.userId) {
        throw new Error('User ID is missing in context');
      }

      const server = await ctx.db.server.findFirst({
        where: {
          id: input.serverId,
          members: {
            some: {
              userId: ctx.auth.userId,
            },
          },
        },
        include: {
          owner: true,
          channels: {
            include: {
              category: true,
              _count: {
                select: {
                  messages: {
                    where: {
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
          },
          members: {
            include: {
              user: true,
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found or you don't have access",
        });
      }

      return server;
    }),

  // Create a new server
  createServer: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        glowColor: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      console.log('Creating server for user:', ctx.auth.userId);
      console.log('Server input:', input);
      
      const server = await ctx.db.server.create({
        data: {
          name: input.name,
          description: input.description,
          icon: input.icon || "🎮",
          color: input.color || "from-[#5865F2] to-[#4752C4]",
          glowColor: input.glowColor || "#5865F2",
          ownerId: ctx.auth.userId,
          members: {
            create: {
              userId: ctx.auth.userId,
            },
          },
          channels: {
            create: [
              {
                name: "general",
                type: "TEXT",
                position: 0,
              },
              {
                name: "General Voice",
                type: "VOICE",
                position: 1,
              },
            ],
          },
          roles: {
            create: [
              {
                name: "@everyone",
                permissions: ["VIEW_CHANNELS", "SEND_MESSAGES"],
                position: 0,
              },
              {
                name: "Admin",
                permissions: ["ADMINISTRATOR"],
                position: 1,
                color: "#FEE75C",
              },
            ],
          },
        },
        include: {
          _count: {
            select: {
              members: true,
              channels: true,
            },
          },
        },
      });
      
      console.log('Server created successfully:', {
        id: server.id,
        name: server.name,
        ownerId: server.ownerId,
        memberCount: server._count.members
      });

      return {
        id: server.id,
        name: server.name,
        description: server.description,
        icon: server.icon,
        color: server.color,
        glowColor: server.glowColor,
        members: server._count.members,
        online: 1,
        channels: server._count.channels,
        notifications: 0,
      };
    }),

  // Update server
  updateServer: protectedProcedure
    .input(
      z.object({
        serverId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        glowColor: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const server = await ctx.db.server.findFirst({
        where: {
          id: input.serverId,
          ownerId: ctx.auth.userId,
        },
      });

      if (!server) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this server",
        });
      }

      const updatedServer = await ctx.db.server.update({
        where: { id: input.serverId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description && { description: input.description }),
          ...(input.icon && { icon: input.icon }),
          ...(input.color && { color: input.color }),
          ...(input.glowColor && { glowColor: input.glowColor }),
        },
      });

      return updatedServer;
    }),

  // Join server (via invite)
  joinServer: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existingMember = await ctx.db.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId: ctx.auth.userId,
            serverId: input.serverId,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this server",
        });
      }

      const server = await ctx.db.server.findUnique({
        where: { id: input.serverId },
      });

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found",
        });
      }

      const member = await ctx.db.serverMember.create({
        data: {
          userId: ctx.auth.userId,
          serverId: input.serverId,
        },
        include: {
          server: true,
        },
      });

      return member;
    }),

  // Leave server
  leaveServer: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const server = await ctx.db.server.findUnique({
        where: { id: input.serverId },
        select: { ownerId: true },
      });

      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Server not found",
        });
      }

      if (server.ownerId === ctx.auth.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Server owner cannot leave their own server",
        });
      }

      await ctx.db.serverMember.delete({
        where: {
          userId_serverId: {
            userId: ctx.auth.userId,
            serverId: input.serverId,
          },
        },
      });

      return { success: true };
    }),

  // FIXED: Create server invite with proper error handling
  createInvite: protectedProcedure
    .input(
      z.object({
        serverId: z.string(),
        maxUses: z.number().optional(),
        expiresIn: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      console.log('🔧 createInvite called with:', { 
        input, 
        hasDb: !!ctx.db, 
        userId: ctx.auth.userId,
        isAuthenticated: ctx.auth.isAuthenticated 
      });
      
      // Enhanced error checking
      if (!ctx.db) {
        console.error('❌ Database context is missing!');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      if (!ctx.auth.userId) {
        console.error('❌ User ID is missing from auth context!');
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User authentication required",
        });
      }

      try {
        // Check if user is server member with enhanced error handling
        console.log('🔍 Checking if user is member of server:', input.serverId);
        
        const member = await ctx.db.serverMember.findUnique({
          where: {
            userId_serverId: {
              userId: ctx.auth.userId,
              serverId: input.serverId,
            },
          },
        });

        console.log('👤 Member check result:', !!member);

        if (!member) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a member to create invites",
          });
        }

        // Generate unique invite code using nanoid
        let code: string;
        let attempts = 0;
        const maxAttempts = 10;
        
        console.log('🎲 Generating unique invite code...');
        
        do {
          code = nanoid(10); // Use nanoid instead of random string
          console.log(`🔍 Checking code attempt ${attempts + 1}: ${code}`);
          
          try {
            const existing = await ctx.db.serverInvite.findUnique({
              where: { code },
            });
            
            if (!existing) {
              console.log('✅ Code is unique!');
              break;
            }
            console.log('⚠️ Code already exists, trying another...');
          } catch (error) {
            console.error('❌ Error checking existing invite:', error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to verify invite code uniqueness",
            });
          }
          
          attempts++;
        } while (attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
          console.error('❌ Failed to generate unique code after max attempts');
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate unique invite code",
          });
        }
        
        // Calculate expiration date
        const expiresAt = input.expiresIn && input.expiresIn > 0
          ? new Date(Date.now() + input.expiresIn * 60 * 60 * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

        console.log('📅 Invite will expire at:', expiresAt.toISOString());

        // Create the invite
        console.log('💾 Creating invite in database...');
        
        const invite = await ctx.db.serverInvite.create({
          data: {
            code,
            serverId: input.serverId,
            createdBy: ctx.auth.userId,
            maxUses: input.maxUses || null,
            expiresAt,
          },
        });

        console.log('✅ Invite created successfully:', { 
          id: invite.id, 
          code: invite.code, 
          serverId: input.serverId 
        });
        
        return { 
          code: invite.code,
          expiresAt: invite.expiresAt,
          maxUses: invite.maxUses,
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.code}`
        };
        
      } catch (error) {
        console.error('❌ Error in createInvite:', error);
        
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Wrap other errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invite",
          cause: error,
        });
      }
    }),

  // Public procedure to get invite details (no auth required)
  getInvitePublic: publicProcedure
    .input(z.object({ inviteCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.serverInvite.findUnique({
        where: {
          code: input.inviteCode,
          expiresAt: {
            gt: new Date(), // Only get non-expired invites
          },
        },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              color: true,
              glowColor: true,
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invite",
        });
      }

      // Check if invite has reached max uses
      if (invite.maxUses && invite.uses >= invite.maxUses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has reached maximum uses",
        });
      }

      return {
        id: invite.id,
        code: invite.code,
        server: invite.server,
        inviter: invite.creator,
        uses: invite.uses,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt,
      };
    }),

  // Keep the old getInvite for backward compatibility (but improved)
  getInvite: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input, ctx }) => {
      console.log('🔍 getInvite called with:', { code: input.code, hasDb: !!ctx.db });
      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }
      
      try {
        const invite = await ctx.db.serverInvite.findUnique({
          where: { code: input.code },
          include: {
            server: {
              include: {
                _count: {
                  select: {
                    members: true,
                  },
                },
                members: {
                  where: {
                    user: {
                      status: {
                        in: ["ONLINE", "IDLE", "DND"],
                      },
                    },
                  },
                  include: {
                    user: true,
                    roles: {
                      include: {
                        role: true,
                      },
                    },
                  },
                },
                channels: {
                  where: {
                    type: {
                      in: ["TEXT", "VOICE"],
                    },
                  },
                  orderBy: {
                    position: "asc",
                  },
                },
              },
            },
          },
        });

        if (!invite) {
          console.log('❌ Invite not found:', input.code);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invite not found",
          });
        }

        // Check if invite is expired
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          console.log('⏰ Invite expired:', input.code);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invite has expired",
          });
        }

        // Check if invite has reached max uses
        if (invite.maxUses && invite.uses >= invite.maxUses) {
          console.log('🔒 Invite used up:', input.code);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invite has reached maximum uses",
          });
        }

        console.log('✅ Found valid invite for server:', invite.server.name);
        return invite;
        
      } catch (error) {
        console.error('❌ Error in getInvite:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve invite",
          cause: error,
        });
      }
    }),

  // Join server via invite
  joinViaInvite: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      console.log('🚪 joinViaInvite called with:', { code: input.code, userId: ctx.auth.userId });
      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        const invite = await ctx.db.serverInvite.findUnique({
          where: { code: input.code },
          include: { server: true },
        });

        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invite not found",
          });
        }

        // Check if invite is expired
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invite has expired",
          });
        }

        // Check if invite has reached max uses
        if (invite.maxUses && invite.uses >= invite.maxUses) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invite has reached maximum uses",
          });
        }

        // Check if already a member
        const existingMember = await ctx.db.serverMember.findUnique({
          where: {
            userId_serverId: {
              userId: ctx.auth.userId,
              serverId: invite.serverId,
            },
          },
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You are already a member of this server",
          });
        }

        // Create member and increment invite uses
        const [member] = await ctx.db.$transaction([
          ctx.db.serverMember.create({
            data: {
              userId: ctx.auth.userId,
              serverId: invite.serverId,
            },
          }),
          ctx.db.serverInvite.update({
            where: { id: invite.id },
            data: { uses: { increment: 1 } },
          }),
        ]);

        console.log('✅ User joined server via invite:', { userId: ctx.auth.userId, serverId: invite.serverId });
        return { serverId: invite.serverId, serverName: invite.server.name };
        
      } catch (error) {
        console.error('❌ Error in joinViaInvite:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join server",
          cause: error,
        });
      }
    }),

  // Protected procedure to join server via invite code (requires auth)
  joinServerViaInvite: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      console.log('🚪 User attempting to join via invite:', { userId, inviteCode: input.inviteCode });

      const invite = await ctx.db.serverInvite.findUnique({
        where: {
          code: input.inviteCode,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              color: true,
              glowColor: true,
            },
          },
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invite",
        });
      }

      // Check if invite has reached max uses
      if (invite.maxUses && invite.uses >= invite.maxUses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has reached maximum uses",
        });
      }

      // Check if user is already a member
      const existingMember = await ctx.db.serverMember.findFirst({
        where: {
          userId: userId,
          serverId: invite.serverId,
        },
      });

      if (existingMember) {
        console.log('✅ User already member, redirecting to server:', invite.serverId);
        return { 
          success: true, 
          serverId: invite.serverId,
          serverName: invite.server.name,
          alreadyMember: true
        };
      }

      try {
        // Add user to server and increment invite usage in a transaction
        await ctx.db.$transaction([
          ctx.db.serverMember.create({
            data: {
              userId: userId,
              serverId: invite.serverId,
            },
          }),
          ctx.db.serverInvite.update({
            where: { id: invite.id },
            data: { uses: { increment: 1 } },
          }),
        ]);

        console.log('✅ User joined server successfully:', { userId, serverId: invite.serverId });
        return { 
          success: true, 
          serverId: invite.serverId,
          serverName: invite.server.name,
          alreadyMember: false
        };
      } catch (error) {
        console.error('❌ Error joining server:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join server",
          cause: error,
        });
      }
    }),

  // Get server invites (for admins)
  getServerInvites: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Check if user has permission to view invites (is server member)
      const member = await ctx.db.serverMember.findFirst({
        where: {
          userId: userId,
          serverId: input.serverId,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view invites for this server",
        });
      }

      const invites = await ctx.db.serverInvite.findMany({
        where: {
          serverId: input.serverId,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return invites.map(invite => ({
        id: invite.id,
        code: invite.code,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.code}`,
        creator: invite.creator,
        uses: invite.uses,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }));
    }),

  // Delete server
  deleteServer: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const server = await ctx.db.server.findFirst({
        where: {
          id: input.serverId,
          ownerId: ctx.auth.userId,
        },
      });

      if (!server) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this server",
        });
      }

      await ctx.db.server.delete({
        where: { id: input.serverId },
      });

      return { success: true };
    }),
});
