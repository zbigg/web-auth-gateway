import express from "express";
import { AuthGatewayConfig } from "../common";
import {
  getOAuthRedirectUri,
  SocialProvider,
} from "../server/authenticateSocial";
import { fetchJson, urlAddQueryString, urlEncodeBody } from "../utils";

function log(...args: unknown[]) {
  console.log("microsoftSocialProvider", ...args);
}

export type MicrosoftOAuthParams = {
  clientSecret: string;
  clientId: string;
};

// https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
export function microsoftSocialProvider(
  oAuthParams: MicrosoftOAuthParams,
  config: AuthGatewayConfig
): SocialProvider {
  const { clientSecret, clientId } = oAuthParams;

  return {
    type: "microsoft",
    getClientOAuthParams: () => {
      return {
        name: "Microsoft",
        baseUrl:
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        clientId,
        scope: "openid email",
        responseType: "code",
        redirectUri: getOAuthRedirectUri(config, "microsoft"),
      };
    },
    consumeCode: async (req: express.Request) => {
      const code = req.body.code || req.query.code;

      if (!clientSecret) {
        log("missing appSecret");
        throw new Error("ERR_BAD_REQUEST");
      }
      if (!code) {
        log("missing code");
        throw new Error("ERR_BAD_REQUEST");
      }

      const redirectUri = getOAuthRedirectUri(config, "microsoft");
      const authTokenResponse: any = await fetchJson(
        `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: urlEncodeBody({
            client_id: clientId,
            redirect_uri: redirectUri,
            client_secret: clientSecret,
            code: code,
            grant_type: "authorization_code",
          }),
        }
      ).catch((e) => ({ error: e }));

      if (authTokenResponse.error) {
        log("consumeCode faile to get token", authTokenResponse.error);
        throw Error("ERR_FAILED_MICROSOFT");
      }

      const accessToken = authTokenResponse.access_token;
      if (!accessToken) {
        log("consumeCode: no access_token in response");
        throw Error("ERR_FAILED_MICROSOFT");
      }
      return { accessToken };
    },
    getUserInfo: async (accessToken: string) => {
      const microsoftUsserInfo: any = await fetchJson(
        `https://graph.microsoft.com/oidc/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      ).catch((e) => ({ error: e }));

      if (!microsoftUsserInfo || microsoftUsserInfo.error) {
        log("getUserInfo: unable to retrieve userinfo", microsoftUsserInfo);
        throw Error("ERR_FAILED_MICROSOFT");
      }
      return {
        type: "microsoft",
        email: microsoftUsserInfo.email,
        picture: microsoftUsserInfo.picture,
      };
    },
  };
}
