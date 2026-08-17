import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LINK_DURATIONS } from "@shared/invitationConfig";

/**
 * Politique de confidentialité.
 *
 * Le contenu décrit exactement ce que fait le code : les champs listés sont
 * ceux des tables `invitations`, `responses` et `rateLimits`, et les durées
 * celles réellement appliquées par la purge automatique. Toute évolution du
 * schéma doit être répercutée ici.
 */
export default function Confidentialite() {
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
          <span className="font-display font-bold text-ink-900">Confidentialité</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-stone-700">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-stone-900">Politique de confidentialité</h1>
          <p className="text-sm">
            Dis oui fonctionne sans compte et sans mot de passe. Cette page décrit précisément les
            données traitées, pourquoi, et combien de temps elles sont conservées.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Données collectées</h2>
          <ul className="text-sm space-y-2 list-disc pl-5">
            <li>
              <strong>Votre adresse e-mail</strong>, saisie à la création : elle sert uniquement à
              vous transmettre la réponse du destinataire. Elle n'est ni revendue, ni utilisée pour
              une newsletter.
            </li>
            <li>
              <strong>Le contenu de l'invitation</strong> : prénoms, question, créneaux, menus,
              thème et messages libres que vous rédigez.
            </li>
            <li>
              <strong>La réponse du destinataire</strong> : créneau et menu choisis, lieu proposé et
              petit mot éventuels.
            </li>
            <li>
              <strong>Un hachage de l'adresse IP</strong> du créateur. L'adresse elle-même n'est
              jamais enregistrée : seule une empreinte irréversible l'est, pour limiter le nombre
              d'invitations créées depuis une même connexion.
            </li>
          </ul>
          <p className="text-sm">
            Aucun cookie publicitaire, aucun traceur tiers, aucun outil de mesure d'audience n'est
            déposé sur ce site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Durée de conservation</h2>
          <p className="text-sm">
            À la création, vous choisissez une durée de validité de {LINK_DURATIONS.join(", ")}{" "}
            heures. À son échéance, l'invitation <strong>et la réponse associée</strong> sont
            supprimées automatiquement de la base, sans intervention de votre part. Une tâche
            s'exécute toutes les quinze minutes à cet effet.
          </p>
          <p className="text-sm">
            Les empreintes d'adresses IP utilisées pour la limitation de débit sont supprimées au
            bout de 24 heures.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Qui peut voir quoi</h2>
          <p className="text-sm">
            Le lien destinataire et le lien de suivi contiennent chacun un identifiant aléatoire non
            devinable. Toute personne disposant du lien de suivi peut consulter la réponse : ne le
            partagez pas. Le destinataire, lui, ne voit jamais votre adresse e-mail.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-stone-900">Vos droits</h2>
          <p className="text-sm">
            Vous pouvez demander la suppression immédiate d'une invitation avant son échéance, ainsi
            que l'accès aux données la concernant, en écrivant à l'adresse indiquée dans les{" "}
            <button
              onClick={() => setLocation("/mentions-legales")}
              className="text-brand-700 underline underline-offset-2">
              mentions légales
            </button>
            . Précisez le lien de suivi concerné pour que la demande puisse être traitée.
          </p>
        </section>
      </main>
    </div>
  );
}
