import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { THEMES, MENU_OPTIONS_PRESETS, TONE_PRESETS } from "@/lib/themes";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_SLOT_DURATION_MIN,
  invitationConfigSchema,
  LINK_DURATIONS,
  MAX_DATE_SLOTS,
  MAX_MENU_LABEL,
  MAX_MENU_OPTIONS,
  type DateSlot,
  type MotionIntensity,
  type NoButtonBehavior,
  type Relation,
  type ThemeId,
  type Tone,
} from "@shared/invitationConfig";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QrCode as QrCodeSvg } from "@/components/QrCode";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Copy,
  Flame,
  Flower,
  Heart,
  HelpCircle,
  Laugh,
  Lock,
  MapPin,
  Palette,
  Rabbit,
  RotateCcw,
  Send,
  Shrink,
  Shuffle,
  Smile,
  Sparkle,
  Sparkles,
  Users,
  Utensils,
  UtensilsCrossed,
  Wand2,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";

const DRAFT_STORAGE_KEY = "dis_oui_draft";

/**
 * Tire une formulation au hasard parmi celles du ton, en évitant celle qui est
 * déjà affichée : sans cette précaution, un tirage sur vingt-cinq redonnerait
 * la même phrase et le bouton passerait pour cassé.
 */
function tirerQuestion(ton: Tone, exclure?: string): string {
  const toutes = TONE_PRESETS[ton].questions;
  const candidates = toutes.filter(q => q !== exclure);
  const parmi = candidates.length > 0 ? candidates : toutes;
  return parmi[Math.floor(Math.random() * parmi.length)];
}

// --- Créneaux ---------------------------------------------------------------

/** Libellé lisible par défaut : « vendredi 14 août à 19h30 ». */
function slotLabelFor(date: Date): string {
  return format(date, "EEEE d MMMM 'à' HH'h'mm", { locale: fr });
}

function makeSlot(date: Date): DateSlot {
  return {
    id: crypto.randomUUID().slice(0, 8),
    label: slotLabelFor(date),
    startsAt: date.toISOString(),
    durationMin: DEFAULT_SLOT_DURATION_MIN,
  };
}

