interface AddToChromeButtonProps {
  variant?: "hero" | "section";
  className?: string;
}

/**
 * CTA "Aggiungi a Chrome" disattivato ovunque finché l'estensione non è
 * pubblicata sul Chrome Web Store. Restituisce null in tutte le pagine che
 * lo importano (Hero, Pricing, Features, …).
 * Per riattivarlo: ripristinare il markup con ChromeIcon + EXTENSION_URL.
 */
export default function AddToChromeButton(_props: AddToChromeButtonProps) {
  return null;
}
