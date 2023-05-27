import express from "express";
import { v4 as uuidv4 } from "uuid";

import { renderReactComponent } from "./html";

import { facebookSocialProvider } from "../providers/facebook";
import { googleSocialProvider } from "../providers/google";
import { githubSocialProvider } from "../providers/github";
import { microsoftSocialProvider } from "../providers/microsoft";

import { AuthGatewayConfig, DEFAULT_BASE_URL, OAuth2Params } from "../common";
import { LoginPage } from "../pages/LoginPage";
import { ClientProps } from "../clientMain";

import {
  createEmailAuthProvider,
  EmailAuthProviderParams,
} from "./authenticateEmail";
import {
  consumeOauthResultHandler,
  SocialProvider,
} from "./authenticateSocial";
import { createAuthorizer } from "./authorize";
import { allHeaderValues, lastHeaderValue, splitOnFirst } from "../utils";

function log(...args: unknown[]) {
  console.log("authGateway", ...args);
}

function getPublicAppUrlFromHeaders(
  req: express.Request,
  trustForwardHeaders?: boolean
): string {
  let host = req.headers.host;
  let proto: string = req.protocol;

  if (trustForwardHeaders) {
    if (req.headers.forwarded) {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded
      for (const headerValue of allHeaderValues(req.headers.forwarded)) {
        const splitted = headerValue.split(",");
        for (const entry of splitted) {
          const nvs = entry.split(";");
          for (const nv of nvs) {
            const [name, value] = splitOnFirst("=", nv);
            if (name === "host" && value) {
              host = value;
            }
            if (name === "proto" && value) {
              proto = proto;
            }
          }
        }
      }
    } else {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host
      if (req.headers["x-forwarded-host"]) {
        host = lastHeaderValue(req.headers["x-forwarded-host"]);
      }

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto
      if (req.headers["x-forwarded-proto"]) {
        proto = lastHeaderValue(req.headers["x-forwarded-proto"]);
      }
    }
  }
  if (host && proto) {
    return `${proto}://${host}`;
  }
  return `http://localhost`;
}

export function createAuthGatewayRouter(config: AuthGatewayConfig) {
  let appUrl = config.appUrl;
  const { appTitle, supportLink } = config;
  const appGatewayRelativeUri = (config.appGatewayRelativeUri =
    config.appGatewayRelativeUri || DEFAULT_BASE_URL);

  const oAuthProviders: SocialProvider[] = [];
  if (config.facebook) {
    oAuthProviders.push(facebookSocialProvider(config.facebook, config));
  }
  if (config.github) {
    oAuthProviders.push(githubSocialProvider(config.github, config));
  }
  if (config.google) {
    oAuthProviders.push(googleSocialProvider(config.google, config));
  }
  if (config.microsoft) {
    oAuthProviders.push(microsoftSocialProvider(config.microsoft, config));
  }

  function getClientProps(req: express.Request): ClientProps {
    if (!appUrl && config.deriveAppUrlFromHeaders) {
      config.appUrl = appUrl = getPublicAppUrlFromHeaders(
        req,
        config.trustForwardHeaders
      );
      log(`derived appUrl from headers: ${appUrl}`);
    }

    if (!req.session.authState) {
      req.session.authState = uuidv4();
    }

    return {
      commonProps: {
        appUrl,
        appTitle,
        appGatewayRelativeUri,
        supportLink,
      },
      loginPageProps: {
        providers: {
          email: Boolean(config.email && config.tokenSigningSecret),
          phone: false, // Boolean(config.sms && config.tokenSigningSecret),
          ...oAuthProviders.reduce((r, provider) => {
            r[provider.type] = {
              ...provider.getClientOAuthParams(),
              authState: req.session.authState,
            };
            return r;
          }, {} as Record<"facebook" | "github" | "google", OAuth2Params>),
        },
        step: String(req.query.step),
        enteredEmail: String(req.query.enteredEmail),
      },
    };
  }

  const authorize = createAuthorizer(config);
  const router = express.Router();

  // TODO: relative to node_modules, __dirname or import.url
  const staticFilesRoot = `${process.cwd()}/dist/client/_auth-gateway/static`;
  router.use(
    "/static",
    express.static(staticFilesRoot, {
      fallthrough: false,
    })
  );

  router.get("/client-config", (req, res) => {
    res.status(200).json(getClientProps(req)).end();
  });
  router.get("/me", (req, res) => {
    res
      .status(200)
      .json(req.session._ageu || {})
      .end();
  });

  router.get("/login", (req, res) => {
    const { commonProps, loginPageProps } = getClientProps(req);
    if (!loginPageProps) {
      res.status(500).send("internal error").end();
      return;
    }

    res
      .status(200)
      .type("html")
      .send(
        renderReactComponent(
          LoginPage,
          { ...commonProps, ...loginPageProps },
          "Login"
        )
      )
      .end();
  });

  for (const provider of oAuthProviders) {
    router.get(
      `/oauth2-result-${provider.type}`,
      consumeOauthResultHandler(provider, authorize)
    );
  }

  if (config.email && config.tokenSigningSecret) {
    // TODO: appUrl is soo broken
    const configFixup: EmailAuthProviderParams =
      config as unknown as EmailAuthProviderParams;
    configFixup.authorize = authorize;
    const { startEmailAuth, consumeEmailToken } =
      createEmailAuthProvider(configFixup);
    router.post("/start-auth-email", startEmailAuth); // handle POST email from login screen
    router.post("/auth-token", consumeEmailToken); // handle POST email + token from login screen step 2
    router.get("/auth-token", consumeEmailToken); // handle e-mail token click
  }
  // router.use('/*', (req, res) => {
  //   if (!req.)
  //   res
  //     .status(req.method === "GET" ? 404 : 400)
  //     .type("txt")
  //     .send("bad request/not found")
  //     .end();
  // });

  return router;
}
export function createAuthGateway(config: AuthGatewayConfig) {
  const appGatewayRelativeUri =
    config.appGatewayRelativeUri || DEFAULT_BASE_URL;

  const loginUrl = (originalUrl: string) =>
    `${appGatewayRelativeUri}/login?originalUrl=${encodeURIComponent(
      originalUrl
    )}`;

  const router = express.Router();
  router.use(appGatewayRelativeUri, createAuthGatewayRouter(config));
  router.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.url.startsWith(appGatewayRelativeUri)) {
        return;
      }

      // if there is no session cookie, start auth

      if (!req.session?._ageu) {
        console.log("PROXY-FAIL: ", req.method, req.url);
        if (!req.session.originalUrl) {
          req.session.originalUrl = req.url;
        }
        res.redirect(302, loginUrl(req.url));
        return;
      }

      next();
    }
  );

  return {
    appGatewayRelativeUri,
    cleanup: () => {},
    loginUrl,
    expressMiddleware: router,
  };
}
