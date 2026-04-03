import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4K UHD Blu-ray Tracker",
  description: "Track upcoming 4K UHD Blu-ray releases with prices and retailer links",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0b0f]">{children}</body>
    </html>
  );
}
