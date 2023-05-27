import express from "express";
import { ErrorPage } from "../pages/ErrorPage";
import { ExternalUserInfo } from "./authorize";
import { renderReactComponent } from "./html";
import jwt from "jsonwebtoken";
import dedent from "dedent";
import { createEmailSender, EmailSenderParams } from "./EmailSenderSmtp";

function log(...args: unknown[]) {
  console.log("authenticateEmail", ...args);
}

export type EmailAuthProviderParams = {
  appUrl: string;
  appGatewayRelativeUri: string;
  tokenSigningSecret: string;
  email: EmailSenderParams;
  authorize: (user: ExternalUserInfo) => Promise<string | false>;
};

export function createEmailAuthProvider(params: EmailAuthProviderParams) {
  const {
    appGatewayRelativeUri,
    email: emailSenderParams,
    tokenSigningSecret,
    authorize,
  } = params;
  const { sendEmail, cleanup: cleanupEmailSender } =
    createEmailSender(emailSenderParams);

  async function startEmailAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const { appUrl } = params;
      const email = req.body.email;
      const originalUrl = req.body.originalUrl;
      const token = jwt.sign({ e: email, u: originalUrl }, tokenSigningSecret, {
        expiresIn: "30m",
        audience: appUrl,
      });

      log(`sending token to ${email}`);
      await sendEmail({
        email,
        subject: `Access link for ${appUrl}`,
        text: dedent(`
          Hello,

          Your code for accessing ${appUrl} is: ${token}

          Use it in login form or click this link: ${appUrl}${appGatewayRelativeUri}/auth-token?token=${encodeURIComponent(
          token
        )}
          BR,
            Support team
      `),
      });

      res.redirect(
        302,
        `${appUrl}${appGatewayRelativeUri}/login?step=email2&enteredEmail=${encodeURIComponent(
          email
        )}`
      );
      res.end();
    } catch (error) {
      next(error);
    }
  }

  async function consumeEmailToken(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const { appUrl } = params;
      const token = req.query.token || req.body.token;
      let tokenPayload: any;
      log("validating token");
      try {
        tokenPayload =
          typeof token === "string" &&
          jwt.verify(token, tokenSigningSecret, { audience: appUrl });
      } catch {
        tokenPayload = undefined;
      }

      log("got valid token", tokenPayload);
      const valid = tokenPayload && tokenPayload.e;
      if (!valid) {
        res
          .status(401)
          .type("html")
          .send(
            renderReactComponent(
              ErrorPage,
              { message: "Authentication failed" },
              "Authentication failed"
            )
          );
        return;
      }

      const externalUser: ExternalUserInfo = {
        email: tokenPayload.e,
        type: "email",
      };

      log("authorizing", externalUser);
      if (!(await authorize(externalUser))) {
        res
          .status(403)
          .type("html")
          .send(
            renderReactComponent(
              ErrorPage,
              { message: "Unauthorized" },
              "Unauthorized"
            )
          );
        return;
      }

      log("authenticated as", externalUser.principal);
      req.session._ageu = externalUser;

      const originalUrl = tokenPayload.u || req.session.originalUrl || "/";
      req.session.originalUrl = undefined;
      log("redirecting to", originalUrl);
      res.redirect(302, originalUrl);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  return {
    startEmailAuth,
    consumeEmailToken,
    cleanup: () => {
      cleanupEmailSender();
    },
  };
}
