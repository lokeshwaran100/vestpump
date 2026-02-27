import { Inter } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "VestPump — Market-Driven Token Launches",
  description: "Fair token launches with immediate, market-driven vesting on the bonding curve.",
  icons: { icon: "/favicon.ico" },
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning data-theme="vestpump" className={inter.className}>
      <body>
        <ThemeProvider forcedTheme="vestpump">
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
