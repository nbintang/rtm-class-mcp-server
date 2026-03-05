import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiOutputTable1772425300000 implements MigrationInterface {
  name = 'CreateAiOutputTable1772425300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF to_regclass('public."AIOutput"') IS NULL THEN
    CREATE TABLE "AIOutput" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "materialId" uuid NOT NULL,
      "jobId" uuid NOT NULL,
      "type" "public"."AIJobType" NOT NULL,
      "content" jsonb NOT NULL,
      "editedContent" jsonb,
      "isPublished" boolean NOT NULL DEFAULT false,
      "publishedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_ai_output_job_id" UNIQUE ("jobId"),
      CONSTRAINT "PK_e2f9c06c6cf89dc60b70e2f43a4" PRIMARY KEY ("id")
    );
  END IF;
END $$;
`);

    await queryRunner.query(`
CREATE INDEX IF NOT EXISTS "IDX_ai_output_material_id_type"
ON "AIOutput" ("materialId", "type");
`);

    // FK ke AIJob (idempotent: cek pg_constraint)
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_ai_output_job_id'
  ) THEN
    ALTER TABLE "AIOutput"
    ADD CONSTRAINT "FK_ai_output_job_id"
    FOREIGN KEY ("jobId")
    REFERENCES "AIJob"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
  END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "AIOutput" DROP CONSTRAINT IF EXISTS "FK_ai_output_job_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ai_output_material_id_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "AIOutput"`);
  }
}