import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskStatus, TaskPriority } from './task.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/roles.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // regular user: see only their assigned tasks
  @Get()
  findAll(@Request() req: any) {
    return this.tasksService.findByUser(req.user.id);
  }

  // admin: see all tasks
  @Get('all')
  @UseGuards(RolesGuard)
  @Role('admin')
  findAllAdmin() {
    return this.tasksService.findAll();
  }

  // admin only: create and assign task
  @Post()
  @UseGuards(RolesGuard)
  @Role('admin')
  create(
    @Body()
    body: { title: string; assigneeId?: number },
    @Request() req: any,
  ) {
    return this.tasksService.create(body.title, req.user, body.assigneeId);
  }

  // both: update status (service enforces ownership for regular users)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { status: TaskStatus },
    @Request() req: any,
  ) {
    return this.tasksService.update(
      +id,
      body.status,
      req.user.id,
      req.user.role);
  }

  // admin only: edit title
  @Patch(':id/title')
  @UseGuards(RolesGuard)
  @Role('admin')
  updateTitle(
    @Param('id') id: string,
    @Body() body: { title: string },
    @Request() req: any,
  ) {
    return this.tasksService.updateTitle(+id, body.title, req.user);
  }

  @Patch(':id/priority')
  @UseGuards(RolesGuard)
  @Role('admin')
  updatePriority(
    @Param('id') id: string,
    @Body() body: { priority: TaskPriority },
    @Request() req: any,
  ) {
    return this.tasksService.updatePriority(+id, body.priority, req.user);
  }

  @Patch(':id/due-date')
  @UseGuards(RolesGuard)
  @Role('admin')
  updateDueDate(
    @Param('id') id: string,
    @Body() body: { dueDate: string },
    @Request() req: any,
  ) {
    return this.tasksService.updateDueDate(+id, body.dueDate, req.user);
  }

  // admin only: delete task
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Role('admin')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.remove(+id, req.user);
  }

  // admin only: reassign task to another user
  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Role('admin')
  reassign(
    @Param('id') id: string,
    @Body() body: { assigneeId: number },
    @Request() req: any,
  ) {
    return this.tasksService.reassign(+id, body.assigneeId, req.user);
  }

  // admin only: add subtask
  @Post(':id/subtasks')
  @UseGuards(RolesGuard)
  @Role('admin')
  createSubtask(@Param('id') id: string, @Body() body: { title: string }) {
    return this.tasksService.createSubtask(+id, body.title);
  }

  // both: update subtask status
  @Patch('subtasks/:id')
  updateSubtask(@Param('id') id: string, @Body() body: { status: TaskStatus }) {
    return this.tasksService.updateSubtask(+id, body.status);
  }

  // admin only: edit subtask title
  @Patch('subtasks/:id/title')
  @UseGuards(RolesGuard)
  @Role('admin')
  updateSubtaskTitle(@Param('id') id: string, @Body() body: { title: string }) {
    return this.tasksService.updateSubtaskTitle(+id, body.title);
  }

  // admin only: delete subtask
  @Delete('subtasks/:id')
  @UseGuards(RolesGuard)
  @Role('admin')
  removeSubtask(@Param('id') id: string) {
    return this.tasksService.removeSubtask(+id);
  }
}
