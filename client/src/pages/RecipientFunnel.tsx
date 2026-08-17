import { useState } from "react";
import { useRoute } from "wouter";
import { resolveTheme, MENU_OPTIONS_PRESETS } from "@/lib/themes";
import { trpc } from "@/lib/trpc";
import { MAX_VENUE_LABEL, normalizeDateSlots, slotStartsAt, type DateSlot } from "@shared/invitationConfig";
import { buildRendezVousIcs } from "@shared/ics";
import { lienWhatsApp, messageWhatsApp } from "@shared/whatsapp";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BoutonNon } from "@/components/BoutonNon";
import type { LucideIcon } from "lucide-react";
import { Calendar, Download, MailX, MapPin, MessageCircle, Sparkles, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

/**
 * Écrans du parcours destinataire.
 *
 * Nommés plutôt que numérotés : l’insertion du lieu entre le menu et le
 * billet décale tout ce qui suit, et un numéro écrit en dur aurait continué
 * de compiler en menant au mauvais écran.
 */
const ECRANS = {
  enveloppe: 0,
  question: 1,
  reaction: 2,
  creneau: 3,
  menu: 4,
  lieu: 5,
  billet: 6,
} as const;

export default function RecipientFunnel() {
  const [, params] = useRoute("/r/:slug");
  const slug = params?.slug || "";

  const { data: invitation, isLoading, error } = trpc.invitations.getBySlug.useQuery({ slug }, {
    enabled: !!slug,
    retry: false,
  });

  const respondMutation = trpc.invitations.respond.useMutation({
    onSuccess: data => {
      // `emailSent` dit si la notification est réellement partie. L'écran de
      // confirmation s'en sert : la réponse est toujours enregistrée, la
      // notification ne l'est pas toujours.
      setEmailEnvoye(data.emailSent);
      setScreen(ECRANS.billet);
      toast.success("Ta réponse est enregistrée !");
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de l'envoi de la réponse.");
    }
  });

  const [screen, setScreen] = useState<number>(ECRANS.enveloppe);
  const [refusCount, setRefusCount] = useState(0);

  // Response choices
  const [emailEnvoye, setEmailEnvoye] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DateSlot | null>(null);
  const [selectedMenu, setSelectedMenu] = useState("");
  const [customVenue, setCustomVenue] = useState("");
  const [customNote, setCustomNote] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
        <MailX className="w-10 h-10 opacity-70" strokeWidth={1.5} />
        <h1 className="text-2xl font-bold">Invitation introuvable ou expirée</h1>
        <p className="text-sm text-stone-400 max-w-md">
          Ce lien a peut-être expiré ou le créateur l'a désactivé.
        </p>
      </div>
    );
  }

  const config = invitation.config as any;
  const theme = resolveTheme(config.themeKey);
  // Tolère les invitations créées avant les créneaux datés, dont
  // `selectedDates` n'est qu'un tableau de chaînes.
  const slots = normalizeDateSlots(config.selectedDates);

  // Le même générateur RFC 5545 que celui du serveur : le fichier téléchargé
  // ici et celui joint à l'e-mail sont identiques.
  const calendarFile = selectedSlot
    ? buildRendezVousIcs({
        senderName: config.senderName,
        recipientName: config.recipientName,
        startsAt: slotStartsAt(selectedSlot),
        durationMinutes: selectedSlot.durationMin,
        slotLabel: selectedSlot.label,
        menu: selectedMenu,
        venue: customVenue,
        note: customNote,
      })
    : null;

  // `includeSurprise` était enregistré par l'éditeur mais n'apparaissait nulle
  // part dans le funnel : l'option n'a jamais été proposée au destinataire.
  const menuChoices: Array<{ id: string; Icon: LucideIcon; label: string }> = [
    ...((config.selectedMenuOptions as string[] | undefined) ?? []).map(optId => {
      const preset = MENU_OPTIONS_PRESETS.find(m => m.id === optId);
      // Un identifiant inconnu vient d une invitation creee avant un
      // remaniement du catalogue : on l affiche tel quel, avec une icone neutre.
      return { id: optId, Icon: preset?.Icon ?? UtensilsCrossed, label: preset?.label ?? optId };
    }),
    ...(config.includeSurprise
      ? [{ id: "surprise", Icon: Sparkles, label: "Surprends-moi" }]
      : []),
  ];

  // Message pré-rempli pour prévenir le créateur, une fois le créneau retenu.
  // Il ne porte pas le lien de suivi : celui-ci contient le jeton du créateur,
  // qui donne accès à son adresse et, sur une invitation à réponses multiples,
  // aux réponses des autres destinataires. Le créateur le reçoit par courriel.
  const lienNotificationWhatsApp =
    invitation.creatorPhone && selectedSlot
      ? lienWhatsApp(
          invitation.creatorPhone,
          messageWhatsApp({
            recipientName: config.recipientName,
            creneau: selectedSlot.label,
            dateLisible: slotStartsAt(selectedSlot)
              ? format(new Date(slotStartsAt(selectedSlot)!), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
              : undefined,
            menu: selectedMenu || undefined,
            lieu: customVenue || undefined,
            note: customNote || undefined,
            lienInvitation: window.location.href,
          })
        )
      : null;

  // Lieux proposés par le créateur. Absent des invitations créées avant cet
  // écran : le tableau vide y ramène simplement au champ libre d'autrefois.
  const venueChoices: string[] = (config.venueOptions as string[] | undefined) ?? [];

  // Ni lieu proposé, ni saisie autorisée : l'écran se réduit au petit mot, et
  // son titre le dit plutôt que d'annoncer un choix de lieu inexistant.
  const onDemandeUnLieu = venueChoices.length > 0 || Boolean(config.includeVenue);

  const maxRefusals: number = config.maxRefusals ?? 12;
  const behavior: string = config.noButtonBehavior ?? "fuyant";
  const fleeing = behavior === "fuyant" || behavior === "les_deux";
  const shrinking = behavior === "retrecissant" || behavior === "les_deux";
  // Passé le quota, le bouton cessait simplement de réagir : aucune issue, et
  // rien qui l'explique. Il devient explicitement hors d'usage.
  const noButtonExhausted = refusCount >= maxRefusals;

  const teaseMessage: string | null =
    refusCount > 0
      ? config.teases?.[Math.min(refusCount - 1, (config.teases?.length ?? 1) - 1)] ??
        "Tu hésites encore ?"
      : null;

  const compterUnRefus = () => setRefusCount(prev => Math.min(prev + 1, maxRefusals));

  const handleYes = () => {
    if (refusCount > 0) {
      setScreen(ECRANS.reaction);
    } else {
      setScreen(ECRANS.creneau);
    }
  };

  const handleFinalSubmit = () => {
    if (!selectedSlot) {
      toast.error("Choisis d'abord un créneau.");
      setScreen(ECRANS.creneau);
      return;
    }

    const startsAt = slotStartsAt(selectedSlot);

    respondMutation.mutate({
      slug,
      answer: {
        day: selectedSlot.label,
        // L'heure était jusqu'ici figée à « 19h30 » : `selectedTime` existait
        // mais n'était jamais renseigné. Elle vient maintenant du créneau.
        time: startsAt ? format(new Date(startsAt), "HH'h'mm", { locale: fr }) : "",
        startsAt,
        durationMin: selectedSlot.durationMin,
        menu: selectedMenu,
        venue: customVenue,
        customNote,
        refusCount,
      }
    });
  };

  // Une invitation déjà répondue laissait le visiteur refaire tout le parcours
  // pour se heurter à un conflit au moment de valider.
  if (invitation.alreadyResponded && screen !== ECRANS.billet) {
    const previous = invitation.response as { day?: string; menu?: string } | undefined;
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex items-center justify-center p-6 font-sans`}>
        <Card className={`max-w-md w-full p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl text-center space-y-4 animate-scaleUp`}>
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-extrabold">Réponse déjà envoyée</h1>
          <p className={`text-sm ${theme.mutedText}`}>
            Tu as déjà répondu à cette invitation. {config.senderName} a bien reçu ton message.
          </p>
          {previous?.day && (
            <div className={`border rounded-2xl p-4 text-left space-y-1 text-xs ${theme.panelBg}`}>
              <p><span className="font-bold">Créneau :</span> {previous.day}</p>
              {previous.menu && <p><span className="font-bold">Menu :</span> {previous.menu}</p>}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden relative font-sans`}>

      {/* Background ambient particles / glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <div className="w-full max-w-md relative z-10">

        {/* SCREEN 0: Threshold Envelope */}
        {screen === ECRANS.enveloppe && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl text-center space-y-6 animate-scaleUp`}>
            <div className={`w-24 h-24 mx-auto rounded-full ${theme.accentSoft} flex items-center justify-center text-4xl shadow-inner animate-heartbeat`}>
              {config.emoji || "💌"}
            </div>
            <div className="space-y-2">
              <p className={`text-xs uppercase tracking-widest font-bold ${theme.labelText}`}>Message secret</p>
              <h1 className="text-2xl font-extrabold">
                {config.recipientName}, quelqu'un t'a laissé un message...
              </h1>
              <p className={`text-xs ${theme.mutedText}`}>
                De la part de <span className="font-bold">{config.senderName}</span>
              </p>
            </div>
            <Button
              onClick={() => setScreen(ECRANS.question)}
              className={`w-full ${theme.buttonBg} rounded-2xl py-4 font-bold text-base shadow-xl transition-all hover:scale-105 motion-reduce:hover:scale-100`}>
              Ouvrir l'enveloppe
            </Button>
          </Card>
        )}

        {/* SCREEN 1: The Question */}
        {screen === ECRANS.question && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl text-center space-y-8 animate-fadeIn`}>
            <div className={`w-20 h-20 mx-auto rounded-3xl ${theme.accentSoft} flex items-center justify-center text-4xl shadow-inner`}>
              {config.emoji || "💌"}
            </div>
            <div className="space-y-3">
              <p className={`text-xs uppercase tracking-widest font-bold ${theme.labelText}`}>Invitation exclusive</p>
              <h2 className="text-2xl md:text-3xl font-extrabold leading-snug">
                {config.question}
              </h2>
              {/* aria-live : les taquineries doivent être annoncées aux
                  lecteurs d'écran, sans déplacer le focus. */}
              <p className={`text-xs font-semibold min-h-4 ${theme.mutedText}`} aria-live="polite">
                {teaseMessage && `${teaseMessage} (${refusCount} refus)`}
              </p>
            </div>

            <div className="space-y-3">
              {/* Le « Oui » reste hors de l'aire de jeu : un saut de −45 px
                  plaçait auparavant 79 % du « Non » derrière lui. */}
              <Button
                onClick={handleYes}
                className={`w-full ${theme.buttonBg} rounded-2xl py-4 font-bold text-base shadow-xl transition-all hover:scale-105 motion-reduce:hover:scale-100`}>
                Oui, avec immense plaisir
              </Button>

              {behavior !== "desactive" && (
                <BoutonNon
                  fuyant={fleeing}
                  retrecissant={shrinking}
                  refusCount={refusCount}
                  epuise={noButtonExhausted}
                  onRefus={compterUnRefus}
                  classeIdle={theme.optionIdle}
                />
              )}

              {noButtonExhausted && (
                <p className={`text-[11px] ${theme.labelText}`}>
                  Tu as essayé {refusCount} fois. Si c'est vraiment non, ferme simplement cette page —
                  {" "}
                  {config.senderName} ne recevra aucune réponse.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* SCREEN 2: Reaction (if tried to refuse) */}
        {screen === ECRANS.reaction && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl text-center space-y-6 animate-scaleUp`}>
            <div className={`w-20 h-20 mx-auto rounded-full ${theme.accentSoft} flex items-center justify-center text-3xl shadow-inner`}>
              🤭
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold">Nice try !</h2>
              <p className={`text-sm ${theme.mutedText}`}>
                Tu as essayé de cliquer sur Non <span className="font-bold">{refusCount} fois</span>. Mais au fond, tu savais très bien que tu dirais Oui !
              </p>
            </div>
            <Button
              onClick={() => setScreen(ECRANS.creneau)}
              className={`w-full ${theme.buttonBg} rounded-2xl py-4 font-bold text-base shadow-xl`}>
              Continuer vers les créneaux
            </Button>
          </Card>
        )}

        {/* SCREEN 3: Date & Time slots */}
        {screen === ECRANS.creneau && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl space-y-6 animate-fadeIn`}>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold">Quand est-on libre ?</h2>
              <p className={`text-xs ${theme.mutedText}`}>Choisis ton créneau préféré pour notre rendez-vous.</p>
            </div>

            <div className="space-y-3" role="radiogroup" aria-label="Créneaux proposés">
              {slots.map(slot => {
                const isSelected = selectedSlot?.id === slot.id;
                const startsAt = slotStartsAt(slot);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full text-left p-4 min-h-14 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected ? theme.optionSelected : theme.optionIdle
                    }`}
                  >
                    <span>
                      <span className="text-sm block">{slot.label}</span>
                      {startsAt && (
                        <span className={`text-[11px] font-normal ${theme.labelText}`}>
                          {format(new Date(startsAt), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                        </span>
                      )}
                    </span>
                    <Calendar className="w-4 h-4 shrink-0 opacity-70" />
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setScreen(ECRANS.menu)}
              disabled={!selectedSlot}
              className={`w-full ${theme.buttonBg} rounded-2xl py-4 font-bold text-base shadow-xl disabled:opacity-40`}>
              {selectedSlot ? "Étape suivante : Le menu" : "Choisis un créneau pour continuer"}
            </Button>
          </Card>
        )}

        {/* ÉCRAN MENU */}
        {screen === ECRANS.menu && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl space-y-6 animate-fadeIn`}>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold">Qu'est-ce qu'on mange ?</h2>
              <p className={`text-xs ${theme.mutedText}`}>Sélectionne tes envies gourmandes pour la soirée.</p>
            </div>

            <div
              className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1"
              role="radiogroup"
              aria-label="Propositions de menu">
              {menuChoices.map(choice => {
                const isSelected = selectedMenu === choice.label;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedMenu(choice.label)}
                    className={`w-full text-left p-3.5 min-h-13 rounded-2xl border transition-all flex items-center gap-3 ${
                      isSelected ? theme.optionSelected : theme.optionIdle
                    }`}
                  >
                    <choice.Icon className="w-5 h-5 shrink-0 opacity-80" strokeWidth={1.75} />
                    <span className="text-sm">{choice.label}</span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setScreen(ECRANS.lieu)}
              className={`w-full ${theme.buttonBg} rounded-2xl py-4 font-bold text-base shadow-xl`}>
              Continuer
            </Button>
          </Card>
        )}

        {/* ÉCRAN LIEU */}
        {screen === ECRANS.lieu && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl space-y-6 animate-fadeIn`}>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold">
                {onDemandeUnLieu ? "Où se retrouve-t-on ?" : `Un mot pour ${config.senderName} ?`}
              </h2>
              <p className={`text-xs ${theme.mutedText}`}>
                {venueChoices.length > 0
                  ? "Choisis l'endroit qui te tente le plus."
                  : onDemandeUnLieu
                    ? "Propose l'endroit de ton choix."
                    : "Le dernier mot avant ton billet."}
              </p>
            </div>

            {venueChoices.length > 0 && (
              <div className="space-y-2.5" role="radiogroup" aria-label="Lieux proposés">
                {venueChoices.map(lieu => {
                  const isSelected = customVenue === lieu;
                  return (
                    <button
                      key={lieu}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setCustomVenue(lieu)}
                      className={`w-full text-left p-3.5 min-h-13 rounded-2xl border transition-all flex items-center gap-3 ${
                        isSelected ? theme.optionSelected : theme.optionIdle
                      }`}
                    >
                      <MapPin className="w-5 h-5 shrink-0 opacity-80" strokeWidth={1.75} />
                      <span className="text-sm">{lieu}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Le champ libre partage `customVenue` avec les propositions
                ci-dessus : écrire un endroit décoche celui qui l'était, ce qui
                est bien le comportement voulu — c'est l'un ou l'autre. */}
            {config.includeVenue && (
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${theme.mutedText}`} htmlFor="lieu">
                  {venueChoices.length > 0 ? "Ou propose un autre endroit" : "Proposer un lieu (optionnel)"}
                </label>
                <Input
                  id="lieu"
                  value={venueChoices.includes(customVenue) ? "" : customVenue}
                  onChange={e => setCustomVenue(e.target.value)}
                  placeholder="ex : Le café de la Gare"
                  maxLength={MAX_VENUE_LABEL}
                  className="rounded-xl text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className={`text-xs font-semibold ${theme.mutedText}`} htmlFor="petit-mot">
                Un petit mot pour {config.senderName} ?
              </label>
              <Textarea
                id="petit-mot"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                placeholder="ex : J'ai hâte !"
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            <Button
              onClick={handleFinalSubmit}
              disabled={respondMutation.isPending}
              className={`w-full ${theme.buttonBg} rounded-2xl py-4 font-bold text-base shadow-xl`}>
              {respondMutation.isPending ? "Validation..." : "Valider mon billet de confirmation"}
            </Button>
          </Card>
        )}

        {/* ÉCRAN BILLET */}
        {screen === ECRANS.billet && (
          <Card className={`p-8 rounded-[36px] ${theme.cardBg} ${theme.textColor} shadow-2xl text-center space-y-6 animate-scaleUp`}>
            <div className={`w-16 h-16 rounded-full ${theme.accentSoft} flex items-center justify-center mx-auto text-3xl shadow-inner`}>
              🎉
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold">C'est un grand OUI !</h2>
              {/* La réponse est enregistrée avant toute tentative d'envoi, et
                  l'envoi peut échouer. Affirmer sans condition que le message
                  est arrivé mentait au destinataire dès que la notification
                  ne partait pas. */}
              <p className={`text-xs ${theme.mutedText}`}>
                {emailEnvoye
                  ? `${config.senderName} a reçu ta réponse par e-mail.`
                  : `Ta réponse est bien enregistrée. ${config.senderName} la retrouvera sur son lien de suivi.`}
              </p>
            </div>

            <div className={`border rounded-2xl p-4 text-left space-y-2 text-xs ${theme.panelBg}`}>
              <p><span className="font-bold">Créneau :</span> {selectedSlot?.label}</p>
              {selectedSlot && slotStartsAt(selectedSlot) && (
                <p>
                  <span className="font-bold">Date :</span>{" "}
                  {format(new Date(slotStartsAt(selectedSlot)!), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                </p>
              )}
              <p><span className="font-bold">Menu :</span> {selectedMenu || "Au choix"}</p>
              {customVenue && <p><span className="font-bold">Lieu :</span> {customVenue}</p>}
              {customNote && <p><span className="font-bold">Note :</span> « {customNote} »</p>}
            </div>

            <p className={`text-xs italic ${theme.labelText}`}>
              {config.finalMessage || "Prépare ton plus beau sourire !"}
            </p>

            {calendarFile ? (
              <Button
                onClick={() => {
                  const blob = new Blob([calendarFile], { type: "text/calendar;charset=utf-8" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "rendez-vous.ics";
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success("Fichier .ics téléchargé !");
                }}
                className={`w-full ${theme.buttonBg} rounded-2xl py-3 font-semibold text-xs flex items-center justify-center gap-2`}>
                <Download className="w-4 h-4" /> Ajouter au calendrier (.ics)
              </Button>
            ) : (
              <p className={`text-[11px] ${theme.labelText}`}>
                Ce créneau n'a pas de date précise : aucun fichier calendrier n'est disponible.
              </p>
            )}

            {/* Proposé seulement si le créateur a renseigné un numéro : sans
                lui, le bouton ouvrirait une conversation dans le vide. */}
            {lienNotificationWhatsApp && (
              <a
                href={lienNotificationWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full ${theme.optionIdle} border rounded-2xl py-3 font-semibold text-xs flex items-center justify-center gap-2 min-h-11`}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2} />
                Prévenir {config.senderName} sur WhatsApp
              </a>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}
