import axios from 'axios';

export async function getFlowById(flowId: string) {
    const res = await axios.get(`/api/flows/${flowId}`);
    return res.data;
}
