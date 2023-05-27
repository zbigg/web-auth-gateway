build: dist/server.js dist/client/_auth-gateway/static/client.js dist/client/_auth-gateway/static/pico.min.css

ESBUILD_OPTIONS_COMMON=--bundle --sourcemap=linked --sources-content=false

dist/server.js: src/serverMain.ts node_modules yarn.lock
	@mkdir -p dist
	./node_modules/.bin/esbuild $(ESBUILD_OPTIONS_COMMON)  --platform=node '--external:node:*' $< --outfile=$@
	node mkdep-sourcemap.mjs $@ > dist/server.ts.d

-include dist/server.ts.d

dist/client/_auth-gateway/static/client.js: src/clientMain.tsx node_modules yarn.lock
	@mkdir -p dist/client/_auth-gateway/static
	./node_modules/.bin/esbuild $(ESBUILD_OPTIONS_COMMON) $< --outfile=$@
	node mkdep-sourcemap.mjs $@ > dist/clientMain.ts.d

dist/client/_auth-gateway/static/pico.min.css: node_modules/@picocss/pico/css/pico.min.css
	@mkdir -p dist/client/_auth-gateway/static
	cp -v $< $@

-include dist/clientMain.ts.d

run: build
	node dist/server.js

node_modules: yarn.lock package.json
	yarn

clean:
	rm -rf dist

watch: build
	./node_modules/.bin/nodemon -w src -e ts,tsx --exec "make && node" dist/server.js

docker-image: Dockerfile dist/*.js
	docker build . -t web-auth-gateway