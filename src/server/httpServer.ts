import http from "http";

function log(...args: unknown[]) {
  console.log("httpServer: ", ...args);
}

export type HttpServerOptions = {
  host?: string;
  port?: number;
};

export type HttpServerProps = Required<HttpServerOptions>;
const HTTP_SERVER_DEFAULT_PROPS: Readonly<HttpServerProps> = {
  host: "localhost",
  port: 3000,
};

export function resolveHttpServerProps(
  options?: HttpServerOptions
): HttpServerProps {
  return {
    port:
      options?.port ??
      (process.env.PORT
        ? parseInt(process.env.PORT || "")
        : HTTP_SERVER_DEFAULT_PROPS.port),
    host:
      options?.host ??
      (process.env.HOST ? process.env.HOST : HTTP_SERVER_DEFAULT_PROPS.host),
  };
}

export function createHttpServer(
  requestListener: http.RequestListener,
  options?: HttpServerOptions
) {
  const server = http.createServer(requestListener);
  const { host, port } = resolveHttpServerProps(options);
  let listening = false;

  (async () => {
    await new Promise<void>((resolve, reject) => {
      server.on("error", (e) => {
        log("server error", e);
        if (!listening) {
          reject(new Error("server error"));
        }
      });
      server.listen(port, host, () => {
        listening = true;
        resolve();
      });
    });
    log(`started at http://${host}:${port}`);
  })();
  return () => {
    server.close();
  };
}
