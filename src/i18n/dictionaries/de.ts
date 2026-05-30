import type { Dictionary } from "./es";

export const de: Dictionary = {
  nav: {
    workspace: "Arbeitsbereich",
    comunicacion: "Kommunikation",
    crecimiento: "Wachstum",
    sistema: "System",
    dashboard: "Dashboard",
    pipeline: "Pipeline",
    clientes: "Kunden",
    conversaciones: "Konversationen",
    agenda: "Kalender",
    iaReceptionist: "KI-Empfang",
    campanas: "KI-Kampagnen",
    metricas: "Kennzahlen",
    configuracion: "Einstellungen",
  },
  topbar: {
    searchPlaceholder: "Kunden, Konversationen, Automatisierungen suchen…",
    myAutomations: "Meine Automatisierungen",
    help: "Hilfe",
    notifications: "Benachrichtigungen",
  },
  common: {
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    edit: "Bearbeiten",
    create: "Erstellen",
    search: "Suchen",
    loading: "Wird geladen…",
    back: "Zurück",
    next: "Weiter",
    confirm: "Bestätigen",
    language: "Sprache",
  },
  signin: {
    welcome: "Willkommen zurück",
    subtitle: "Melde dich mit deiner E-Mail an. Wir senden dir einen Einmal-Link.",
    emailLabel: "E-Mail",
    emailPlaceholder: "du@klinik.com",
    submit: "Link senden",
    sent: "Wenn deine E-Mail registriert ist, erhältst du in Kürze einen Link. In der Entwicklung siehe auch die Server-Konsole.",
    error: "Der Link konnte nicht gesendet werden. Stelle sicher, dass deine E-Mail von der Klinik registriert ist.",
    valueProp: "Automatisiere dein Unternehmen mit KI über ein einziges Dashboard.",
    valuePropSub: "Virtueller Empfang, CRM, Kalender, intelligente Kampagnen und Echtzeit-Kennzahlen — alles verbunden.",
    noAccount: "Bist du Inhaber/in ohne Konto?",
    startOnboarding: "Onboarding starten",
  },
  landing: {
    navProduct: "Produkt",
    navSectors: "Branchen",
    navCampaigns: "KI-Kampagnen",
    navClients: "Kunden",
    navDemo: "CRM-Demo",
    signIn: "Anmelden",
    getStarted: "Loslegen",

    heroBadge: "Neu · ROI-Prognose vor dem Versand",
    heroTitleA: "Eine Plattform",
    heroTitleB: "für jedes Unternehmen.",
    heroHighlight: "Ergebnisse",
    heroTitleC: "für alle.",
    heroSubtitle:
      "Verbinde, automatisiere und skaliere dein Unternehmen mit intelligenten Modulen, die mit dir wachsen. CRM, KI-Empfang, Kalender und Kampagnen auf einer einzigen Plattform.",
    exploreSectors: "Branchen entdecken",
    seeHow: "So funktioniert's",
    noCard: "Ohne Karte starten",
    onboarding10: "Onboarding in 10 Minuten",
    supportEs: "Support in deiner Sprache",
    socialProof: "4,9 von 5 · 250+ Unternehmen mit Aizorix automatisiert",
    statusOperational: "Betriebsbereit · 99,97 % Verfügbarkeit",
    activeAutomations: "Aktive Automatisierungen",
  },
  onboarding: {
    eyebrow: "Intelligentes Onboarding",
    saveAndExit: "Speichern und beenden",
    footerGdpr: "DSGVO",
    footerSecure: "Sicher",
    footerCloud: "100 % Cloud",

    back: "Zurück",
    continue: "Weiter",
    finish: "Fertigstellen",
    stepOf: "Schritt {current} von {total}",

    ai: {
      uploadTitle: "Lade Dokumente mit deinen Unternehmensinformationen hoch",
      uploadHint:
        "Preislisten, FAQ, Leistungsbeschreibungen, Handbücher… Wir verwenden sie, um deine KI zu trainieren.",
      dropzoneTitle: "Dateien hier ablegen",
      dropzoneSub: "PDF, DOCX, TXT, MD, CSV · max. 10 MB pro Datei",
      dropzoneButton: "Dateien auswählen",
      uploadedHeader: "Hochgeladene Dokumente",
      empty: "Du hast noch keine Dokumente hochgeladen.",
      remove: "Entfernen",
      retry: "Erneut versuchen",
      statusReady: "Verarbeitet",
      statusPending: "Ausstehend · füge den Inhalt unten ein",
      statusError: "Fehler",
      errTooLarge: "Die Datei ist größer als 10 MB.",
      errType: "Format nicht unterstützt.",
      errRead: "Die Datei konnte nicht gelesen werden.",
      pendingNotice:
        "Binärdateien (PDF, DOCX) werden akzeptiert, ihr Inhalt wird aber noch nicht automatisch extrahiert. Füge den wichtigsten Text in das Notizfeld ein, damit deine KI ihn lernen kann.",
      words: "{n} Wörter",
      notesLabel: "Zusätzliche Notizen für deine KI",
      notesPlaceholder:
        "Füge hier alle weiteren Informationen ein, die deine KI kennen soll: Richtlinien, Aktionen, FAQ, Stornierungen…",
      notesHint:
        "Deine KI merkt sich diesen Text und verwendet ihn in jeder Konversation.",
      toneLabel: "Tonfall der KI",
      toneProfessional: "Professionell",
      toneProfessionalDesc: "Höflich, direkt, technisch.",
      toneFriendly: "Freundlich",
      toneFriendlyDesc: "Warm, einfühlsam, konversationell.",
      toneCasual: "Locker",
      toneCasualDesc: "Entspannt, jugendlich, informell.",
      introLabel: "Begrüßungsnachricht",
      introHint:
        "Erste Nachricht, die die KI sendet, wenn ein Kunde ein Gespräch beginnt.",
      askEmailTitle: "Neue Kund:innen nach E-Mail fragen",
      askEmailDesc:
        "Die KI fragt beim Erstkontakt nach Name, Telefon und E-Mail.",
      pushBookingTitle: "Immer Richtung Buchung lenken",
      pushBookingDesc:
        "Die KI schlägt echte Slots vor und schließt die Buchung natürlich ab.",
      learnTitle: "Deine KI lernt über",
      learnServices: "Deine Leistungen und Preise",
      learnHours: "Deine Zeiten und Verfügbarkeit",
      learnDocs: "Die Dokumente, die du in diesem Schritt hochlädst",
      learnNotes: "Die zusätzlichen Notizen, die du schreibst",
      tip: "Tipp",
      tipBody:
        "Je mehr Informationen du hochlädst, desto besser antwortet deine KI. Beginne mit der Preisliste und den meistverkauften Leistungen.",
      autoTrainNotice:
        "Deine KI wird automatisch mit deinen Leistungen, Zeiten und Preisen trainiert. Du kannst das Verhalten unter Einstellungen › KI im CRM feinjustieren.",
    },

    steps: {
      negocio: {
        label: "Dein Unternehmen",
        short: "Dein Unternehmen",
        highlight: "Unternehmen",
        description:
          "Erzähl uns, wer du bist: Name, Branche, Standort, Kontakt, Filialen und Mitarbeitende. Wir konfigurieren deine Plattform mit Modulen, die zu deiner Tätigkeit passen.",
      },
      serviciosYAgenda: {
        label: "Leistungen und Kalender",
        short: "Leistungen & Kalender",
        highlight: "Kalender",
        description:
          "Trage deine Behandlungen, Preise und Dauern ein und konfiguriere deine Öffnungszeiten (inkl. geteilter Schichten).",
      },
      canales: {
        label: "Kanäle verbinden",
        short: "Kanäle verbinden",
        highlight: "Kanäle",
        description:
          "Verbinde die Kanäle, über die du mit deinen Kunden kommunizierst: WhatsApp, Instagram, Facebook, Webformulare und Google Kalender.",
      },
      ia: {
        label: "Trainiere deine KI",
        short: "Trainiere deine KI",
        highlight: "deine KI",
        description:
          "Lade Dokumente hoch und konfiguriere, wie sich dein KI-Assistent verhalten soll — Ton, Sprache und spezifische Anweisungen.",
      },
      activar: {
        label: "Aktiviere dein System",
        short: "Aktiviere dein System",
        highlight: "dein System",
        description:
          "Überprüfe deine Konfiguration und aktiviere das System. Du bist fast bereit!",
      },
    },
  },
};
