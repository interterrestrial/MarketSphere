import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MarketSphere",
  description: "A B2B marketplace connecting micro and small enterprises with business buyers",
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
