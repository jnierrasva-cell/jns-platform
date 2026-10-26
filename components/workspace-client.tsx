"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  prepareOrgLogoUpload,
  removeOrgLogo,
  saveOrgLogoUrl,
  updateWorkspaceName,
} from "@/app/dashboard/workspace/actions";
import { createClient } from "@/lib/supabase/client";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;

export function WorkspaceClient({
  initialName,
  orgKind,
  initialLogoUrl,
  welcome,
}: {
  organizationId: string;
  initialName: string;
  orgKind: "personal" | "business";
  initialLogoUrl: string | null;
  welcome: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Workspace name is required.");
      return;
    }

    startTransition(async () => {
      try {
        await updateWorkspaceName(trimmedName);
        setName(trimmedName);
        setNotice("Workspace name saved.");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not save workspace name.",
        );
      }
    });
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setNotice(null);
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size === 0 || file.size > MAX_LOGO_SIZE) {
      setError("Logo file must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    startTransition(async () => {
      try {
        const prepared = await prepareOrgLogoUpload(file.name);
        if (!prepared.ok) {
          setError(prepared.error ?? "Could not prepare logo upload.");
          return;
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("org-logos")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: file.type,
          });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const saved = await saveOrgLogoUrl(prepared.path);
        if (!saved.logoUrl) {
          throw new Error("Could not get the uploaded logo URL.");
        }
        setLogoUrl(saved.logoUrl);
        setNotice("Workspace logo updated.");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not upload workspace logo.",
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function handleRemoveLogo() {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        await removeOrgLogo();
        setLogoUrl(null);
        setNotice("Workspace logo removed.");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not remove workspace logo.",
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your workspace name and branding.
        </p>
        <p className="mt-1 text-xs font-medium capitalize text-zinc-400">
          {orgKind} workspace
        </p>
      </div>

      {welcome && (
        <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Your workspace is ready. Set its name and logo here.
        </p>
      )}

      <div className="mt-6 border-t border-zinc-100 pt-6">
        <form onSubmit={handleSaveName} className="max-w-xl">
          <label
            htmlFor="workspace-name"
            className="text-sm font-medium text-zinc-700"
          >
            Workspace name
          </label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              id="workspace-name"
              required
              maxLength={120}
              value={name}
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B132B] disabled:bg-zinc-50"
            />
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
            >
              Save name
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 border-t border-zinc-100 pt-6">
        <h2 className="text-sm font-medium text-zinc-700">Workspace logo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Use an image up to 5MB. It will appear in your workspace sidebar.
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          {logoUrl ? (
            <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-2">
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                width={160}
                height={72}
                unoptimized
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
              No logo uploaded
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="workspace-logo"
              className={`cursor-pointer rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 ${
                isPending ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {isPending
                ? "Please wait…"
                : logoUrl
                  ? "Replace logo"
                  : "Upload logo"}
            </label>
            <input
              ref={fileInputRef}
              id="workspace-logo"
              type="file"
              accept="image/*"
              disabled={isPending}
              onChange={handleLogoChange}
              className="sr-only"
            />
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={isPending}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
      </div>

      {(error || notice) && (
        <p
          className={`mt-5 text-sm ${error ? "text-red-600" : "text-emerald-700"}`}
          role={error ? "alert" : "status"}
        >
          {error ?? notice}
        </p>
      )}
    </section>
  );
}