/** Prochaine occurrence du jour demandé (0 = dimanche), à l'heure indiquée. */
function nextWeekday(weekday: number, hours: number, minutes: number): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const delta = (weekday - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function defaultSlots(): DateSlot[] {
  return [
    makeSlot(nextWeekday(5, 19, 30)), // vendredi soir
    makeSlot(nextWeekday(6, 20, 0)), // samedi soir
    makeSlot(nextWeekday(0, 12, 0)), // dimanche midi
  ];
}

/** `2026-08-14` et `19:30` tels qu'attendus par les champs date/heure natifs. */
function slotDateInput(slot: DateSlot): string {
  return format(new Date(slot.startsAt), "yyyy-MM-dd");
}

function slotTimeInput(slot: DateSlot): string {
  return format(new Date(slot.startsAt), "HH:mm");
}

/**
 * Recompose la date à partir des champs natifs. Les valeurs sont exprimées
 * dans le fuseau du créateur ; `new Date("2026-08-14T19:30")` sans suffixe est
 * bien interprété en heure locale, ce qui est le comportement attendu.
 */
function withDateTime(slot: DateSlot, dateInput: string, timeInput: string): DateSlot {
  const parsed = new Date(`${dateInput}T${timeInput}`);
  if (Number.isNaN(parsed.getTime())) return slot;

  // Le libellé suit la date tant que le créateur ne l'a pas personnalisé.
  const wasAutoLabel = slot.label === slotLabelFor(new Date(slot.startsAt));
  return {
    ...slot,
    startsAt: parsed.toISOString(),
    label: wasAutoLabel ? slotLabelFor(parsed) : slot.label,
  };
}

// Étape où corriger chaque champ, pour renvoyer l'utilisateur au bon endroit
// plutôt que d'afficher une erreur sans issue.
const FIELD_STEPS: Record<string, number> = {
  recipientName: 1,
  senderName: 1,
  relation: 1,
  tone: 1,
  question: 2,
  subtitle: 2,
  emoji: 2,
  noButtonBehavior: 2,
  maxRefusals: 2,
  teases: 2,
  selectedDates: 3,
  customTimeNote: 3,
  selectedMenuOptions: 4,
  themeKey: 5,
  finalMessage: 5,
};

// Zod émet ses messages en anglais ; l'interface est entièrement en français.
const FIELD_MESSAGES: Record<string, string> = {
  recipientName: "Le prénom du destinataire est obligatoire (40 caractères maximum).",
  senderName: "Votre prénom est obligatoire (40 caractères maximum).",
  question: "La question est obligatoire (80 caractères maximum).",
  subtitle: "Le sous-titre ne doit pas dépasser 120 caractères.",
  teases: "Indiquez au moins une phrase de taquinerie.",
  selectedDates: "Proposez au moins un créneau.",
  customTimeNote: "Le libellé horaire ne doit pas dépasser 80 caractères.",
  selectedMenuOptions: "Sélectionnez au moins une proposition de menu.",
  finalMessage: "Le message final ne doit pas dépasser 280 caractères.",
};

export default function Editor() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1); // 1 to 6

  // Form State
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [relation, setRelation] = useState<Relation>("crush");
  const [tone, setTone] = useState<Tone>("doux");

  const [question, setQuestion] = useState(() => tirerQuestion("doux"));
  // Vrai dès que le créateur réécrit la question : changer de ton ne doit
  // alors plus la remplacer.
  const [questionPersonnalisee, setQuestionPersonnalisee] = useState(false);
  const [subtitle, setSubtitle] = useState("J'ai une surprise pour toi...");
  const [emoji, setEmoji] = useState("💌");
  const [noButtonBehavior, setNoButtonBehavior] = useState<NoButtonBehavior>("fuyant");
  const [maxRefusals, setMaxRefusals] = useState<number>(12);
  const [teases, setTeases] = useState<string[]>(TONE_PRESETS.doux.teases);

  // Time slots
  const [selectedDates, setSelectedDates] = useState<DateSlot[]>(() => defaultSlots());

  // Menu & Options
  const [selectedMenuOptions, setSelectedMenuOptions] = useState<string[]>(["amiwo", "ablo", "bistrot"]);
  const [nouveauPlat, setNouveauPlat] = useState("");
  const [includeSurprise, setIncludeSurprise] = useState(true);
  const [includeVenue, setIncludeVenue] = useState(true);

  // Art Direction & Theme
  const [themeKey, setThemeKey] = useState<ThemeId>("blush");
  const [enableAnimation, setEnableAnimation] = useState(true);
  const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>("normal");
  const [finalMessage, setFinalMessage] = useState("J'ai hâte de te voir ! Prépare ton plus beau sourire.");

  // Delivery
  const [creatorEmail, setCreatorEmail] = useState("");
  const [linkDuration, setLinkDuration] = useState(30);
  const [allowMultiple, setAllowMultiple] = useState(false);

  // Result state after creation
  const [createdResult, setCreatedResult] = useState<{ slug: string; creatorToken: string; trackingUrl: string; recipientUrl: string } | null>(null);

  const currentTheme = THEMES[themeKey];

  // Un plat retenu qui ne correspond à aucun identifiant du catalogue est un
  // libellé saisi par le créateur : il s'affiche à part, avec sa croix.
  const platsPersonnalises = selectedMenuOptions.filter(
    m => !MENU_OPTIONS_PRESETS.some(opt => opt.id === m)
  );

  const ajouterPlat = () => {
    const plat = nouveauPlat.trim();
    if (!plat) return;
    if (selectedMenuOptions.includes(plat)) {
      toast.error("Ce plat est déjà dans la liste.");
      return;
    }
    if (selectedMenuOptions.length >= MAX_MENU_OPTIONS) {
      toast.error(`Pas plus de ${MAX_MENU_OPTIONS} propositions.`);
      return;
    }
    setSelectedMenuOptions([...selectedMenuOptions, plat]);
    setNouveauPlat("");
  };

  // Rassemble l'état du formulaire dans la forme attendue par l'API.
  // Une seule source de vérité pour la sauvegarde du brouillon et l'envoi.
  const buildConfigDraft = () => ({
    recipientName,
    senderName,
    relation,
    tone,
    question,
    subtitle,
    emoji,
    noButtonBehavior,
    maxRefusals,
    // Le textarea de taquineries produit une ligne vide à chaque retour
    // chariot ; elles ne doivent pas partir en base.
    teases: teases.map(t => t.trim()).filter(Boolean),
    selectedDates,
    selectedMenuOptions,
    includeSurprise,
    includeVenue,
    themeKey,
    enableAnimation,
    motionIntensity,
    finalMessage,
  });

  // Le brouillon enregistrait 7 champs mais n'en restaurait que 5 : `relation`
  // et `tone` étaient perdus au rechargement, et tout le reste du formulaire
  // (créneaux, menus, message final) n'était pas sauvegardé du tout.
  // Un seul objet, validé par le schéma partagé au rechargement.
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return;

    try {
      const { config, creatorEmail: savedEmail, linkDuration: savedDuration, allowMultiple: savedMultiple } =
        JSON.parse(saved);

      const parsed = invitationConfigSchema.safeParse(config);
      if (parsed.success) {
        const c = parsed.data;
        setRecipientName(c.recipientName);
        setSenderName(c.senderName);
        setRelation(c.relation);
        setTone(c.tone);
        setQuestion(c.question);
        setQuestionPersonnalisee(true);
        setSubtitle(c.subtitle);
        setEmoji(c.emoji);
        setNoButtonBehavior(c.noButtonBehavior);
        setMaxRefusals(c.maxRefusals);
        setTeases(c.teases);
        setSelectedDates(c.selectedDates);
        setSelectedMenuOptions(c.selectedMenuOptions);
        setIncludeSurprise(c.includeSurprise);
        setIncludeVenue(c.includeVenue);
        setThemeKey(c.themeKey);
        setEnableAnimation(c.enableAnimation);
        setMotionIntensity(c.motionIntensity);
        setFinalMessage(c.finalMessage);
      }

      if (typeof savedEmail === "string") setCreatorEmail(savedEmail);
      if (LINK_DURATIONS.includes(savedDuration)) setLinkDuration(savedDuration);
      if (typeof savedMultiple === "boolean") setAllowMultiple(savedMultiple);
    } catch {
      // Brouillon corrompu ou issu d'une version antérieure du schéma :
      // on repart des valeurs par défaut plutôt que de bloquer l'éditeur.
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  /**
   * Change de ton et propose une nouvelle formulation.
   *
   * Le tirage évite la formulation affichée : recliquer sur le même ton donnait
   * une chance sur vingt-cinq de ne rien changer, ce qui se lit comme un bouton
   * cassé.
   *
   * Une question réécrite par le créateur n'est jamais écrasée — c'est son
   * texte, changer de ton ne doit pas le lui reprendre.
   */
  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
    setTeases(TONE_PRESETS[newTone].teases);

    if (questionPersonnalisee) return;
    setQuestion(tirerQuestion(newTone, question));
  };

  const relancerQuestion = () => {
    setQuestion(tirerQuestion(tone, question));
    setQuestionPersonnalisee(false);
  };

  // Sauvegarde du brouillon à chaque modification du formulaire.
  //
  // Le tableau de dépendances est indispensable : sans lui, l'effet s'exécutait
  // à chaque rendu du composant, donc à chaque frappe et à chaque survol.
  useEffect(() => {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ config: buildConfigDraft(), creatorEmail, linkDuration, allowMultiple })
    );
    // `buildConfigDraft` lit l'ensemble de l'état du formulaire ; la liste
    // ci-dessous en reprend chaque source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recipientName,
    senderName,
    relation,
    tone,
    question,
    subtitle,
    emoji,
    noButtonBehavior,
    maxRefusals,
    teases,
    selectedDates,
    selectedMenuOptions,
    includeSurprise,
    includeVenue,
    themeKey,
    enableAnimation,
    motionIntensity,
    finalMessage,
    creatorEmail,
    linkDuration,
    allowMultiple,
  ]);

  const createMutation = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      setCreatedResult(data);
      toast.success("Votre invitation a été générée avec succès !");
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la création de l'invitation.");
    }
  });

  const handleGenerate = () => {
    if (!creatorEmail.trim()) {
      toast.error("Veuillez renseigner votre e-mail de réception.");
      return;
    }

    // Même schéma que celui appliqué par l'API : les erreurs sont détectées
    // ici plutôt que renvoyées par le serveur après un aller-retour.
    const parsed = invitationConfigSchema.safeParse(buildConfigDraft());

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0] ?? "");
      const step = FIELD_STEPS[field];
      if (step) setStep(step);
      toast.error(FIELD_MESSAGES[field] ?? issue.message);
      return;
    }

    createMutation.mutate({
      creatorEmail: creatorEmail.trim(),
      allowMultiple,
      expiresDays: linkDuration,
      config: parsed.data,
    });
  };

  if (createdResult) {
    const fullRecipientUrl = `${window.location.origin}${createdResult.recipientUrl}`;

    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <Card className="max-w-xl w-full p-8 rounded-3xl shadow-2xl space-y-6 text-center border-brand-100 bg-white">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-stone-900">Votre invitation est prête !</h1>
            <p className="text-sm text-stone-600">
              Partagez le lien ci-dessous avec <span className="font-display font-bold text-ink-900">{recipientName}</span>. Suspense garanti !
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 text-left">
            <label className="text-xs font-semibold text-stone-500 uppercase">Lien unique pour {recipientName}</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={fullRecipientUrl} 
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-mono text-stone-800"
              />
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(fullRecipientUrl);
                  toast.success("Lien copié dans le presse-papier !");
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col items-center gap-3">
            <QrCodeSvg value={fullRecipientUrl} size={168} title={`QR code de l'invitation pour ${recipientName}`} />
            <p className="text-xs text-stone-500 max-w-xs">
              Faites scanner ce code par le destinataire pour ouvrir l'invitation directement sur
              son téléphone.
            </p>
          </div>

          {/* Un bouton « Tester l'expérience destinataire » ouvrait ici le vrai
              lien du destinataire. Deux effets qu'il n'annonçait pas : la
              consultation horodate l'ouverture, de sorte que la page de suivi
              affichait « Vue » avant même que le destinataire ait reçu le lien ;
              et aller au bout du parcours enregistrait une réponse, ce qui
              verrouillait l'invitation puisque `allowMultiple` vaut faux par
              défaut. Le créateur reste libre d'ouvrir le lien lui-même. */}
          <div className="pt-4">
            <Button
              onClick={() => setLocation(createdResult.trackingUrl)}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-3">
              Voir la page de suivi privée
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
            <BrandMark size={21} decorative />
          </span>
            {/* Titre court sous `sm` : « Éditeur Dis oui » se repliait sur deux
                lignes et écrasait la barre sur un écran de 360 px. */}
            <span className="font-display font-bold text-ink-900 whitespace-nowrap">
              <span className="sm:hidden">Éditeur</span>
              <span className="hidden sm:inline">Éditeur Dis oui</span>
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-stone-500">
          <span>Étape {step} sur 6</span>
          <div className="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }}></div>
          </div>
        </div>

        <div>
          <Button 
            onClick={() => {
              localStorage.removeItem("dis_oui_draft");
              window.location.reload();
            }}
            variant="ghost" 
            size="sm" 
            className="text-stone-500 hover:text-brand-700 gap-1">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </Button>
        </div>
      </header>

      {/* Main Split Layout: Form (Left) & Live Preview (Right) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-[1600px] w-full mx-auto">
        
        {/* Left Form Column */}
        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between bg-white overflow-y-auto">
          <div className="max-w-xl mx-auto w-full space-y-8 pb-12">
            
            {/* Step navigation tabs */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 overflow-x-auto gap-2">
              {[
                { id: 1, label: "Identités", icon: Smile },
                { id: 2, label: "Question", icon: Sparkles },
                { id: 3, label: "Créneaux", icon: Calendar },
                { id: 4, label: "Menu", icon: Utensils },
                { id: 5, label: "Design", icon: Palette },
                { id: 6, label: "Livraison", icon: Send },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isPassed = step > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStep(s.id)}
                    className={`flex items-center gap-2 px-3 min-h-11 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      isActive 
                        ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" 
                        : isPassed 
                        ? "bg-brand-50 text-brand-800" 
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* STEP 1: Identities & Tone */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-900">Qui invite qui ?</h2>
                  <p className="text-sm text-stone-600">Définissez les prénoms et le ton général de votre invitation.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700">Prénom du destinataire *</label>
                    <Input 
                      value={recipientName} 
                      onChange={(e) => setRecipientName(e.target.value)} 
                      placeholder="ex: Julie" 
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700">Votre prénom (expéditeur) *</label>
                    <Input 
                      value={senderName} 
                      onChange={(e) => setSenderName(e.target.value)} 
                      placeholder="ex: Thomas" 
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Relation</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { id: "crush", label: "Crush", Icon: Sparkle },
                      { id: "partenaire", label: "Partenaire", Icon: Heart },
                      { id: "amie", label: "Ami·e", Icon: Users },
                      { id: "complique", label: "C'est compliqué", Icon: HelpCircle },
                    ] as const).map((rel) => (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => setRelation(rel.id)}
                        className={`p-3 min-h-12 rounded-xl border text-xs font-bold transition-all text-center ${
                          relation === rel.id 
                            ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm" 
                            : "border-stone-200 text-stone-700 hover:border-stone-300"
                        }`}
                      >
                        <rel.Icon className="w-4 h-4 mx-auto mb-1" strokeWidth={1.75} />
                        {rel.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Ton de l'invitation</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { id: "doux", label: "Doux", Icon: Flower },
                      { id: "drôle", label: "Drôle", Icon: Laugh },
                      { id: "audacieux", label: "Audacieux", Icon: Flame },
                      { id: "romantique", label: "Romantique", Icon: Heart },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToneChange(t.id)}
                        className={`p-3 min-h-12 rounded-xl border text-xs font-bold transition-all text-center ${
                          tone === t.id 
                            ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm" 
                            : "border-stone-200 text-stone-700 hover:border-stone-300"
                        }`}
                      >
                        <t.Icon className="w-4 h-4 mx-auto mb-1" strokeWidth={1.75} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Question & Fleeing button */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-900">La question & taquineries</h2>
                  <p className="text-sm text-stone-600">Personnalisez la question principale et le comportement du bouton « Non ».</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-stone-700" htmlFor="question">
                      Texte de la question (80 car. max)
                    </label>
                    <button
                      type="button"
                      onClick={relancerQuestion}
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 min-h-11 px-1">
                      <Shuffle className="w-3.5 h-3.5" strokeWidth={2} />
                      Une autre
                    </button>
                  </div>
                  <Input
                    id="question"
                    value={question}
                    onChange={e => {
                      setQuestion(e.target.value);
                      // Dès la première frappe, le texte appartient au créateur :
                      // changer de ton ne doit plus le lui reprendre.
                      setQuestionPersonnalisee(true);
                    }}
                    maxLength={80}
                    className="rounded-xl"
                  />
                  <p className="text-[11px] text-stone-500">
                    {TONE_PRESETS[tone].questions.length} formulations pour ce ton — « Une autre »
                    en propose une nouvelle.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700" htmlFor="sous-titre">
                    Sous-titre (sous la question)
                  </label>
                  <Input
                    id="sous-titre"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    maxLength={120}
                    placeholder="ex: J'ai une surprise pour toi..."
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Emoji ou illustration principale</label>
                  <div className="flex items-center gap-3">
                    {["💌", "💖", "🌹", "🥂", "🍕", "✨", "🔥", "🍓", "☕"].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border transition-all ${
                          emoji === em ? "border-brand-600 bg-brand-50 scale-110" : "border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Comportement du bouton « Non »</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { id: "fuyant", label: "Fuyant", Icon: Rabbit },
                      { id: "retrecissant", label: "Rétrécit à chaque clic", Icon: Shrink },
                      { id: "les_deux", label: "Les deux combinés", Icon: Wand2 },
                      { id: "desactive", label: "Désactivé d'office", Icon: Lock },
                    ] as const).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setNoButtonBehavior(b.id)}
                        className={`p-3 min-h-12 rounded-xl border text-xs font-bold transition-all text-center ${
                          noButtonBehavior === b.id 
                            ? "border-brand-600 bg-brand-50 text-brand-800" 
                            : "border-stone-200 text-stone-700"
                        }`}
                      >
                        <b.Icon className="w-4 h-4 mx-auto mb-1" strokeWidth={1.75} />
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {noButtonBehavior !== "desactive" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700" htmlFor="max-refus">
                      Nombre de refus avant que le bouton abandonne : {maxRefusals}
                    </label>
                    <input
                      id="max-refus"
                      type="range"
                      min={1}
                      max={30}
                      value={maxRefusals}
                      onChange={(e) => setMaxRefusals(Number(e.target.value))}
                      className="w-full accent-brand-600"
                    />
                    <p className="text-[11px] text-stone-500">
                      Passé ce nombre, le bouton « Non » se désactive et le destinataire garde une
                      porte de sortie explicite.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Phrases de taquinerie (une par ligne)</label>
                  <Textarea 
                    value={teases.join("\n")}
                    onChange={(e) => setTeases(e.target.value.split("\n"))}
                    rows={4}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Time slots */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-900">Les créneaux proposés</h2>
                  <p className="text-sm text-stone-600">
                    Proposez jusqu'à {MAX_DATE_SLOTS} moments clés. La date réelle sert à générer le fichier
                    calendrier ; le libellé est ce que verra le destinataire.
                  </p>
                </div>

                <div className="space-y-4">
                  {selectedDates.map((slot, idx) => {
                    const updateSlot = (next: DateSlot) =>
                      setSelectedDates(selectedDates.map((s, i) => (i === idx ? next : s)));

                    return (
                      <div key={slot.id} className="rounded-2xl border border-stone-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Créneau {idx + 1}
                          </span>
                          {selectedDates.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Supprimer le créneau ${idx + 1}`}
                              onClick={() => setSelectedDates(selectedDates.filter((_, i) => i !== idx))}
                              className="text-stone-400 hover:text-red-500 h-11 w-11 md:h-8 md:w-8">
                              ✕
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-stone-700" htmlFor={`date-${slot.id}`}>
                              Date
                            </label>
                            <Input
                              id={`date-${slot.id}`}
                              type="date"
                              value={slotDateInput(slot)}
                              onChange={e => updateSlot(withDateTime(slot, e.target.value, slotTimeInput(slot)))}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-stone-700" htmlFor={`heure-${slot.id}`}>
                              Heure
                            </label>
                            <Input
                              id={`heure-${slot.id}`}
                              type="time"
                              value={slotTimeInput(slot)}
                              onChange={e => updateSlot(withDateTime(slot, slotDateInput(slot), e.target.value))}
                              className="rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-stone-700" htmlFor={`libelle-${slot.id}`}>
                            Libellé affiché au destinataire
                          </label>
                          <Input
                            id={`libelle-${slot.id}`}
                            value={slot.label}
                            maxLength={60}
                            onChange={e => updateSlot({ ...slot, label: e.target.value })}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {selectedDates.length < MAX_DATE_SLOTS && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedDates([...selectedDates, makeSlot(nextWeekday(5, 19, 30))])}
                      className="w-full rounded-xl border-dashed">
                      + Ajouter un créneau
                    </Button>
                  )}
                </div>

              </div>
            )}

            {/* STEP 4: Menu & Venue */}
            {step === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-900">Le menu & les options</h2>
                  <p className="text-sm text-stone-600">Sélectionnez les propositions culinaires et options de lieu.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MENU_OPTIONS_PRESETS.map((opt) => {
                    const isSelected = selectedMenuOptions.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMenuOptions(selectedMenuOptions.filter(id => id !== opt.id));
                          } else {
                            setSelectedMenuOptions([...selectedMenuOptions, opt.id]);
                          }
                        }}
                        className={`cursor-pointer p-4 min-h-14 rounded-2xl border flex items-center gap-3 transition-all ${
                          isSelected ? "border-brand-600 bg-brand-50/50 shadow-sm" : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <opt.Icon
                          className={`w-5 h-5 shrink-0 ${isSelected ? "text-brand-700" : "text-stone-500"}`}
                          strokeWidth={1.75}
                        />
                        <span className="text-sm font-medium text-stone-800">{opt.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Plats saisis librement.
                    Une entrée de `selectedMenuOptions` est soit un identifiant du
                    catalogue, soit un libellé rédigé : le funnel résout d'abord dans
                    le catalogue et affiche la chaîne telle quelle à défaut. */}
                {platsPersonnalises.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {platsPersonnalises.map(plat => (
                      <div
                        key={plat}
                        className="p-4 min-h-14 rounded-2xl border border-brand-600 bg-brand-50/50 shadow-sm flex items-center gap-3">
                        <UtensilsCrossed className="w-5 h-5 shrink-0 text-brand-700" strokeWidth={1.75} />
                        <span className="flex-1 min-w-0 text-sm font-medium text-stone-800 truncate">
                          {plat}
                        </span>
                        <button
                          type="button"
                          aria-label={`Retirer ${plat}`}
                          onClick={() => setSelectedMenuOptions(selectedMenuOptions.filter(m => m !== plat))}
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedMenuOptions.length < MAX_MENU_OPTIONS && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700" htmlFor="plat-libre">
                      Un plat qui n'est pas dans la liste ?
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="plat-libre"
                        value={nouveauPlat}
                        onChange={e => setNouveauPlat(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            ajouterPlat();
                          }
                        }}
                        maxLength={MAX_MENU_LABEL}
                        placeholder="ex : Wagasi grillé & piment vert"
                        className="rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={ajouterPlat}
                        disabled={!nouveauPlat.trim()}
                        className="rounded-xl shrink-0 min-h-11">
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeSurprise} 
                      onChange={(e) => setIncludeSurprise(e.target.checked)}
                      className="w-5 h-5 accent-brand-600 rounded shrink-0"
                    />
                    <span className="text-sm text-stone-700 font-medium">Ajouter l'option « Surprends-moi »</span>
                  </label>
                  <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeVenue} 
                      onChange={(e) => setIncludeVenue(e.target.checked)}
                      className="w-5 h-5 accent-brand-600 rounded shrink-0"
                    />
                    <span className="text-sm text-stone-700 font-medium">Autoriser le destinataire à proposer un lieu</span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 5: Art Direction & Themes */}
            {step === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-900">Direction artistique & Thèmes</h2>
                  <p className="text-sm text-stone-600">Choisissez l'ambiance visuelle et le message final du billet.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Le nom reprend la couleur de texte du thème : en
                      text-stone-900 fixe, il était illisible sur Minuit,
                      Forêt et Néon. */}
                  {Object.values(THEMES).map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      aria-pressed={themeKey === th.id}
                      onClick={() => setThemeKey(th.id)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all text-center space-y-2 bg-gradient-to-br ${th.bgGradient} ${
                        themeKey === th.id ? "ring-2 ring-brand-600 shadow-lg scale-102" : "border-stone-200 shadow-sm"
                      }`}
                    >
                      <th.Icon className="w-6 h-6 mx-auto text-ink-800" strokeWidth={1.75} />
                      <span className={`block font-bold text-xs ${th.textColor}`}>{th.name}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 rounded-2xl border border-stone-200 p-4">
                  <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableAnimation}
                      onChange={(e) => setEnableAnimation(e.target.checked)}
                      className="w-5 h-5 accent-brand-600 rounded shrink-0"
                    />
                    <span className="text-sm text-stone-700 font-medium">Activer les animations d'écran</span>
                  </label>

                  {enableAnimation && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-700">Intensité du mouvement</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id: "subtile", label: "Subtile" },
                          { id: "normal", label: "Normale" },
                          { id: "intense", label: "Intense" },
                        ] as const).map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMotionIntensity(m.id)}
                            className={`p-2 min-h-11 rounded-xl border text-xs font-bold transition-all ${
                              motionIntensity === m.id
                                ? "border-brand-600 bg-brand-50 text-brand-800"
                                : "border-stone-200 text-stone-700 hover:border-stone-300"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500">
                    Les animations sont de toute façon neutralisées pour les personnes ayant activé
                    « réduire les animations » dans leur système.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Message final personnalisé sur le billet</label>
                  <Textarea 
                    value={finalMessage} 
                    onChange={(e) => setFinalMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {/* STEP 6: Delivery & Email */}
            {step === 6 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-stone-900">Livraison & Réception</h2>
                  <p className="text-sm text-stone-600">Où devons-nous vous envoyer la réponse du destinataire ?</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Votre adresse e-mail (obligatoire) *</label>
                  <Input 
                    type="email"
                    value={creatorEmail} 
                    onChange={(e) => setCreatorEmail(e.target.value)} 
                    placeholder="votre.email@exemple.com" 
                    className="rounded-xl"
                  />
                  <p className="text-[11px] text-stone-500">C'est ici que vous recevrez la réponse détaillée avec le fichier `.ics`.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700">Durée de validité du lien</label>
                  <select 
                    value={linkDuration}
                    onChange={(e) => setLinkDuration(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 h-11 md:h-10 text-base md:text-sm font-medium text-stone-800"
                  >
                    <option value={7}>7 jours</option>
                    <option value={30}>30 jours (recommandé)</option>
                    <option value={90}>90 jours</option>
                  </select>
                  <p className="text-[11px] text-stone-500">
                    Passé ce délai, l'invitation et sa réponse sont définitivement supprimées.
                  </p>
                </div>

                <label className="flex items-start gap-3 min-h-11 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-5 h-5 accent-brand-600 rounded mt-0.5 shrink-0"
                  />
                  <span className="text-sm text-stone-700 font-medium">
                    Autoriser plusieurs réponses
                    <span className="block text-[11px] font-normal text-stone-500">
                      Par défaut, le lien se verrouille après la première réponse.
                    </span>
                  </span>
                </label>

                <div className="pt-4">
                  <Button 
                    onClick={handleGenerate}
                    disabled={createMutation.isPending}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-4 font-bold text-base shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2">
                    {createMutation.isPending ? "Génération en cours..." : "Générer mon lien magique"}
                  </Button>
                </div>
              </div>
            )}

            {/* Bottom navigation buttons */}
            <div className="flex items-center justify-between pt-8 border-t border-stone-200">
              <Button 
                variant="outline" 
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="rounded-xl px-6">
                Précédent
              </Button>
              {step < 6 && (
                <Button 
                  onClick={() => setStep(Math.min(6, step + 1))}
                  className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl px-6">
                  Suivant <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* Right Live Preview Column */}
        <div className="lg:col-span-5 bg-stone-900 p-8 flex items-center justify-center relative overflow-hidden hidden lg:flex">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"></div>
          
          <div className="relative w-full max-w-sm aspect-[9/16] rounded-[48px] bg-stone-950 p-4 shadow-2xl shadow-black/80 border-4 border-stone-800">
            <div className="absolute top-7 left-1/2 -translate-x-1/2 w-36 h-4 bg-stone-900 rounded-full z-20"></div>
            
            <div className={`w-full h-full rounded-[38px] overflow-hidden bg-gradient-to-br ${currentTheme.bgGradient} flex flex-col justify-between p-6 text-center relative shadow-inner`}>
              
              <div className="z-10 pt-6">
                <span className="inline-block px-3 py-1 rounded-full bg-white/70 backdrop-blur text-xs font-semibold text-stone-800 shadow-sm">
                  Aperçu live • {currentTheme.name}
                </span>
              </div>

              <div className="z-10 space-y-4 my-auto">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-xl flex items-center justify-center text-3xl animate-pulse">
                  {emoji}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">
                    {recipientName || "Destinataire"} de la part de {senderName || "Toi"}
                  </p>
                  <h3 className="text-xl font-extrabold text-stone-900 leading-snug">
                    {question}
                  </h3>
                  <p className="text-xs text-stone-600">{subtitle}</p>
                </div>
              </div>

              <div className="z-10 w-full space-y-2 pb-4">
                {/* L'aperçu reflète le thème d'invitation choisi, pas
                    l'habillage de l'application. */}
                <div className={`w-full py-3 rounded-2xl ${currentTheme.buttonBg} font-bold text-sm shadow-lg`}>
                  Oui, avec immense plaisir
                </div>
                <div className="w-full py-2.5 rounded-2xl bg-white/80 backdrop-blur text-stone-700 font-semibold text-xs border border-stone-200">
                  Non (refuser)
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
