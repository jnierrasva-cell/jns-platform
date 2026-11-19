"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  prepareSopUpload,
  saveSopRecord,
  deleteSop,
  getSopViewUrl,
  getSopDownloadUrl,
  updateSopVisibility,
  updateSopVersion,
} from "@/app/dashboard/sops/actions";

type Sop = {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  updated_at?: string | null;
  uploaded_by: string | null;
  visibility?: string | null;
  version?: string | null;
};

type PendingKey =
  | null
  | "upload"
  | `view:${string}`
  | `download:${string}`
  | `delete:${string}`
  | `visibility:${string}`
  | `version:${string}`;

function isOfficeDoc(fileType: string | null | undefined, fileName?: string) {
  const t = (fileType || "").toLowerCase();
  const n = (fileName || "").toLowerCase();
  return (
    t.includes("word") ||
    t.includes("officedocument") ||
    t.includes("msword") ||
    n.endsWith(".doc") ||
    n.endsWith(".docx")
  );
}

export function SopsClient({
  organizationId: _organizationId,
  orgName,
  canManage,
  sops,
}: {
  organizationId: string;
  orgName: string;
  canManage: boolean;
  sops: Sop[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingKey>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"all_members" | "managers_only">(
    "all_members",
  );

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!file || file.size === 0) {
      setError("Choose a file to upload");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20MB");
      return;
    }
    const uploadFile = file;
    const uploadTitle = title.trim();
    const uploadDescription = description.trim();
    const uploadVisibility = visibility;
    const uploadVersion = version.trim() || "1.0";
    setPending("upload");
    try {
      const prepared = await prepareSopUpload(uploadFile.name);
      if (!prepared.ok) {
        setError(prepared.error ?? "Could not prepare upload");
        return;
      }
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("org-sops")
        .uploadToSignedUrl(prepared.path, prepared.token, uploadFile, {
          contentType: uploadFile.type || "application/octet-stream",
        });
      if (uploadError) {
        setError(uploadError.message ?? "Upload to storage failed");
        return;
      }
      const result = await saveSopRecord({
        title: uploadTitle,
        description: uploadDescription,
        filePath: prepared.path,
        fileName: uploadFile.name,
        fileType: uploadFile.type || "application/octet-stream",
        fileSize: uploadFile.size,
        visibility: uploadVisibility,
        version: uploadVersion,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save SOP");
        return;
      }
      setTitle("");
      setDescription("");
      setVersion("1.0");
      setFile(null);
      setVisibility("all_members");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(null);
    }
  }

  async function handleView(sop: Sop) {
    setError(null);
    setPending(`view:${sop.id}`);
    try {
      const result = await getSopViewUrl(sop.id);
      if (!result.ok) {
        setError(result.error ?? "Could not open document");
        return;
      }
      const fileType = result.fileType ?? sop.file_type;
      const fileName = result.fileName ?? sop.file_name;
      if (isOfficeDoc(fileType, fileName)) {
        const viewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(result.url)}`;
        const win = window.open(viewer, "_blank", "noopener,noreferrer");
        if (!win) window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }
      const win = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!win) {
        setError("Popup blocked. Allow popups for this site to view documents.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open document");
    } finally {
      setPending(null);
    }
  }

  async function handleDownload(sopId: string) {
    setError(null);
    setPending(`download:${sopId}`);
    try {
      const result = await getSopDownloadUrl(sopId);
      if (!result.ok) {
        setError(result.error ?? "Download failed");
        return;
      }
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName;
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setPending(null);
    }
  }

  async function handleDelete(sopId: string, sopTitle: string) {
    if (!window.confirm(`Delete playbook “${sopTitle}”?`)) return;
    setError(null);
    setPending(`delete:${sopId}`);
    try {
      const result = await deleteSop(sopId);
      if (!result.ok) {
        setError(result.error ?? "Delete failed");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPending(null);
    }
  }

  async function handleVisibility(
    sopId: string,
    next: "all_members" | "managers_only",
  ) {
    setError(null);
    setPending(`visibility:${sopId}`);
    try {
      const result = await updateSopVisibility(sopId, next);
      if (!result.ok) {
        setError(result.error ?? "Could not update access");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update access");
    } finally {
      setPending(null);
    }
  }

  async function handleVersionBlur(sopId: string, value: string) {
    const v = value.trim() || "1.0";
    setPending(`version:${sopId}`);
    try {
      const result = await updateSopVersion(sopId, v);
      if (!result.ok) {
        setError(result.error ?? "Could not update version");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update version");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        Playbooks
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        Playbooks
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Playbooks for <span className="font-medium">{orgName}</span>. Prefer{" "}
        <span className="font-medium">PDF</span> for in-browser viewing.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-900">Upload playbook</h2>
          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-slate-700">Playbook title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client cancellation process"
                className="mt-1 w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-slate-700">Version</label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700">Who can view</label>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(
                      e.target.value as "all_members" | "managers_only",
                    )
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-sm"
                >
                  <option value="all_members">Everyone in this workspace</option>
                  <option value="managers_only">Owners & admins only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-700">Notes (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-700">File (PDF recommended)</label>
              <input
                type="file"
                required
                accept=".pdf,application/pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={pending === "upload"}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {pending === "upload" ? "Uploading…" : "Upload"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Library ({sops.length})
        </h2>
        {sops.length === 0 ? (
          <p className="text-sm text-slate-500">
            No playbooks shared with you yet.
            {canManage ? " Upload one above and set Everyone in this workspace." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Playbook title</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Last edited</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map((sop) => {
                  const edited = sop.updated_at || sop.created_at;
                  const viewing = pending === `view:${sop.id}`;
                  const downloading = pending === `download:${sop.id}`;
                  const deleting = pending === `delete:${sop.id}`;
                  return (
                    <tr key={sop.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{sop.title}</p>
                        {sop.description ? (
                          <p className="mt-0.5 text-xs text-slate-500">{sop.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {canManage ? (
                          <input
                            defaultValue={sop.version || "1.0"}
                            onBlur={(e) => handleVersionBlur(sop.id, e.target.value)}
                            disabled={pending === `version:${sop.id}`}
                            className="w-16 rounded border border-slate-200/80 px-2 py-1 text-sm disabled:opacity-60"
                            aria-label={`Version for ${sop.title}`}
                          />
                        ) : (
                          sop.version || "1.0"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {edited
                          ? new Date(edited).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={viewing}
                            onClick={() => handleView(sop)}
                            className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                          >
                            {viewing ? "Opening…" : "View"}
                          </button>
                          {canManage ? (
                            <>
                              <button
                                type="button"
                                disabled={downloading}
                                onClick={() => handleDownload(sop.id)}
                                className="rounded-2xl border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {downloading ? "Downloading…" : "Download"}
                              </button>
                              <select
                                disabled={pending === `visibility:${sop.id}`}
                                value={
                                  sop.visibility === "managers_only"
                                    ? "managers_only"
                                    : "all_members"
                                }
                                onChange={(e) =>
                                  handleVisibility(
                                    sop.id,
                                    e.target.value as "all_members" | "managers_only",
                                  )
                                }
                                className="rounded-2xl border border-slate-200/80 px-2 py-1.5 text-xs text-slate-800 disabled:opacity-60"
                              >
                                <option value="all_members">Team can view</option>
                                <option value="managers_only">Managers only</option>
                              </select>
                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => handleDelete(sop.id, sop.title)}
                                className="rounded-2xl border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                {deleting ? "Deleting…" : "Delete"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
