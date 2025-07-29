/*
  Warnings:

  - You are about to drop the column `profilePicURL` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "profilePicURL",
ADD COLUMN     "avatarPublicId" TEXT DEFAULT 'user_profile.png',
ADD COLUMN     "avatarURL" TEXT DEFAULT './user_profile.png';
