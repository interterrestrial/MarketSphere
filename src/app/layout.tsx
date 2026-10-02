import type { Metadata } from "next";
import { Space_Mono, Varela, Varela_Round } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Header } from "@/components/layout/header";
import "./globals.css";

const heading = Varela_Round({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const body = Varela({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "MarketSphere",
  description: "A B2B marketplace connecting micro and small enterprises with business buyers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
