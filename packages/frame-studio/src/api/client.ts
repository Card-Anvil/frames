import type {
  Edit,
  EditRejection,
  FramePayload,
  FrameSummary,
  Impact,
  Provenance,
  StudioInfo,
} from "./types.js";

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} → ${String(response.status)}`);
  }
  return (await response.json()) as T;
}

export const getInfo = () => get<StudioInfo>("/api/studio");

export const getFrames = () =>
  get<{ frames: FrameSummary[] }>("/api/frames").then((body) => body.frames);

export const getFrame = (slug: string) =>
  get<FramePayload>(`/api/frame?frame=${encodeURIComponent(slug)}`);

export const getSource = (
  slug: string,
  path: readonly (string | number)[],
  withImpact = false,
) =>
  get<Provenance>(
    `/api/source?frame=${encodeURIComponent(slug)}&path=${encodeURIComponent(path.join("."))}` +
      (withImpact ? "&impact=1" : ""),
  );

export interface EditResult {
  ok: boolean;
  revision?: number;
  rejected?: EditRejection[];
  /** Set when the edit touches a literal other box sets read. */
  shared?: Impact[];
}

export async function postEdits(
  slug: string,
  edits: readonly Edit[],
  options: { confirmShared?: boolean } = {},
): Promise<EditResult> {
  const response = await fetch("/api/edit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      frame: slug,
      edits,
      ...(options.confirmShared === true ? { confirmShared: true } : {}),
    }),
  });
  const body = (await response.json()) as {
    revision?: number;
    rejected?: EditRejection[];
    code?: string;
    shared?: Impact[];
  };
  if (response.ok) {
    return {
      ok: true,
      ...(body.revision === undefined ? {} : { revision: body.revision }),
    };
  }
  return body.code === "shared"
    ? { ok: false, shared: body.shared ?? [] }
    : { ok: false, rejected: body.rejected ?? [] };
}

/** Live reload channel. Returns an unsubscribe. */
export function subscribe(
  onEvent: (event: { type: string; slug?: string; cause?: string }) => void,
): () => void {
  const source = new EventSource("/api/events");
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data as string) as { type: string });
    } catch {
      /* a ping or a partial frame */
    }
  };
  return () => {
    source.close();
  };
}
