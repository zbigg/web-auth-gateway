import express from "express";
import { AuthGatewayConfig } from "../common";
import {
  getOAuthRedirectUri,
  SocialProvider,
} from "../server/authenticateSocial";
import { fetchJson, urlAddQueryString } from "../utils";

function log(...args: unknown[]) {
  console.log("githubSocialProvider", ...args);
}

export type GitHubOAuthParams = {
  clientId: string;
  clientSecret: string;
};

export function githubSocialProvider(
  oAuthParams: GitHubOAuthParams,
  config: AuthGatewayConfig
): SocialProvider {
  const { clientSecret, clientId } = oAuthParams;

  return {
    type: "github",
    getClientOAuthParams: () => {
      return {
        name: "GitHub",
        baseUrl: "https://github.com/login/oauth/authorize",
        clientId,
        scope: "user",
        responseType: "code",
        redirectUri: getOAuthRedirectUri(config, "github"),
      };
    },
    consumeCode: async (req: express.Request) => {
      const code = req.body.code || req.query.code;

      if (!clientSecret) {
        log("missing clientSecret");
        throw new Error("ERR_BAD_REQUEST");
      }
      if (!code) {
        log("missing code");
        throw new Error("ERR_BAD_REQUEST");
      }

      const redirectUri = getOAuthRedirectUri(config, "github");
      const authTokenResponse: any = await fetchJson(
        urlAddQueryString(`https://github.com/login/oauth/access_token`, {
          client_id: clientId,
          redirect_uri: redirectUri,
          client_secret: clientSecret,
          code: code,
        }),
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
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
      const githubUser: any = await fetchJson(`https://api.github.com/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch((e) => ({ error: e }));

      if (!githubUser || githubUser.error) {
        log("getUserInfo: unable to retrieve userinfo", githubUser);
        throw Error("ERR_FAILED_GOOGLE");
      }
      if (!githubUser.id) {
        log("getUserInfo: bad userinfo, no id", githubUser);
        throw Error("ERR_FAILED_GOOGLE");
      }
      return {
        type: "github",
        id: githubUser.login,
        login: githubUser.login,
        email: githubUser.email,
        name: githubUser.name,
      };
    },
  };
}
