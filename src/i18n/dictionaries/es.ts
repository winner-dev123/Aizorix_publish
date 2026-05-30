/**
 * Spanish dictionary — the canonical shape. All other locale files must
 * satisfy `Dictionary` (the type is derived from this object), so adding a
 * key here forces every language to provide a translation (compile error
 * otherwise).
 */
export const es = {
  nav: {
    workspace: "Workspace",
    comunicacion: "Comunicación",
    crecimiento: "Crecimiento",
    sistema: "Sistema",
    dashboard: "Dashboard",
    pipeline: "Pipeline",
    clientes: "Clientes",
    conversaciones: "Conversaciones",
    agenda: "Agenda",
    iaReceptionist: "IA Recepcionista",
    campanas: "Campañas IA",
    metricas: "Métricas",
    configuracion: "Configuración",
  },
  topbar: {
    searchPlaceholder: "Buscar clientes, conversaciones, automatizaciones…",
    myAutomations: "Mis automatizaciones",
    help: "Ayuda",
    notifications: "Notificaciones",
  },
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Crear",
    search: "Buscar",
    loading: "Cargando…",
    back: "Volver",
    next: "Siguiente",
    confirm: "Confirmar",
    language: "Idioma",
  },
  signin: {
    welcome: "Bienvenida de vuelta",
    subtitle: "Accede con tu correo. Te enviaremos un enlace de un solo uso.",
    emailLabel: "Correo",
    emailPlaceholder: "tu@clinica.com",
    submit: "Enviar enlace",
    sent: "Si tu correo está registrado, recibirás un enlace en breve. Revisa también la consola del servidor en desarrollo.",
    error: "No hemos podido enviar el enlace. Comprueba que tu correo esté registrado por la clínica.",
    valueProp: "Automatiza tu negocio con IA desde un solo panel.",
    valuePropSub: "Recepcionista virtual, CRM, agenda, campañas inteligentes y métricas en tiempo real — todo conectado.",
    noAccount: "¿Eres dueño/a y aún no tienes cuenta?",
    startOnboarding: "Empezar onboarding",
  },
  landing: {
    // Top nav
    navProduct: "Producto",
    navSectors: "Sectores",
    navCampaigns: "Campañas IA",
    navClients: "Clientes",
    navDemo: "Demo CRM",
    signIn: "Entrar",
    getStarted: "Empezar",

    // Hero
    heroBadge: "Novedad · ROI previsto antes de enviar",
    heroTitleA: "Una plataforma",
    heroTitleB: "para cada negocio.",
    heroHighlight: "Resultados",
    heroTitleC: "para todos.",
    heroSubtitle:
      "Conecta, automatiza y escala tu negocio con módulos inteligentes diseñados para crecer contigo. CRM, IA recepcionista, agenda y campañas en una sola plataforma.",
    exploreSectors: "Explorar sectores",
    seeHow: "Ver cómo funciona",
    noCard: "Sin tarjeta para empezar",
    onboarding10: "Onboarding en 10 minutos",
    supportEs: "Soporte en español",
    socialProof: "4.9 sobre 5 · +250 negocios automatizados con Aizorix",
    statusOperational: "Operativo · 99,97% uptime",
    activeAutomations: "Automatizaciones activas",
  },
  onboarding: {
    // Header / chrome
    eyebrow: "Onboarding inteligente",
    saveAndExit: "Guardar y salir",
    footerGdpr: "RGPD",
    footerSecure: "Seguro",
    footerCloud: "100% nube",

    // Step navigation buttons
    back: "Atrás",
    continue: "Continuar",
    finish: "Finalizar",
    stepOf: "Paso {current} de {total}",

    ai: {
      uploadTitle: "Sube documentos con la información de tu negocio",
      uploadHint:
        "Listas de precios, FAQ, descripciones de servicios, manuales… Los usaremos para entrenar a tu IA.",
      dropzoneTitle: "Arrastra tus archivos aquí",
      dropzoneSub: "PDF, DOCX, TXT, MD, CSV · máx. 10 MB cada uno",
      dropzoneButton: "Seleccionar archivos",
      uploadedHeader: "Documentos subidos",
      empty: "Aún no has subido ningún documento.",
      remove: "Quitar",
      retry: "Reintentar",
      // Status badges
      statusReady: "Procesado",
      statusPending: "Pendiente · pega el contenido abajo",
      statusError: "Error",
      // Errors
      errTooLarge: "El archivo supera los 10 MB.",
      errType: "Formato no soportado.",
      errRead: "No se pudo leer el archivo.",
      // Pending notice (PDFs/DOCX)
      pendingNotice:
        "Los archivos binarios (PDF, DOCX) están aceptados pero su contenido aún no se extrae automáticamente. Copia el texto clave en el campo de notas para que tu IA lo aprenda.",
      // Words counter
      words: "{n} palabras",
      // Additional notes
      notesLabel: "Notas adicionales para tu IA",
      notesPlaceholder:
        "Pega aquí cualquier información extra que tu IA deba conocer: políticas, ofertas, preguntas frecuentes, cancelaciones…",
      notesHint:
        "Tu IA recordará todo este texto y lo usará en cada conversación.",
      // Existing fields
      toneLabel: "Tono de la IA",
      toneProfessional: "Profesional",
      toneProfessionalDesc: "Educada, directa, técnica.",
      toneFriendly: "Cercana",
      toneFriendlyDesc: "Cálida, empática, conversacional.",
      toneCasual: "Casual",
      toneCasualDesc: "Relajada, juvenil, informal.",
      introLabel: "Mensaje de bienvenida",
      introHint:
        "Primer mensaje que enviará la IA cuando un cliente inicie una conversación.",
      askEmailTitle: "Pedir email a clientes nuevos",
      askEmailDesc:
        "La IA pedirá nombre, teléfono y email en el primer contacto.",
      pushBookingTitle: "Empujar siempre hacia la reserva",
      pushBookingDesc:
        "La IA propondrá huecos reales y cerrará cita de forma natural.",
      learnTitle: "Tu IA aprenderá sobre",
      learnServices: "Tus servicios y precios",
      learnHours: "Tus horarios y disponibilidad",
      learnDocs: "Documentos que subas en este paso",
      learnNotes: "Las notas adicionales que escribas",
      tip: "Consejo",
      tipBody:
        "Cuanta más información subas, mejor responderá tu IA. Empieza con la lista de precios y los servicios más vendidos.",
      autoTrainNotice:
        "La IA se entrenará automáticamente con tus servicios, horarios y precios. Podrás afinar el comportamiento desde Configuración › IA del CRM.",
    },

    // Step labels — match `slug` in onboarding-steps.ts.
    // Each step has `label` (the big title), `short` (the timeline label),
    // `highlight` (the violet keyword inside `label`) and `description`.
    steps: {
      negocio: {
        label: "Tu negocio",
        short: "Tu negocio",
        highlight: "negocio",
        description:
          "Cuéntanos quién eres: nombre, sector, ubicación, contacto, sedes y empleados. Configuraremos tu plataforma con módulos específicos para tu actividad.",
      },
      serviciosYAgenda: {
        label: "Servicios y agenda",
        short: "Servicios y agenda",
        highlight: "agenda",
        description:
          "Añade tus tratamientos, precios, duración y configura tus horarios de atención (incluidos turnos partidos).",
      },
      canales: {
        label: "Conecta canales",
        short: "Conecta canales",
        highlight: "canales",
        description:
          "Conecta los canales que usarás para comunicarte con tus clientes: WhatsApp, Instagram, Facebook, formularios web y Google Calendar.",
      },
      ia: {
        label: "Entrena tu IA",
        short: "Entrena tu IA",
        highlight: "tu IA",
        description:
          "Sube documentos y configura cómo debe comportarse tu asistente de IA — tono, idioma e instrucciones específicas.",
      },
      activar: {
        label: "Activa tu sistema",
        short: "Activa tu sistema",
        highlight: "tu sistema",
        description:
          "Revisa tu configuración y activa el sistema. ¡Ya casi estás listo!",
      },
    },
  },
};

export type Dictionary = typeof es;
