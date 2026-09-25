import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Physical Intelligence — Product Thesis & Live Robotics Lab",
    template: "%s | Physical Intelligence",
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
      <body>{children}</body>
    </html>
  );
}
