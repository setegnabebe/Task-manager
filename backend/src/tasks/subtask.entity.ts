import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Task } from './task.entity';

export type SubtaskStatus = 'todo' | 'in_progress' | 'done';

@Entity()
export class Subtask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ default: 'todo' })
  status!: SubtaskStatus;

  @ManyToOne(() => Task, (task) => task.subtasks, { onDelete: 'CASCADE' })
  task!: Task;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
