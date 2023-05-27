import React from "react";

export function ErrorPage({ message }: { message: string }) {
  return (
    <section>
      <h2>{message}</h2>
      <hr></hr>
      <a href="/_auth-gateway/login">Login again</a>
    </section>
  );
}
