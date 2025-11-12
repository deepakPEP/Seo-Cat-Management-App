import {
  Controller,
  Post,
  Body,
  UsePipes,
  UseGuards,
  Get,
  Param,
  Delete,
  Res,
  Put,
  Req,
  UnauthorizedException,NotFoundException
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, UpdateUserDto } from './auth.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { signupSchema, loginSchema } from './auth.zod';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
// import { Query } from 'mongoose';
import { Query } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ✅ Signup
  @Post('signup')
  // @UsePipes(new ZodValidationPipe(signupSchema))
  async signup(@Body() dto: SignupDto) {
    return this.authService.register(dto);
  }

  // ✅ Login (Set Refresh Token in HttpOnly Cookie)
  @Post('login')
  // @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);

    // ✅ Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Return only accessToken and user
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  // ✅ Refresh Access Token using Refresh Token from Cookie
  @Post('refresh')
  
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    return this.authService.refreshToken(refreshToken);
  }

  // ✅ Logout (Clear Refresh Token Cookie)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response, @Body('userId') userId: string) {
    
    await this.authService.logout(userId);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return { message: 'Logged out successfully',
          userId: userId
     };
  }



  // ✅ Get all users (Admin only)
  @Get('users')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async getAllUsers() {
    return this.authService.findAllUsers();
  }

  @Get('email-exists')
async emailExists(@Query('email') email: string) {
  const user = await this.authService.findUser({ email });
  return { exists: !!user };
}

@Get('users/:id')
async getUser(@Param('id') id: string) {
  const user = await this.authService.findUser({ _id: id });
  if (!user) throw new NotFoundException('User not found');
  return user;
}

@Put('users/:id')
// @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  return this.authService.updateUser(id, dto);
}

  // ✅ Delete a user (Admin only)
  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }
}
