import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { GenerationJob } from './generation-job.entity';

@Entity({ name: 'summaries' })
export class Summary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GenerationJob, { onDelete: 'CASCADE' })
  job: GenerationJob;

  @Column()
  userId: string;

  @Column()
  documentId: string;

  @Column()
  title: string;

  @Column('text')
  overview: string;

  @Column('jsonb')
  keyPoints: string[];

  @CreateDateColumn()
  createdAt: Date;
}
