/*
  Warnings:

  - The primary key for the `UserPreferences` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `illness_tags` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `match_preference` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `mood_tags` on the `UserPreferences` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `UserPreferences` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `UserPreferences` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `UserPreferences` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'ANY');

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_user_id_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "illnessId" TEXT;

-- AlterTable
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_pkey",
DROP COLUMN "illness_tags",
DROP COLUMN "match_preference",
DROP COLUMN "mood_tags",
ADD COLUMN     "ageRangeMax" INTEGER NOT NULL DEFAULT 65,
ADD COLUMN     "ageRangeMin" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "availabilityHours" TEXT[],
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "isOpenToGroupChats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOpenToMentoring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSeekingMentor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredChatStyle" TEXT[],
ADD COLUMN     "preferredGender" "Gender" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "shareAge" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shareIllnesses" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Illness" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Illness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIllnessPreference" (
    "id" TEXT NOT NULL,
    "userPreferenceId" TEXT NOT NULL,
    "illnessId" TEXT NOT NULL,
    "isMainIllness" BOOLEAN NOT NULL DEFAULT false,
    "diagnosedYear" INTEGER,
    "severityLevel" INTEGER DEFAULT 3,
    "isSeekingSupport" BOOLEAN NOT NULL DEFAULT true,
    "isOfferingSupport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserIllnessPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Illness_name_key" ON "Illness"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserIllnessPreference_userPreferenceId_illnessId_key" ON "UserIllnessPreference"("userPreferenceId", "illnessId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_user_id_key" ON "UserPreferences"("user_id");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_illnessId_fkey" FOREIGN KEY ("illnessId") REFERENCES "Illness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIllnessPreference" ADD CONSTRAINT "UserIllnessPreference_userPreferenceId_fkey" FOREIGN KEY ("userPreferenceId") REFERENCES "UserPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIllnessPreference" ADD CONSTRAINT "UserIllnessPreference_illnessId_fkey" FOREIGN KEY ("illnessId") REFERENCES "Illness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
