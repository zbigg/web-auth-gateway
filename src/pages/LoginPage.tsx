import React, { ComponentProps } from "react";
import { ClientCommonProps } from "../clientMain";
import { OAuth2Params } from "../common";

function miniStyled<T extends React.ElementType>(
  component: T,
  staticStyle: React.CSSProperties
) {
  const Component = component as any;
  return ({ children, style, ...props }: ComponentProps<T>) => (
    <Component style={{ ...staticStyle, ...style }} {...props}>
      {children}
    </Component>
  );
}

const WarningHeader = miniStyled("h4", { color: "orange" });

export type LoginPageDedicatedProps = {
  providers: {
    phone?: boolean;
    email?: boolean;
    google?: OAuth2Params;
    facebook?: OAuth2Params;
    github?: OAuth2Params;
    microsoft?: OAuth2Params;
  };
  step?: string;
  enteredEmail?: string;
};

export type LoginPageProps = ClientCommonProps & LoginPageDedicatedProps;

export function LoginPage({
  appTitle,
  step,
  enteredEmail,
  appGatewayRelativeUri,
  providers,
}: LoginPageProps) {
  const oAuthProviders: OAuth2Params[] = [];
  if (providers.google) {
    oAuthProviders.push(providers.google);
  }
  if (providers.github) {
    oAuthProviders.push(providers.github);
  }
  if (providers.facebook) {
    oAuthProviders.push(providers.facebook);
  }
  if (providers.microsoft) {
    oAuthProviders.push(providers.microsoft);
  }

  const emailInSecondStep = Boolean(step === "email2" && enteredEmail);
  return (
    <div>
      <div>
        <div style={{ textAlign: "center" }}>
          {appTitle && <h2>{appTitle}</h2>}
          <WarningHeader>
            Access is restricted to authenticated users only.
          </WarningHeader>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5em",
        }}
      >
        {!emailInSecondStep && oAuthProviders.length > 0 && (
          <div>
            <h4>Use social login</h4>
            {oAuthProviders.map((provider, i) => (
              <div key={i}>
                <a href={getOAuth2RequestLoginLink(provider)}>
                  <button>Login with {provider.name}</button>
                </a>
              </div>
            ))}
          </div>
        )}
        {providers.email && (
          <div>
            {!emailInSecondStep && (
              <h4>Send me magic link / code with e-mail</h4>
            )}
            <form
              method="POST"
              action={
                emailInSecondStep
                  ? `${appGatewayRelativeUri}/auth-token`
                  : `${appGatewayRelativeUri}/start-auth-email`
              }
            >
              {!emailInSecondStep && (
                <input
                  type="email"
                  name="email"
                  placeholder="email"
                  disabled={emailInSecondStep}
                  value={emailInSecondStep ? enteredEmail : undefined}
                />
              )}
              {emailInSecondStep && (
                <>
                  <p>
                    We've send token & link to {enteredEmail}, check your e-mail
                    and either
                    <ul>
                      <li>click on link in e-mail</li>
                      <li>enter token from e-mail in input below </li>
                    </ul>
                  </p>
                  <input name="token" placeholder="token from e-mail" />
                </>
              )}
              <input type="submit" />
              {emailInSecondStep && (
                <a href={`${appGatewayRelativeUri}/login`}>
                  back to other login options
                </a>
              )}
            </form>
          </div>
        )}
        {providers.phone && (
          <div>
            <h4>Send me magic link / code with phone</h4>
            <form
              method="POST"
              action={`${appGatewayRelativeUri}/start-auth-phone`}
            >
              <input
                type="phone"
                name="phone"
                placeholder="phone number"
                required
              />
              <input type="submit" />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function getOAuth2RequestLoginLink(params: OAuth2Params) {
  const query = new URLSearchParams({
    redirect_uri: params.redirectUri,
  });
  if (params.responseType) {
    query.set("response_type", params.responseType);
  }
  if (params.scope) {
    query.set("scope", params.scope);
  }
  if (params.clientId) {
    query.set("client_id", params.clientId);
  }
  if (params.authState) {
    query.set("state", params.authState);
  }
  return `${params.baseUrl}?${query.toString()}`;
}
