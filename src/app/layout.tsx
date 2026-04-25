import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  title: "TriAge — AI-Powered Bug Triage & Autonomous Testing",
  description:
    "AI agents that write, heal, and observe your tests in real-time. Intelligent bug triage with zero maintenance.",
  authors: [{ name: "TriAge" }],
  openGraph: {
    type: "website",
    title: "TriAge — AI-Powered Bug Triage & Autonomous Testing",
    description:
      "AI agents that write, heal, and observe your tests in real-time. Intelligent bug triage with zero maintenance.",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5906fa03-7cd7-440a-b35b-610dc22a1352/id-preview-2791a9bb--93c31158-4502-4421-91b3-6b0f3d16adfc.lovable.app-1772225585800.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TriAgeAI",
    title: "TriAge — AI-Powered Bug Triage & Autonomous Testing",
    description:
      "AI agents that write, heal, and observe your tests in real-time. Intelligent bug triage with zero maintenance.",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5906fa03-7cd7-440a-b35b-610dc22a1352/id-preview-2791a9bb--93c31158-4502-4421-91b3-6b0f3d16adfc.lovable.app-1772225585800.png",
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
