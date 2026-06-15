import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../auth/user.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  created_at!: Date;
}
