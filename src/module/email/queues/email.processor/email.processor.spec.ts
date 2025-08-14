import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  let provider: EmailProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailProcessor],
    }).compile();

    provider = module.get<EmailProcessor>(EmailProcessor);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
