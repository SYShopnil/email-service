import { registerAs } from '@nestjs/config';

//!!need to remove
export enum EEmailProvider {
  Brevo = 'Brevo',
  Custom = 'Custom',
}

export default registerAs('email', () => ({
  provider: EEmailProvider.Brevo,
  smtp: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!, 10),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    secure: String(process.env.SMTP_SECURE ?? 'false') === 'true',
  },
}));
