import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAiUpdatedAtDefaults1772425600000
  implements MigrationInterface
{
  name = 'FixAiUpdatedAtDefaults1772425600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF to_regclass('public."AIJob"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AIJob'
        AND column_name = 'updatedAt'
        AND column_default IS NULL
    ) THEN
      ALTER TABLE "AIJob" ALTER COLUMN "updatedAt" SET DEFAULT now();
    END IF;
  END IF;

  IF to_regclass('public."AIOutput"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AIOutput'
        AND column_name = 'updatedAt'
        AND column_default IS NULL
    ) THEN
      ALTER TABLE "AIOutput" ALTER COLUMN "updatedAt" SET DEFAULT now();
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
    ALTER TABLE "AIOutput" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF to_regclass('public."AIJob"') IS NOT NULL THEN
    ALTER TABLE "AIJob" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
`);
  }
}
