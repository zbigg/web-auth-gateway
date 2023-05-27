import { SocialProvider } from "../../server/authenticateSocial";

import jwt from "jsonwebtoken";
const jwksClient = require("jwks-rsa");

function log(...args: unknown[]) {
  console.log("appleSocialProvider", ...args);
}

export type AppleOAuthParams = {};

export function appleSocialProvider(_params: AppleOAuthParams): SocialProvider {
  return {
    consumeCode: async () => {
      throw Error("ERR_NOT_IMPLEMENTED_YET");
    },

    getUserInfo: async (identityToken: string) => {
      const jwtJson = jwt.decode(identityToken, { complete: true });
      const kid = jwtJson?.header.kid;

      const appleKey = await getAppleSigningKey(kid);

      if (!appleKey) {
        log("getUserInfo: getAppleSigningKey not get signing key");
        throw Error("ERR_FAILED_APPLE");
      }

      const appleUserInfo: any = await jwt.verify(identityToken, appleKey);

      if (!appleUserInfo || appleUserInfo.error) {
        log("getUserInfo: unable to retrieve userinfo", appleUserInfo);
        throw Error("ERR_FAILED_APPLE");
      }
      if (!appleUserInfo.sub) {
        log("getUserInfo: bad userinfo, no sub", appleUserInfo);
        throw Error("ERR_FAILED_APPLE");
      }

      if (appleUserInfo.is_private_email) {
        delete appleUserInfo.is_private_email;
        delete appleUserInfo.email;
      }

      return {
        type: "apple",
        id: appleUserInfo.sub,
        ...appleUserInfo,
      };
    },
  };
}

async function getAppleSigningKey(kid: any) {
  const client = jwksClient({
    jwksUri: "https://appleid.apple.com/auth/keys",
    timeout: 30000,
  });
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}
