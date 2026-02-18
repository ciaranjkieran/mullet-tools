// app/layout.tsx
import "../styles/globals.css";
import { ClientProviders } from "./ClientProviders";
import NavGate from "@/components/common/NavGate";

export const metadata = {
  title: "Mullet",
  description: "Compartmentalize your life with modes.",
  icons: {
    icon: "/logo.png",
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
