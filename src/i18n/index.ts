import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const fr = {
  nav: {
    dashboard: 'Tableau de bord', planificateur: 'Planificateur', subscriptions: 'Abonnements',
    players: 'Joueurs', presence: 'Présences', parents: 'Parents', trainers: 'Entraîneurs', website: 'Site web',
    workers: 'Employés', doctors: 'Médecins', matches: 'Matchs', expenses: 'Dépenses', caisse: 'Caisse', analyse: 'Analyse',
    reports: 'Rapports', settings: 'Paramètres', logout: 'Déconnexion',
    management: 'Gestion', finance: 'Finance', system: 'Système',
  },
  common: {
    save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', view: 'Voir',
    add: 'Ajouter', create: 'Créer', search: 'Rechercher', filter: 'Filtrer', all: 'Tous',
    close: 'Fermer', confirm: 'Confirmer', details: 'Détails', name: 'Nom', price: 'Prix',
    date: 'Date', amount: 'Montant', description: 'Description', phone: 'Téléphone', email: 'E-mail',
    address: 'Adresse', actions: 'Actions', total: 'Total', paid: 'Payé', rest: 'Reste',
    status: 'Statut', yes: 'Oui', no: 'Non', print: 'Imprimer', send: 'Envoyer', generate: 'Générer',
    from: 'Du', to: 'Au', none: 'Aucun', loading: 'Chargement…', noData: 'Aucune donnée',
    firstName: 'Prénom', lastName: 'Nom de famille', fullName: 'Nom complet', birthDate: 'Date de naissance',
    startDate: 'Date de début', deleteConfirm: 'Confirmer la suppression ?', back: 'Retour',
    today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois', period: 'Période', apply: 'Appliquer',
  },
  auth: {
    welcome: 'Bienvenue', signIn: 'Se connecter', createAccount: 'Créer un compte administrateur',
    username: 'Nom d’utilisateur', password: 'Mot de passe', identifier: 'E-mail ou nom d’utilisateur',
    demo: 'Connexion démo (Admin)', viewWebsite: 'Voir le site web', tagline: 'Gestion complète de votre club de football',
    haveAccount: 'Vous avez déjà un compte ?', noAccount: 'Pas encore de compte ?', register: 'S’inscrire',
    loginError: 'Identifiants incorrects', existsError: 'Ce compte existe déjà', slogan: 'Passion · Discipline · Excellence',
  },
  dash: {
    title: 'Tableau de bord', overview: 'Vue d’ensemble du club',
    players: 'Joueurs', trainers: 'Entraîneurs', activeSubs: 'Abonnements actifs', revenue: 'Revenus',
    expiring: 'Abonnements bientôt expirés', debts: 'Créances', cashBalance: 'Solde caisse',
    revenueVsExpenses: 'Revenus vs Dépenses', playersByCategory: 'Joueurs par catégorie',
    paymentStatus: 'Statut des paiements', recentPayments: 'Paiements récents', upcoming: 'Séances à venir',
  },
  planner: {
    title: 'Planificateur', newTiming: 'Nouveau créneau', category: 'Catégorie', group: 'Groupe',
    sport: 'Sport', stadium: 'Stade', trainer: 'Entraîneur', days: 'Jours', startTime: 'Heure de début',
    endTime: 'Heure de fin', calendar: 'Calendrier', viewCalendar: 'Voir le calendrier',
    newCategory: 'Nouvelle catégorie', newGroup: 'Nouveau groupe', newSport: 'Nouveau sport',
    newStadium: 'Nouveau stade', playersInTiming: 'Joueurs du créneau', schedule: 'Horaire',
  },
  subs: {
    title: 'Abonnements', newSub: 'Nouvel abonnement', timing: 'Créneau', periodDays: 'Période (jours)',
    seances: 'Nombre de séances', pricePerSeance: 'Prix par séance', totalPrice: 'Prix total',
    searchTiming: 'Rechercher un créneau…',
    filterCategory: 'Catégorie', filterGroup: 'Groupe', filterSport: 'Sport', filterTrainer: 'Entraîneur',
    regFeeAmount: 'Frais d’inscription', regFeeHint: 'Montant facturé une seule fois par joueur, à l’assignation d’un abonnement',
  },
  players: {
    title: 'Joueurs', newPlayer: 'Nouveau joueur', birthPlace: 'Lieu de naissance', assign: 'Assigner abonnement',
    payDebt: 'Payer créance', card: 'Carte joueur', personalInfo: 'Infos personnelles', subInfo: 'Abonnement',
    paymentHistory: 'Historique paiements', parentInfo: 'Informations parent', expiry: 'Expiration',
    daysLeft: 'jours restants', expired: 'Expiré', expiringSoon: 'Expire bientôt', active: 'Actif',
    debt: 'Créance', regFee: 'Frais d’inscription', regPaid: 'Inscription payée', regUnpaid: 'Inscription impayée',
    assignSub: 'Assigner un abonnement', howMuchPaid: 'Montant payé', sendMail: 'Envoyer par e-mail',
    noSub: 'Aucun abonnement', removeSub: 'Retirer l’abonnement', expiryAlert: 'Alerte expirations',
    searchPh: 'Nom, téléphone, parent…', filterCategory: 'Catégorie', filterGroup: 'Groupe',
    filterSub: 'Abonnement', filterPay: 'Paiement', activeSubs: 'Actifs', expiredSubs: 'Expirés',
    soonExpiring: 'Bientôt expirés', printCard: 'Imprimer la carte', qr: 'QR Code', barcode: 'Code-barres',
    uploadPhoto: 'Photo (impression uniquement)', collectFeeNow: 'Encaisser les frais d’inscription maintenant',
  },
  scan: {
    title: 'Scanner une carte', subtitle: 'Scannez le QR ou le code-barres de la carte joueur',
    button: 'Scanner', point: 'Placez le code dans le cadre', flip: 'Changer de caméra',
    manual: 'Saisie manuelle', manualPh: 'ID ou code de la carte', useCamera: 'Utiliser la caméra',
    again: 'Scanner à nouveau', notFound: 'Aucun joueur trouvé',
    notFoundHint: 'Le code scanné ne correspond à aucune carte joueur.', scanned: 'Code scanné',
    camDenied: 'Caméra refusée ou indisponible', camHint: 'Autorisez la caméra ou utilisez la saisie manuelle.',
    unsupported: 'La détection par caméra n’est pas prise en charge sur ce navigateur.',
    statusActive: 'Abonnement actif', statusSoon: 'Expire bientôt', statusExpired: 'Abonnement expiré',
    statusNone: 'Aucun abonnement',
  },
  parents: {
    title: 'Parents', newParent: 'Nouveau parent', kids: 'Enfants', searchKids: 'Rechercher des enfants…',
    sendReport: 'Envoyer rapport', specialMessage: 'Message spécial', lastSubOnly: 'Dernier abonnement seulement',
  },
  trainers: {
    title: 'Entraîneurs', newTrainer: 'Nouvel entraîneur', paymentType: 'Type de paiement', monthly: 'Mensuel',
    percentage: 'Pourcentage', assignTiming: 'Assigner créneaux', timings: 'Créneaux', acomptes: 'Acomptes',
    absences: 'Absences', payment: 'Paiement', newAcompte: 'Nouvel acompte', newAbsence: 'Nouvelle absence',
    monthlyAmount: 'Montant mensuel', pct: '% des abonnements', unpaidMonths: 'Mois impayés',
    paySalary: 'Effectuer paiement', notifyExpiry: 'Notifier expiration',
  },
  website: {
    title: 'Gestion du site web', activities: 'Activités', contact: 'Contact', newActivity: 'Nouvelle activité',
    image: 'Image', whatsapp: 'WhatsApp', map: 'Carte / Maps',
  },
  workers: {
    title: 'Employés', newWorker: 'Nouvel employé', role: 'Rôle', permissions: 'Permissions', newRole: 'Nouveau rôle',
    idCard: 'N° carte d’identité', payInfo: 'Informations de paiement', activatePay: 'Activer la rémunération',
    perDay: 'Par jour', perMonth: 'Par mois', activateAccount: 'Activer le compte de connexion',
    startWork: 'Date d’embauche', selectPages: 'Interfaces visibles', selectActions: 'Actions autorisées',
  },
  expenses: { title: 'Dépenses', newExpense: 'Nouvelle dépense', category: 'Catégorie', newCategory: 'Nouvelle catégorie' },
  caisse: {
    title: 'Caisse', deposit: 'Dépôt', withdraw: 'Retrait', newTransaction: 'Nouvelle transaction',
    balance: 'Solde de caisse', history: 'Historique', payments: 'Encaissements joueurs', expenses: 'Dépenses',
  },
  analyse: { title: 'Analyse', generate: 'Générer l’analyse', selectPeriod: 'Sélectionnez une période puis générez' },
  reports: { title: 'Rapports', generate: 'Générer le rapport', selectPeriod: 'Sélectionnez une période puis générez' },
  settings: {
    title: 'Paramètres', club: 'Informations du club', account: 'Compte', database: 'Base de données',
    logo: 'Logo', backup: 'Sauvegarde', restore: 'Restaurer', backupDesc: 'Exporter/importer les données',
  },
};

