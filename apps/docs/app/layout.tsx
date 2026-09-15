import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "@fontsource-variable/geist";
import "./global.css";

const docsSocialImagePath = "/og/home.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.openpo.st"),
  title: { template: "%s | OpenPost Docs", default: "OpenPost Docs" },
  description:
    "Connect your accounts, publish your first post, and keep your content moving with OpenPost.",
  icons: { icon: "/assets/brand/icon.svg" },
  openGraph: {
    siteName: "OpenPost Docs",
    type: "website",
    images: [
      {
        url: docsSocialImagePath,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "OpenPost documentation social preview.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: docsSocialImagePath,
        width: 1200,
        height: 630,
        alt: "OpenPost documentation social preview.",
      },
    ],
  },
  other: {
    "integration-screenshot-sources": "/assets/screenshots/integrations/SOURCES.txt",
    "integration-screenshot-license": "/assets/screenshots/integrations/POSTIZ-LICENSE.txt",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
