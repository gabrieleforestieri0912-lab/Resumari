/* eslint-disable react-hooks/immutability */
import { motion } from "framer-motion";
import { Check, Star, Zap, Sparkles, Building2, Gem, LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

const getToken = (): string | null => {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
};

interface Plan {
  name: string;
  price: string;
  period?: string;
  icon: LucideIcon;
  color: string;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
  badge?: string;
  isFree: boolean;
  planType?: string;
}

export default function Pricing() {
  const router = useRouter();
  const addToast = useToast();
  const plans: Plan[] = [
    {
      name: "Starter",
      price: "0",
      icon: Sparkles,
      color: "gray",
      description: "Perfetto per provare la potenza di Resumari senza impegno.",
      features: [
        "10 Crediti omaggio",
        "Trascrizioni base",
        "Esporta in TXT",
        "Supporto Community",
      ],
      buttonText: "Inizia Gratis",
      popular: false,
      isFree: true,
    },
    {
      name: "Standard",
      price: "7.99",
      period: "/mese",
      icon: Gem,
      color: "purple",
      description:
        "Per chi usa Resumari con costanza e vuole più spazio per trascrizioni e chat.",
      features: [
        "1000 Crediti / mese",
        "Crediti per trascrizioni e chat AI",
        "Reset automatico ogni mese",
        "Esporta in TXT e JSON",
        "Supporto via email",
      ],
      buttonText: "Scegli Standard",
      popular: false,
      isFree: false,
      planType: "standard",
    },
    {
      name: "Pro Pack",
      price: "19.99",
      period: "/mese",
      icon: Zap,
      color: "purple",
      description:
        "Ideale per creatori e studenti che analizzano video quotidianamente.",
      features: [
        "2500 Crediti / mese",
        "Crediti per trascrizioni e chat AI",
        "Reset automatico ogni mese",
        "Formati avanzati (JSON, CSV, SRT)",
        "Accesso API Beta",
        "Supporto prioritario 24/7",
      ],
      buttonText: "Scegli Pro",
      popular: true,
      badge: "Più popolare",
      isFree: false,
      planType: "pro",
    },
    {
      name: "Business",
      price: "39.99",
      period: "/mese",
      icon: Building2,
      color: "purple",
      description:
        "Per team e aziende che necessitano di analisi massiva e supporto.",
      features: [
        "6000 Crediti / mese",
        "Crediti per trascrizioni e chat AI",
        "Reset automatico ogni mese",
        "Team Management",
        "Fatturazione aziendale",
        "Custom Workflow",
        "Account Manager dedicato",
      ],
      buttonText: "Scegli Business",
      popular: true,
      badge: "Best Value",
      isFree: false,
      planType: "business",
    },
  ];

  const handleCheckout = async (planType?: string) => {
    const token = getToken();

    if (!token) {
      addToast("Devi essere loggato per acquistare un piano.", "error");
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planType }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        const errorMessage =
          data.message || "Errore sconosciuto durante il checkout.";
        addToast(`Impossibile procedere al checkout: ${errorMessage}`, "error");
      }
    } catch (error) {
      addToast("Si è verificato un errore di rete. Riprova più tardi.", "error");
    }
  };

  const colorConfig: Record<string, string> = {
    gray: "from-gray-500/20 to-gray-600/5 text-gray-600 border-gray-200",
    purple: "from-purple-600/20 to-red-600/5 text-purple-600 border-purple-200",
    blue: "from-blue-600/20 to-cyan-600/5 text-blue-600 border-blue-200",
  };

  return (
    <section
      className="py-16 px-6 relative overflow-hidden bg-white dark:bg-zinc-950"
      id="pricing"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-black text-gray-900 dark:text-gray-100 mb-6 tracking-tight"
        >
          Scegli il tuo{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-red-600">
            successo
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium"
        >
          Investi nel tuo tempo. Piani flessibili progettati per adattarsi alla
          tua crescita.
        </motion.p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto items-center">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col p-6 rounded-2xl transition-all duration-500 h-full ${
                plan.popular
                  ? "bg-white dark:bg-zinc-900 border-2 border-purple-600 scale-105 z-10 py-8"
                  : "bg-gray-50/50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-xl"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-linear-to-r from-purple-600 to-red-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  {plan.popular && (
                    <Star
                      size={12}
                      fill="currentColor"
                    />
                  )}
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div
                  className={`w-10 h-10 rounded-2xl bg-linear-to-br ${colorConfig[plan.color]} flex items-center justify-center mb-4 shadow-sm`}
                >
                  <Icon size={20} strokeWidth={2.5} />
                </div>

                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">
                    {plan.price === "0" ? "Gratis" : `€${plan.price}`}
                  </span>
                  {plan.period && (
                    <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-gray-100 dark:bg-zinc-800 mb-6" />

              <ul className="space-y-3 mb-8 grow">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-[13px] font-semibold leading-tight"
                  >
                    <div
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${plan.popular ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400"}`}
                    >
                      <Check size={10} strokeWidth={4} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.isFree ? (
                <button className="group relative px-1 py-1 rounded-4xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all cursor-pointer w-full">
                  <span className="block px-7 py-2 bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-300 text-sm font-bold rounded-[1.8rem] transition-colors group-hover:bg-gray-50 dark:group-hover:bg-zinc-800">
                    {plan.buttonText}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.planType)}
                  className="group relative px-1 py-1 rounded-4xl bg-linear-to-r from-purple-600 to-red-600 hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/25 cursor-pointer w-full"
                >
                  <span className="block px-7 py-2 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white text-sm font-bold rounded-[1.8rem] transition-colors group-hover:bg-gray-50 dark:group-hover:bg-zinc-900">
                    {plan.buttonText}
                  </span>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          Hai bisogno di un piano personalizzato?{" "}
          <button className="text-purple-600 font-bold hover:underline">
            Parla con noi
          </button>
        </p>
      </div>
    </section>
  );
}
