import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { THEMES } from "@/lib/themes";
import { trpc } from "@/lib/trpc";
import type { ThemeId } from "@shared/invitationConfig";
import { Heart, Sparkles, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedThemeKey, setSelectedThemeKey] = useState<ThemeId>("blush");
  const currentTheme = THEMES[selectedThemeKey];

  const { data: stats } = trpc.invitations.stats.useQuery();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bgGradient} transition-all duration-700 font-sans text-stone-900`}>
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-stone-200/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
            <Heart className="w-5 h-5 fill-current animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
            Dis oui
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
          <a href="#how-it-works" className="hover:text-rose-600 transition-colors">Comment ça marche</a>
          <a href="#themes" className="hover:text-rose-600 transition-colors">Thèmes</a>
          <a href="#faq" className="hover:text-rose-600 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setLocation("/editor")}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-6 py-2.5 shadow-lg shadow-rose-600/25 transition-all hover:scale-105">
            Créer une invitation
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-24 md:pt-24 md:pb-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-semibold tracking-wide uppercase">
            {/* « animée 3D » retiré : il n'y a aucune 3D dans le projet. */}
            <Sparkles className="w-3.5 h-3.5" /> Expérience interactive & animée
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-stone-900">
            Transformez votre demande de rendez-vous en <span className="bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">moment magique</span>.
          </h1>
          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto lg:mx-0 font-normal">
            Créez une invitation interactive inoubliable en moins de 2 minutes. Bouton fuyant taquin, choix de créneaux, menu sur-mesure, et réponse reçue directement par e-mail avec un fichier calendrier `.ics`.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <Button 
              onClick={() => setLocation("/editor")}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-base font-medium rounded-full px-8 py-4 shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 transition-all hover:scale-105">
              Créer un rendez-vous <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              {/* « 100 % sécurisé » ne veut rien dire et ne s'appuie sur
                  aucun audit ; on annonce ce qui est vérifiable dans le code. */}
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Gratuit • Sans inscription • Données supprimées à
              l'expiration
            </div>
          </div>
          
          {/* Chiffres réels, issus de la base. Les valeurs affichées ici
              étaient inventées : « 2 600+ » en repli d'un compteur serveur qui
              en annonçait 1 428, un taux de 92 % et un poids de page jamais
              mesurés. */}
          <div className="pt-8 grid grid-cols-3 gap-6 border-t border-stone-200/60 text-center lg:text-left">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-stone-900">
                {stats ? stats.totalCreated.toLocaleString("fr-FR") : "—"}
              </p>
              <p className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">Invitations créées</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-stone-900">
                {stats && stats.totalCreated > 0
                  ? `${Math.round((stats.totalResponses / stats.totalCreated) * 100)} %`
                  : "—"}
              </p>
              <p className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">Taux de réponse</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-stone-900">
                {Object.keys(THEMES).length}
              </p>
              <p className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">Thèmes animés</p>
            </div>
          </div>
        </div>

        {/* Live Miniature Preview in Hero */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-sm aspect-[9/16] rounded-[40px] bg-stone-900 p-3 shadow-2xl shadow-stone-900/40 border-4 border-stone-800">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-4 bg-stone-800 rounded-full z-20"></div>
            <div className={`w-full h-full rounded-[32px] overflow-hidden bg-gradient-to-br ${currentTheme.bgGradient} flex flex-col items-center justify-between p-6 text-center relative`}>
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              <div className="z-10 pt-6">
                <span className="inline-block px-3 py-1 rounded-full bg-white/60 backdrop-blur text-xs font-semibold text-stone-700">
                  Thème : {currentTheme.name}
                </span>
              </div>

              <div className="z-10 space-y-4 my-auto">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-xl flex items-center justify-center text-3xl animate-bounce">
                  💌
                </div>
                <h3 className="text-xl font-bold text-stone-900">
                  Julie, tu veux sortir avec moi ?
                </h3>
                <p className="text-xs text-stone-600">
                  Une invitation exclusive de Thomas
                </p>
              </div>

              <div className="z-10 w-full space-y-2 pb-4">
                <div className="w-full py-3 rounded-xl bg-rose-600 text-white font-semibold text-sm shadow-md">
                  Oui, avec joie ! ✨
                </div>
                <div className="w-full py-2 rounded-xl bg-white/80 text-stone-700 font-medium text-xs">
                  Non (impossible)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 bg-white/60 backdrop-blur border-y border-stone-200/50">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              Comment ça fonctionne ?
            </h2>
            <p className="text-stone-600 max-w-xl mx-auto">
              Trois étapes simples pour transformer une simple invitation en un souvenir mémorable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center text-center space-y-4 relative group hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl font-bold shadow-inner">
                1
              </div>
              <h3 className="text-xl font-bold text-stone-900">Personnalisez</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Choisissez vos prénoms, le ton (doux, drôle, audacieux), les créneaux horaires, le menu gourmand et l'un de nos 6 thèmes visuels exclusifs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center text-center space-y-4 relative group hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold shadow-inner">
                2
              </div>
              <h3 className="text-xl font-bold text-stone-900">Envoyez le lien</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Récupérez votre lien unique et partagez-le par WhatsApp, SMS ou Instagram. Le destinataire découvre une enveloppe magique animée.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center text-center space-y-4 relative group hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold shadow-inner">
                3
              </div>
              <h3 className="text-xl font-bold text-stone-900">Recevez la réponse</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Dès que le destinataire répond, vous recevez un e-mail détaillé avec ses choix et un fichier calendrier `.ics` prêt à l'emploi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Themes Gallery */}
      <section id="themes" className="px-6 py-20 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            6 thèmes visuels et ambiances uniques
          </h2>
          <p className="text-stone-600 max-w-xl mx-auto">
            Chaque thème possède sa propre palette, ses animations de fond et son atmosphère. Cliquez pour tester en direct.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.values(THEMES).map((theme) => (
            <div
              key={theme.id}
              onClick={() => setSelectedThemeKey(theme.id)}
              className={`cursor-pointer rounded-2xl p-4 transition-all border text-center flex flex-col items-center justify-between gap-3 bg-gradient-to-br ${theme.bgGradient} ${
                selectedThemeKey === theme.id ? "ring-4 ring-rose-500 shadow-xl scale-105" : "hover:scale-102 border-stone-200/60 shadow-md"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/80 shadow flex items-center justify-center text-xl">
                {theme.id === 'blush' ? '🌸' : theme.id === 'midnight' ? '🌙' : theme.id === 'citrus' ? '🍊' : theme.id === 'forest' ? '🌲' : theme.id === 'sepia' ? '📜' : '⚡'}
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">{theme.name}</h4>
                <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{theme.tagline}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-20 bg-white/60 backdrop-blur border-t border-stone-200/50">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              Foire Aux Questions
            </h2>
            <p className="text-stone-600">
              Tout ce que vous devez savoir sur Dis oui.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-500" /> Est-ce 100% gratuit ?
              </h3>
              <p className="text-sm text-stone-600">
                Oui, la création d'invitations et l'envoi de réponses par e-mail sont entièrement gratuits, sans publicité intrusive.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-500" /> Faut-il créer un compte ?
              </h3>
              <p className="text-sm text-stone-600">
                Aucun compte ni mot de passe n'est requis. Donnez simplement votre e-mail pour recevoir la réponse et repartez avec votre lien.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-500" /> Combien de temps le lien reste-t-il actif ?
              </h3>
              <p className="text-sm text-stone-600">
                Vous pouvez choisir une durée de vie de 7, 30 ou 90 jours lors de la création. Passé ce délai, l'invitation est automatiquement purgée (RGPD).
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-500" /> Le destinataire saura-t-il que c'est un site ?
              </h3>
              <p className="text-sm text-stone-600">
                Les aperçus de partage affichent un titre neutre (« Quelqu'un t'a envoyé quelque chose 👀 ») pour préserver la surprise jusqu'à l'ouverture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-stone-900 text-stone-400 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white font-bold">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <span className="text-white font-bold text-lg">Dis oui</span>
          </div>
          <p className="text-xs text-stone-500">
            © 2026 Dis oui. Conçu avec amour et élégance. Tous droits réservés. Respect strict du RGPD.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <button
              onClick={() => setLocation("/mentions-legales")}
              className="hover:text-white transition-colors">
              Mentions légales
            </button>
            <button
              onClick={() => setLocation("/confidentialite")}
              className="hover:text-white transition-colors">
              Confidentialité
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
