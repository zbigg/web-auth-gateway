import fetch from "node-fetch";
import * as userConfig from "config";
import * as fs from "fs";
(global as any).fetch = fetch;

import {
  AuthGatewayServerOptions,
  startGatewayServer,
} from "./server/authGatewayServer";
import { starOutConfidentalFields } from "./utils";
import { merge } from "lodash";

const DEFAULT_CONFIG_FILE = ".web-auth-gateway.json";

function readDefaultCliOptions(): [
  Partial<AuthGatewayServerOptions>,
  string | undefined
] {
  let optionsRaw: any;
  if (!fs.existsSync(DEFAULT_CONFIG_FILE)) {
    return [{}, undefined];
  }
  try {
    optionsRaw = fs.readFileSync(DEFAULT_CONFIG_FILE, "utf-8");
  } catch (error) {
    throw new Error(
      `unable to read config from '${DEFAULT_CONFIG_FILE}': ${error}`
    );
  }
  return [JSON.parse(optionsRaw), DEFAULT_CONFIG_FILE];
}

// TODO: read config & other things
const [localConfig, localConfigFile] = readDefaultCliOptions();

for (const ce of [
  ...userConfig.util.getConfigSources(),
  { name: localConfigFile },
].filter((cs) => cs.name)) {
  console.log("using config from: %s", ce.name);
}

const config = merge(userConfig, localConfig);
console.log(
  "actual config: %s",
  JSON.stringify(starOutConfidentalFields(config.util.toObject()), null, 2)
);

if (!config.session?.secret) {
  console.log(
    "warning: generting random session secret, all sessions will be invalidated on restart"
  );
  config.session = {
    ...config.session,
    secret: String(Math.random()),
  };
}
startGatewayServer(config as AuthGatewayServerOptions);
