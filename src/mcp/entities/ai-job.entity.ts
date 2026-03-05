import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AIJobStatus, AIJobType } from './ai-job.enums';
import { AiOutputEntity } from './ai-output.entity';

@Entity({ name: 'AIJob' })
@Index(['status', 'createdAt'])
@Index(['materialId'])
@Index(['requestedById'])
export class AiJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  materialId: string;

  @Column({ type: 'uuid' })
  requestedById: string;

  @Column({
    type: 'enum',
    enum: AIJobType,
    enumName: 'AIJobType',
  })
  type: AIJobType;

  @Column({
    type: 'enum',
    enum: AIJobStatus,
    enumName: 'AIJobStatus',
    default: AIJobStatus.ACCEPTED,
  })
  status: AIJobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  externalJobId: string | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @OneToOne(() => AiOutputEntity, (output) => output.job)
  output?: AiOutputEntity;
}
