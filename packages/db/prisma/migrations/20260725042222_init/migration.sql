-- CreateEnum
CREATE TYPE "LobbyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Operation" AS ENUM ('ADD', 'SUB', 'MUL', 'DIV');

-- CreateEnum
CREATE TYPE "NumberOrder" AS ENUM ('SEQ', 'RAND');

-- CreateEnum
CREATE TYPE "CheckMode" AS ENUM ('INPUT', 'END');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('JOINED', 'PLAYING', 'FINISHED');

-- CreateTable
CREATE TABLE "Lobby" (
    "Id" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastUpdated" TIMESTAMP(3) NOT NULL,
    "InviteCode" TEXT NOT NULL,
    "Status" "LobbyStatus" NOT NULL DEFAULT 'OPEN',
    "Op" "Operation" NOT NULL DEFAULT 'ADD',
    "StartNumber" INTEGER NOT NULL DEFAULT 1,
    "EndNumber" INTEGER NOT NULL DEFAULT 10,
    "NumberOrder" "NumberOrder" NOT NULL DEFAULT 'SEQ',
    "Check" "CheckMode" NOT NULL DEFAULT 'INPUT',
    "TopHeaders" INTEGER[],
    "LeftHeaders" INTEGER[],
    "MaxPlayers" INTEGER NOT NULL DEFAULT 8,
    "StartedAt" TIMESTAMP(3),
    "FinishedAt" TIMESTAMP(3),
    "ExpiresAt" TIMESTAMP(3),

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Player" (
    "Id" TEXT NOT NULL,
    "LobbyId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsHost" BOOLEAN NOT NULL DEFAULT false,
    "Status" "PlayerStatus" NOT NULL DEFAULT 'JOINED',
    "Answers" JSONB NOT NULL DEFAULT '{"cells":[]}',
    "CorrectCount" INTEGER NOT NULL DEFAULT 0,
    "FilledCount" INTEGER NOT NULL DEFAULT 0,
    "JoinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastSeenAt" TIMESTAMP(3) NOT NULL,
    "FinishedAt" TIMESTAMP(3),

    CONSTRAINT "Player_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_InviteCode_key" ON "Lobby"("InviteCode");

-- CreateIndex
CREATE INDEX "Lobby_Status_LastUpdated_idx" ON "Lobby"("Status", "LastUpdated");

-- CreateIndex
CREATE INDEX "Player_LobbyId_idx" ON "Player"("LobbyId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_LobbyId_fkey" FOREIGN KEY ("LobbyId") REFERENCES "Lobby"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
