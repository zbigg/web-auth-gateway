import express from "express";
import { AuthGatewayConfig } from "../common";
import {
  getOAuthRedirectUri,
  SocialProvider,
} from "../server/authenticateSocial";
import { fetchJson, urlAddQueryString } from "../utils";

function log(...args: unknown[]) {
  console.log("facebookSocialProvider", ...args);
}

export type FacebookOAuthParams = {
  appSecret: string;
  appId: string;
};

export function facebookSocialProvider(
  oAuthParams: FacebookOAuthParams,
  config: AuthGatewayConfig
): SocialProvider {
  const { appSecret, appId } = oAuthParams;
  return {
    type: "facebook",
    getClientOAuthParams: () => {
      return {
        name: "Facebook",
        baseUrl: "https://www.facebook.com/v12.0/dialog/oauth",
        scope: "public_profile email",
        responseType: "code",
        clientId: appId,
        redirectUri: getOAuthRedirectUri(config, "facebook"),
      };
    },
    // https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
    consumeCode: async (req: express.Request) => {
      const { code } = req.body.code || req.query.code;
      if (!appSecret) {
        log("missing appSecret");
        throw Error("ERR_BAD_REQUEST");
      }
      if (!code) {
        log("missing code | redirectUri");
        throw Error("ERR_BAD_REQUEST");
      }

      const redirectUri = getOAuthRedirectUri(config, "facebook");
      const authTokenResponse: any = await fetchJson(
        urlAddQueryString(
          `https://graph.facebook.com/v12.0/oauth/access_token`,
          {
            client_id: appId,
            redirect_uri: redirectUri,
            client_secret: appSecret,
            code: code,
          }
        )
      ).catch((e) => ({ error: e }));

      if (authTokenResponse.error) {
        log(
          "facebookSocialProvider.consumeCode faile to get token",
          authTokenResponse.error
        );
        throw Error("ERR_FAILED_FACEBOOK");
      }

      const accessToken = authTokenResponse.access_token;
      if (!accessToken) {
        log(
          "facebookSocialProvider.consumeCode: access_token token in response"
        );
        throw Error("ERR_FAILED_FACEBOOK");
      }
      return { accessToken };
    },
    getUserInfo: async (accessToken: string) => {
      const facebookUserInfo: any = await fetchJson(
        urlAddQueryString(`https://graph.facebook.com/v12.0/me`, {
          access_token: accessToken,
          fields: "id,name,email",
        })
      ).catch((e) => ({ error: e }));

      if (!facebookUserInfo || facebookUserInfo.error) {
        log(
          "facebookSocialProvider.getUserInfo: unable to retrieve userinfo",
          facebookUserInfo
        );
        throw Error("ERR_FAILED_FACEBOOK");
      }
      if (!facebookUserInfo.id) {
        log(
          "facebookSocialProvider.getUserInfo: bad userinfo, no id",
          facebookUserInfo
        );
        throw Error("ERR_FAILED_FACEBOOK");
      }
      return {
        type: "facebook",
        picture: await facebookUserAvatarUrl(facebookUserInfo.id, oAuthParams),
        ...facebookUserInfo,
      };
    },
  };
}

async function facebookUserAvatarUrl(
  facebookUserId: string,
  oAuthParams: FacebookOAuthParams
): Promise<string> {
  const { appId, appSecret } = oAuthParams;
  const accessToken = `${appId}|${appSecret}`;
  const imageMeta = await fetchJson(
    urlAddQueryString(`https://graph.facebook.com/${facebookUserId}/picture`, {
      type: "large",
      redirect: false,
      access_token: accessToken,
    })
  ).catch((error) => ({
    fetchError: error,
  }));
  // log("GET /user-facebook-image neta", imageMeta);
  if (!imageMeta.data.url) {
    return "";
  }
  return imageMeta.data.url;
}
