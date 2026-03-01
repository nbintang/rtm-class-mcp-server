import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { EssayQuiz } from './essay-quiz.entity';

@Entity({ name: 'essay_questions' })
export class EssayQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EssayQuiz, (qz) => qz.questions, { onDelete: 'CASCADE' })
  quiz: EssayQuiz;

  @Column('text')
  question: string;

  @Column()
  expectedPoints: string; // di payload kamu string "5"
}
