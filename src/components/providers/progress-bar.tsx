"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function ProgressBar() {
  return (
    <AppProgressBar
      height="2px"
      color="#2563eb"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
