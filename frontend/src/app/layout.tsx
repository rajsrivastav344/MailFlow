import type { Metadata } from 'next';
import { Syne } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MailFlow — Bulk Email Sender',
  description: 'Professional bulk email sending platform with contact management and campaign tracking',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${syne.variable}`}>
      <body className="font-sans bg-surface-50 text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
