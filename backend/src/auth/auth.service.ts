import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersRepository.findOneBy({ username });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      role: user.role,
      username: user.username,
    };
  }

  async createUser(username: string, password: string, role: string = 'user') {
    const existing = await this.usersRepository.findOneBy({ username });
    if (existing) throw new ConflictException('Username already taken');
    const hashed = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      username,
      password: hashed,
      role,
    } as any);
    await this.usersRepository.save(user);
    return { message: 'User created successfully' };
  }

  async findAll() {
    return this.usersRepository.find({
      select: ['id', 'username', 'role', 'created_at'],
    });
  }

  async deleteUser(id: number) {
    await this.usersRepository.delete(id);
    return { success: true };
  }

  async updateFcmToken(userId: number, token: string) {
    await this.usersRepository.update(userId, { fcmtoken: token });
    return { success: true };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new UnauthorizedException('Old password incorrect');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, { password: hashed });
    return { success: true };
  }
}