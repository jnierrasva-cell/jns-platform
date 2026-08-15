"use client";

import { useState } from "react";

type Workspace = {
  clientName: string;
  company: string;
  email: string;
};

type WorkspaceFormProps = {
  onCreate: (workspace: Workspace) => void;
};

export default function WorkspaceForm({
  onCreate,
}: WorkspaceFormProps) {
  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientName || !company || !email) return;

    onCreate({
      clientName,
      company,
      email,
    });

    setClientName("");
    setCompany("");
    setEmail("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      <h2 className="text-2xl font-semibold">
        Create Workspace
      </h2>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Client Name
          </label>

          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Company
          </label>

          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-5 py-3 text-white"
        >
          Save Workspace
        </button>
      </div>
    </form>
  );
}