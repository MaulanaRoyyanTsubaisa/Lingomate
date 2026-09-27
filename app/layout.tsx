import type { Metadata } from "next";
export const metadata: Metadata = { title: "LingoMate", description: "Interactive English & Chinese learning" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body style={{margin:0}}>{children}</body></html>; }
