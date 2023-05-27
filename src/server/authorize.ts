import { AuthGatewayConfig } from "../common";

export interface ExternalUserInfo {
  principal?: string;
  type: string;
  id?: string;
  login?: string;
  email?: string;
  phone?: string;
  picture?: string;
}

export function createAuthorizer(config: AuthGatewayConfig) {
  return async function authorize(user: ExternalUserInfo) {
    const principals = [
      user.email,
      user.phone,
      user.email && `email:${user.email}`,
      user.phone && `tel:${user.email}`,
      user.type && user.id && `${user.type}:${user.id}`,
      user.type && user.login && `${user.type}:${user.login}`,
    ].filter((id) => id) as string[];

    function matchPrincipal(rule: string) {
      return principals.find((id) => id === rule);
    }
    console.log("authorize:", principals.join(","));
    if (!config.allowedUsers || !principals.length) {
      return false;
    }
    for (const rule of config.allowedUsers) {
      const principal = matchPrincipal(rule);
      if (principal) {
        console.log("matched principal:", principal);
        user.principal = principal;
        return principal;
      }
    }
    return false;
  };
}
