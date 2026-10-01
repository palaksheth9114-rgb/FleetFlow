"use client";

import { AuthProvider, useAuth } from '../context/AuthContext';
import AppLayout from './AppLayout';
import { usePathname } from 'next/navigation';

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutWrapper>
        {children}
      </LayoutWrapper>
    </AuthProvider>
  );
}
