import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../auth/user.entity';

@Entity()
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  action!: string;

  @Column()
  details!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  performedBy!: User;

  @CreateDateColumn()
  created_at!: Date;
}
