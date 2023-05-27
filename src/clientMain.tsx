import React from "react";
import { hydrateRoot } from "react-dom/client";
import { PageLayout } from "./pages/PageLayout";
import { LoginPage, LoginPageDedicatedProps } from "./pages/LoginPage";
import { fetchJson } from "./utils";

export interface ClientCommonProps {
  appUrl?: string;
  appTitle?: string;
  supportLink?: string;
  appGatewayRelativeUri: string;
}
export interface ClientProps {
  commonProps: ClientCommonProps;
  loginPageProps?: LoginPageDedicatedProps;
}

declare global {
  interface Window {
    _authGatewayClientProps?: ClientProps;
  }
}

function getElementForRoute(pathname: string, props: ClientProps) {
  return (
    <PageLayout {...props.commonProps}>
      {props.loginPageProps && (
        <LoginPage {...props.commonProps} {...props.loginPageProps} />
      )}
    </PageLayout>
  );
}

function hydrate(clientProps: ClientProps) {
  const element = getElementForRoute(window.location.pathname, clientProps);
  const domAnchor = document.getElementById("app");

  if (!element || !domAnchor) {
    return;
  }
  // hydrateRoot(domAnchor, element);
}

if (window._authGatewayClientProps) {
  hydrate(window._authGatewayClientProps);
} else {
  (async () => {
    const clientProps = await fetchJson("/_auth-gateway/client-config");

    hydrate(clientProps);
  })();
}
