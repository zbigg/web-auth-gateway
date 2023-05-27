import React from "react";
import ReactDOMServer from "react-dom/server";
import express from "express";
import dedent from "dedent";
import { PageLayout } from "../pages/PageLayout";
const config = require("config");

export function renderHtmlPage(content: string, title: string) {
  return dedent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title id="page-title">${title} - Auth Gateway</title>
        <link rel="stylesheet" href="/_auth-gateway/static/pico.min.css">
        <style>
          :root {
            --font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
}

export function renderReactElement(
  component: React.ReactElement,
  title: string
) {
  const content = dedent(`
    <div id="app">${ReactDOMServer.renderToString(component)}</div>
    <script src="/_auth-gateway/static/client.js"></script>
  `);
  return renderHtmlPage(content, title);
}

export function renderReactComponent<P extends {}>(
  component: React.ComponentType<P>,
  props: P,
  title: string
) {
  return renderReactElement(
    React.createElement(PageLayout, {
      supportLink: config.supportLink,
      children: React.createElement(component, props),
    }),
    title
  );
}

export function sendReactPage(
  Component: React.ComponentType,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    res
      .type("html")
      .send(renderReactElement(React.createElement(Component), "no title"))
      .end();
  } catch (error) {
    next(error);
  }
}
