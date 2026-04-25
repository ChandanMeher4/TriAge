import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — SentinelQA",
  description: "Real-time multi-agent pipeline monitoring",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
