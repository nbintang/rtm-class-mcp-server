import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AIJobType } from './ai-job.enums';
import { AiJobEntity } from './ai-job.entity';

@Entity({ name: 'AIOutput' })
@Index(['materialId', 'type'])
export class AiOutputEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  materialId: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  jobId: string;

  @Column({
    type: 'enum',
    enum: AIJobType,
    enumName: 'AIJobType',
  })
  type: AIJobType;

  @Column({ type: 'jsonb' })
  content: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  editedContent: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => AiJobEntity, (job) => job.output, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: AiJobEntity;
}
