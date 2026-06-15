import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Task } from '../tasks/task.entity';

export type UserRole = 'user' | 'admin';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({ default: 'user' })
  role!: UserRole;

  @Column({ default: 'user' })
  fcmtoken!: string;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Task, (task) => task.owner)
  tasks!: Task[];
}
