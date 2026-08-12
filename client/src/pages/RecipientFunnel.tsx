import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { resolveTheme, MENU_OPTIONS_PRESETS } from "@/lib/themes";
import { trpc } from "@/lib/trpc";
import { normalizeDateSlots, slotStartsAt, type DateSlot } from "@shared/invitationConfig";
import { buildRendezVousIcs } from "@shared/ics";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Sparkles, Calendar, Utensils, CheckCircle2, Download, Share2, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function RecipientFunnel() {
  const [, params] = useRoute("/r/:slug");
  const slug = params?.slug || "";

  const { data: invitation, isLoading, error } = trpc.invitations.getBySlug.useQuery({ slug }, {
    enabled: !!slug,
    retry: false,
  });

  const respondMutation = trpc.invitations.respond.useMutation({
    onSuccess: () => {
      setScreen(5); // Ticket screen
      toast.success("Votre réponse a été transmise avec succès !");
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de l'envoi de la réponse.");
    }
  });

  const [screen, setScreen] = useState(0); // 0: Threshold envelope, 1: Question, 2: Reaction, 3: Date/Time, 4: Menu, 5: Ticket
  const [refusCount, setRefusCount] = useState(0);
  const [noBtnPos, setNoBtnPos] = useState<{ x: number; y: number } | null>(null);

  // Response choices
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
        <div className="text-4xl">💌</div>
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

  // Handle fleeing "No" button
  const handleNoInteraction = (e: any) => {
    e.preventDefault();
    const maxTries = config.maxRefusals || 12;
    if (refusCount >= maxTries) return;

    setRefusCount(prev => prev + 1);
    
    // Calculate random offset
    const randomX = (Math.random() - 0.5) * 240;
    const randomY = (Math.random() - 0.5) * 180;
    setNoBtnPos({ x: randomX, y: randomY });
  };

  const handleYes = () => {
    if (refusCount > 0) {
      setScreen(2); // Reaction screen if tried to refuse
    } else {
      setScreen(3); // Date screen directly
    }
  };

  const handleFinalSubmit = () => {
    if (!selectedSlot) {
      toast.error("Choisis d'abord un créneau.");
      setScreen(3);
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden relative font-sans select-none`}>
      
      {/* Background ambient particles / glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* SCREEN 0: Threshold Envelope */}
        {screen === 0 && (
          <Card className="p-8 rounded-[36px] bg-white/90 backdrop-blur-xl shadow-2xl border-rose-200 text-center space-y-6 animate-scaleUp">
            <div className="w-24 h-24 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-4xl shadow-inner animate-bounce">
              {config.emoji || "💌"}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-stone-500 font-bold">Message secret</p>
              <h1 className="text-2xl font-extrabold text-stone-900">
                {config.recipientName}, quelqu'un t'a laissé un message...
              </h1>
              <p className="text-xs text-stone-600">De la part de <span className="font-bold text-stone-800">{config.senderName}</span></p>
            </div>
            <Button 
              onClick={() => setScreen(1)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-4 font-bold text-base shadow-xl shadow-rose-600/30 transition-all hover:scale-105">
              Ouvrir l'enveloppe 🔓
            </Button>
          </Card>
        )}

        {/* SCREEN 1: The Question */}
        {screen === 1 && (
          <Card className="p-8 rounded-[36px] bg-white/90 backdrop-blur-xl shadow-2xl border-rose-200 text-center space-y-8 animate-fadeIn">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 flex items-center justify-center text-4xl shadow-inner">
              {config.emoji || "💌"}
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-rose-600 font-bold">Invitation exclusive</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 leading-snug">
                {config.question}
              </h2>
              {refusCount > 0 && (
                <p className="text-xs font-semibold text-rose-500 animate-pulse">
                  {config.teases?.[Math.min(refusCount - 1, (config.teases?.length || 1) - 1)] || "Tu hésites encore ?"} ({refusCount} refus)
                </p>
              )}
            </div>

            <div className="space-y-3 relative min-h-[140px] flex flex-col justify-center">
              <Button 
                onClick={handleYes}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-4 font-bold text-base shadow-xl shadow-rose-600/30 transition-all hover:scale-105 z-10">
                Oui, avec immense plaisir ✨
              </Button>

              {config.noButtonBehavior !== "desactive" && (
                <button
                  onMouseEnter={config.noButtonBehavior === 'fuyant' || config.noButtonBehavior === 'les_deux' ? handleNoInteraction : undefined}
                  onTouchStart={config.noButtonBehavior === 'fuyant' || config.noButtonBehavior === 'les_deux' ? handleNoInteraction : undefined}
                  onClick={handleNoInteraction}
                  style={noBtnPos ? { transform: `translate(${noBtnPos.x}px, ${noBtnPos.y}px)` } : {}}
                  className={`w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs border border-stone-200 transition-all ${
                    config.noButtonBehavior === 'retrecissant' || config.noButtonBehavior === 'les_deux'
                      ? `scale-${Math.max(40, 100 - refusCount * 10)}`
                      : ''
                  }`}
                >
                  Non (refuser)
                </button>
              )}
            </div>
          </Card>
        )}

        {/* SCREEN 2: Reaction (if tried to refuse) */}
        {screen === 2 && (
          <Card className="p-8 rounded-[36px] bg-white/90 backdrop-blur-xl shadow-2xl border-rose-200 text-center space-y-6 animate-scaleUp">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl shadow-inner">
              🤭
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-stone-900">Nice try !</h2>
              <p className="text-sm text-stone-600">
                Tu as essayé de cliquer sur Non <span className="font-bold text-rose-600">{refusCount} fois</span>. Mais au fond, tu savais très bien que tu dirais Oui !
              </p>
            </div>
            <Button 
              onClick={() => setScreen(3)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-4 font-bold text-base shadow-xl">
              Continuer vers les créneaux 📅
            </Button>
          </Card>
        )}

        {/* SCREEN 3: Date & Time slots */}
        {screen === 3 && (
          <Card className="p-8 rounded-[36px] bg-white/90 backdrop-blur-xl shadow-2xl border-rose-200 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-stone-900">Quand est-on libre ?</h2>
              <p className="text-xs text-stone-600">Choisis ton créneau préféré pour notre rendez-vous.</p>
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
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-rose-500 bg-rose-50 font-bold text-rose-900 shadow-sm"
                        : "border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span>
                      <span className="text-sm block">{slot.label}</span>
                      {startsAt && (
                        <span className="text-[11px] font-normal text-stone-500">
                          {format(new Date(startsAt), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                        </span>
                      )}
                    </span>
                    <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setScreen(4)}
              disabled={!selectedSlot}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-4 font-bold text-base shadow-xl disabled:opacity-40">
              {selectedSlot ? "Étape suivante : Le menu 🍽️" : "Choisis un créneau pour continuer"}
            </Button>
          </Card>
        )}

        {/* SCREEN 4: Menu selection */}
        {screen === 4 && (
          <Card className="p-8 rounded-[36px] bg-white/90 backdrop-blur-xl shadow-2xl border-rose-200 space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-stone-900">Qu'est-ce qu'on mange ?</h2>
              <p className="text-xs text-stone-600">Sélectionne tes envies gourmandes pour la soirée.</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {(config.selectedMenuOptions || ["sushi", "italien", "bistrot"]).map((optId: string) => {
                const found = MENU_OPTIONS_PRESETS.find(m => m.id === optId) || { emoji: "🍽️", label: optId };
                const isSelected = selectedMenu === found.label;
                return (
                  <div
                    key={optId}
                    onClick={() => setSelectedMenu(found.label)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected ? "border-rose-500 bg-rose-50 font-bold text-rose-900 shadow-sm" : "border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-xl">{found.emoji}</span>
                    <span className="text-sm">{found.label}</span>
                  </div>
                );
              })}
            </div>

            {config.includeVenue && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">Proposer un lieu (optionnel)</label>
                <Input 
                  value={customVenue} 
                  onChange={(e) => setCustomVenue(e.target.value)} 
                  placeholder="ex: Le café de la Gare" 
                  className="rounded-xl text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">Un petit mot pour {config.senderName} ?</label>
              <Textarea 
                value={customNote} 
                onChange={(e) => setCustomNote(e.target.value)} 
                placeholder="ex: J'ai hâte !" 
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            <Button 
              onClick={handleFinalSubmit}
              disabled={respondMutation.isPending}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-4 font-bold text-base shadow-xl">
              {respondMutation.isPending ? "Validation..." : "Valider mon billet de confirmation ✨"}
            </Button>
          </Card>
        )}

        {/* SCREEN 5: Confirmation Ticket */}
        {screen === 5 && (
          <Card className="p-8 rounded-[36px] bg-white shadow-2xl border-rose-200 text-center space-y-6 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              🎉
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-stone-900">C'est un grand OUI !</h2>
              <p className="text-xs text-stone-600">
                {config.senderName} a reçu ta réponse et son e-mail de confirmation.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2 text-xs text-stone-700">
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

            <p className="text-xs text-stone-500 italic">
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
                className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-2xl py-3 font-semibold text-xs flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Ajouter au calendrier (.ics)
              </Button>
            ) : (
              <p className="text-[11px] text-stone-400">
                Ce créneau n'a pas de date précise : aucun fichier calendrier n'est disponible.
              </p>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}
