import nodemailer from "nodemailer";
import { defaultFrom } from "../../../config/constants";
import type { EmailMessage, EmailTransport } from "../types";

export class SmtpEmailTransport implements EmailTransport {
  private readonly transporter: nodemailer.Transporter;

  constructor(host: string, port: number, user: string, pass: string) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async send(msg: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: msg.from ?? defaultFrom,
      to: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
      subject: msg.subject,
      ...(msg.html ? { html: msg.html } : {}),
      ...(msg.text ? { text: msg.text } : {}),
    });
  }
}
