import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { GenerationJob } from './generation-job.entity';

@Entity({ name: 'generation_sources' })
export class GenerationSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GenerationJob, (j) => j.sources, { onDelete: 'CASCADE' })
  job: GenerationJob;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  chunkId: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  sourceId: string | null;

  @Column('text')
  excerpt: string;
}
