import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Background from "@/components/Background";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Wanneer Games?",
  description: "Wanneer is de volgende game sessie?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster />
        <div>
          <Background />
          <main className="flex flex-col items-center justify-center min-h-screen z-10 relative p-4 text-gray-100">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
