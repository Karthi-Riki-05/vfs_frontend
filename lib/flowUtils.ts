export function isFlowEmpty(flow: any): boolean {
  const xml = flow?.diagramData || flow?.xml_data || flow?.xml || '';
  if (!xml || xml.trim() === '') return true;
  if (xml.trim() === '<mxGraphModel></mxGraphModel>') return true;
  if (xml.trim() === '<mxGraphModel/>') return true;
  if (xml.trim() === '{}') return true;
  if (xml.trim().length < 60) return true;
  return false;
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
