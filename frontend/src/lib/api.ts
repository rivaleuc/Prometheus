const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface Doc {
  docId: number;
  title: string;
  description: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  shelbyAccount: string;
  shelbyBlobName: string;
  stakeAmount: number;
  txHash: string;
  uploadedAt: string;
  status: number;          // 0 active | 1 challenged | 2 removed | 3 vindicated
  statusLabel: string;
  guardianCount: number;
  totalStaked: number;
  totalStakedAPT: string;
  readCount: number;
  explorerUrl?: string;
}

export interface Stats {
  totalDocs: number;
  totalChallenges: number;
  totalReads: number;
  totalStaked: number;
  totalStakedAPT: string;
  contract: string;
  network: string;
}

export interface UploadResult {
  ok: boolean;
  docId: number;
  txHash: string;
  sha256: string;
  shelbyBlobName: string;
  stakeAmount: string;
  explorerUrl: string;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchDocs(): Promise<Doc[]> {
  const d = await get<{ docs: Doc[] }>("/api/docs");
  return d.docs;
}

export async function fetchDoc(id: number): Promise<Doc> {
  return get<Doc>(`/api/docs/${id}`);
}

export async function fetchStats(): Promise<Stats> {
  return get<Stats>("/api/stats");
}

export async function uploadDoc(
  file: File,
  title: string,
  description: string,
  stakeAmount: number,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("description", description);
    fd.append("stakeAmount", String(stakeAmount));

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const d = JSON.parse(xhr.responseText);
      if (xhr.status === 200) resolve(d);
      else reject(new Error(d.error || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("POST", `${BASE}/api/upload`);
    xhr.send(fd);
  });
}

export function downloadUrl(docId: number, wallet?: string): string {
  return `${BASE}/api/read/${docId}${wallet ? `?wallet=${wallet}` : ""}`;
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export function formatAPT(octas: number): string {
  return (octas / 1e8).toFixed(4) + " APT";
}

export function shortHash(h: string): string {
  if (!h) return "—";
  return h.slice(0, 6) + "…" + h.slice(-4);
}

export const STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: "ACTIVE",      cls: "badge-active"     },
  1: { label: "CHALLENGED",  cls: "badge-challenged"  },
  2: { label: "REMOVED",     cls: "badge-removed"     },
  3: { label: "VINDICATED",  cls: "badge-vindicated"  },
};
