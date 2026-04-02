import axios from 'axios';
import { message, Modal } from 'antd';

export async function getFlowById(flowId: string) {
    const res = await axios.get(`/api/flows/${flowId}`);
    // Backend returns { success, data: { ... } }
    return res.data?.data || res.data;
}

function showFlowLimitModal(errorMsg: string) {
    Modal.confirm({
        title: "You've reached your flow limit",
        content: errorMsg,
        okText: 'Buy 50 Flows — $5',
        cancelText: 'Cancel',
        centered: true,
        width: 440,
        okButtonProps: {
            style: { backgroundColor: '#3CB371', borderColor: '#3CB371' },
        },
        onOk: async () => {
            try {
                const res = await axios.post('/api/pro/buy-flows', { package: '50' });
                const data = res.data?.data || res.data;
                if (data?.url) {
                    window.location.href = data.url;
                }
            } catch {
                message.error('Failed to start purchase');
            }
        },
    });
}

export async function createNewFlow(options?: { name?: string; projectId?: string }) {
    try {
        const body: any = {
            name: options?.name || 'Untitled Flow',
        };
        if (options?.projectId) {
            body.projectId = options.projectId;
        }

        const res = await axios.post('/api/flows', body);
        const flow = res.data?.data || res.data;

        if (!flow || !flow.id) {
            throw new Error('No flow ID returned from API');
        }

        // Always open editor in a new tab
        window.open(`/dashboard/flows/${flow.id}`, '_blank');
        return flow;
    } catch (err: any) {
        const errorCode = err?.response?.data?.error?.code;
        const errorMsg = err?.response?.data?.error?.message || 'Failed to create flow';

        if (errorCode === 'PRO_FLOW_LIMIT_REACHED' || errorCode === 'FLOW_LIMIT_REACHED') {
            showFlowLimitModal(errorMsg);
        } else {
            message.error(errorMsg);
        }
        throw err;
    }
}
