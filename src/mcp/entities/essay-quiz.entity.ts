import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { GenerationJob } from './generation-job.entity';
import { EssayQuestion } from './essay-question.entity';

@Entity({ name: 'essay_quizzes' })
export class EssayQuiz {
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

  @OneToMany(() => EssayQuestion, (q) => q.quiz, { cascade: true })
  questions: EssayQuestion[];
}
