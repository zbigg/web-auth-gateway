# Web App Auth Gateway

(experimental, work-in-progress)

HTTP Gateway that enforces authentication for web app.

Works as a reverse proxy against unauthenticated app. Until user is authorized, forces him to authorize using simple login screen

Supported auth providers:

- magic e-mail link
- Social OAuth based: Gighub, Google, Microsoft, Facebook

## Installation

## Use as docker image

(this is envisioned use case)
Run this "behind" TLS gateway and in front of simple, auth-less app.

```shell

# run TLS gatweay(nginx caddy) with backend/upstream against caddy
$ ./run-tls-gateway.sh myapp.dev.example.com --host 0.0.0.0 --port 443 --upstream localhost:9001 &

# run your app on port 10001
$ ./run-my-unsecureapp --host localhost --port 10001 &

# run web-auth-gateway in between
docker run \
    --rm \
    -p 9001:8080/tcp \ listen on port 9001
    --network host \
    -e UPSTREAM_URL=http://localhost:10001 \ # target port
    -e APP_URL=https://myapp.dev.example.com \
    -e GOOGLE_CLIENT_ID=xxx \
    -e GOOGLE_APP_SECRET=yyy \
    web-auth-gateway
```

## Use as express middleware

```js
const app = express();
app.use(createAuthGateway(config).expressMiddleware);
// nothing passes through until user is logged in
```

## Use in protected web app

```js
const userInfo = await fetch("/_auth-gateway/me").then((response) =>
  response.json()
);
```

If user is authenticated and authorized, returns HTTP 200 and JSON with object with following fields:

- `type` - authentication type
- `principal` - user "identification" that was accepted by authorization, string in form `type:someId` can be
  - `email:foo@bar.com` for user logged in using e-mail
  - `github:user` - for users logged
  - `just@email.com` for users with provided e-mail
- `email` - email if known (github & facebook notoriously doesn't
  send it)
- `id` - if provided by login provider
- `picture` - url of avatar/picture
- `phone` - TODO

## Authorization

As for now, the only authorization is hardcoded list of user principals allowed to login. Example config snippet:
```json
{
  "allowedUsers": [
    "somebody@gmail.com", // just e-mail
    "email:somebody@gmail.com", // canonical version
    "github:someone" // github handle
  ]
}
```


## Contribute

PRs accepted.

## License

MIT © Zbigniew Zagórski
