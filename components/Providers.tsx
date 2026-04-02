"use client";

import { SessionProvider } from "next-auth/react";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { antdTheme } from '@/lib/theme';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AntdRegistry>
                <ConfigProvider theme={antdTheme}>
                    {children}
                </ConfigProvider>
            </AntdRegistry>
        </SessionProvider>
    );
}
