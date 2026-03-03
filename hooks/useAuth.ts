"use client";

import { useSession } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user as any;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const isAdmin = user?.role === 'ADMIN';

  const hasRole = (role: string) => user?.role === role;

  return {
    user,
    session,
    status,
    isAuthenticated,
    isLoading,
    isAdmin,
    hasRole,
  };
}
