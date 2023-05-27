import { transform, isObject } from "lodash";

export function urlAddQueryString(
  baseUri: string,
  queryParams?: Record<string, null | unknown | string | number | boolean>
) {
  if (queryParams) {
    const url = new URL(baseUri);
    for (const key in queryParams) {
      const value = queryParams[key];
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  } else {
    return baseUri;
  }
}

export function fetchJson(url: RequestInfo, init?: RequestInit) {
  return fetch(url, {
    redirect: "follow",
    ...init,
  }).then((res) => res.json());
}

const confidentalFieldsRe = new RegExp(
  "(authorization|cookie|password|secret|key|token)",
  "i"
);
const urlWithPasswordRe = new RegExp("[a-z]+://[^:]+:[^@]+@.+");
const replaceUrlPasswordRe = new RegExp("://([^:]+):.*@");

export function starOutConfidentalFields(obj: any) {
  return deepMap(obj, function (val, key) {
    if (confidentalFieldsRe.test(key)) {
      return "***";
    } else if (urlWithPasswordRe.test(val)) {
      return val.replace(replaceUrlPasswordRe, function (_m: any, g1: string) {
        return "://" + g1 + ":***@";
      });
    } else {
      return val;
    }
  });
}

function deepMap(
  obj: any,
  iterator: (val: any, key: string, obj: any) => any,
  context?: any
) {
  return transform(obj, (result: any, val, key) => {
    result[key] = isObject(val) /*&& !_.isDate(val)*/
      ? deepMap(val, iterator, context)
      : iterator.call(context, val, String(key), obj);
  });
}

export function lastHeaderValue(headerValue: string[] | string) {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  } else {
    return headerValue;
  }
}

export function allHeaderValues(headerValue: string[] | string) {
  if (Array.isArray(headerValue)) {
    return headerValue;
  } else {
    return [headerValue];
  }
}

export function splitOnFirst(
  delimiter: string,
  value: string
): [string | undefined, string | undefined] {
  const index = value.indexOf(delimiter);
  if (!index) {
    return [undefined, undefined];
  } else {
    return [value.substring(0, index), value.substring(index + 1)];
  }
}

export function urlEncodeBody(
  object: Record<string, string | number | boolean>
) {
  const elements: string[] = [];
  for (const [key, value] of Object.entries(object)) {
    if (value === null || value === undefined) {
      continue;
    }
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    elements.push(encodedKey + "=" + encodedValue);
  }
  return elements.join("&");
}
