import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { categories, products } from "../lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Petal Pantry",
  description: "Modern pet food ecommerce frontend",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f7fbf3] text-[#2f453b]">
        <Navbar products={products} categories={categories} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