const ar = {
  nav: {
    dashboard: 'لوحة القيادة', planificateur: 'المُخطِّط', subscriptions: 'الاشتراكات', players: 'اللاعبون',
    presence: 'الحضور', parents: 'الأولياء', trainers: 'المدربون', website: 'الموقع', workers: 'الموظفون',
    doctors: 'الأطباء', matches: 'المباريات', expenses: 'المصاريف',
    caisse: 'الصندوق', analyse: 'التحليل', reports: 'التقارير', settings: 'الإعدادات', logout: 'تسجيل الخروج',
    management: 'الإدارة', finance: 'المالية', system: 'النظام',
  },
  common: {
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', view: 'عرض', add: 'إضافة', create: 'إنشاء',
    search: 'بحث', filter: 'تصفية', all: 'الكل', close: 'إغلاق', confirm: 'تأكيد', details: 'التفاصيل',
    name: 'الاسم', price: 'السعر', date: 'التاريخ', amount: 'المبلغ', description: 'الوصف', phone: 'الهاتف',
    email: 'البريد الإلكتروني', address: 'العنوان', actions: 'إجراءات', total: 'المجموع', paid: 'مدفوع',
    rest: 'الباقي', status: 'الحالة', yes: 'نعم', no: 'لا', print: 'طباعة', send: 'إرسال', generate: 'توليد',
    from: 'من', to: 'إلى', none: 'لا شيء', loading: 'جار التحميل…', noData: 'لا توجد بيانات',
    firstName: 'الاسم', lastName: 'اللقب', fullName: 'الاسم الكامل', birthDate: 'تاريخ الميلاد',
    startDate: 'تاريخ البدء', deleteConfirm: 'تأكيد الحذف؟', back: 'رجوع', today: 'اليوم', week: 'هذا الأسبوع',
    month: 'هذا الشهر', period: 'الفترة', apply: 'تطبيق',
  },
  auth: {
    welcome: 'مرحباً', signIn: 'تسجيل الدخول', createAccount: 'إنشاء حساب مسؤول', username: 'اسم المستخدم',
    password: 'كلمة المرور', identifier: 'البريد أو اسم المستخدم', demo: 'دخول تجريبي (مسؤول)',
    viewWebsite: 'عرض الموقع', tagline: 'الإدارة الكاملة لناديك لكرة القدم', haveAccount: 'لديك حساب؟',
    noAccount: 'ليس لديك حساب؟', register: 'تسجيل', loginError: 'بيانات الدخول غير صحيحة',
    existsError: 'هذا الحساب موجود بالفعل', slogan: 'شغف · انضباط · تميّز',
  },
  dash: {
    title: 'لوحة القيادة', overview: 'نظرة عامة على النادي', players: 'اللاعبون', trainers: 'المدربون',
    activeSubs: 'اشتراكات نشطة', revenue: 'الإيرادات', expiring: 'اشتراكات على وشك الانتهاء', debts: 'الديون',
    cashBalance: 'رصيد الصندوق', revenueVsExpenses: 'الإيرادات مقابل المصاريف', playersByCategory: 'اللاعبون حسب الفئة',
    paymentStatus: 'حالة المدفوعات', recentPayments: 'مدفوعات حديثة', upcoming: 'الحصص القادمة',
  },
  planner: {
    title: 'المُخطِّط', newTiming: 'حصة جديدة', category: 'الفئة', group: 'المجموعة', sport: 'الرياضة',
    stadium: 'الملعب', trainer: 'المدرب', days: 'الأيام', startTime: 'وقت البدء', endTime: 'وقت الانتهاء',
    calendar: 'التقويم', viewCalendar: 'عرض التقويم', newCategory: 'فئة جديدة', newGroup: 'مجموعة جديدة',
    newSport: 'رياضة جديدة', newStadium: 'ملعب جديد', playersInTiming: 'لاعبو الحصة', schedule: 'التوقيت',
  },
  subs: {
    title: 'الاشتراكات', newSub: 'اشتراك جديد', timing: 'الحصة', periodDays: 'المدة (أيام)', seances: 'عدد الحصص',
    pricePerSeance: 'سعر الحصة', totalPrice: 'السعر الإجمالي', searchTiming: 'ابحث عن حصة…',
    filterCategory: 'الفئة', filterGroup: 'المجموعة', filterSport: 'الرياضة', filterTrainer: 'المدرب',
    regFeeAmount: 'رسوم التسجيل', regFeeHint: 'مبلغ يُحتسب مرة واحدة لكل لاعب عند إسناد اشتراك',
  },
  players: {
    title: 'اللاعبون', newPlayer: 'لاعب جديد', birthPlace: 'مكان الميلاد', assign: 'إسناد اشتراك', payDebt: 'دفع الدين',
    card: 'بطاقة اللاعب', personalInfo: 'معلومات شخصية', subInfo: 'الاشتراك', paymentHistory: 'سجل المدفوعات',
    parentInfo: 'معلومات الولي', expiry: 'الانتهاء', daysLeft: 'يوم متبقٍ', expired: 'منتهٍ', expiringSoon: 'ينتهي قريباً',
    active: 'نشط', debt: 'دين', regFee: 'رسوم التسجيل', regPaid: 'التسجيل مدفوع', regUnpaid: 'التسجيل غير مدفوع',
    assignSub: 'إسناد اشتراك', howMuchPaid: 'المبلغ المدفوع', sendMail: 'إرسال بالبريد', noSub: 'لا يوجد اشتراك',
    removeSub: 'إزالة الاشتراك', expiryAlert: 'تنبيه الانتهاء', searchPh: 'الاسم، الهاتف، الولي…',
    filterCategory: 'الفئة', filterGroup: 'المجموعة', filterSub: 'الاشتراك', filterPay: 'الدفع',
    activeSubs: 'نشطة', expiredSubs: 'منتهية', soonExpiring: 'تنتهي قريباً', printCard: 'طباعة البطاقة',
    qr: 'رمز QR', barcode: 'الباركود', uploadPhoto: 'صورة (للطباعة فقط)', collectFeeNow: 'تحصيل رسوم التسجيل الآن',
  },
  scan: {
    title: 'مسح البطاقة', subtitle: 'امسح رمز QR أو الباركود لبطاقة اللاعب',
    button: 'مسح', point: 'ضع الرمز داخل الإطار', flip: 'تبديل الكاميرا',
    manual: 'إدخال يدوي', manualPh: 'معرّف أو رمز البطاقة', useCamera: 'استخدام الكاميرا',
    again: 'مسح مرة أخرى', notFound: 'لم يتم العثور على لاعب',
    notFoundHint: 'الرمز الممسوح لا يطابق أي بطاقة لاعب.', scanned: 'الرمز الممسوح',
    camDenied: 'تم رفض الكاميرا أو غير متوفرة', camHint: 'اسمح بالكاميرا أو استخدم الإدخال اليدوي.',
    unsupported: 'المسح عبر الكاميرا غير مدعوم في هذا المتصفح.',
    statusActive: 'اشتراك نشط', statusSoon: 'ينتهي قريباً', statusExpired: 'اشتراك منتهٍ',
    statusNone: 'لا يوجد اشتراك',
  },
  parents: {
    title: 'الأولياء', newParent: 'ولي جديد', kids: 'الأبناء', searchKids: 'ابحث عن الأبناء…',
    sendReport: 'إرسال تقرير', specialMessage: 'رسالة خاصة', lastSubOnly: 'آخر اشتراك فقط',
  },
  trainers: {
    title: 'المدربون', newTrainer: 'مدرب جديد', paymentType: 'نوع الدفع', monthly: 'شهري', percentage: 'نسبة مئوية',
    assignTiming: 'إسناد حصص', timings: 'الحصص', acomptes: 'التسبيقات', absences: 'الغيابات', payment: 'الدفع',
    newAcompte: 'تسبيق جديد', newAbsence: 'غياب جديد', monthlyAmount: 'المبلغ الشهري', pct: '٪ من الاشتراكات',
    unpaidMonths: 'أشهر غير مدفوعة', paySalary: 'تنفيذ الدفع', notifyExpiry: 'إشعار بالانتهاء',
  },
  website: {
    title: 'إدارة الموقع', activities: 'الأنشطة', contact: 'التواصل', newActivity: 'نشاط جديد', image: 'صورة',
    whatsapp: 'واتساب', map: 'الخريطة',
  },
  workers: {
    title: 'الموظفون', newWorker: 'موظف جديد', role: 'الدور', permissions: 'الصلاحيات', newRole: 'دور جديد',
    idCard: 'رقم بطاقة التعريف', payInfo: 'معلومات الدفع', activatePay: 'تفعيل الأجر', perDay: 'باليوم',
    perMonth: 'بالشهر', activateAccount: 'تفعيل حساب الدخول', startWork: 'تاريخ التوظيف',
    selectPages: 'الواجهات المرئية', selectActions: 'الإجراءات المسموحة',
  },
  expenses: { title: 'المصاريف', newExpense: 'مصروف جديد', category: 'الفئة', newCategory: 'فئة جديدة' },
  caisse: {
    title: 'الصندوق', deposit: 'إيداع', withdraw: 'سحب', newTransaction: 'معاملة جديدة', balance: 'رصيد الصندوق',
    history: 'السجل', payments: 'مدفوعات اللاعبين', expenses: 'المصاريف',
  },
  analyse: { title: 'التحليل', generate: 'توليد التحليل', selectPeriod: 'اختر فترة ثم قم بالتوليد' },
  reports: { title: 'التقارير', generate: 'توليد التقرير', selectPeriod: 'اختر فترة ثم قم بالتوليد' },
  settings: {
    title: 'الإعدادات', club: 'معلومات النادي', account: 'الحساب', database: 'قاعدة البيانات', logo: 'الشعار',
    backup: 'نسخ احتياطي', restore: 'استعادة', backupDesc: 'تصدير/استيراد البيانات',
  },
};

i18n.use(initReactI18next).init({
  resources: { fr: { t: fr }, ar: { t: ar } },
  lng: localStorage.getItem('ofc_lang') || 'fr',
  fallbackLng: 'fr',
  defaultNS: 't',
  interpolation: { escapeValue: false },
});

export function applyDir(lng: string) {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
}
applyDir(i18n.language);
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('ofc_lang', lng);
  applyDir(lng);
});

export default i18n;
