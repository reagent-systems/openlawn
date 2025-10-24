import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/use-auth"
import { RoleBasedRouter } from "@/components/auth/RoleBasedRouter"
import { EnvCheck } from "@/components/ui/env-check"

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'OpenLawn',
  description: 'AI-powered CRM for lawn care businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-body antialiased`}>
        <AuthProvider>
          <RoleBasedRouter>
            {children}
          </RoleBasedRouter>
          <Toaster />
          <EnvCheck />
        </AuthProvider>
      </body>
    </html>
  );
}
