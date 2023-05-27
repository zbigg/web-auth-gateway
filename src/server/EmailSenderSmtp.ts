import NodeMailer from "nodemailer";
import { htmlToText } from "html-to-text";

export type EmailSenderParams = {
  fromAddress: string;
  smtp: {
    host: string;
    port: number;
    auth: {
      user: string;
      password: string;
    };
  };
};

interface EmailProps {
  from?: string;

  /** Recipient e-mail address. */
  email: string;

  /** Reply-to e-mail address. */
  replyTo?: string;

  /** Subject of e-mail */
  subject: string;

  /** Content as HTML. */
  text?: string;

  /** Content as TEXT. */
  html?: string;
}

export function createEmailSender(params: EmailSenderParams) {
  const transport = NodeMailer.createTransport({
    host: params.smtp.host,
    port: params.smtp.port,
    auth: {
      user: params.smtp.auth.user,
      pass: params.smtp.auth.password,
    },
  });

  const sendEmail = async (data: EmailProps) => {
    const from = params.fromAddress || data.from;
    const html = data.html;
    let text = data.text;
    if (html && !text) {
      text = htmlToText(html, {
        wordwrap: 130,
        ignoreImage: true,
        hideLinkHrefIfSameAsText: true,
      });
    } else if (!html && !text) {
      throw new Error("sendEmail: missing text or html content");
    }

    return transport.sendMail({
      from, // sender address
      to: data.email, // list of receivers,
      replyTo: data.replyTo || from,
      subject: data.subject, // Subject line
      text, // plain text body
      html, // html body
    });
  };
  return {
    sendEmail,
    cleanup: () => {},
  };
}
