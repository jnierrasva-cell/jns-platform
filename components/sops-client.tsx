"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"all_members" | "managers_only">(
    "all_members",
  );

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
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

    startTransition(async () => {
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
      }
    });
  }

  function handleView(sopId: string) {
    setError(null);
    startTransition(async () => {
      const result = await getSopViewUrl(sopId);
      if (!result.ok) {
        setError(result.error ?? "Could not open document");
        return;
      }
      // PDF / images open in browser; Word will download (browser limitation)
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDownload(sopId: string) {
    setError(null);
    startTransition(async () => {
      const result = await getSopDownloadUrl(sopId);
      if (!result.ok) {
        setError(result.error ?? "Download failed");
        return;
      }
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName; // Title-based name
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  function handleDelete(sopId: string, sopTitle: string) {
    if (!window.confirm(`Delete SOP “${sopTitle}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSop(sopId);
      if (!result.ok) {
        setError(result.error ?? "Delete failed");
        return;
      }
      router.refresh();
    });
  }

  function handleVisibility(
    sopId: string,
    next: "all_members" | "managers_only",
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateSopVisibility(sopId, next);
      if (!result.ok) {
        setError(result.error ?? "Could not update access");
        return;
      }
      router.refresh();
    });
  }

  function handleVersionBlur(sopId: string, value: string) {
    const v = value.trim() || "1.0";
    startTransition(async () => {
      const result = await updateSopVersion(sopId, v);
      if (!result.ok) {
        setError(result.error ?? "Could not update version");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        SOPs / Workflow
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        Company processes
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Playbooks for <span className="font-medium">{orgName}</span>. Team
        members can view shared SOPs. Owners and admins upload and manage
        access. Prefer <span className="font-medium">PDF</span> for in-browser
        viewing.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {canManage && (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Upload SOP</h2>
          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-zinc-700">SOP title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client cancellation process"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-400">
                This title is what the team sees (not the original file name).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-zinc-700">Version</label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-700">Who can view</label>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(
                      e.target.value as "all_members" | "managers_only",
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="all_members">
                    Everyone in this workspace
                  </option>
                  <option value="managers_only">Owners & admins only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-700">Notes (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-700">File (PDF recommended)</label>
              <input
                type="file"
                required
                accept=".pdf,application/pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-zinc-600"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Max 20MB. PDF opens in the browser; Word usually downloads.
              </p>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
            >
              {isPending ? "Uploading…" : "Upload"}
            </button>
          </form>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Library ({sops.length})
        </h2>
        {sops.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No SOPs shared with you yet.
            {canManage ? " Upload one above and set “Everyone in this workspace”." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">SOP title</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Last edited</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map((sop) => {
                  const edited = sop.updated_at || sop.created_at;
                  return (
                    <tr
                      key={sop.id}
                      className="border-b border-zinc-50 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{sop.title}</p>
                        {sop.description ? (
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {sop.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {canManage ? (
                          <input
                            defaultValue={sop.version || "1.0"}
                            onBlur={(e) =>
                              handleVersionBlur(sop.id, e.target.value)
                            }
                            className="w-16 rounded border border-zinc-200 px-2 py-1 text-sm"
                            aria-label={`Version for ${sop.title}`}
                          />
                        ) : (
                          sop.version || "1.0"
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
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
                            disabled={isPending}
                            onClick={() => handleView(sop.id)}
                            className="rounded-lg bg-[#0B132B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
                          >
                            View
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDownload(sop.id)}
                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                              >
                                Download
                              </button>
                              <select
                                disabled={isPending}
                                value={
                                  sop.visibility === "managers_only"
                                    ? "managers_only"
                                    : "all_members"
                                }
                                onChange={(e) =>
                                  handleVisibility(
                                    sop.id,
                                    e.target.value as
                                      | "all_members"
                                      | "managers_only",
                                  )
                                }
                                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="all_members">Team can view</option>
                                <option value="managers_only">
                                  Managers only
                                </option>
                              </select>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(sop.id, sop.title)}
                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
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