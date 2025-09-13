"use client";

import FilmTimeline from "@/components/FilmTimeline";
import Link from "next/link";

export default function TimelinePage() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm">
          ← Back to Home
        </Link>
      </div>
      <FilmTimeline projectId="project-1" apiBase="/api" />
    </div>
  );
}
