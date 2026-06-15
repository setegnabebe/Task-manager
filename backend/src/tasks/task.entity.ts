import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Subtask } from './subtask.entity';
import { User } from '../auth/user.entity';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ default: 'todo' })
  status!: TaskStatus;

  @Column({ default: 'medium' })
  priority!: TaskPriority;

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null;

  @OneToMany(() => Subtask, (subtask) => subtask.task)
  subtasks!: Subtask[];

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  owner!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  assignee!: User;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
