// src/email/dto/enqueue-email-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnqueueEmailResponseDto {
  @ApiProperty({ example: 'job_01J7X9Y2Z3ABCDEF' })
  id!: string;

  @ApiProperty({ example: 'queued' })
  status!: 'queued';

  @ApiProperty({ example: 'user@example.com' })
  to!: string;

  @ApiPropertyOptional({ example: 'Welcome to Ghapfy' })
  subject?: string;

  @ApiProperty({ example: '2025-08-14T17:22:54.123Z' })
  queuedAt!: string;
}
