import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Role } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Public registration endpoint
  @Post('register')
  register(
    @Body()
    body: {
      username: string;
      password: string;
    },
  ) {
    return this.authService.createUser(body.username, body.password, 'user');
  }

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  updateFcmToken(
    @Request() req: { user: { id: number } },
    @Body() body: { token: string },
  ) {
    return this.authService.updateFcmToken(req.user.id, body.token);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Request() req: { user: { id: number } },
    @Body()
    body: {
      oldPassword: string;
      newPassword: string;
    },
  ) {
    return this.authService.changePassword(
      req.user.id,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  createUser(
    @Body()
    body: {
      username: string;
      password: string;
      role?: string;
    },
  ) {
    const role = body.role ?? 'user';

    return this.authService.createUser(body.username, body.password, role);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  findAllUsers() {
    return this.authService.findAll();
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(+id);
  }
}
