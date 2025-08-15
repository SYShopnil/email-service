import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    description: 'to whom email will be sent',
    example: 'xyz@gmail.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'email subject',
    example: 'any subject',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({
    description: 'Email body as plain text or HTML',
    example: '<p>Hello from ZOHO + Nodemailer 👋</p>',
    maxLength: 10000,
    required: true,
  })
  @IsString()
  @MaxLength(10000)
  body!: string;
}
