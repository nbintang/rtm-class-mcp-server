import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { McqQuiz } from './mcp-quiz.entity';

@Entity({ name: 'mcq_questions' })
export class McqQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => McqQuiz, (qz) => qz.questions, { onDelete: 'CASCADE' })
  quiz: McqQuiz;

  @Column('text')
  question: string;

  @Column('jsonb')
  options: string[];

  @Column()
  correctAnswer: string;

  @Column('text', { nullable: true })
  explanation?: string;
}
