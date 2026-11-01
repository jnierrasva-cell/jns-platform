"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-6 pb-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-text-muted">
          Playbooks
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          Company processes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          Playbooks for <span className="font-medium text-foreground">{orgName}</span>. Team
          members can view shared SOPs. Owners and admins upload and manage
          access. Prefer <span className="font-medium text-foreground">PDF</span> for in-browser
          viewing.
        </p>
      </header>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {canManage && (
        <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
          <h2 className="font-heading text-base font-bold text-foreground">Upload playbook</h2>
          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Playbook title</label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client cancellation process"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-text-muted">
                This title is what the team sees (not the original file name).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-text-secondary">Version</label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary">Who can view</label>
                <Select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(
                      e.target.value as "all_members" | "managers_only",
                    )
                  }
                  className="mt-1"
                >
                  <option value="all_members">
                    Everyone in this workspace
                  </option>
                  <option value="managers_only">Owners & admins only</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Notes (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 min-h-20"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary">File (PDF recommended)</label>
              <input
                type="file"
                required
                accept=".pdf,application/pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface-inset px-3 py-2 text-sm text-text-secondary file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-accent-cyan file:px-3 file:font-semibold file:text-[#0A0E1A]"
              />
              <p className="mt-1 text-xs text-text-muted">
                Max 20MB. PDF opens in the browser; Word usually downloads.
              </p>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
            >
              {isPending ? "Uploading…" : "Upload"}
            </button>
          </form>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-foreground">
            Library
          </h2>
          <Badge variant="secondary">{sops.length}</Badge>
        </div>
        <p className="sr-only">Playbooks available in {orgName}</p>
        {sops.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No playbooks shared yet"
            description={canManage ? "Upload a process document for this workspace." : "Shared process documents will appear here."}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card text-card-foreground">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-surface-inset text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Playbook</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Last edited</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sops.map((sop) => {
                  const edited = sop.updated_at || sop.created_at;
                  return (
                    <tr key={sop.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{sop.title}</p>
                        {sop.description ? (
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {sop.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {canManage ? (
                          <Input
                            defaultValue={sop.version || "1.0"}
                            onBlur={(e) => handleVersionBlur(sop.id, e.target.value)}
                            className="w-24"
                            aria-label={`Version for ${sop.title}`}
                          />
                        ) : (
                          sop.version || "1.0"
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
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
                            className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-3 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
                          >
                            View
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDownload(sop.id)}
                                className="min-h-11 rounded-xl border border-border px-3 text-sm text-text-secondary hover:bg-surface-inset disabled:opacity-60"
                              >
                                Download
                              </button>
                              <Select
                                disabled={isPending}
                                value={sop.visibility === "managers_only" ? "managers_only" : "all_members"}
                                onChange={(e) => handleVisibility(sop.id, e.target.value as "all_members" | "managers_only")}
                                aria-label={`Visibility for ${sop.title}`}
                                className="min-h-11 w-40 px-2 text-xs"
                              >
                                <option value="all_members">Team can view</option>
                                <option value="managers_only">Managers only</option>
                              </Select>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(sop.id, sop.title)}
                                className="min-h-11 rounded-xl border border-danger/30 px-3 text-sm text-danger hover:bg-danger/10 disabled:opacity-60"
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