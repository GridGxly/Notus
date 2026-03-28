import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://notus-157773981093.us-central1.run.app'),
  title: 'NOTUS — Multi-Agent Hurricane Intelligence',
  description:
    'Real-time hurricane preparedness powered by four AI agents. NOTUS deploys Recon, Supply, Shelter, and Dispatch agents to analyze weather threats, locate resources, and generate actionable evacuation plans.',
  icons: { icon: '/notus-logo-512px.png', apple: '/notus-logo-512px.png' },
  openGraph: {
    title: 'NOTUS — Multi-Agent Hurricane Intelligence',
    description:
      'Four AI agents coordinate in real-time to analyze weather threats, find fuel and shelter, and build your personalized hurricane action plan.',
    images: ['/notus-logo-512px.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'NOTUS — Multi-Agent Hurricane Intelligence',
    description:
      'Four AI agents coordinate in real-time to build your hurricane action plan.',
    images: ['/notus-logo-512px.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased h-full`}>
        {children}
      </body>
    </html>
  );
}
