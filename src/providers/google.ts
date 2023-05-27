import express from "express";
import { AuthGatewayConfig } from "../common";
import {
  getOAuthRedirectUri,
  SocialProvider,
} from "../server/authenticateSocial";
import { fetchJson, urlAddQueryString } from "../utils";

function log(...args: unknown[]) {
  console.log("googleSocialProvider", ...args);
}

export type GoogleOAuthParams = {
  appSecret: string;
  clientId: string;
};

export function googleSocialProvider(
  oAuthParams: GoogleOAuthParams,
  config: AuthGatewayConfig
): SocialProvider {
  const { appSecret, clientId } = oAuthParams;

  return {
    type: "google",
    getClientOAuthParams: () => {
      return {
        name: "Google",
        baseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId,
        scope: "openid email profile",
        responseType: "code",
        redirectUri: getOAuthRedirectUri(config, "google"),
      };
    },
    consumeCode: async (req: express.Request) => {
      // https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#oauth-2.0-endpoints
      const code = req.body.code || req.query.code;

      if (!appSecret) {
        log("missing appSecret");
        throw new Error("ERR_BAD_REQUEST");
      }
      if (!code) {
        log("missing code");
        throw new Error("ERR_BAD_REQUEST");
      }

      const redirectUri = getOAuthRedirectUri(config, "google");
      const authTokenResponse: any = await fetchJson(
        urlAddQueryString(`https://oauth2.googleapis.com/token`, {
          client_id: clientId,
          redirect_uri: redirectUri,
          client_secret: appSecret,
          code: code,
          grant_type: "authorization_code",
        }),
        {
          method: "POST",
        }
      ).catch((e) => ({ error: e }));

      if (authTokenResponse.error) {
        log("consumeCode faile to get token", authTokenResponse.error);
        throw Error("ERR_FAILED_GOOGLE");
      }

      const accessToken = authTokenResponse.access_token;
      if (!accessToken) {
        log("consumeCode: no access_token in response");
        throw Error("ERR_FAILED_GOOGLE");
      }
      return { accessToken };
    },
    getUserInfo: async (accessToken: string) => {
      // https://developers.google.com/identity/protocols/oauth2/openid-connect#obtaininguserprofileinformation
      // https://www.googleapis.com/auth/userinfo.email
      const googleUserInfo: any = await fetchJson(
        urlAddQueryString(`https://www.googleapis.com/oauth2/v1/userinfo`, {
          access_token: accessToken,
        })
      ).catch((e) => ({ error: e }));

      if (!googleUserInfo || googleUserInfo.error) {
        log("getUserInfo: unable to retrieve userinfo", googleUserInfo);
        throw Error("ERR_FAILED_GOOGLE");
      }
      if (!googleUserInfo.id) {
        log("getUserInfo: bad userinfo, no id", googleUserInfo);
        throw Error("ERR_FAILED_GOOGLE");
      }
      return {
        type: "google",
        ...googleUserInfo,
      };
    },
  };
}
