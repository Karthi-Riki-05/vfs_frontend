"use client";

import React, { useState } from "react";
import { Result, Button } from "antd";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { getPostLoginDashboardUrl } from "@/lib/postLoginRedirect";

interface RoleGuardProps {
  children: React.ReactNode;
  role: string;
  fallback?: React.ReactNode;
}

export default function RoleGuard({
  children,
  role,
  fallback,
}: RoleGuardProps) {
  const { user, isLoading, hasRole } = useAuth();
  const [dashUrl] = useState(() =>
    typeof window !== "undefined"
      ? getPostLoginDashboardUrl()
      : "/dashboard/team",
  );

  if (isLoading) return null;

  if (!hasRole(role)) {
    return (
      fallback || (
        <Result
          status="403"
          title="Access Denied"
          subTitle="You do not have permission to view this page."
          extra={
            <Link href={dashUrl}>
              <Button type="primary">Go to Dashboard</Button>
            </Link>
          }
        />
      )
    );
  }

  return <>{children}</>;
}
