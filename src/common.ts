import { FacebookOAuthParams } from "./providers/facebook";
import { GitHubOAuthParams } from "./providers/github";
import { GoogleOAuthParams } from "./providers/google";
import { MicrosoftOAuthParams } from "./providers/microsoft";
import { EmailSenderParams } from "./server/EmailSenderSmtp";

export const DEFAULT_BASE_URL = "/_auth-gateway";

/*
 * Random links
 *  * https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
 *  * https://developers.google.com/identity/protocols/oauth2/openid-connect#obtaininguserprofileinformation
 *
 * TODO: maybe implement popup?
 *
 *  * https://github.com/ricokahler/oauth2-popup-flow
 */

export interface OAuth2Params {
  name: string;
  baseUrl: string;
  scope?: string;
  clientId?: string;
  responseType?: string;
  redirectUri: string;
  authState?: string;
}

export type AuthGatewayConfig = {
  // application settings

  /**
   * Application URL.
   *
   * AuthGateway sends links and generates redirect urls to, so browsers/other agents
   * can get back with auth credentials.
   *
   * One can skip specyfying `and rely on autodetection.
   * See
   *  * `deriveAppUrlFromHeaders`
   *  * `trustForwardHeaders`
   */
  appUrl?: string;

  /** App title displayed on login page. */
  appTitle?: string;

  supportLink?: string;

  /**
   * Derive app url from headers like `Host`.
   *
   * (note, global express `trust headers` flag also has effect on this)
   *
   * @default true
   */
  deriveAppUrlFromHeaders?: boolean;

  /**
   * When deriving appUrl from first request headers, trust
   * `Forwarded`, `X-Forwarded-Host` and `X-Forwarded-Proto` headers.
   *
   * @default false
   */
  trustForwardHeaders?: boolean;

  //
  // authentication providers
  //
  github?: GitHubOAuthParams;
  google?: GoogleOAuthParams;
  facebook?: FacebookOAuthParams;
  microsoft?: MicrosoftOAuthParams;

  email?: EmailSenderParams;
  tokenSigningSecret?: string;
  phone?: {
    // TODO: any providers?
  };

  // authorization settings
  allowedUsers: string[];

  /**
   * Relative url of auth-gateway, usually no reason to change.
   * @default `/_auth-gateway`
   */
  appGatewayRelativeUri?: string;
};
