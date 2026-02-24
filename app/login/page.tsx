import LoginForm from "@/components/auth/LoginForm";
import { Layout } from "antd";

export default function LoginPage() {
    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
            <LoginForm />
        </Layout>
    );
}
