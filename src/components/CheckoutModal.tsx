"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Loader2 } from "lucide-react";

interface PlanInfo {
  name?: string;
  price?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: PlanInfo | null;
  clientSecret?: string | null;
}

export default function CheckoutModal({ isOpen, onClose, plan, clientSecret }: CheckoutModalProps) {
  const checkoutUrl = clientSecret;

  useEffect(() => {
    if (checkoutUrl && isOpen) {
      window.location.href = checkoutUrl;
    }
  }, [checkoutUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Reindirizzamento a Stripe
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                Piano: {plan?.name} - {plan?.price}€/mese
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 text-center py-12">
            <Loader2 className="w-10 h-10 mx-auto mb-4 text-purple-600 animate-spin" />
            <p className="text-gray-600 font-medium mb-2">
              Reindirizzamento a Stripe...
            </p>
            <p className="text-sm text-gray-400">
              Se non vieni reindirizzato automaticamente,{" "}
              <a href={checkoutUrl || "#"} className="text-purple-600 font-bold hover:underline">
                clicca qui
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
