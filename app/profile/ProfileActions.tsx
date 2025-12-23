"use client";

import { useRouter } from 'next/navigation';

export default function ProfileActions() {
  const router = useRouter();

  return (
    <div className="flex space-x-4">
      <button
        className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
        onClick={() => router.push('/homes/new')}
      >
        List House
      </button>
      <button
        className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600"
        onClick={() => router.push('/homes')}
      >
        Rent/Buy House
      </button>
    </div>
  );
}