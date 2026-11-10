-- CreateEnum
CREATE TYPE "ReversiStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "ReversiColor" AS ENUM ('BLACK', 'WHITE');

-- CreateEnum
CREATE TYPE "ReversiEndReason" AS ENUM ('NORMAL', 'RESIGN', 'TIMEOUT');

-- CreateTable
CREATE TABLE "ReversiGame" (
    "Id" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastUpdated" TIMESTAMP(3) NOT NULL,
    "InviteCode" TEXT NOT NULL,
    "Status" "ReversiStatus" NOT NULL DEFAULT 'WAITING',
    "Board" TEXT NOT NULL,
    "Turn" "ReversiColor",
    "Version" INTEGER NOT NULL DEFAULT 0,
    "LastMove" JSONB,
    "ClockBaseMs" INTEGER,
    "IncrementMs" INTEGER NOT NULL DEFAULT 0,
    "BlackMs" INTEGER,
    "WhiteMs" INTEGER,
    "TurnStartedAt" TIMESTAMP(3),
    "Winner" "ReversiColor",
    "EndReason" "ReversiEndReason",
    "StartedAt" TIMESTAMP(3),
    "FinishedAt" TIMESTAMP(3),
    "NextGameId" TEXT,

    CONSTRAINT "ReversiGame_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ReversiPlayer" (
    "Id" TEXT NOT NULL,
    "GameId" TEXT NOT NULL,
    "Color" "ReversiColor" NOT NULL,
    "Name" TEXT NOT NULL,
    "IdentityHash" TEXT NOT NULL,
    "WantsRematch" BOOLEAN NOT NULL DEFAULT false,
    "JoinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReversiPlayer_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReversiGame_InviteCode_key" ON "ReversiGame"("InviteCode");

-- CreateIndex
CREATE INDEX "ReversiGame_Status_LastUpdated_idx" ON "ReversiGame"("Status", "LastUpdated");

-- CreateIndex
CREATE INDEX "ReversiPlayer_IdentityHash_idx" ON "ReversiPlayer"("IdentityHash");

-- CreateIndex
CREATE UNIQUE INDEX "ReversiPlayer_GameId_Color_key" ON "ReversiPlayer"("GameId", "Color");

-- AddForeignKey
ALTER TABLE "ReversiPlayer" ADD CONSTRAINT "ReversiPlayer_GameId_fkey" FOREIGN KEY ("GameId") REFERENCES "ReversiGame"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
