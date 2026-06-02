import type { Dictionary } from "./es";

export const fr: Dictionary = {
  nav: {
    workspace: "Espace de travail",
    comunicacion: "Communication",
    crecimiento: "Croissance",
    sistema: "Système",
    dashboard: "Tableau de bord",
    pipeline: "Pipeline",
    clientes: "Clients",
    conversaciones: "Conversations",
    agenda: "Agenda",
    iaReceptionist: "Réceptionniste IA",
    campanas: "Campagnes IA",
    metricas: "Métriques",
    configuracion: "Paramètres",
  },
  topbar: {
    searchPlaceholder: "Rechercher clients, conversations, automatisations…",
    myAutomations: "Mes automatisations",
    help: "Aide",
    notifications: "Notifications",
  },
  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    create: "Créer",
    search: "Rechercher",
    loading: "Chargement…",
    back: "Retour",
    next: "Suivant",
    confirm: "Confirmer",
    language: "Langue",
  },
  signin: {
    welcome: "Bon retour",
    subtitle: "Connectez-vous avec votre e-mail. Nous vous enverrons un lien à usage unique.",
    emailLabel: "E-mail",
    emailPlaceholder: "vous@clinique.com",
    submit: "Envoyer le lien",
    sent: "Si votre e-mail est enregistré, vous recevrez un lien sous peu. En développement, vérifiez aussi la console du serveur.",
    error: "Nous n'avons pas pu envoyer le lien. Vérifiez que votre e-mail est enregistré par la clinique.",
    valueProp: "Automatisez votre entreprise avec l'IA depuis un seul tableau de bord.",
    valuePropSub: "Réceptionniste virtuel, CRM, agenda, campagnes intelligentes et métriques en temps réel — tout connecté.",
    noAccount: "Vous êtes propriétaire sans compte ?",
    startOnboarding: "Démarrer l'intégration",
  },
  landing: {
    navProduct: "Produit",
    navSectors: "Secteurs",
    navCampaigns: "Campagnes IA",
    navClients: "Clients",
    navDemo: "Démo CRM",
    signIn: "Se connecter",
    getStarted: "Commencer",

    heroBadge: "Nouveau · ROI prévu avant l'envoi",
    heroTitleA: "Une plateforme",
    heroTitleB: "pour chaque entreprise.",
    heroHighlight: "Résultats",
    heroTitleC: "pour tous.",
    heroSubtitle:
      "Connectez, automatisez et développez votre entreprise avec des modules intelligents conçus pour grandir avec vous. CRM, réceptionniste IA, agenda et campagnes sur une seule plateforme.",
    exploreSectors: "Explorer les secteurs",
    seeHow: "Voir comment ça marche",
    noCard: "Sans carte pour commencer",
    onboarding10: "Intégration en 10 minutes",
    supportEs: "Support dans votre langue",
    socialProof: "4,9 sur 5 · +250 entreprises automatisées avec Aizorix",
    statusOperational: "Opérationnel · 99,97 % de disponibilité",
    activeAutomations: "Automatisations actives",
  },
  onboarding: {
    eyebrow: "Intégration intelligente",
    saveAndExit: "Enregistrer et quitter",
    footerGdpr: "RGPD",
    footerSecure: "Sécurisé",
    footerCloud: "100 % cloud",

    back: "Retour",
    continue: "Continuer",
    finish: "Terminer",
    stepOf: "Étape {current} sur {total}",

    ai: {
      uploadTitle: "Téléversez des documents contenant les infos de votre entreprise",
      uploadHint:
        "Tarifs, FAQ, descriptions de services, manuels… Nous les utiliserons pour entraîner votre IA.",
      dropzoneTitle: "Déposez vos fichiers ici",
      dropzoneSub: "PDF, DOCX, TXT, MD, CSV · max. 10 Mo chacun",
      dropzoneButton: "Sélectionner des fichiers",
      uploadedHeader: "Documents téléversés",
      empty: "Vous n'avez encore téléversé aucun document.",
      remove: "Supprimer",
      retry: "Réessayer",
      statusReady: "Traité",
      statusPending: "En attente · collez le contenu ci-dessous",
      statusError: "Erreur",
      errTooLarge: "Le fichier dépasse 10 Mo.",
      errType: "Format non pris en charge.",
      errRead: "Impossible de lire le fichier.",
      pendingNotice:
        "Les fichiers binaires (PDF, DOCX) sont acceptés mais leur contenu n'est pas encore extrait automatiquement. Collez le texte clé dans le champ de notes pour que votre IA puisse l'apprendre.",
      words: "{n} mots",
      notesLabel: "Notes supplémentaires pour votre IA",
      notesPlaceholder:
        "Collez ici toute information supplémentaire que votre IA doit connaître : politiques, promotions, FAQ, annulations…",
      notesHint:
        "Votre IA retiendra ce texte et l'utilisera dans chaque conversation.",
      toneLabel: "Ton de l'IA",
      toneProfessional: "Professionnel",
      toneProfessionalDesc: "Poli, direct, technique.",
      toneFriendly: "Chaleureux",
      toneFriendlyDesc: "Chaleureux, empathique, conversationnel.",
      toneCasual: "Décontracté",
      toneCasualDesc: "Décontracté, jeune, informel.",
      introLabel: "Message de bienvenue",
      introHint:
        "Premier message envoyé par l'IA lorsqu'un client commence une conversation.",
      askEmailTitle: "Demander l'e-mail des nouveaux clients",
      askEmailDesc:
        "L'IA demandera le nom, le téléphone et l'e-mail au premier contact.",
      pushBookingTitle: "Toujours pousser vers la réservation",
      pushBookingDesc:
        "L'IA proposera des créneaux réels et conclura la réservation naturellement.",
      learnTitle: "Votre IA apprendra sur",
      learnServices: "Vos services et tarifs",
      learnHours: "Vos horaires et disponibilités",
      learnDocs: "Les documents que vous téléversez à cette étape",
      learnNotes: "Les notes supplémentaires que vous écrivez",
      tip: "Astuce",
      tipBody:
        "Plus vous téléversez d'informations, mieux votre IA répondra. Commencez par votre grille tarifaire et vos services phares.",
      autoTrainNotice:
        "Votre IA sera entraînée automatiquement avec vos services, horaires et tarifs. Vous pourrez ajuster le comportement depuis Paramètres › IA dans le CRM.",
    },

    crmMode: {
      subtitle:
        "Aizorix s'adapte à votre façon de travailler. Choisissez — vous pouvez changer à tout moment.",
      recommendedBadge: "Recommandé",
      flexibilityNote:
        "Ce choix n'est pas définitif. Vous pouvez changer de mode depuis Paramètres › Modules.",
      aizorixTitle: "Utiliser le CRM Aizorix",
      aizorixDesc:
        "Aizorix devient votre système principal de gestion clients.",
      aizorixBullet1: "CRM visuel, pipeline, agenda et métriques inclus.",
      aizorixBullet2: "Importez vos données via CSV à tout moment.",
      aizorixBullet3: "Configuration en moins de 10 minutes.",
      externalTitle: "Connecter mon CRM",
      externalDesc:
        "Gardez votre CRM actuel ; Aizorix synchronise via API.",
      externalBullet1: "Générez un jeton API après l'activation.",
      externalBullet2: "Connectez HubSpot, Pipedrive, Zoho ou le vôtre.",
      externalBullet3: "Rien ne bouge tant que vous ne le décidez.",
      noneTitle: "Commencer sans CRM",
      noneDesc:
        "Uniquement IA + WhatsApp + agenda. Activez le CRM plus tard.",
      noneBullet1: "Configuration initiale minimale.",
      noneBullet2: "Idéal pour tester l'IA avant de migrer.",
      noneBullet3: "Activez les modules un par un depuis Paramètres.",
    },
    steps: {
      modo: {
        label: "Choisissez votre mode",
        short: "Mode",
        highlight: "mode",
        description:
          "Comment voulez-vous travailler avec Aizorix ? Utilisez notre CRM, connectez le vôtre, ou commencez sans CRM et activez-le plus tard.",
      },
      negocio: {
        label: "Votre entreprise",
        short: "Votre entreprise",
        highlight: "entreprise",
        description:
          "Dites-nous qui vous êtes : nom, secteur, localisation, contact, sites et employés. Nous configurerons votre plateforme avec des modules spécifiques à votre activité.",
      },
      serviciosYAgenda: {
        label: "Services et agenda",
        short: "Services et agenda",
        highlight: "agenda",
        description:
          "Ajoutez vos traitements, prix et durées, puis configurez vos horaires d'ouverture (services coupés inclus).",
      },
      canales: {
        label: "Connectez vos canaux",
        short: "Connectez vos canaux",
        highlight: "canaux",
        description:
          "Connectez les canaux que vous utiliserez pour communiquer avec vos clients : WhatsApp, Instagram, Facebook, formulaires web et Google Calendar.",
      },
      ia: {
        label: "Entraînez votre IA",
        short: "Entraînez votre IA",
        highlight: "votre IA",
        description:
          "Téléversez des documents et configurez le comportement de votre assistant IA — ton, langue et instructions spécifiques.",
      },
      activar: {
        label: "Activez votre système",
        short: "Activez votre système",
        highlight: "votre système",
        description:
          "Vérifiez votre configuration et activez le système. Vous y êtes presque !",
      },
    },
  },
};
