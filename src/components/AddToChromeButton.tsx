import ChromeIcon from "./ChromeIcon";

const FALLBACK_URL = "https://chrome.google.com/webstore";
// Set NEXT_PUBLIC_CHROME_EXTENSION_URL to the live Chrome Web Store listing once
// the extension is published; until then it falls back to the store home.
const EXTENSION_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || FALLBACK_URL;

interface AddToChromeButtonProps {
  variant?: "hero" | "section";
  className?: string;
}

export default function AddToChromeButton({
  variant = "hero",
  className = "",
}: AddToChromeButtonProps) {
  const sizes =
    variant === "hero"
      ? "px-6 py-3 text-base"
      : "px-8 py-4 text-base";

  return (
    <a
      href={EXTENSION_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Aggiungi l'estensione Resumari a Chrome"
      className={`group inline-flex items-center justify-center gap-2.5 font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full border border-white/15 hover:border-white/30 shadow-sm hover:shadow-lg hover:shadow-black/20 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 ${sizes} ${className}`}
    >
      <ChromeIcon
        size={variant === "hero" ? 20 : 22}
        className="text-white shrink-0 transition-transform duration-200 group-hover:scale-110"
      />
      Aggiungi a Chrome
    </a>
  );
}
