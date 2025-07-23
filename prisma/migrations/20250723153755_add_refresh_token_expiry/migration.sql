-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokenExpiry" TIMESTAMP(3),
ALTER COLUMN "refreshToken" DROP DEFAULT;
