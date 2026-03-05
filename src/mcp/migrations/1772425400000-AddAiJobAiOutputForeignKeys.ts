import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiJobAiOutputForeignKeys1772425400000
  implements MigrationInterface
{
  name = 'AddAiJobAiOutputForeignKeys1772425400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // AIJob.materialId -> Material.id
    await queryRunner.query(`
      ALTER TABLE "AIJob"
      ADD CONSTRAINT "FK_ai_job_material_id"
      FOREIGN KEY ("materialId")
      REFERENCES "Material"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // AIJob.requestedById -> User.id
    await queryRunner.query(`
      ALTER TABLE "AIJob"
      ADD CONSTRAINT "FK_ai_job_requested_by_id"
      FOREIGN KEY ("requestedById")
      REFERENCES "User"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    // AIOutput.materialId -> Material.id
    await queryRunner.query(`
      ALTER TABLE "AIOutput"
      ADD CONSTRAINT "FK_ai_output_material_id"
      FOREIGN KEY ("materialId")
      REFERENCES "Material"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "AIOutput" DROP CONSTRAINT "FK_ai_output_material_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AIJob" DROP CONSTRAINT "FK_ai_job_requested_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AIJob" DROP CONSTRAINT "FK_ai_job_material_id"`,
    );
  }
}
