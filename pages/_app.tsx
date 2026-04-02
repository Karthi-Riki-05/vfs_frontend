import React from 'react';
import type { AppProps } from 'next/app';
import 'antd/dist/reset.css';
import '../app/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />;
}

export default MyApp;
