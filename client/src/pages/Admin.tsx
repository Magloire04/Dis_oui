import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/BrandMark";
import { SerieTemporelle } from "@/components/charts/SerieTemporelle";
import { BarresHorizontales } from "@/components/charts/BarresHorizontales";
import { THEMES, resolveTheme } from "@/lib/themes";
import { libelleDuree } from "@shared/invitationConfig";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Gauge,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type Onglet = "usage" | "sante" | "performances" | "moderation";

const ONGLETS: Array<{ id: Onglet; label: string; icone: typeof BarChart3 }> = [
  { id: "usage", label: "Usage", icone: BarChart3 },
  { id: "sante", label: "Santé", icone: Activity },
  { id: "performances", label: "Perf.", icone: Gauge },
  { id: "moderation", label: "Modération", icone: ShieldAlert },
];

const pourcent = (n: number) => `${Math.round(n * 100)} %`;
const dateCourte = (d: Date | string) => format(new Date(d), "d MMM yyyy", { locale: fr });
const dateHeure = (d: Date | string) => format(new Date(d), "d MMM 'à' HH'h'mm", { locale: fr });

/** Chiffre de tête. Un seul par carte : c'est ce qui se lit d'un coup d'œil. */
function Tuile({ valeur, libelle, precision }: { valeur: string; libelle: string; precision?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-2xl sm:text-3xl font-extrabold text-ink-900 tabular-nums">{valeur}</p>
      <p className="text-xs text-stone-500 uppercase tracking-wider mt-1">{libelle}</p>
      {precision && <p className="text-xs text-stone-400 mt-1">{precision}</p>}
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4">
      <h2 className="font-display font-bold text-ink-900">{titre}</h2>
      {children}
    </section>
  );
}

