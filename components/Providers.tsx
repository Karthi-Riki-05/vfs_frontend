"use client";

import { SessionProvider } from "next-auth/react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import { antdTheme } from "@/lib/theme";
import { AppContextProvider } from "@/context/AppContext";
import { AiBillingProvider } from "@/context/AiBillingContext";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AntdRegistry>
        <ConfigProvider theme={antdTheme}>
          <AppContextProvider>
            <AiBillingProvider>
              {children}
              <Toaster position="top-right" richColors />
            </AiBillingProvider>
          </AppContextProvider>
        </ConfigProvider>
      </AntdRegistry>
    </SessionProvider>
  );
}
