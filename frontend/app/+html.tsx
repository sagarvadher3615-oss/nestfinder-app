// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                width: 100%;
                height: 100vh;
                height: 100dvh;
                margin: 0;
                padding: 0;
                overflow: hidden;
                background: #FFFFFF;
              }
              body {
                display: flex;
                flex-direction: column;
              }
              body > div:first-child {
                position: relative !important;
                flex: 1 1 auto;
                min-height: 0;
                width: 100%;
              }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }

              @media (max-width: 480px) {
                [role="tablist"] {
                  position: fixed !important;
                  left: 0 !important;
                  right: 0 !important;
                  bottom: 0 !important;
                  z-index: 1000 !important;
                  width: 100% !important;
                  max-width: none !important;
                  height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
                  margin: 0 !important;
                  padding-top: 6px !important;
                  padding-right: 0 !important;
                  padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px)) !important;
                  padding-left: 0 !important;
                  border: 0 !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  background: #FFFFFF !important;
                }
                [role="tablist"] [role="tab"] {
                  height: 52px !important;
                  min-height: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
            `,
          }}
        />
      </head>
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
