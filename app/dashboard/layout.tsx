import DashboardLayout from "@/components/layout/DashboardLayout";
import { ProGuard } from "@/components/layout/ProGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </ProGuard>
  );
}
