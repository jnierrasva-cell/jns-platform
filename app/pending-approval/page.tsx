import { BrandMark } from "@/components/brand-mark";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#0B132B] px-6 py-16">
      <div className="w-full max-w-[380px]">
        <BrandMark />
        <div className="jns-card mt-8 p-6">
          <h1 className="text-lg font-semibold text-white">
            This account is unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            Your account cannot access a JNS workspace. Contact JNS if you think
            this is a mistake.
          </p>
        </div>
      </div>
    </div>
  );
}
