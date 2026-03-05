  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class CreateAiJobTable1772425200000 implements MigrationInterface {
    name = 'CreateAiJobTable1772425200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      // 1) enum types (idempotent)
      await queryRunner.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'AIJobType' AND n.nspname = 'public'
    ) THEN
      CREATE TYPE "public"."AIJobType" AS ENUM (
        'MCQ','ESSAY','SUMMARY','LKPD','REMEDIAL','DISCUSSION_TOPIC'
      );
    END IF;
  END $$;
  `);

      await queryRunner.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'AIJobStatus' AND n.nspname = 'public'
    ) THEN
      CREATE TYPE "public"."AIJobStatus" AS ENUM (
        'accepted','processing','succeeded','failed_processing','failed_delivery'
      );
    END IF;
  END $$;
  `);

      // 2) table (idempotent)
      await queryRunner.query(`
  DO $$
  BEGIN
    IF to_regclass('public."AIJob"') IS NULL THEN
      CREATE TABLE "AIJob" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "materialId" uuid NOT NULL,
        "requestedById" uuid NOT NULL,
        "type" "public"."AIJobType" NOT NULL,
        "status" "public"."AIJobStatus" NOT NULL DEFAULT 'accepted',
        "attempts" integer NOT NULL DEFAULT 0,
        "parameters" jsonb,
        "externalJobId" character varying,
        "lastError" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_07a5719af56fca1f2721ce31e83" PRIMARY KEY ("id")
      );
    END IF;
  END $$;
  `);

      // 3) indexes (idempotent)
      await queryRunner.query(`
  CREATE INDEX IF NOT EXISTS "IDX_ai_job_status_created_at"
  ON "AIJob" ("status", "createdAt");
  `);

      await queryRunner.query(`
  CREATE INDEX IF NOT EXISTS "IDX_ai_job_material_id"
  ON "AIJob" ("materialId");
  `);

      await queryRunner.query(`
  CREATE INDEX IF NOT EXISTS "IDX_ai_job_requested_by_id"
  ON "AIJob" ("requestedById");
  `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      // Down biasanya tidak perlu idempotent, tapi kalau mau aman, bisa pakai IF EXISTS juga
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ai_job_requested_by_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ai_job_material_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ai_job_status_created_at"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "AIJob"`);

      // Hati-hati drop type kalau dipakai table lain
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."AIJobStatus"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."AIJobType"`);
    }
  }