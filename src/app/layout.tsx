import type { Metadata } from "next";
import "./globals.css"; // 👈 এই ইমপোর্টটি অবশ্যই থাকতে হবে!
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Super-Fast Messenger",
  description: "Luminous Glassmorphic Chat Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}