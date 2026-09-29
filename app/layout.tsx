import type { Metadata } from "next";
import "./globals.css";
import "../public/site.css";
import "../public/analog-light.css";
import SiteHeader from "./SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Analog Physical Intelligence",
    template: "%s | Analog Physical Intelligence",
  },
  description:
    "A working reference architecture for Physical Intelligence: grounded intent, world state, mission orchestration, policy routing, robot-edge safety, browser physics and live camera perception.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><SiteHeader />{children}</body>
    </html>
  );
}
