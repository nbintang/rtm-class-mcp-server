import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiJobAiOutputForeignKeys1772425400000
  implements MigrationInterface
{
  name = 'AddAiJobAiOutputForeignKeys1772425400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public."AIJob"') IS NOT NULL
           AND to_regclass('public."Material"') IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM pg_constraint WHERE conname = 'FK_ai_job_material_id'
           ) THEN
          ALTER TABLE "AIJob"
          ADD CONSTRAINT "FK_ai_job_material_id"
          FOREIGN KEY ("materialId")
          REFERENCES "Material"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public."AIJob"') IS NOT NULL
           AND to_regclass('public."User"') IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM pg_constraint WHERE conname = 'FK_ai_job_requested_by_id'
           ) THEN
          ALTER TABLE "AIJob"
          ADD CONSTRAINT "FK_ai_job_requested_by_id"
          FOREIGN KEY ("requestedById")
          REFERENCES "User"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public."AIOutput"') IS NOT NULL
           AND to_regclass('public."Material"') IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM pg_constraint WHERE conname = 'FK_ai_output_material_id'
           ) THEN
          ALTER TABLE "AIOutput"
          ADD CONSTRAINT "FK_ai_output_material_id"
          FOREIGN KEY ("materialId")
          REFERENCES "Material"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "AIOutput" DROP CONSTRAINT IF EXISTS "FK_ai_output_material_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AIJob" DROP CONSTRAINT IF EXISTS "FK_ai_job_requested_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AIJob" DROP CONSTRAINT IF EXISTS "FK_ai_job_material_id"`,
    );
  }
}
