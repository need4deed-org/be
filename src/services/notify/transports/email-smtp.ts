import nodemailer from "nodemailer";
import { defaultFrom } from "../../../config/constants";
import type { EmailMessage, EmailTransport } from "../types";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from?: string;
}

export class SmtpEmailTransport implements EmailTransport {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from ?? defaultFrom;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
    });
  }

  async send(msg: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: msg.from ?? this.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
  }
}
