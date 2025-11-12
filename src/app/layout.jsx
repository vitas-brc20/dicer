import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/Wallet";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "11dice Game",
  description: "A daily dice game on the XPR Network",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}