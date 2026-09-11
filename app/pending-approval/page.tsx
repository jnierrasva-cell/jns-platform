import Link from "next/link";
import Image from "next/image";

export default function PendingApprovalPage() {
  return (
    <div className="relative flex min-h-full items-center justify-center bg-[#0B132B] px-6 py-16">
      {/* Soft ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[40%] h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563EB]/12 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[380px] text-center">
        <Link href="/" className="inline-block">
          <Image
            src="/jns-logo.png"
            alt="JNS Platform"
            width={160}
            height={60}
            className="mx-auto h-12 w-auto"
            priority
          />
        </Link>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <h1 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-white">
            This account is unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            Your account cannot access a JNS workspace. Please contact JNS if
            you think this is a mistake.
          </p>
        </div>

        <p className="mt-6 text-xs text-[#64748B]">
          Secure access to your business systems
        </p>
      </div>
    </div>
  );
}
