import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KVY - Document Verification',
  description: 'Document verification workflow for seller onboarding',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
