import { IsString, IsEmail, MinLength, IsEnum, IsIn } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(['admin', 'category_manager', 'pepagora_manager'])
  role: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
} 

export class UpdateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsIn(['admin', 'category_manager', 'pepagora_manager'])
  role: string;
}
