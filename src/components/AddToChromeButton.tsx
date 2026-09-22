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
      ? "text-base"
      : "text-base";

  return (
    <a
      href={EXTENSION_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Aggiungi l'estensione Resumari a Chrome"
      className={`group flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-black text-base bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-zinc-700 hover:border-gray-900 dark:hover:border-white transition-all transform hover:-translate-y-1 hover:shadow-2xl active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none ${sizes} ${className}`}
    >
      <ChromeIcon
        size={variant === "hero" ? 20 : 22}
        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
      />
      Aggiungi a Chrome
    </a>
  );
}