function Pastille({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  // Jamais la couleur seule : chaque état porte son icône et son libellé.
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
      }`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

// --- Connexion ---------------------------------------------------------------

function Connexion({ onSucces }: { onSucces: () => void }) {
  const [, setLocation] = useLocation();
  const [motDePasse, setMotDePasse] = useState("");

  const connexion = trpc.admin.connexion.useMutation({
    onSuccess: () => onSucces(),
    onError: err => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <form
        onSubmit={e => {
          e.preventDefault();
          connexion.mutate({ password: motDePasse });
        }}
        className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
            <BrandMark size={30} decorative />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">Console d'exploitation</h1>
            <p className="text-sm text-stone-500 mt-1">Réservée à l'éditeur du site.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="mot-de-passe" className="text-xs font-semibold text-stone-700">
            Mot de passe
          </label>
          <Input
            id="mot-de-passe"
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            className="rounded-xl"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={connexion.isPending || motDePasse.length === 0}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold">
          {connexion.isPending ? "Vérification…" : "Se connecter"}
        </Button>

        <button
          type="button"
          onClick={() => setLocation("/")}
          className="w-full text-xs text-stone-500 hover:text-stone-800 min-h-11">
          Retour au site
        </button>
      </form>
    </div>
  );
}

// --- Onglets -----------------------------------------------------------------

function OngletUsage() {
  const { data, isLoading } = trpc.admin.usage.useQuery();
  if (isLoading || !data) return <p className="text-sm text-stone-500">Chargement…</p>;

  const { resume, serie, themes, reponses, durees } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tuile valeur={resume.invitationsTotal.toLocaleString("fr-FR")} libelle="Invitations" precision={`${resume.invitations7j} sur 7 jours`} />
        <Tuile valeur={resume.reponsesTotal.toLocaleString("fr-FR")} libelle="Réponses" />
        <Tuile valeur={pourcent(resume.tauxOuverture)} libelle="Taux d'ouverture" precision={`${resume.invitationsOuvertes} ouvertes`} />
        <Tuile valeur={pourcent(resume.tauxReponse)} libelle="Taux de réponse" />
      </div>

      <Section titre="Activité sur 30 jours">
        <SerieTemporelle donnees={serie} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section titre="Thèmes choisis">
          <BarresHorizontales
            donnees={themes.map(t => ({
              cle: t.theme,
              libelle: THEMES[t.theme]?.name ?? t.theme,
              valeur: t.total,
            }))}
          />
        </Section>

        <Section titre="Comportement des destinataires">
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-stone-600">Délai médian avant réponse</dt>
              <dd className="font-semibold text-ink-900 tabular-nums">
                {reponses.delaiMedianHeures === null ? "—" : `${reponses.delaiMedianHeures} h`}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-stone-600">Refus moyen avant le oui</dt>
              <dd className="font-semibold text-ink-900 tabular-nums">{reponses.refusMoyen ?? "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-stone-600">Record de refus</dt>
              <dd className="font-semibold text-ink-900 tabular-nums">{reponses.refusMax ?? "—"}</dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Durées de validité
            </p>
            <BarresHorizontales
              donnees={durees.map(d => ({ cle: String(d.heures), libelle: libelleDuree(d.heures), valeur: d.total }))}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function OngletSante() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.sante.useQuery();
  const purge = trpc.admin.lancerPurge.useMutation({
    onSuccess: r => {
      toast.success(
        `Purge effectuée : ${r.invitationsSupprimees} invitation(s), ${r.compteursSupprimes} compteur(s).`
      );
      void utils.admin.sante.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading || !data) return <p className="text-sm text-stone-500">Chargement…</p>;

  const total = (kind: string, outcome: string) =>
    data.evenements7j.find(e => e.kind === kind && e.outcome === outcome)?.total ?? 0;

  return (
    <div className="space-y-4">
      <Section titre="État des services">
        <div className="flex flex-wrap gap-2">
          <Pastille ok={data.base.ok}>
            Base de données{data.base.latenceMs !== null ? ` · ${data.base.latenceMs} ms` : ""}
          </Pastille>
          <Pastille ok={data.envoiReel}>
            {data.envoiReel
              ? `Envoi d'e-mails actif (${data.courriel.transport})`
              : data.courriel.transport === "console"
                ? "E-mails simulés (aucun transport configuré)"
                : `Transport ${data.courriel.transport} injoignable`}
          </Pastille>
          <Pastille ok={Boolean(data.dernierePurge)}>
            {data.dernierePurge ? `Purge : ${dateHeure(data.dernierePurge.createdAt)}` : "Purge jamais exécutée"}
          </Pastille>
        </div>
      </Section>

      <Section titre="Événements des 7 derniers jours">
        <BarresHorizontales
          donnees={[
            { cle: "email-ok", libelle: "E-mails envoyés", valeur: total("email", "ok") },
            { cle: "email-ko", libelle: "E-mails en échec", valeur: total("email", "error") },
            { cle: "rate", libelle: "Créations bloquées (débit)", valeur: total("rate_limit", "blocked") },
            { cle: "mod", libelle: "Rejets de modération", valeur: total("moderation", "blocked") },
            { cle: "purge", libelle: "Passages de purge", valeur: total("purge", "ok") },
          ]}
        />
      </Section>

      {data.echecsEmail.length > 0 && (
        <Section titre="Derniers échecs d'envoi">
          <ul className="space-y-2 text-sm">
            {data.echecsEmail.map(e => (
              <li key={e.id} className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2 last:border-0">
                <span className="text-stone-600">{dateHeure(e.createdAt)}</span>
                <span className="text-amber-800 font-medium">échec</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section titre="Purge des données expirées">
        <p className="text-sm text-stone-600">
          Elle s'exécute automatiquement toutes les heures. Ce bouton force un passage immédiat.
        </p>
        <Button
          onClick={() => purge.mutate()}
          disabled={purge.isPending}
          variant="outline"
          className="rounded-xl gap-2">
          <RefreshCw className={`w-4 h-4 ${purge.isPending ? "animate-spin" : ""}`} />
          {purge.isPending ? "Purge en cours…" : "Lancer une purge maintenant"}
        </Button>
      </Section>
    </div>
  );
}

function OngletPerformances() {
  const { data, isLoading } = trpc.admin.performances.useQuery();
  if (isLoading || !data) return <p className="text-sm text-stone-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tuile valeur={data.appelsTotal.toLocaleString("fr-FR")} libelle="Appels mesurés" />
        <Tuile valeur={String(data.erreursTotal)} libelle="Erreurs" />
        <Tuile valeur={dateCourte(data.depuis)} libelle="Depuis le démarrage" precision={dateHeure(data.depuis)} />
      </div>

      <Section titre="Temps de réponse par procédure">
        <p className="text-xs text-stone-500">
          Mesures conservées en mémoire, sur les 500 derniers appels de chaque procédure. Elles
          repartent de zéro à chaque redémarrage du serveur.
        </p>

        {data.procedures.length === 0 ? (
          <p className="text-sm text-stone-500">Aucun appel mesuré pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <th className="py-2 pl-4 sm:pl-0 font-semibold">Procédure</th>
                  <th className="py-2 px-2 font-semibold text-right">Appels</th>
                  <th className="py-2 px-2 font-semibold text-right">Médiane</th>
                  <th className="py-2 px-2 font-semibold text-right">p95</th>
                  <th className="py-2 pr-4 sm:pr-0 font-semibold text-right">Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {data.procedures.map(p => (
                  <tr key={p.procedure} className="border-b border-stone-100 last:border-0">
                    <td className="py-2 pl-4 sm:pl-0 font-mono text-xs text-ink-900">{p.procedure}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{p.appels}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{p.medianeMs} ms</td>
                    <td className="py-2 px-2 text-right tabular-nums font-semibold">{p.p95Ms} ms</td>
                    <td className="py-2 pr-4 sm:pr-0 text-right tabular-nums">
                      {p.erreurs > 0 ? (
                        <span className="text-amber-800 font-semibold">{p.erreurs}</span>
                      ) : (
                        <span className="text-stone-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function OngletModeration() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.moderation.useQuery();
  const supprimer = trpc.admin.supprimerInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation supprimée.");
      void utils.admin.moderation.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading || !data) return <p className="text-sm text-stone-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <Section titre="Rejets du filtre de contenu">
        {data.rejets.length === 0 ? (
          <p className="text-sm text-stone-500">Aucun rejet enregistré.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.rejets.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2 last:border-0">
                <span className="font-mono text-xs text-ink-900">
                  {(r.detail as { terme?: string } | null)?.terme ?? "—"}
                </span>
                <span className="text-stone-500 text-xs">{dateHeure(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section titre="Dernières invitations">
        <p className="text-xs text-stone-500">
          Ni e-mail, ni prénoms, ni contenu : cette liste sert à retirer une invitation signalée,
          pas à lire les messages des utilisateurs.
        </p>

        {data.invitations.length === 0 ? (
          <p className="text-sm text-stone-500">Aucune invitation.</p>
        ) : (
          <ul className="space-y-2">
            {data.invitations.map(inv => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-stone-100 pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ink-900">{inv.slug}</p>
                  <p className="text-xs text-stone-500">
                    {dateCourte(inv.creeLe)} · {resolveTheme(inv.themeKey).name}
                    {inv.ouverteLe ? " · ouverte" : " · non ouverte"}
                    {inv.aRepondu ? " · répondue" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Supprimer définitivement l'invitation ${inv.slug} et sa réponse ?`)) {
                      supprimer.mutate({ slug: inv.slug });
                    }
                  }}
                  className="text-stone-500 hover:text-red-600 gap-1.5 shrink-0">
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// --- Page --------------------------------------------------------------------

export default function Admin() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [onglet, setOnglet] = useState<Onglet>("usage");

  const { data: session, isLoading } = trpc.admin.session.useQuery();
  const deconnexion = trpc.admin.deconnexion.useMutation({
    onSuccess: () => void utils.admin.session.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session?.configuree) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center gap-4">
        <ShieldAlert className="w-10 h-10 text-stone-400" />
        <h1 className="font-display text-xl font-bold text-ink-900">Console non configurée</h1>
        <p className="text-sm text-stone-600 max-w-sm">
          Aucun mot de passe d'administration n'est défini sur ce serveur. Renseignez
          <code className="mx-1 px-1.5 py-0.5 bg-stone-200 rounded text-xs">ADMIN_PASSWORD</code>
          dans le fichier <code className="px-1.5 py-0.5 bg-stone-200 rounded text-xs">.env</code>,
          puis redémarrez.
        </p>
        <Button variant="outline" onClick={() => setLocation("/")} className="rounded-xl">
          Retour au site
        </Button>
      </div>
    );
  }

  if (!session.authentifie) {
    return <Connexion onSucces={() => void utils.admin.session.invalidate()} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5 text-stone-700" />
            </Button>
            <span className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <BrandMark size={21} decorative />
            </span>
            <span className="font-display font-bold text-ink-900 truncate">Console</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => deconnexion.mutate()}
            className="text-stone-500 hover:text-ink-900 gap-1.5 shrink-0">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>

        {/* Onglets défilables : quatre libellés ne tiennent pas côte à côte
            sous 360 px. */}
        <nav className="flex gap-1 px-2 sm:px-6 overflow-x-auto border-t border-stone-100">
          {ONGLETS.map(o => {
            const Icone = o.icone;
            const actif = onglet === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setOnglet(o.id)}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 min-h-11 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  actif
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}>
                <Icone className="w-4 h-4" />
                {o.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {onglet === "usage" && <OngletUsage />}
        {onglet === "sante" && <OngletSante />}
        {onglet === "performances" && <OngletPerformances />}
        {onglet === "moderation" && <OngletModeration />}
      </main>
    </div>
  );
}
