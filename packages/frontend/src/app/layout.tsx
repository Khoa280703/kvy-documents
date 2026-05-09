import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'KVY Document Verification', description: 'Document verification workflow for seller onboarding' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
