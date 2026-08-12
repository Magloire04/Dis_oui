export function generateIcsFile(params: {
  title: string;
  description: string;
  location: string;
  dateStr: string;
  timeStr: string;
}): string {
  const nowIso = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dis oui//Rendez-vous//FR
BEGIN:VEVENT
UID:${Date.now()}@disouiapp.com
DTSTAMP:${nowIso}
SUMMARY:${params.title}
DESCRIPTION:${params.description}
LOCATION:${params.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

export async function sendCreatorNotification(options: {
  toEmail: string;
  recipientName: string;
  senderName: string;
  answerDetails: {
    day: string;
    time: string;
    menu: string;
    venue: string;
    customNote: string;
  };
  trackingUrl: string;
  theme: string;
}) {
  console.log(`[Email / Resend Simulation] Sending notification to ${options.toEmail}: ${options.recipientName} a dit OUI à ${options.senderName} !`);
  
  const icsContent = generateIcsFile({
    title: `Rendez-vous : ${options.senderName} & ${options.recipientName}`,
    description: `Menu choisi: ${options.recipientName} a choisi ${options.answerDetails.menu} à ${options.answerDetails.time}. Note: ${options.answerDetails.customNote}`,
    location: options.answerDetails.venue || "Lieu secret / à définir",
    dateStr: options.answerDetails.day,
    timeStr: options.answerDetails.time,
  });

  return { success: true, icsContent };
}
