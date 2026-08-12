/*
  Warnings:

  - A unique constraint covering the columns `[DiscordInstanceId]` on the table `Lobby` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[LobbyId,DiscordUserId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "DiscordChannelId" TEXT,
ADD COLUMN     "DiscordGuildId" TEXT,
ADD COLUMN     "DiscordInstanceId" TEXT,
ADD COLUMN     "NextLobbyId" TEXT,
ADD COLUMN     "SettingsOpen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "DiscordAvatar" TEXT,
ADD COLUMN     "DiscordUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_DiscordInstanceId_key" ON "Lobby"("DiscordInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_LobbyId_DiscordUserId_key" ON "Player"("LobbyId", "DiscordUserId");
