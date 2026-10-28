import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Restaurant Ordering',
  description: 'Fast, contact-free table ordering system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased flex flex-col">{children}</body>
    </html>
  );
}
