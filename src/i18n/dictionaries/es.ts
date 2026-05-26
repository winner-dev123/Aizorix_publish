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
    navProduct: "Producto",
    navSectors: "Sectores",
    navCampaigns: "Campañas IA",
    navClients: "Clientes",
    navDemo: "Demo CRM",
    signIn: "Entrar",
    getStarted: "Empezar",
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
  },
};

export type Dictionary = typeof es;
