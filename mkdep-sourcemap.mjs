import { readFileSync } from "fs";
import { dirname, relative, resolve } from "path";

const target = process.argv[2];

const targetSourceMap = `${target}.map`;
const sourceMap = JSON.parse(readFileSync(targetSourceMap));
const sources = sourceMap.sources;

const targetPath = dirname(target);
function remapToRoot(source) {
  // TODO: proper relative path to root
  return relative(".", resolve(targetPath, source));
}

process.stdout.write(
  `${target}: ${sources
    .filter((x) => !x.includes("node_modules"))
    .map(remapToRoot)
    .join(" ")}\n`
);
