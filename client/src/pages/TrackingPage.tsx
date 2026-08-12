import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, ArrowLeft, Copy, CheckCircle2, Clock, Calendar, Utensils, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function TrackingPage() {
  const [, params] = useRoute("/track/:token");
  const token = params?.token || "";
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.invitations.getByToken.useQuery({ token }, {
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
        <div className="text-4xl">🔒</div>
        <h1 className="text-2xl font-bold">Lien de suivi invalide ou expiré</h1>
        <p className="text-sm text-stone-400 max-w-md">
          Ce lien de suivi ne correspond à aucune invitation active.
        </p>
        <Button onClick={() => setLocation("/")} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const { invitation, responses } = data;
  const config = invitation.config as any;
  const hasResponded = responses.length > 0;
  const latestResponse = hasResponded ? (responses[responses.length - 1] as any).answer : null;

  const fullRecipientUrl = `${window.location.origin}/r/${invitation.slug}`;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-stone-900">Tableau de suivi Dis oui</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-stone-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider">
                Invitation pour {config.recipientName}
              </span>
              <h1 className="text-2xl font-extrabold text-stone-900">
                {config.question}
              </h1>
              <p className="text-xs text-stone-500">Créée le {new Date(invitation.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center gap-2">
              {hasResponded ? (
                <div className="px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center gap-2 shadow-inner">
                  <CheckCircle2 className="w-4 h-4" /> Répondue (OUI)
                </div>
              ) : invitation.openedAt ? (
                <div className="px-4 py-2 rounded-2xl bg-amber-100 text-amber-700 text-sm font-bold flex items-center gap-2 shadow-inner">
                  <Clock className="w-4 h-4" /> Vue par {config.recipientName}
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-stone-100 text-stone-600 text-sm font-bold flex items-center gap-2 shadow-inner">
                  <Clock className="w-4 h-4" /> En attente d'ouverture
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-stone-800 text-sm">Lien unique partagé</h3>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={fullRecipientUrl} 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-700"
              />
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(fullRecipientUrl);
                  toast.success("Lien copié !");
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 text-xs">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {hasResponded && latestResponse && (
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-rose-900 text-base flex items-center gap-2">
                ✨ Réponse de {config.recipientName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700">
                <div className="bg-white p-4 rounded-xl border border-rose-100 space-y-1">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-rose-600" /> Créneau choisi</p>
                  <p>{latestResponse.day}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-rose-100 space-y-1">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5"><Utensils className="w-4 h-4 text-rose-600" /> Menu choisi</p>
                  <p>{latestResponse.menu}</p>
                </div>
                {latestResponse.venue && (
                  <div className="bg-white p-4 rounded-xl border border-rose-100 space-y-1">
                    <p className="font-bold text-stone-900 flex items-center gap-1.5">📍 Lieu proposé</p>
                    <p>{latestResponse.venue}</p>
                  </div>
                )}
                {latestResponse.customNote && (
                  <div className="bg-white p-4 rounded-xl border border-rose-100 space-y-1">
                    <p className="font-bold text-stone-900 flex items-center gap-1.5">💬 Note personnelle</p>
                    <p>« {latestResponse.customNote} »</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
