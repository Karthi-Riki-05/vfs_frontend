/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: [
        'antd',
        '@ant-design',
        'rc-util',
        'rc-pagination',
        'rc-picker',
        'rc-notification',
        'rc-tooltip',
        'rc-tree',
        'rc-table',
        'rc-input',
        'rc-textarea',
        'rc-select',
        'rc-checkbox',
        'rc-input-number',
        'rc-switch',
        'rc-rate',
        'rc-slider',
        'rc-steps',
        'rc-tabs',
        'rc-upload',
        'rc-dialog',
        'rc-drawer',
        'rc-dropdown',
        'rc-menu',
        'rc-resize-observer',
        'rc-segmented',
        'rc-cascader',
        'rc-mentions',
        'rc-virtual-list'
    ],
    experimental: {
        esmExternals: 'loose'
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig
