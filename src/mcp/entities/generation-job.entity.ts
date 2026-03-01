import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { GenerationSource } from './generation-source.entity';
import { GenerationWarning } from './generation-warning.entity';

@Entity({ name: 'generation_jobs' })
export class GenerationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  jobId: string;

  @Column()
  event: string;

  @Column()
  status: string;

  @Column()
  userId: string;

  @Column()
  documentId: string;

  @Column()
  filename: string;

  @Column()
  fileType: string;

  @Column({ type: 'int' })
  extractedChars: number;

  @Column({ type: 'int', nullable: true })
  attempt?: number;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => GenerationSource, (s) => s.job, { cascade: true })
  sources: GenerationSource[];

  @OneToMany(() => GenerationWarning, (w) => w.job, { cascade: true })
  warnings: GenerationWarning[];
}
