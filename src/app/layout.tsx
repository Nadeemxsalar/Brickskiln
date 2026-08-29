import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 🟢 NAYA: Yahan 'manifest' link add kiya hai
export const metadata: Metadata = {
  title: "Bricks Kiln",
  description: "Complete Brick Kiln Management System",
  manifest: "/manifest.json", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}