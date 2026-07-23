import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SplashScreen } from "@/components/SplashScreen";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Buffer — Safe-to-Spend Budgeting",
  description: "Personal, cloud-synced budgeting with a daily safe-to-spend gauge.",
  applicationName: "Buffer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Buffer",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // respect iOS safe areas / notch
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-black font-sans text-white antialiased">
        {children}
        <SplashScreen />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
