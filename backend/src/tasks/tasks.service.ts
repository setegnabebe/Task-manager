import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './task.entity';
import { Subtask } from './subtask.entity';
import { User } from '../auth/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Subtask)
    private subtasksRepository: Repository<Subtask>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private activityService: ActivityService,
  ) {}

  findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: ['subtasks', 'owner', 'assignee'],
      order: { created_at: 'DESC' },
    });
  }

  findByUser(userId: number): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { assignee: { id: userId } },
      relations: ['subtasks', 'owner', 'assignee'],
      order: { created_at: 'DESC' },
    });
  }

  async create(
    title: string,
    owner: User,
    assigneeId?: number,
    priority?: TaskPriority,
    dueDate?: string,
  ): Promise<Task> {
    const assignee = assigneeId ? ({ id: assigneeId } as User) : owner;
    const task = this.tasksRepository.create({
      title,
      owner,
      assignee,
      priority: priority ?? 'medium',
      dueDate,
    });
    const saved = await this.tasksRepository.save(task);

    const fullTask = await this.tasksRepository.findOne({
      where: { id: saved.id },
      relations: ['assignee'],
    });

    if (fullTask?.assignee) {
      await this.notificationsService.create(
        `New task assigned to you: "${title}"`,
        fullTask.assignee,
      );
    }

    await this.activityService.log(
      'task_created',
      `Task "${title}" created and assigned to ${fullTask?.assignee?.username || 'unassigned'}`,
      owner,
    );

    return saved;
  }

  async update(
    id: number,
    status: TaskStatus,
    userId: number,
    userRole: string,
  ): Promise<Task | null> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'assignee'],
    });

    if (userRole !== 'admin' && task?.assignee?.id !== userId) {
      throw new ForbiddenException('You can only update your own tasks');
    }

    await this.tasksRepository.update(id, { status });

    if (status === 'done' && task?.assignee) {
      await this.notificationsService.create(
        `Task "${task.title}" marked as done!`,
        task.assignee,
      );
    }

    await this.activityService.log(
      'status_changed',
      `Task "${task?.title}" status changed to ${status}`,
      { id: userId } as User,
    );

    return this.tasksRepository.findOne({
      where: { id },
      relations: ['owner', 'assignee'],
    });
  }

  async updateTitle(
    id: number,
    title: string,
    user: User,
  ): Promise<Task | null> {
    const task = await this.tasksRepository.findOneBy({ id });
    await this.tasksRepository.update(id, { title });
    await this.activityService.log(
      'task_updated',
      `Task renamed from "${task?.title}" to "${title}"`,
      user,
    );
    return this.tasksRepository.findOneBy({ id });
  }

  async updatePriority(
    id: number,
    priority: TaskPriority,
    user: User,
  ): Promise<Task | null> {
    const task = await this.tasksRepository.findOneBy({ id });
    await this.tasksRepository.update(id, { priority });
    await this.activityService.log(
      'priority_changed',
      `Task "${task?.title}" priority set to ${priority}`,
      user,
    );
    return this.tasksRepository.findOneBy({ id });
  }

  async updateDueDate(
    id: number,
    dueDate: string,
    user: User,
  ): Promise<Task | null> {
    const task = await this.tasksRepository.findOneBy({ id });
    await this.tasksRepository.update(id, { dueDate });
    await this.activityService.log(
      'due_date_set',
      `Task "${task?.title}" due date set to ${dueDate}`,
      user,
    );
    return this.tasksRepository.findOneBy({ id });
  }

  async remove(id: number, user: User): Promise<void> {
    const task = await this.tasksRepository.findOneBy({ id });
    await this.tasksRepository.delete(id);
    await this.activityService.log(
      'task_deleted',
      `Task "${task?.title}" was deleted`,
      user,
    );
  }

  async reassign(id: number, assigneeId: number, user: User): Promise<Task> {
    // load task
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['assignee', 'owner'],
    });

    // load the real user from DB using injected repository
    const newAssignee = await this.usersRepository.findOneBy({
      id: assigneeId,
    });

    if (!newAssignee) throw new Error('Assignee not found');

    // update the relation properly
    task!.assignee = newAssignee;
    await this.tasksRepository.save(task!);

    // send notification to new assignee
    await this.notificationsService.create(
      `Task "${task?.title}" has been as  signed to you`,
      newAssignee,
    );

    await this.activityService.log(
      'task_reassigned',
      `Task "${task?.title}" reassigned to ${newAssignee.username}`,
      user,
    );

    const updated = await this.tasksRepository.findOne({
      where: { id },
      relations: ['assignee', 'owner', 'subtasks'],
    });

    return updated!;
  }

  async createSubtask(taskId: number, title: string): Promise<Subtask | null> {
    const task = await this.tasksRepository.findOneBy({ id: taskId });
    if (!task) return null;
    const subtask = this.subtasksRepository.create({ title, task });
    return this.subtasksRepository.save(subtask);
  }

  async updateSubtask(id: number, status: TaskStatus): Promise<Subtask | null> {
    await this.subtasksRepository.update(id, { status });
    return this.subtasksRepository.findOneBy({ id });
  }

  async updateSubtaskTitle(id: number, title: string): Promise<Subtask | null> {
    await this.subtasksRepository.update(id, { title });
    return this.subtasksRepository.findOneBy({ id });
  }

  async removeSubtask(id: number): Promise<void> {
    await this.subtasksRepository.delete(id);
  }
}
