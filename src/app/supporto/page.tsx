'use client'

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Mail, MessageCircle, Clock, Zap, CheckCircle } from 'lucide-react';

const Navbar = dynamic(() => import('../../components/Navbar'), { ssr: false });
const Footer = dynamic(() => import('../../components/Footer'), { ssr: false });

export default function Supporto() {
  useEffect(() => {
    document.title = "Supporto | Resumari";
  }, []);

  const contatti = [
    {
      icon: Mail,
      title: 'Email',
      description: 'Scrivici a',
      link: 'mailto:support@resumari.it',
      action: 'support@resumari.it',
    },
    {
      icon: MessageCircle,
      title: 'Community',
      description: 'Unisciti alla nostra',
      link: 'https://discord.gg/resumari',
      action: 'Discord community',
    },
    {
      icon: Clock,
      title: 'Orari',
      description: 'Rispondiamo',
      action: 'Lun-Ven 9:00-18:00',
    },
  ];

  const faq = [
    {
      q: 'Come resetto la mia password?',
      a: 'Puoi resetare la password dalla pagina di login cliccando su "Password dimenticata". Riceverai un link via email per impostare una nuova password.',
    },
    {
      q: 'Come funzionano i crediti?',
      a: 'Ogni trascrizione costa un credito. I crediti vengono scalati automaticamente dal tuo saldo quando avvii una nuova trascrizione.',
    },
    {
      q: 'Posso ottenere un rimborso?',
      a: 'Sì, contattaci entro 14 giorni dall\'acquisto. Ogni caso viene valutato individualmente.',
    },
    {
      q: 'Come contatto il supporto?',
      a: 'Puoi scriverci direttamente a support@resumari.it o unirti alla nostra Discord community.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-red-500 text-white mb-6">
            <Zap size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Centro{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
              Supporto
            </span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Hai bisogno di aiuto? Siamo qui per te. Trova le risposte che cerchi o contattaci direttamente.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {contatti.map((item, i) => (
            <a
              key={i}
              href={item.link || '#'}
              target={item.link?.startsWith('http') ? '_blank' : undefined}
              rel={item.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-xl hover:shadow-purple-500/10 transition-all"
            >
              <item.icon
                size={24}
                className="text-purple-600 mb-4 group-hover:scale-110 transition-transform"
              />
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">{item.description}</p>
              <p className="text-sm font-semibold text-purple-600 group-hover:text-purple-700">
                {item.action}
              </p>
            </a>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-zinc-900 rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-black mb-8">Domande Frequenti</h2>
          <div className="space-y-6">
            {faq.map((item, i) => (
              <div key={i} className="bg-white dark:bg-zinc-950 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-purple-500" />
                  {item.q}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
