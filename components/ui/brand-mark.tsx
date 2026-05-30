export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="h-3.5 w-3.5 text-white"
        aria-hidden="true"
      >
        <path
          d="M3 12V4l5 4-5 4zm5-4 5-4v8l-5-4z"
          fill="currentColor"
          opacity="0.95"
        />
      </svg>
    </span>
  );
}
