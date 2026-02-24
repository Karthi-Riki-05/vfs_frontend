import RegisterForm from "@/components/auth/RegisterForm";
import { Layout } from "antd";

export default function RegisterPage() {
    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
            <RegisterForm />
        </Layout>
    );
}
