import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Mono, Varela, Varela_Round } from "next/font/google";
import { currentUser } from "@/app/api/auth/_helpers";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Header } from "@/components/layout/header";
import { unreadCount } from "@/server/services/notification.service";
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Resolved on the server so the first paint already knows who is signed in
  // and how many notifications are waiting (Design.md §8).
  const user = await currentUser((await headers()).get("cookie"));
  const unread = user ? await unreadCount(user.id) : 0;

  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        <AuthProvider initialUser={user} initialUnread={unread}>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
