// Use the app's axios client so the workspace-scoping request interceptor
// (lib/axios.tsx) attaches the `X-Team-Context` header. Bare `axios` from
// the npm module bypasses interceptors and caused team-context flow
// creations to fall back to personal.
import api from "@/lib/axios";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "sonner";

export async function getFlowById(flowId: string) {
  const res = await api.get(`/flows/${flowId}`);
  // Backend returns { success, data: { ... } }
  return res.data?.data || res.data;
}

function showFlowLimitModal(errorMsg: string) {
  confirmDialog({
    title: "Flow limit reached",
    content: errorMsg,
    confirmLabel: "Upgrade Plan",
    cancelLabel: "Cancel",
    onConfirm: () => {
      window.location.href = "/dashboard/subscription";
    },
  });
}

// Guards against double-creation: a single user intent (button tap) can fire
// twice on touch devices (ghost-click / impatient double-tap) or via two
// surfaces racing, producing two flows ("Untitled Flow" + a stray duplicate).
// We dedupe concurrent in-flight calls and ignore taps within a short window
// of a completed one, so only ONE flow is ever created per intent.
let flowCreateInFlight: Promise<any> | null = null;
let lastFlowCreateAt = 0;

export async function createNewFlow(options?: {
  name?: string;
  projectId?: string;
}) {
  // Collapse a burst of clicks onto the single in-flight request.
  if (flowCreateInFlight) return flowCreateInFlight;
  // Swallow a trailing duplicate tap right after one resolved/opened.
  if (Date.now() - lastFlowCreateAt < 1500) return null;

  flowCreateInFlight = (async () => {
    try {
      return await doCreateNewFlow(options);
    } finally {
      lastFlowCreateAt = Date.now();
      flowCreateInFlight = null;
    }
  })();
  return flowCreateInFlight;
}

async function doCreateNewFlow(options?: {
  name?: string;
  projectId?: string;
}) {
  try {
    const body: any = {
      name: options?.name || "Untitled Flow",
    };
    if (options?.projectId) {
      body.projectId = options.projectId;
    }

    const res = await api.post("/flows", body);
    const flow = res.data?.data || res.data;

    if (!flow || !flow.id) {
      throw new Error("No flow ID returned from API");
    }

    // Always open editor in a new tab
    window.open(`/dashboard/flows/${flow.id}`, "_blank");
    return flow;
  } catch (err: any) {
    const errorCode = err?.response?.data?.error?.code;
    const errorMsg =
      err?.response?.data?.error?.message || "Failed to create flow";

    if (
      errorCode === "PRO_FLOW_LIMIT_REACHED" ||
      errorCode === "FLOW_LIMIT_REACHED"
    ) {
      showFlowLimitModal(errorMsg);
      // Handled with the upgrade modal — return null so unawaited callers
      // (e.g. sidebar onClick) don't surface an unhandled rejection /
      // dev-overlay axios error.
      return null;
    }
    toast.error(errorMsg);
    return null;
  }
}
