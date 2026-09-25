"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  saveSopRecord,
  deleteSop,
  getSopDownloadUrl,
} from "@/app/dashboard/sops/actions";

type Sop = {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  uploaded_by: string | null;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SopsClient({
  organizationId,
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
  const [file, setFile] = useState<File | null>(null);

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

    startTransition(async () => {
      try {
        const supabase = createClient();
        const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${organizationId}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("org-sops")
          .upload(path, uploadFile, {
            contentType: uploadFile.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const result = await saveSopRecord({
          title: uploadTitle,
          description: uploadDescription,
          filePath: path,
          fileName: uploadFile.name,
          fileType: uploadFile.type || null,
          fileSize: uploadFile.size,
        });

        if (!result.ok) {
          await supabase.storage.from("org-sops").remove([path]);
          setError(result.error);
          return;
        }

        setTitle("");
        setDescription("");
        setFile(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleDownload(sopId: string) {
    setError(null);
    startTransition(async () => {
      const result = await getSopDownloadUrl(sopId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName;
      a.target = "_blank";
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
        setError(result.error);
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
      <p className="mt-1 text-sm text-zinc-500">
        Shared playbooks for <span className="font-medium">{orgName}</span> so
        everyone follows the same steps.
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
              <label className="text-sm text-zinc-700">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New client onboarding"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-700">Notes (optional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="When to use this process…"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-700">File</label>
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-zinc-600"
              />
              <p className="mt-1 text-xs text-zinc-400">Max 20MB</p>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
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
            No SOPs yet.
            {canManage ? " Upload the first process above." : ""}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sops.map((sop) => (
              <div
                key={sop.id}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {sop.title}
                    </p>
                    {sop.description && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {sop.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-400">
                      {sop.file_name} · {formatSize(sop.file_size)} ·{" "}
                      {new Date(sop.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDownload(sop.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Download
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(sop.id, sop.title)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}