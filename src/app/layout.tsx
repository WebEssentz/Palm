import type { Metadata } from "next";
import { Geist_Mono, Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/theme/provider";
import { Toaster } from "@/components/ui/sonner";
import { PalmToastProvider } from "@/components/ui/palm-toast";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/convex/provider";
import ReduxProvider from "@/redux/provider"
import { ConvexUserRaw, normalizeProfile } from "@/types/user";
import { ProfileQuery } from "@/convex/query.config";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Palm",
  description: "Turn ideas into interfaces, instantly.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const rawProfile = await ProfileQuery()
  const profile = normalizeProfile(
    rawProfile._valueJSON as unknown as ConvexUserRaw | null
  )

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className={`bg-background ${bricolage.variable} ${dmSans.variable}`} suppressHydrationWarning>
        <body className={`${dmSans.className} antialiased`}>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <ReduxProvider preloadedState={{ profile }}>
                <PalmToastProvider>
                  {children}
                  <Toaster />
                </PalmToastProvider>
              </ReduxProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}