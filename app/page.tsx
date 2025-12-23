import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2D3748] px-4">
      <div className="max-w-lg w-full text-center space-y-10">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-[#E8D5B7]">
            House Rent
          </h1>
          <p className="text-xl text-[#E8D5B7]/80 font-light">
            Find your perfect rental or list your property
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
          <Link
            href="/signup"
            className="px-6 py-2.5 bg-[#E8D5B7] text-[#2D3748] rounded-2xl hover:bg-[#D4C19F] transition-all font-medium text-base shadow-lg shadow-[#E8D5B7]/20 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 bg-[#E8D5B7]/20 text-[#E8D5B7] border border-[#E8D5B7] rounded-2xl hover:bg-[#E8D5B7]/30 transition-all font-medium text-base"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
