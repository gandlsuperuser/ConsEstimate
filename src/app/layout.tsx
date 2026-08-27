import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopToolbar from "@/components/TopToolbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ConsEstimate",
  description: "Construction Estimating & Profitability Tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-scroll-behavior="smooth">
      <body className="h-full font-sans antialiased print:bg-white print:p-0">
        <TopToolbar />
        <div className="min-h-screen pt-12 print:pt-0 print:min-h-0 print:p-0">
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:w-full print:p-0 print:m-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
