"use client";

import React from 'react';
import { Result, Button } from 'antd';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface RoleGuardProps {
  children: React.ReactNode;
  role: string;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ children, role, fallback }: RoleGuardProps) {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) return null;

  if (!hasRole(role)) {
    return fallback || (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You do not have permission to view this page."
        extra={<Link href="/dashboard"><Button type="primary">Go to Dashboard</Button></Link>}
      />
    );
  }

  return <>{children}</>;
}
