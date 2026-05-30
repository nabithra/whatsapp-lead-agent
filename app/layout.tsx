import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wheelztracker Lead Agent',
  description: 'WhatsApp Lead Conversion Agent for GPS device installations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
