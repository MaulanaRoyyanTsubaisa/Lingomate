import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LingoMate — English & Chinese Learning",
  description: "Interactive English and Mandarin learning with lessons, practice, voice conversation, corrections and vocabulary.",
  applicationName: "LingoMate",
};
export const viewport: Viewport = { themeColor: "#f6f7fb", width: "device-width", initialScale: 1 };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}