import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

/**
 * Mentions légales.
 *
 * L'identité de l'éditeur y est obligatoire. Le bloc « hébergeur » reste à
 * ajouter une fois l'hébergement choisi.
 */
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

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Éditeur du site</h2>
          <ul className="text-sm space-y-2">
            <li>Nom / raison sociale : <strong>ByTechnum</strong></li>
            <li>
              Adresse : Porto-Novo, Bénin
            </li>
            <li>
              Adresse e-mail de contact :{" "}
              <a href="mailto:disoui@bytechnum.com" className="text-brand-700 underline underline-offset-2">
                disoui@bytechnum.com
              </a>
            </li>
            <li>
              Téléphone :{" "}
              <a href="tel:+2290150617300" className="text-brand-700 underline underline-offset-2">
                +229 01 50 61 73 00
              </a>
            </li>
            <li>Directeur de la publication : <strong>Elisée Magloire ATONDE</strong></li>
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
