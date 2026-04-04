import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in or sign up for Mullet.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
