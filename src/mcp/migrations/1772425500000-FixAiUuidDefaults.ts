import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAiUuidDefaults1772425500000 implements MigrationInterface {
  name = 'FixAiUuidDefaults1772425500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
DO $$
BEGIN
  IF to_regclass('public."AIJob"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AIJob'
        AND column_name = 'id'
        AND column_default = 'uuid_generate_v4()'
    ) THEN
      ALTER TABLE "AIJob" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
    END IF;
  END IF;

  IF to_regclass('public."AIOutput"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AIOutput'
        AND column_name = 'id'
        AND column_default = 'uuid_generate_v4()'
    ) THEN
      ALTER TABLE "AIOutput" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
    END IF;
  END IF;
END $$;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF to_regclass('public."AIOutput"') IS NOT NULL THEN
    ALTER TABLE "AIOutput" ALTER COLUMN "id" DROP DEFAULT;
  END IF;

  IF to_regclass('public."AIJob"') IS NOT NULL THEN
    ALTER TABLE "AIJob" ALTER COLUMN "id" DROP DEFAULT;
  END IF;
END $$;
`);
  }
}
