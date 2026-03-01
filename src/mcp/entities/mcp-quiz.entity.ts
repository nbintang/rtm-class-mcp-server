import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { GenerationJob } from './generation-job.entity';
import { McqQuestion } from './mcq-question.entity';

@Entity({ name: 'mcq_quizzes' })
export class McqQuiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GenerationJob, { onDelete: 'CASCADE' })
  job: GenerationJob;

  @Column()
  userId: string;

  @Column()
  documentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => McqQuestion, (q) => q.quiz, { cascade: true })
  questions: McqQuestion[];
}
