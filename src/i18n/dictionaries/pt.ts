import type { Dictionary } from "./es";

export const pt: Dictionary = {
  nav: {
    workspace: "Workspace",
    comunicacion: "Comunicação",
    crecimiento: "Crescimento",
    sistema: "Sistema",
    dashboard: "Painel",
    pipeline: "Pipeline",
    clientes: "Clientes",
    conversaciones: "Conversas",
    agenda: "Agenda",
    iaReceptionist: "Rececionista IA",
    campanas: "Campanhas IA",
    metricas: "Métricas",
    configuracion: "Definições",
  },
  topbar: {
    searchPlaceholder: "Procurar clientes, conversas, automações…",
    myAutomations: "As minhas automações",
    help: "Ajuda",
    notifications: "Notificações",
  },
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Criar",
    search: "Procurar",
    loading: "A carregar…",
    back: "Voltar",
    next: "Seguinte",
    confirm: "Confirmar",
    language: "Idioma",
  },
  signin: {
    welcome: "Bem-vindo de volta",
    subtitle: "Aceda com o seu e-mail. Enviaremos um link de utilização única.",
    emailLabel: "E-mail",
    emailPlaceholder: "voce@clinica.com",
    submit: "Enviar link",
    sent: "Se o seu e-mail estiver registado, receberá um link em breve. Em desenvolvimento, verifique também a consola do servidor.",
    error: "Não foi possível enviar o link. Confirme que o seu e-mail está registado pela clínica.",
    valueProp: "Automatize o seu negócio com IA a partir de um único painel.",
    valuePropSub: "Rececionista virtual, CRM, agenda, campanhas inteligentes e métricas em tempo real — tudo conectado.",
    noAccount: "É proprietário/a e ainda não tem conta?",
    startOnboarding: "Iniciar onboarding",
  },
  landing: {
    navProduct: "Produto",
    navSectors: "Setores",
    navCampaigns: "Campanhas IA",
    navClients: "Clientes",
    navDemo: "Demo CRM",
    signIn: "Entrar",
    getStarted: "Começar",

    heroBadge: "Novidade · ROI previsto antes de enviar",
    heroTitleA: "Uma plataforma",
    heroTitleB: "para cada negócio.",
    heroHighlight: "Resultados",
    heroTitleC: "para todos.",
    heroSubtitle:
      "Conecte, automatize e escale o seu negócio com módulos inteligentes concebidos para crescer consigo. CRM, rececionista IA, agenda e campanhas numa só plataforma.",
    exploreSectors: "Explorar setores",
    seeHow: "Ver como funciona",
    noCard: "Sem cartão para começar",
    onboarding10: "Onboarding em 10 minutos",
    supportEs: "Suporte no seu idioma",
    socialProof: "4,9 em 5 · +250 negócios automatizados com Aizorix",
    statusOperational: "Operacional · 99,97% de disponibilidade",
    activeAutomations: "Automações ativas",
  },
  onboarding: {
    eyebrow: "Onboarding inteligente",
    saveAndExit: "Guardar e sair",
    footerGdpr: "RGPD",
    footerSecure: "Seguro",
    footerCloud: "100% na nuvem",

    back: "Voltar",
    continue: "Continuar",
    finish: "Concluir",
    stepOf: "Passo {current} de {total}",

    ai: {
      uploadTitle: "Carregue documentos com a informação do seu negócio",
      uploadHint:
        "Listas de preços, FAQ, descrições de serviços, manuais… Usaremos para treinar a sua IA.",
      dropzoneTitle: "Arraste os seus ficheiros para aqui",
      dropzoneSub: "PDF, DOCX, TXT, MD, CSV · máx. 10 MB cada",
      dropzoneButton: "Selecionar ficheiros",
      uploadedHeader: "Documentos carregados",
      empty: "Ainda não carregou nenhum documento.",
      remove: "Remover",
      retry: "Repetir",
      statusReady: "Processado",
      statusPending: "Pendente · cole o conteúdo abaixo",
      statusError: "Erro",
      errTooLarge: "O ficheiro excede 10 MB.",
      errType: "Formato não suportado.",
      errRead: "Não foi possível ler o ficheiro.",
      pendingNotice:
        "Os ficheiros binários (PDF, DOCX) são aceites, mas o conteúdo ainda não é extraído automaticamente. Cole o texto principal no campo de notas para a sua IA aprender.",
      words: "{n} palavras",
      notesLabel: "Notas adicionais para a sua IA",
      notesPlaceholder:
        "Cole aqui qualquer informação extra que a sua IA deva saber: políticas, promoções, FAQ, cancelamentos…",
      notesHint:
        "A sua IA lembrar-se-á deste texto e usá-lo-á em todas as conversas.",
      toneLabel: "Tom da IA",
      toneProfessional: "Profissional",
      toneProfessionalDesc: "Educada, direta, técnica.",
      toneFriendly: "Próxima",
      toneFriendlyDesc: "Calorosa, empática, conversacional.",
      toneCasual: "Casual",
      toneCasualDesc: "Descontraída, jovem, informal.",
      introLabel: "Mensagem de boas-vindas",
      introHint:
        "Primeira mensagem que a IA envia quando um cliente inicia uma conversa.",
      askEmailTitle: "Pedir e-mail a novos clientes",
      askEmailDesc:
        "A IA pedirá nome, telefone e e-mail no primeiro contacto.",
      pushBookingTitle: "Conduzir sempre para a marcação",
      pushBookingDesc:
        "A IA proporá horários reais e fechará a marcação de forma natural.",
      learnTitle: "A sua IA aprenderá sobre",
      learnServices: "Os seus serviços e preços",
      learnHours: "Os seus horários e disponibilidade",
      learnDocs: "Os documentos que carregar neste passo",
      learnNotes: "As notas adicionais que escrever",
      tip: "Dica",
      tipBody:
        "Quanto mais informação carregar, melhor a sua IA responderá. Comece pela lista de preços e pelos serviços mais procurados.",
      autoTrainNotice:
        "A sua IA será treinada automaticamente com os seus serviços, horários e preços. Pode ajustar o comportamento em Definições › IA do CRM.",
    },

    crmMode: {
      subtitle:
        "A Aizorix adapta-se à sua forma de trabalhar. Escolha — pode mudar mais tarde.",
      recommendedBadge: "Recomendado",
      flexibilityNote:
        "Esta escolha não é definitiva. Pode mudar de modo a qualquer momento em Definições › Módulos.",
      aizorixTitle: "Usar Aizorix CRM",
      aizorixDesc:
        "A Aizorix passa a ser o seu sistema principal de gestão de clientes.",
      aizorixBullet1: "CRM visual, pipeline, agenda e métricas incluídos.",
      aizorixBullet2: "Importe os seus dados via CSV a qualquer altura.",
      aizorixBullet3: "Configuração em menos de 10 minutos.",
      externalTitle: "Ligar o meu CRM",
      externalDesc:
        "Mantenha o seu CRM atual; a Aizorix sincroniza via API.",
      externalBullet1: "Gere um token API após a ativação.",
      externalBullet2: "Ligue HubSpot, Pipedrive, Zoho ou o seu.",
      externalBullet3: "Nada se move até decidir.",
      noneTitle: "Começar sem CRM",
      noneDesc:
        "Apenas IA + WhatsApp + agenda. Ative o CRM mais tarde.",
      noneBullet1: "Configuração inicial mínima.",
      noneBullet2: "Ideal para testar a IA antes de migrar.",
      noneBullet3: "Ative módulos um a um nas Definições.",
    },
    steps: {
      modo: {
        label: "Escolha o seu modo",
        short: "Modo",
        highlight: "modo",
        description:
          "Como quer trabalhar com a Aizorix? Use o nosso CRM, ligue o seu ou comece sem CRM e ative-o mais tarde.",
      },
      negocio: {
        label: "O seu negócio",
        short: "O seu negócio",
        highlight: "negócio",
        description:
          "Diga-nos quem é: nome, setor, localização, contacto, sedes e funcionários. Configuraremos a sua plataforma com módulos específicos para a sua atividade.",
      },
      serviciosYAgenda: {
        label: "Serviços e agenda",
        short: "Serviços e agenda",
        highlight: "agenda",
        description:
          "Adicione os seus tratamentos, preços e durações, e configure os seus horários de atendimento (incluindo turnos partidos).",
      },
      canales: {
        label: "Conecte os seus canais",
        short: "Conecte os canais",
        highlight: "canais",
        description:
          "Conecte os canais que vai usar para comunicar com os seus clientes: WhatsApp, Instagram, Facebook, formulários web e Google Calendar.",
      },
      ia: {
        label: "Treine a sua IA",
        short: "Treine a sua IA",
        highlight: "a sua IA",
        description:
          "Carregue documentos e configure como o seu assistente de IA deve comportar-se — tom, idioma e instruções específicas.",
      },
      activar: {
        label: "Ative o seu sistema",
        short: "Ative o seu sistema",
        highlight: "o seu sistema",
        description:
          "Reveja a sua configuração e ative o sistema. Já está quase pronto!",
      },
    },
  },
};
