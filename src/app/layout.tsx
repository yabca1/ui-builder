import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini App Builder",
  description: "Visual JSON-first mini-app builder for React Native super apps.",
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
