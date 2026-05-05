-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bio" TEXT,
    "contactEmail" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Host_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HostMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "inviteToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HostMember_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HostMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Host_slug_key" ON "Host"("slug");

-- CreateIndex
CREATE INDEX "Host_slug_idx" ON "Host"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HostMember_inviteToken_key" ON "HostMember"("inviteToken");

-- CreateIndex
CREATE INDEX "HostMember_hostId_idx" ON "HostMember"("hostId");

-- CreateIndex
CREATE INDEX "HostMember_userId_idx" ON "HostMember"("userId");

-- CreateIndex
CREATE INDEX "HostMember_inviteToken_idx" ON "HostMember"("inviteToken");
