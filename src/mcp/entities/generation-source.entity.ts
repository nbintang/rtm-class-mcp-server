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
  @Column()
  chunkId: string;

  @Index()
  @Column()
  sourceId: string;

  @Column('text')
  excerpt: string;
}
