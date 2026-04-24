"use client";

import { SessionProvider } from "next-auth/react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import { antdTheme } from "@/lib/theme";
import { AppContextProvider } from "@/context/AppContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AntdRegistry>
        <ConfigProvider theme={antdTheme}>
          <AppContextProvider>{children}</AppContextProvider>
        </ConfigProvider>
      </AntdRegistry>
    </SessionProvider>
  );
}
