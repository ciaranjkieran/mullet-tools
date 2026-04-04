// app/layout.tsx
import "../styles/globals.css";
import { ClientProviders } from "./ClientProviders";
import NavGate from "@/components/common/NavGate";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: {
    default: "Mullet — Compartmentalize your life",
    template: "%s | Mullet",
  },
  description:
    "Organise every area of your life with Modes, Goals, Projects, Milestones, and Tasks. Built-in notes, comments, boards, and a focused work timer.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Mullet — Compartmentalize your life",
    description:
      "A productivity app that gives every area of your life its own space.",
    siteName: "Mullet",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Mullet — Compartmentalize your life",
    description:
      "A productivity app that gives every area of your life its own space.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          <NavGate />
          <main>{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
