import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export interface ISendEmailJobData {
  to: string;
  subject: string;
  body: string;
}

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MaxLength(10000)
  body!: string;
}
