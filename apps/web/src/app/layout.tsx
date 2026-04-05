import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Meter Anomaly Detection Platform",
  description: "Next.js demo platform for secure server-side meter anomaly inference via Hugging Face Space.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link className="brand" href="/">
            {process.env.NEXT_PUBLIC_APP_NAME || "Meter Anomaly Detection Platform"}
          </Link>
          <div className="nav-links">
            <Link href="/">Overview</Link>
            <Link href="/upload">Demo</Link>
            <Link href="/docs">Deploy</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
