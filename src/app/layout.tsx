import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'SENTRIX | Brand Risk Workspace',
  description: 'Review potential brand impersonation with clear evidence, source context, and practical next steps.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="min-h-screen md:flex"><Sidebar /><main className="min-w-0 flex-1">{children}</main></div></body></html>;
}
