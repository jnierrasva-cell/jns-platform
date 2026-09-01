import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#F6F5F1] px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <Link
          href="/"
          className="font-mono text-sm tracking-tight text-[#1B1D1F]"
        >
          JNSystem
        </Link>
        <div className="mt-8 rounded-lg border border-[#E1DFD6] bg-white p-8">
          <h1 className="text-lg font-medium text-[#1B1D1F]">
            Your account is awaiting approval
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6B7069]">
            Someone from JNSystem will review your account shortly. You'll be
            able to sign in once it's approved.
          </p>
        </div>
      </div>
    </div>
  );
}