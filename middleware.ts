export { default } from "next-auth/middleware";

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/flows/:path*",
        "/api/shapes/:path*",
        "/api/subscription/:path*",
    ],
};
