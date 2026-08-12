import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { THEMES } from "@/lib/themes";
import { trpc } from "@/lib/trpc";
import type { ThemeId } from "@shared/invitationConfig";
import { ArrowRight, ShieldCheck, HelpCircle, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const NAV_LINKS = [
  { href: "#how-it-works", label: "Comment ça marche" },
  { href: "#themes", label: "Thèmes" },
  { href: "#faq", label: "FAQ" },
] as const;

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedThemeKey, setSelectedThemeKey] = useState<ThemeId>("blush");
  const [menuOuvert, setMenuOuvert] = useState(false);
  const currentTheme = THEMES[selectedThemeKey];

  const { data: stats } = trpc.invitations.stats.useQuery();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bgGradient} transition-all duration-700 font-sans text-stone-900`}>
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-stone-200/50">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Retour en haut de page"
            className="flex items-center gap-2 sm:gap-2.5 min-h-11 cursor-pointer shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <BrandMark size={26} decorative />
            </span>
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink-900">
              Dis oui
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            {NAV_LINKS.map(lien => (
              <a key={lien.href} href={lien.href} className="hover:text-brand-700 transition-colors">
                {lien.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setLocation("/editor")}
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-full h-11 px-4 sm:px-6 shadow-lg shadow-brand-600/25 transition-all sm:hover:scale-105">
              {/* Libellé court sous `sm` : l'intitulé complet écrasait le nom
                  du site sur un écran de 360 px. */}
              <span className="sm:hidden">Créer</span>
              <span className="hidden sm:inline">Créer une invitation</span>
            </Button>

            {/* La navigation était en `hidden md:flex` sans aucun équivalent
                mobile : les trois sections du site étaient inatteignables
                depuis un téléphone. */}
            <button
              type="button"
              onClick={() => setMenuOuvert(o => !o)}
              aria-expanded={menuOuvert}
              aria-controls="menu-mobile"
              aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
              className="md:hidden w-11 h-11 -mr-1 flex items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 transition-colors">
              {menuOuvert ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOuvert && (
          <nav
            id="menu-mobile"
            className="md:hidden border-t border-stone-200/60 bg-white/95 px-4 py-2">
            {NAV_LINKS.map(lien => (
              <a
                key={lien.href}
                href={lien.href}
                onClick={() => setMenuOuvert(false)}
                className="flex items-center min-h-12 px-2 text-sm font-medium text-stone-700 hover:text-brand-700 border-b border-stone-100 last:border-0">
                {lien.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 md:pt-24 md:pb-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 items-center">
        <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] sm:leading-[1.1] text-stone-900">
            {/* Le dégradé virait vers l'orange, absent de la charte ByTechnum. */}
            Transformez votre demande de rendez-vous en{" "}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              moment magique
            </span>.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-stone-600 max-w-2xl mx-auto lg:mx-0 font-normal">
            {/* Les accents inverses autour de .ics venaient du markdown et
                s'affichaient tels quels. */}
            Créez une invitation interactive inoubliable en moins de 2 minutes. Bouton fuyant taquin,
            choix de créneaux, menu sur-mesure, et réponse reçue directement par e-mail avec un
            fichier calendrier prêt à ouvrir.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <Button
              onClick={() => setLocation("/editor")}
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white text-base font-medium rounded-full min-h-13 px-8 shadow-xl shadow-brand-600/30 flex items-center justify-center gap-3 transition-all sm:hover:scale-105">
              Créer un rendez-vous <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex items-start gap-2 text-sm text-stone-500 text-left">
              {/* « 100 % sécurisé » ne veut rien dire et ne s'appuie sur
                  aucun audit ; on annonce ce qui est vérifiable dans le code.
                  `shrink-0` + `mt-0.5` : l'icône se retrouvait orpheline à
                  gauche du texte replié sur trois lignes. */}
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Gratuit • Sans inscription • Données supprimées à l'expiration</span>
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
                {/* Cette maquette prévisualise le thème d'invitation choisi,
                    pas l'habillage de l'application : le bouton doit donc
                    suivre `currentTheme`, et non la couleur de marque. */}
                <div className={`w-full py-3 rounded-xl ${currentTheme.buttonBg} font-semibold text-sm shadow-md`}>
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
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold shadow-inner">
                1
              </div>
              <h3 className="text-xl font-bold text-stone-900">Personnalisez</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Choisissez vos prénoms, le ton (doux, drôle, audacieux), les créneaux horaires, le menu gourmand et l'un de nos sept thèmes visuels exclusifs.
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
            Sept thèmes visuels et ambiances uniques
          </h2>
          <p className="text-stone-600 max-w-xl mx-auto">
            Chaque thème possède sa propre palette, ses animations de fond et son atmosphère. Cliquez pour tester en direct.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Le nom et la description reprennent les couleurs de texte du
              thème : en `text-stone-900` fixe, ils étaient illisibles sur les
              trois thèmes sombres (Minuit, Forêt, Néon). */}
          {Object.values(THEMES).map((theme) => {
            const isSelected = selectedThemeKey === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedThemeKey(theme.id)}
                className={`cursor-pointer rounded-2xl p-4 transition-all border text-center flex flex-col items-center justify-between gap-3 bg-gradient-to-br ${theme.bgGradient} ${
                  isSelected
                    ? "ring-4 ring-brand-600 shadow-xl scale-105"
                    : "hover:scale-102 border-stone-200/60 shadow-md"
                }`}
              >
                <span className="w-12 h-12 rounded-xl bg-white/80 shadow flex items-center justify-center text-xl">
                  {theme.emoji}
                </span>
                <span className={theme.textColor}>
                  <span className="block font-bold text-sm">{theme.name}</span>
                  <span className={`block text-[11px] line-clamp-2 mt-0.5 ${theme.mutedText}`}>
                    {theme.tagline}
                  </span>
                </span>
              </button>
            );
          })}
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
                <HelpCircle className="w-5 h-5 text-brand-600" /> Est-ce 100% gratuit ?
              </h3>
              <p className="text-sm text-stone-600">
                Oui, la création d'invitations et l'envoi de réponses par e-mail sont entièrement gratuits, sans publicité intrusive.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-600" /> Faut-il créer un compte ?
              </h3>
              <p className="text-sm text-stone-600">
                Aucun compte ni mot de passe n'est requis. Donnez simplement votre e-mail pour recevoir la réponse et repartez avec votre lien.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-600" /> Combien de temps le lien reste-t-il actif ?
              </h3>
              <p className="text-sm text-stone-600">
                Vous pouvez choisir une durée de vie de 7, 30 ou 90 jours lors de la création. Passé ce délai, l'invitation est automatiquement purgée (APDP).
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 space-y-2">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-600" /> Le destinataire saura-t-il que c'est un site ?
              </h3>
              <p className="text-sm text-stone-600">
                Les aperçus de partage affichent un titre neutre (« Quelqu'un t'a envoyé quelque chose ») pour préserver la surprise jusqu'à l'ouverture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-ink-950 text-stone-400 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <BrandMark size={24} decorative />
            </span>
            <span className="font-display text-white font-bold text-lg">Dis oui</span>
          </div>
          <div className="text-xs text-stone-500 text-center space-y-1">
            {/* Année calculée : « © 2026 » était figé dans le code. */}
            <p>© {new Date().getFullYear()} Dis oui — tous droits réservés.</p>
            <p className="text-stone-400">
              Un produit <span className="font-semibold text-white">ByTechnum</span> · La technologie à
              votre portée
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <button
              onClick={() => setLocation("/mentions-legales")}
              className="inline-flex items-center min-h-11 px-2 hover:text-white transition-colors">
              Mentions légales
            </button>
            <button
              onClick={() => setLocation("/confidentialite")}
              className="inline-flex items-center min-h-11 px-2 hover:text-white transition-colors">
              Confidentialité
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
