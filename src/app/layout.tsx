import './globals.css';
import { Sidebar } from '@/components/sidebar';
export const metadata={title:'SENTRIX — Detect Threats. Defend Trust.',description:'Digital risk protection by Team CIPHER'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><div className="min-h-screen md:flex"><Sidebar/><main className="min-w-0 flex-1">{children}</main></div></body></html>}
