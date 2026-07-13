// Unauthenticated public shape viewer fetch — see lib/flow.ts
// getPublicFlowById for the same pattern. Only resolves shapes the owner
// explicitly flagged isPublic=true (shapesApi.update(id, { isPublic: true })).
export async function getPublicShapeById(shapeId: string) {
  const res = await fetch(`/api/public/shapes/${shapeId}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err: any = new Error(json?.error?.message || "Shape not found");
    err.response = { status: res.status, data: json };
    throw err;
  }
  return json.data;
}
