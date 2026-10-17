import type { Metadata } from 'next';
export const metadata: Metadata = {title: '文獻整理教室', description: '一般文獻學生整理及教師即時監考'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="zh-Hant-TW"><body style={{margin:0}}>{children}</body></html>;
}
