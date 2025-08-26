-- AlterTable
ALTER TABLE "ai_recommendations" ADD COLUMN "content" TEXT;
ALTER TABLE "ai_recommendations" ADD COLUMN "metadata" JSONB;
ALTER TABLE "ai_recommendations" ADD COLUMN "confidence" INTEGER DEFAULT 0;
