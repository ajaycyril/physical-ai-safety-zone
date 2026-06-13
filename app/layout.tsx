import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Physical AI Safety Zone",
  description:
    "A Vercel-hosted dashboard and local supervision-based edge agent for no-go zone monitoring.",
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
