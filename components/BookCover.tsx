import type { Book } from "@/lib/types";

/**
 * Generated cover art (pure CSS, no external images), so covers never break.
 */
export function BookCover({ book, size = "md" }: { book: Book; size?: "sm" | "md" | "lg" }) {
  const text = {
    sm: { title: "text-[10px] leading-tight", author: "text-[8px]", pad: "p-2" },
    md: { title: "text-base leading-snug", author: "text-xs", pad: "p-4" },
    lg: { title: "text-2xl leading-tight", author: "text-sm", pad: "p-6" },
  }[size];
  return (
    <div
      role="img"
      aria-label={`Cover of ${book.title} by ${book.author}`}
      className={`relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-r-lg rounded-l-sm text-white shadow-[6px_8px_18px_-6px_rgba(16,24,40,0.45)] ${text.pad}`}
      style={{ background: `linear-gradient(145deg, ${book.coverFrom}, ${book.coverTo})` }}
    >
      {/* spine shading */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-2.5 bg-black/20" />
      <span aria-hidden className="absolute inset-y-0 left-2.5 w-px bg-white/20" />
      {/* decorative circles */}
      <span aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-black/10" />

      <span className={`relative pl-2 font-sans uppercase tracking-[0.2em] text-white/75 ${text.author}`}>{book.category}</span>
      <div className="relative pl-2">
        <p className={`font-serif font-semibold drop-shadow-sm ${text.title}`}>{book.title}</p>
        <div className="my-2 h-0.5 w-8 bg-white/60" />
        <p className={`font-medium text-white/85 ${text.author}`}>{book.author}</p>
      </div>
    </div>
  );
}
