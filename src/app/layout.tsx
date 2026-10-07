import type {Metadata} from 'next';
import { Bebas_Neue, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/use-auth"
import { RoleBasedRouter } from "@/components/auth/RoleBasedRouter"

const brand = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-brand',
});

const body = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'OpenLawn',
  description: 'Lawn care routing and crew run sheets',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${brand.variable} ${body.variable} font-body antialiased`}>
        <AuthProvider>
          <RoleBasedRouter>
            {children}
          </RoleBasedRouter>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
