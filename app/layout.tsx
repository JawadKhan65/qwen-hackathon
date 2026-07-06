import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchGrid",
  description: "Visual agent workflow studio for ecommerce launch content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
