import type { Dictionary } from "./es";

export const en: Dictionary = {
  nav: {
    workspace: "Workspace",
    comunicacion: "Communication",
    crecimiento: "Growth",
    sistema: "System",
    dashboard: "Dashboard",
    pipeline: "Pipeline",
    clientes: "Clients",
    conversaciones: "Conversations",
    agenda: "Calendar",
    iaReceptionist: "AI Receptionist",
    campanas: "AI Campaigns",
    metricas: "Metrics",
    configuracion: "Settings",
  },
  topbar: {
    searchPlaceholder: "Search clients, conversations, automations…",
    myAutomations: "My automations",
    help: "Help",
    notifications: "Notifications",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    loading: "Loading…",
    back: "Back",
    next: "Next",
    confirm: "Confirm",
    language: "Language",
  },
  signin: {
    welcome: "Welcome back",
    subtitle: "Sign in with your email. We'll send you a one-time link.",
    emailLabel: "Email",
    emailPlaceholder: "you@clinic.com",
    submit: "Send link",
    sent: "If your email is registered, you'll receive a link shortly. In development, also check the server console.",
    error: "We couldn't send the link. Make sure your email is registered by the clinic.",
    valueProp: "Automate your business with AI from a single dashboard.",
    valuePropSub: "Virtual receptionist, CRM, calendar, smart campaigns and real-time metrics — all connected.",
    noAccount: "Are you an owner without an account yet?",
    startOnboarding: "Start onboarding",
  },
  landing: {
    navProduct: "Product",
    navSectors: "Sectors",
    navCampaigns: "AI Campaigns",
    navClients: "Customers",
    navDemo: "CRM Demo",
    signIn: "Sign in",
    getStarted: "Get started",

    heroBadge: "New · ROI forecast before you send",
    heroTitleA: "One platform",
    heroTitleB: "for every business.",
    heroHighlight: "Results",
    heroTitleC: "for everyone.",
    heroSubtitle:
      "Connect, automate and scale your business with smart modules designed to grow with you. CRM, AI receptionist, calendar and campaigns in a single platform.",
    exploreSectors: "Explore sectors",
    seeHow: "See how it works",
    noCard: "No card to start",
    onboarding10: "Onboarding in 10 minutes",
    supportEs: "Support in your language",
    socialProof: "4.9 out of 5 · 250+ businesses automated with Aizorix",
    statusOperational: "Operational · 99.97% uptime",
    activeAutomations: "Active automations",
  },
  onboarding: {
    eyebrow: "Smart onboarding",
    saveAndExit: "Save and exit",
    footerGdpr: "GDPR",
    footerSecure: "Secure",
    footerCloud: "100% cloud",

    back: "Back",
    continue: "Continue",
    finish: "Finish",
    stepOf: "Step {current} of {total}",

    ai: {
      uploadTitle: "Upload documents with your business information",
      uploadHint:
        "Price lists, FAQs, service descriptions, manuals… We'll use them to train your AI.",
      dropzoneTitle: "Drag your files here",
      dropzoneSub: "PDF, DOCX, TXT, MD, CSV · max. 10 MB each",
      dropzoneButton: "Select files",
      uploadedHeader: "Uploaded documents",
      empty: "You haven't uploaded any documents yet.",
      remove: "Remove",
      retry: "Retry",
      statusReady: "Processed",
      statusPending: "Pending · paste the content below",
      statusError: "Error",
      errTooLarge: "File exceeds 10 MB.",
      errType: "Unsupported format.",
      errRead: "Couldn't read the file.",
      pendingNotice:
        "Binary files (PDF, DOCX) are accepted but their content isn't extracted automatically yet. Paste the key text in the notes field so your AI can learn it.",
      words: "{n} words",
      notesLabel: "Additional notes for your AI",
      notesPlaceholder:
        "Paste any extra information your AI should know: policies, promotions, FAQs, cancellations…",
      notesHint:
        "Your AI will remember this text and use it in every conversation.",
      toneLabel: "AI tone",
      toneProfessional: "Professional",
      toneProfessionalDesc: "Polite, direct, technical.",
      toneFriendly: "Friendly",
      toneFriendlyDesc: "Warm, empathetic, conversational.",
      toneCasual: "Casual",
      toneCasualDesc: "Relaxed, youthful, informal.",
      introLabel: "Welcome message",
      introHint:
        "First message the AI sends when a customer starts a conversation.",
      askEmailTitle: "Ask new customers for their email",
      askEmailDesc:
        "The AI will ask for name, phone and email on first contact.",
      pushBookingTitle: "Always push toward booking",
      pushBookingDesc:
        "The AI will propose real slots and close the booking naturally.",
      learnTitle: "Your AI will learn about",
      learnServices: "Your services and prices",
      learnHours: "Your hours and availability",
      learnDocs: "The documents you upload in this step",
      learnNotes: "The additional notes you write",
      tip: "Tip",
      tipBody:
        "The more information you upload, the better your AI will respond. Start with your price list and best-selling services.",
      autoTrainNotice:
        "Your AI will be trained automatically with your services, hours and prices. You can fine-tune behavior under Settings › AI in the CRM.",
    },

    steps: {
      negocio: {
        label: "Your business",
        short: "Your business",
        highlight: "business",
        description:
          "Tell us who you are: name, sector, location, contact, locations and employees. We'll configure your platform with modules specific to your activity.",
      },
      serviciosYAgenda: {
        label: "Services and calendar",
        short: "Services & calendar",
        highlight: "calendar",
        description:
          "Add your treatments, prices, durations and configure your business hours (including split shifts).",
      },
      canales: {
        label: "Connect channels",
        short: "Connect channels",
        highlight: "channels",
        description:
          "Connect the channels you'll use to talk to your customers: WhatsApp, Instagram, Facebook, web forms and Google Calendar.",
      },
      ia: {
        label: "Train your AI",
        short: "Train your AI",
        highlight: "your AI",
        description:
          "Upload documents and configure how your AI assistant should behave — tone, language and specific instructions.",
      },
      activar: {
        label: "Activate your system",
        short: "Activate your system",
        highlight: "your system",
        description:
          "Review your configuration and activate the system. You're almost ready!",
      },
    },
  },
};
