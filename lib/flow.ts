import axios from 'axios';

export async function getFlowById(flowId: string) {
    const res = await axios.get(`/api/flows/${flowId}`);
    // Backend returns { success, data: { ... } }
    return res.data?.data || res.data;
}

export async function createNewFlow() {
    const res = await axios.post('/api/flows', {
        name: `Untitled Flow`,
    });
    const flow = res.data?.data || res.data;

    if (!flow || !flow.id) {
        throw new Error('No flow ID returned from API');
    }

    // Open editor in a new tab (no sidebar/header)
    window.open(`/dashboard/flows/${flow.id}`, '_blank');
}
