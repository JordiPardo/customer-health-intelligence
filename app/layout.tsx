import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer health intelligence",
  description:
    "Predict which customers will churn—and when—with survival analysis and causal inference.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
