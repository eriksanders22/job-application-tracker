import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Application Email Tracker",
  description: "A local MVP dashboard for tracking job application emails."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
