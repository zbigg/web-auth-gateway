import express from "express";
import { AuthGatewayConfig, OAuth2Params } from "../common";
import { ErrorPage } from "../pages/ErrorPage";
import { ExternalUserInfo } from "./authorize";
import { renderReactComponent } from "./html";

function log(...args: unknown[]) {
  console.log("authenticateSocial", ...args);
}

export interface OAuthTokenSet {
  accessToken?: string;
  identityToken?: string;
}

export interface SocialProvider {
  type: "facebook" | "github" | "google" | "microsoft";

  getClientOAuthParams(): OAuth2Params;
  consumeCode(req: express.Request): Promise<OAuthTokenSet>;
  getUserInfo(token: string): Promise<ExternalUserInfo>;
}

export type SocialLoginConfig = Record<string, SocialProvider>;

export async function authenticate(
  provider: SocialProvider,
  req: express.Request
) {
  const code = req.body.code || req.query.code;
  const accessToken = req.body.accessToken || req.query.accessToken;
  const state = req.body.state || req.query.state;

  if (
    typeof req.body.identityToken === "string" &&
    typeof req.body.userId === "string"
  ) {
    // mobile: identityToken & userId
    const identityToken: string = String(req.body.identityToken);
    const externalUser = await provider.getUserInfo(req.body.identityToken);

    if (externalUser.id !== req.body.userId) {
      throw Error("ERR_EXT_AUTH_FAILED");
    }
    return { tokenSet: { identityToken: identityToken }, externalUser };
  } else if (
    typeof accessToken === "string" &&
    typeof req.body.userId === "string"
  ) {
    // not implemented "apple" with "accessToken" yet
    // if (type === "apple") throw Error("ERR_NOT_IMPLEMENTED_YET");

    // mobile: accessToken & userId
    const externalUser = await provider.getUserInfo(accessToken);

    if (externalUser.id !== req.body.userId) {
      throw Error("ERR_EXT_AUTH_FAILED");
    }
    return { tokenSet: { accessToken }, externalUser };
  } else if (typeof code === "string" && typeof state === "string") {
    // web: OAuth redirect code & state

    if (state !== req.session.authState) {
      log("invalid auth state", state, req.session.authState);
      throw Error("ERR_BAD_REQUEST");
    }

    const tokenSet = await provider.consumeCode(req);

    if (!tokenSet.accessToken) {
      log("invalid Access Token");
      throw Error("ERR_BAD_REQUEST");
    }

    const externalUser = await provider.getUserInfo(tokenSet.accessToken);

    return { tokenSet, externalUser };
  } else {
    throw Error("ERR_BAD_REQUEST");
  }
}

export const consumeOauthResultHandler = (
  provider: SocialProvider,
  authorize: (user: ExternalUserInfo) => Promise<string | false>
) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const { externalUser } = await authenticate(provider, req);

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

      const originalUrl = req.session.originalUrl || "/";
      req.session.originalUrl = undefined;
      log("redirecting to", originalUrl);
      res.redirect(302, originalUrl);
      res.end();
    } catch (error) {
      next(error);
    }
  };
};

export const getOAuthRedirectUri = (
  config: AuthGatewayConfig,
  type: string
) => {
  const { appUrl, appGatewayRelativeUri } = config;
  const authGatewayUrl = `${appUrl}${appGatewayRelativeUri}`;
  return `${authGatewayUrl}/oauth2-result-${type}`;
};
