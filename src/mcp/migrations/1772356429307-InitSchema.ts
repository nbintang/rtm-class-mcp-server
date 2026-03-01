import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1772356429307 implements MigrationInterface {
    name = 'InitSchema1772356429307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "generation_sources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chunkId" character varying NOT NULL, "sourceId" character varying NOT NULL, "excerpt" text NOT NULL, "jobId" uuid, CONSTRAINT "PK_d10641234feff9e8105ca2655c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e186c312aaff373e3af35deb93" ON "generation_sources" ("chunkId") `);
        await queryRunner.query(`CREATE INDEX "IDX_720efbbe148c678996128f5bda" ON "generation_sources" ("sourceId") `);
        await queryRunner.query(`CREATE TABLE "generation_warnings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" text NOT NULL, "jobId" uuid, CONSTRAINT "PK_235a5b691e103bd440b6b9e4977" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "generation_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jobId" character varying NOT NULL, "event" character varying NOT NULL, "status" character varying NOT NULL, "userId" character varying NOT NULL, "documentId" character varying NOT NULL, "filename" character varying NOT NULL, "fileType" character varying NOT NULL, "extractedChars" integer NOT NULL, "attempt" integer, "finishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b6b705e0fed45c8440c1d7d637" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f06b37c14a4c4f1a76929e53f4" ON "generation_jobs" ("jobId") `);
        await queryRunner.query(`CREATE TABLE "summaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "documentId" character varying NOT NULL, "title" character varying NOT NULL, "overview" text NOT NULL, "keyPoints" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "jobId" uuid, CONSTRAINT "PK_448e2a87db98ce2a6ee8946f392" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "mcq_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "question" text NOT NULL, "options" jsonb NOT NULL, "correctAnswer" character varying NOT NULL, "explanation" text, "quizId" uuid, CONSTRAINT "PK_db103f8e30b96ee52f30429ded9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "mcq_quizzes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "documentId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "jobId" uuid, CONSTRAINT "PK_604f3c11d7f7c469d766d62c0e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "essay_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "question" text NOT NULL, "expectedPoints" character varying NOT NULL, "quizId" uuid, CONSTRAINT "PK_8deb5b15e5de484ebcbdd31ec35" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "essay_quizzes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "documentId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "jobId" uuid, CONSTRAINT "PK_1ed6e3e62611324a10b6eb064ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "generation_sources" ADD CONSTRAINT "FK_cc76b88cc8593e540e759b9a1bc" FOREIGN KEY ("jobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generation_warnings" ADD CONSTRAINT "FK_38cb7ac3ec1b3a33f87adee2a8c" FOREIGN KEY ("jobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "summaries" ADD CONSTRAINT "FK_b934593defdaf74381ef1483541" FOREIGN KEY ("jobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mcq_questions" ADD CONSTRAINT "FK_465705825723e52a4c6b03d06a2" FOREIGN KEY ("quizId") REFERENCES "mcq_quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mcq_quizzes" ADD CONSTRAINT "FK_a75843ebd447ba4be397ae77b57" FOREIGN KEY ("jobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "essay_questions" ADD CONSTRAINT "FK_faf11c3a759f56a64816ff16e99" FOREIGN KEY ("quizId") REFERENCES "essay_quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "essay_quizzes" ADD CONSTRAINT "FK_95f96752351a58d92cc4112b8f1" FOREIGN KEY ("jobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "essay_quizzes" DROP CONSTRAINT "FK_95f96752351a58d92cc4112b8f1"`);
        await queryRunner.query(`ALTER TABLE "essay_questions" DROP CONSTRAINT "FK_faf11c3a759f56a64816ff16e99"`);
        await queryRunner.query(`ALTER TABLE "mcq_quizzes" DROP CONSTRAINT "FK_a75843ebd447ba4be397ae77b57"`);
        await queryRunner.query(`ALTER TABLE "mcq_questions" DROP CONSTRAINT "FK_465705825723e52a4c6b03d06a2"`);
        await queryRunner.query(`ALTER TABLE "summaries" DROP CONSTRAINT "FK_b934593defdaf74381ef1483541"`);
        await queryRunner.query(`ALTER TABLE "generation_warnings" DROP CONSTRAINT "FK_38cb7ac3ec1b3a33f87adee2a8c"`);
        await queryRunner.query(`ALTER TABLE "generation_sources" DROP CONSTRAINT "FK_cc76b88cc8593e540e759b9a1bc"`);
        await queryRunner.query(`DROP TABLE "essay_quizzes"`);
        await queryRunner.query(`DROP TABLE "essay_questions"`);
        await queryRunner.query(`DROP TABLE "mcq_quizzes"`);
        await queryRunner.query(`DROP TABLE "mcq_questions"`);
        await queryRunner.query(`DROP TABLE "summaries"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f06b37c14a4c4f1a76929e53f4"`);
        await queryRunner.query(`DROP TABLE "generation_jobs"`);
        await queryRunner.query(`DROP TABLE "generation_warnings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_720efbbe148c678996128f5bda"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e186c312aaff373e3af35deb93"`);
        await queryRunner.query(`DROP TABLE "generation_sources"`);
    }

}
