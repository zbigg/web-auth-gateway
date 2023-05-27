import React from "react";

export function PageLayout({
  supportLink,
  children,
}: {
  supportLink?: string;
  children?: React.ReactElement;
}) {
  return (
    <main
      // className="container"
      style={{
        fontFamily: "sans-serif",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.06)",
          maxWidth: "600px",
          border: "solid 1px rgba(0,0,0,0.26)",
          borderRadius: "1",
          padding: "2em",
        }}
      >
        {children}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <hr />
          {supportLink && (
            <small>
              <a href={supportLink}>Support</a>
            </small>
          )}
          <small>
            <a href="https://github.com/zbigg/auth-gateway">
              Powered by Auth Gateway
            </a>
          </small>
        </div>
      </div>
    </main>
  );
}
