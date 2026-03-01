import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { GenerationJob } from './generation-job.entity';

@Entity({ name: 'generation_warnings' })
export class GenerationWarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GenerationJob, (j) => j.warnings, { onDelete: 'CASCADE' })
  job: GenerationJob;

  @Column('text')
  message: string;
}
