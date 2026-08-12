import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

/**
 * Mentions légales.
 *
 * Les informations d'identité de l'éditeur et de l'hébergeur sont obligatoires
 * (article 6-III de la LCEN) et ne peuvent pas être devinées : elles sont
 * laissées en champs à compléter, signalés visuellement pour ne pas être
 * oubliés à la mise en ligne.
 */

const A_COMPLETER = "[à compléter]";

function AChamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-xs">
      {children}
    </span>
  );
}

export default function MentionsLegales() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
            <BrandMark size={21} decorative />
          </span>
          <span className="font-display font-bold text-ink-900">Mentions légales</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-stone-700">
        <h1 className="text-3xl font-extrabold text-stone-900">Mentions légales</h1>

        <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            Les champs surlignés restent à renseigner avant toute mise en ligne publique : ces
            informations sont légalement obligatoires et ne peuvent être fournies que par l'éditeur.
            Le bloc « hébergeur » ne pourra l'être qu'une fois l'hébergement choisi.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Éditeur du site</h2>
          <ul className="text-sm space-y-2">
            <li>Nom / raison sociale : <strong>ByTechnum</strong></li>
            <li>Statut juridique : <AChamp>{A_COMPLETER}</AChamp></li>
            <li>
              Adresse : Porto-Novo, Bénin — <AChamp>adresse postale complète {A_COMPLETER}</AChamp>
            </li>
            <li>
              Adresse e-mail de contact :{" "}
              <a href="mailto:elisee.atonde@bytechnum.com" className="text-brand-700 underline underline-offset-2">
                elisee.atonde@bytechnum.com
              </a>
            </li>
            <li>
              Téléphone :{" "}
              <a href="tel:+2290150617300" className="text-brand-700 underline underline-offset-2">
                +229 01 50 61 73 00
              </a>
            </li>
            <li>Directeur de la publication : <strong>Elisée Magloire ATONDE</strong></li>
            <li>Identifiants RCCM / IFU : <AChamp>{A_COMPLETER}</AChamp></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Hébergeur</h2>
          <ul className="text-sm space-y-2">
            <li>Nom : <AChamp>{A_COMPLETER}</AChamp></li>
            <li>Adresse : <AChamp>{A_COMPLETER}</AChamp></li>
            <li>Téléphone : <AChamp>{A_COMPLETER}</AChamp></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Données personnelles</h2>
          <p className="text-sm">
            Le détail des données traitées et de leur durée de conservation figure sur la page{" "}
            <button
              onClick={() => setLocation("/confidentialite")}
              className="text-brand-700 underline underline-offset-2">
              confidentialité
            </button>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Responsabilité</h2>
          <p className="text-sm">
            Les invitations sont rédigées par leurs auteurs. L'éditeur du site n'en contrôle pas le
            contenu a priori, mais retire tout contenu manifestement illicite qui lui est signalé à
            l'adresse de contact ci-dessus.
          </p>
        </section>
      </main>
    </div>
  );
}
