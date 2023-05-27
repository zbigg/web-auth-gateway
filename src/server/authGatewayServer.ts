import express from "express";
import cookieParser from "cookie-parser";
import session, { SessionOptions } from "express-session";
import bodyParser from "body-parser";

import { AuthGatewayConfig } from "../common";
import { createAuthGateway } from "./authGateway";
import { HttpServerOptions, createHttpServer } from "./httpServer";

import HttpProxyServer from "http-proxy";

function log(...args: unknown[]) {
  console.log("authGatewayServer", ...args);
}

export type AuthGatewayServerOptions = AuthGatewayConfig & {
  upstream: string;
  server?: HttpServerOptions;
  session?: SessionOptions;
};

export function createUpstream({
  upstream,
}: AuthGatewayServerOptions): express.Handler | undefined {
  if (typeof upstream === "string") {
    if (upstream.startsWith("file:") || upstream.startsWith("/")) {
      const rootDir = upstream.startsWith("file://")
        ? upstream.substring(6)
        : upstream.startsWith("file:")
        ? upstream.substring(5)
        : upstream;
      log(`upstream: local files from ${rootDir}`);
      return express.static(rootDir, { fallthrough: false });
    } else if (upstream.startsWith("http://")) {
      log(`upstream: reverse proxy to ${upstream}`);
      const proxy = new HttpProxyServer({ target: upstream });
      return (req, res) =>
        proxy.web(req, res, {}, (err) => {
          log("upstream error", err);
          res.writeHead(503, "Service unavailable");
          res.end();
        });
    }
  }
  log(`upstream: no upstream, serving debug messages`);
  return (req, res) => {
    if (res.headersSent) {
      return;
    }
    console.log("PROXY-OK", req.session._ageu?.principal, req.method, req.url);

    res
      .type("txt")
      .send(
        `no upstream configured, you requested ${req.originalUrl} as ${req.session._ageu?.principal}`
      );
    res.end();
  };
}

export function startGatewayServer(config: AuthGatewayServerOptions) {
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded());
  app.use(cookieParser());
  app.use(session(config.session));

  const authGateway = createAuthGateway(config);
  app.use(authGateway.expressMiddleware);
  const upstream = createUpstream(config);
  if (upstream) {
    app.use(upstream);
  }

  const serverCleanup = createHttpServer(app, config.server);

  return () => {
    authGateway.cleanup();
    serverCleanup();
  };
}
