// navigator.clipboard requires a secure context (HTTPS or localhost) — it is
// undefined (or writeText rejects) on plain-HTTP LAN origins like
// http://192.168.x.x:3002, which is how this app is accessed in local dev.
// Every caller that copies text to the clipboard should go through this
// helper instead of calling navigator.clipboard directly, or copy silently
// breaks in that environment with no usable fallback.
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy fallback below.
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}
