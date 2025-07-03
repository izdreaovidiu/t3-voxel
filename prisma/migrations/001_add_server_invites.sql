-- CreateTable
CREATE TABLE "server_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "server_invites_code_key" ON "server_invites"("code");

-- AddForeignKey
ALTER TABLE "server_invites" ADD CONSTRAINT "server_invites_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_invites" ADD CONSTRAINT "server_invites_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
