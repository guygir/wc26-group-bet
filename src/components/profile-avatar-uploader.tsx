"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/ui";

export function ProfileAvatarUploader({
  url,
  name,
}: {
  url?: string | null;
  name?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const currentUrl = previewUrl || url;

  async function upload(file: File | undefined) {
    if (!file) return;

    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.set("avatar", file);

    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    URL.revokeObjectURL(objectUrl);

    if (response.ok) {
      router.refresh();
    } else {
      setPreviewUrl(null);
    }
  }

  return (
    <label
      className={cn(
        "relative block size-24 shrink-0 cursor-pointer overflow-hidden rounded-full bg-white/70 ring-2 ring-white shadow-sm",
        "hover:ring-emerald-300 focus-within:ring-emerald-400",
        uploading && "opacity-70"
      )}
      title="החלפת תמונת פרופיל"
      style={{ position: "relative", display: "block", width: "6rem", height: "6rem" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading}
        aria-label="החלפת תמונת פרופיל"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      {currentUrl ? (
        <Image src={currentUrl} alt={name || ""} fill className="object-cover" sizes="96px" style={{ objectFit: "cover" }} />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-3xl font-black text-slate-300" aria-hidden>
          +
        </span>
      )}
      <span
        className="pointer-events-none z-10 flex items-center justify-center px-1 text-center text-white"
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          left: 0,
          height: "20px",
          backgroundColor: "rgb(0 0 0 / 0.5)",
          fontSize: "0.65rem",
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {uploading ? "מעלה..." : "החלפה"}
      </span>
    </label>
  );
}
