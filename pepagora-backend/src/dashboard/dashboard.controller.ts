import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  
  @Get('admin')
  @Roles('admin')
  getAdminDashboard(@Request() req) {
    return {
      message: 'Welcome to Admin Dashboard',
      user: req.user,
      features: [
        'Manage all categories',
        'Manage all subcategories',
        'Manage all products',
        'View all users',
      ],
    };
  }

  @Get('category-manager')
  @Roles('category_manager')
  getCategoryManagerDashboard(@Request() req) {
    return {
      message: 'Welcome to Category Manager Dashboard',
      user: req.user,
      features: [
        'Manage categories',
        'Manage subcategories',
      ],
    };
  }

  @Get('pepagora-manager')
  @Roles('pepagora_manager')
  getPepagoraManagerDashboard(@Request() req) {
    return {
      message: 'Welcome to Pepagora Manager Dashboard',
      user: req.user,
      features: [
        'Manage products',
        'View subcategories and categories',
      ],
    };
  }
}
