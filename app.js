const STORAGE_KEY = "labcontrol-equipment-v1";
const UI_STORAGE_KEY = "labcontrol-ui-v2";
const APP_NAME = "LabControl-EquiposHG";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CONFIG = window.LABCONTROL_CONFIG || {};
const SUPABASE_URL = CONFIG.supabaseUrl || CONFIG.url || "";
const SUPABASE_KEY = CONFIG.supabasePublishableKey || CONFIG.supabaseAnonKey || CONFIG.anonKey || "";
const ADMIN_USERS_FUNCTION = "labcontrol-admin-users";
const DEMO_RESET_KEY = String(CONFIG.demoResetKey || "HG-LABCONTROL-2026-RESET");
const ALLOW_SELF_SIGNUP = CONFIG.allowSelfSignup === true;
const EQUIPMENT_PHOTOS_BUCKET = "equipment-photos";
const supabaseClient = window.supabase && SUPABASE_URL && SUPABASE_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
const remoteMode = Boolean(supabaseClient);

function getAuthRedirectUrl() {
  if (CONFIG.authRedirectUrl) return CONFIG.authRedirectUrl;
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return `${window.location.origin}${window.location.pathname}`;
  }
  return undefined;
}

const accessLevels = {
  admin: {
    label: "Administrador",
    shortLabel: "Admin",
    tone: "danger",
    description: "Acceso total, incluyendo creación, edición y eliminación de usuarios.",
    permissions: ["Acceso total", "Gestionar usuarios", "Editar equipos", "Registrar eventos", "Exportar datos"]
  },
  editor: {
    label: "Editor operativo",
    shortLabel: "Editor",
    tone: "info",
    description: "Puede editar equipos y registrar eventos, excepto crear, editar o quitar usuarios.",
    permissions: ["Editar equipos", "Registrar eventos", "Actualizar planes", "Exportar datos"]
  },
  viewer: {
    label: "Solo visualización",
    shortLabel: "Visualizador",
    tone: "neutral",
    description: "Solo puede consultar dashboard, inventario, agenda, bitácora, costos y proveedores.",
    permissions: ["Ver dashboard", "Ver inventario", "Ver agenda", "Ver bitácora", "Ver costos", "Ver proveedores"]
  }
};

const NO_MAINTENANCE_SERVICE = "No requiere mantenimiento";

const serviceTypes = [
  "Mantenimiento proveedor",
  "Calibración",
  "Monitoreo",
  "Calificación",
  NO_MAINTENANCE_SERVICE
];

const eventTypes = [
  ...serviceTypes.filter((type) => type !== NO_MAINTENANCE_SERVICE),
  "Verificación interna",
  "Reparación correctiva",
  "Incidencia",
  "Cursos",
  "Capacitaciones",
  "Certificaciones",
  "Traslado",
  "Alta inventario",
  "Baja"
];

const defaultEquipmentTypes = [
  "Agitador",
  "Balanza",
  "Baño / Sonicador",
  "Colorímetro",
  "Densitómetro",
  "Estufa",
  "Granulometría",
  "HPLC",
  "IC",
  "Inclinómetro",
  "Karl Fischer",
  "Masas patrón",
  "Medidor de altura",
  "Medidor de espesor",
  "Medidor de humedad",
  "Micropipeta",
  "Microscopio",
  "NIR",
  "Otro",
  "pH / Conductividad",
  "Pie de metro",
  "Purificador de agua",
  "Refractómetro",
  "Refrigerador",
  "Termohigrómetro",
  "Termómetro",
  "Titulación",
  "TOC",
  "Torquímetro",
  "Turbidímetro",
  "UPLC",
  "UV-VIS",
  "Viscosímetro"
];

const views = {
  dashboard: { label: "Dashboard", title: "Dashboard de laboratorio", icon: "layout" },
  equipos: { label: "Equipos", title: "Inventario de equipos", icon: "microscope" },
  calendario: { label: "Agenda", title: "Agenda de vencimientos", icon: "calendar" },
  bitacora: { label: "Bitácora", title: "Bitácora de eventos", icon: "book" },
  costos: { label: "Costos", title: "Costos y presupuesto", icon: "wallet" },
  proveedores: { label: "Proveedores", title: "Gestión de proveedores", icon: "provider" },
  usuarios: { label: "Usuarios", title: "Usuarios y responsabilidades", icon: "users" },
  configuracion: { label: "Configuración", title: "Catálogos y controles", icon: "settings" }
};

const iconPaths = {
  layout: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 0 0 7-7h-4a3 3 0 0 1-3 3Z"/><path d="M9 14 4 9l3-3 5 5"/><path d="m12 6 4 4"/><path d="m15 3 6 6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v14a2 2 0 0 0 2 2h14v-6"/><path d="M18 12h4v6h-4a3 3 0 0 1 0-6Z"/>',
  provider: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01"/><path d="M15 10h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.52a2 2 0 0 1-1 1.72l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.72v-.52a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54Z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-2.6Z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  minus: '<path d="M5 12h14"/>',
  maximize: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/>',
  map: '<path d="M14.5 4 9.5 2 3 5v17l6.5-3 5 2 6.5-3V1Z"/><path d="M9.5 2v17"/><path d="M14.5 4v17"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m15 9-3 3 3 3"/>'
};

let state;
let toastTimer;
let authSession = null;
let currentProfile = null;
let listenersReady = false;
let authListenersReady = false;
let draggedKpiId = "";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.file}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateInputValue(date = new Date()) {
  const value = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return value.toISOString().slice(0, 10);
}

function daysUntil(value) {
  const due = parseLocalDate(value);
  if (!due) return 9999;
  return Math.ceil((due - todayDate()) / MS_PER_DAY);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parseLocalDate(value));
}

function formatMonth(value) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric"
  }).format(parseLocalDate(value));
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKey(date) {
  return dateInputValue(date);
}

function formatMonthLabel(date) {
  const label = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric"
  }).format(date);
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatFrequency(months) {
  const value = Number(months);
  const map = {
    1: "Mensual",
    3: "Trimestral",
    4: "Cuatrimestral",
    6: "Semestral",
    12: "Anual",
    24: "Bianual",
    36: "Cada 3 años"
  };
  return map[value] || `Cada ${value} meses`;
}

function dueInfo(dateValue) {
  if (!dateValue) return { days: 9999, tone: "neutral", label: "Sin fecha" };
  const days = daysUntil(dateValue);
  if (days < 0) return { days, tone: "danger", label: `Vencido ${Math.abs(days)} días` };
  if (days <= 30) return { days, tone: "warning", label: `En ${days} días` };
  if (days <= 60) return { days, tone: "info", label: `En ${days} días` };
  return { days, tone: "success", label: `En ${days} días` };
}

function annualizedCost(plan) {
  if (isMaintenanceExemptionService(plan?.type)) return 0;
  const months = Number(plan.frequencyMonths || 12);
  if (!months) return 0;
  return Number(plan.cost || 0) * (12 / months);
}

function currentBudgetYear() {
  return todayDate().getFullYear();
}

function defaultBudgetSettings() {
  return {
    year: currentBudgetYear(),
    annualBudget: 0,
    currency: "CLP",
    allocationMethod: "forecast_weighted",
    notes: "Presupuesto anual editable desde la sección Costos."
  };
}

function createSeedData() {
  return {
    activeUserId: "u1",
    ui: {
      activeView: "dashboard",
      selectedEquipmentId: "eq-001",
      equipmentFilters: { search: "", type: "Todos", status: "Todos", criticality: "Todos", frequency: "Todos", authorization: "Todos", sortKey: "name", sortDirection: "asc" },
      equipmentFiltersVisible: true,
      dashboardFilters: {
        period: "90",
        location: "Todos",
        category: "Todos",
        type: "Todos",
        status: "Todos",
        criticality: "Todos",
        owner: "Todos",
        provider: "Todos",
        manufacturer: "Todos",
        equipmentId: "Todos",
        authorization: "Todos",
        healthSearch: "",
        healthSort: "healthAsc",
        savedView: ""
      },
      dashboardSavedViews: [],
      dashboardFiltersVisible: false,
      dashboardCollapsedSections: {},
      dashboardKpiOrder: [],
      sidebarCollapsed: false,
      costBudgetYear: currentBudgetYear(),
      calendarHorizon: "180",
      calendarType: "Todos",
      calendarMonthOffset: 0,
      eventFilters: { equipmentId: "Todos", type: "Todos" },
      providerFilters: { search: "", evaluation: "Todos", year: currentBudgetYear() }
    },
    budget: defaultBudgetSettings(),
    equipmentTypes: defaultEquipmentTypes,
    users: [
      {
        id: "u1",
        name: "Carolina Núñez",
        initials: "CN",
        role: "Jefa de Laboratorio",
        area: "Calidad",
        email: "carolina.nunez@laboratorio.local",
        accessLevel: "admin",
        permissions: ["Aprobar costos", "Editar equipos", "Auditar bitácora"]
      },
      {
        id: "u2",
        name: "Felipe Araya",
        initials: "FA",
        role: "Analista HPLC",
        area: "Cromatografía",
        email: "felipe.araya@laboratorio.local",
        accessLevel: "editor",
        permissions: ["Registrar eventos", "Ver agenda", "Adjuntar evidencias"]
      },
      {
        id: "u3",
        name: "Daniela Soto",
        initials: "DS",
        role: "Coordinadora Metrología",
        area: "Metrología",
        email: "daniela.soto@laboratorio.local",
        accessLevel: "editor",
        permissions: ["Programar calibraciones", "Editar planes", "Exportar reportes"]
      },
      {
        id: "u4",
        name: "Matías Rojas",
        initials: "MR",
        role: "Supervisor Mantención",
        area: "Mantenimiento",
        email: "matias.rojas@laboratorio.local",
        accessLevel: "editor",
        permissions: ["Registrar mantenimientos", "Gestionar proveedores", "Ver costos"]
      },
      {
        id: "u5",
        name: "Valentina Pérez",
        initials: "VP",
        role: "Analista Fisicoquímico",
        area: "Fisicoquímica",
        email: "valentina.perez@laboratorio.local",
        accessLevel: "editor",
        permissions: ["Registrar eventos", "Consultar historial", "Ver inventario"]
      },
      {
        id: "u6",
        name: "Ignacio Herrera",
        initials: "IH",
        role: "Compras Técnicas",
        area: "Abastecimiento",
        email: "ignacio.herrera@laboratorio.local",
        accessLevel: "viewer",
        permissions: ["Ver valores", "Exportar costos", "Consultar contratos"]
      },
      {
        id: "u7",
        name: "Paula Medina",
        initials: "PM",
        role: "QA Compliance",
        area: "Aseguramiento Calidad",
        email: "paula.medina@laboratorio.local",
        accessLevel: "viewer",
        permissions: ["Auditar bitácora", "Bloquear equipo", "Exportar evidencia"]
      }
    ],
    equipments: [
      {
        id: "eq-001",
        assetTag: "LAB-HPLC-001",
        name: "HPLC principal",
        type: "HPLC",
        manufacturer: "Agilent",
        provider: "Agilent Technologies",
        model: "1260 Infinity II",
        serial: "DEACB1260-8841",
        location: "QC Sala HPLC 1",
        owner: "Felipe Araya",
        status: "Operativo",
        criticality: "Alta",
        acquisitionDate: "2021-04-12",
        commercialValue: 84500,
        commercialValueDate: "2026-01-15",
        notes: "Equipo crítico para liberación de lotes y estudios de estabilidad.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2026-07-20", lastDone: "2025-07-18", cost: 4200, provider: "Agilent Technologies", contract: "SLA-AGI-2026" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-09-15", lastDone: "2025-09-10", cost: 1850, provider: "Metrología Andes", contract: "CAL-MA-14" },
          { type: "Monitoreo", frequencyMonths: 3, nextDue: "2026-07-10", lastDone: "2026-04-10", cost: 650, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2027-04-30", lastDone: "2025-04-28", cost: 5200, provider: "Agilent Technologies", contract: "OQ-PQ-AGI" }
        ]
      },
      {
        id: "eq-002",
        assetTag: "LAB-IC-002",
        name: "Cromatógrafo iónico",
        type: "IC",
        manufacturer: "Metrohm",
        provider: "Metrohm Chile",
        model: "940 Professional IC Vario",
        serial: "MH940-CL-2219",
        location: "QC Sala Iones",
        owner: "Carolina Núñez",
        status: "Observación",
        criticality: "Alta",
        acquisitionDate: "2020-10-05",
        commercialValue: 76500,
        commercialValueDate: "2026-02-07",
        notes: "Presenta ruido intermitente en detector; requiere seguimiento cercano.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2026-06-18", lastDone: "2025-06-17", cost: 3900, provider: "Metrohm Chile", contract: "SVC-MET-22" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-08-05", lastDone: "2025-08-02", cost: 1750, provider: "Metrología Andes", contract: "CAL-MA-21" },
          { type: "Monitoreo", frequencyMonths: 3, nextDue: "2026-07-04", lastDone: "2026-04-04", cost: 520, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2026-11-20", lastDone: "2024-11-18", cost: 4800, provider: "Metrohm Chile", contract: "OQ-MET-22" }
        ]
      },
      {
        id: "eq-003",
        assetTag: "LAB-UV-003",
        name: "Espectrofotómetro UV-Vis",
        type: "UV",
        manufacturer: "Shimadzu",
        provider: "Shimadzu Scientific",
        model: "UV-1900i",
        serial: "SHUV1900-7780",
        location: "Fisicoquímica Mesón 2",
        owner: "Valentina Pérez",
        status: "Operativo",
        criticality: "Media",
        acquisitionDate: "2022-02-18",
        commercialValue: 18200,
        commercialValueDate: "2026-03-12",
        notes: "Usado para identidad y perfiles de absorción rutinarios.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2027-02-12", lastDone: "2026-02-12", cost: 1100, provider: "Shimadzu Scientific", contract: "SVC-SHI-19" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-10-10", lastDone: "2025-10-09", cost: 760, provider: "Metrología Andes", contract: "CAL-MA-08" },
          { type: "Monitoreo", frequencyMonths: 6, nextDue: "2026-08-15", lastDone: "2026-02-15", cost: 180, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2028-02-12", lastDone: "2026-02-12", cost: 1600, provider: "Shimadzu Scientific", contract: "OQ-SHI-19" }
        ]
      },
      {
        id: "eq-004",
        assetTag: "LAB-DEN-004",
        name: "Densitómetro digital",
        type: "Densitómetro",
        manufacturer: "Anton Paar",
        provider: "Anton Paar Chile",
        model: "DMA 4500 M",
        serial: "AP-DMA45-3192",
        location: "Fisicoquímica Mesón 1",
        owner: "Valentina Pérez",
        status: "Operativo",
        criticality: "Media",
        acquisitionDate: "2019-09-26",
        commercialValue: 27800,
        commercialValueDate: "2026-01-20",
        notes: "Se usa para control de densidad de jarabes, solventes y materias primas.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2026-12-12", lastDone: "2025-12-10", cost: 1350, provider: "Anton Paar Chile", contract: "SVC-AP-44" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-07-28", lastDone: "2025-07-25", cost: 920, provider: "Metrología Andes", contract: "CAL-MA-31" },
          { type: "Monitoreo", frequencyMonths: 3, nextDue: "2026-09-02", lastDone: "2026-06-02", cost: 140, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2027-12-12", lastDone: "2025-12-10", cost: 1850, provider: "Anton Paar Chile", contract: "OQ-AP-44" }
        ]
      },
      {
        id: "eq-005",
        assetTag: "LAB-BAL-005",
        name: "Balanza analítica",
        type: "Balanza",
        manufacturer: "Sartorius",
        provider: "Sartorius Service",
        model: "Entris II BCE224I",
        serial: "SAR-BCE-6107",
        location: "Pesaje Controlado",
        owner: "Daniela Soto",
        status: "Operativo",
        criticality: "Alta",
        acquisitionDate: "2023-06-08",
        commercialValue: 6200,
        commercialValueDate: "2026-04-01",
        notes: "Balanza bajo control diario, calibración externa y verificación con pesas patrón.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2027-03-18", lastDone: "2026-03-18", cost: 540, provider: "Sartorius Service", contract: "SVC-SAR-12" },
          { type: "Calibración", frequencyMonths: 6, nextDue: "2026-09-18", lastDone: "2026-03-18", cost: 420, provider: "Metrología Andes", contract: "CAL-MA-02" },
          { type: "Monitoreo", frequencyMonths: 1, nextDue: "2026-07-18", lastDone: "2026-06-18", cost: 0, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2028-03-18", lastDone: "2026-03-18", cost: 620, provider: "Sartorius Service", contract: "OQ-SAR-12" }
        ]
      },
      {
        id: "eq-006",
        assetTag: "LAB-KF-006",
        name: "Karl Fischer volumétrico",
        type: "Karl Fischer",
        manufacturer: "Metrohm",
        provider: "Metrohm Chile",
        model: "899 Coulometer",
        serial: "MH899-5502",
        location: "Humedad y Titulación",
        owner: "Felipe Araya",
        status: "Operativo",
        criticality: "Media",
        acquisitionDate: "2021-11-11",
        commercialValue: 24100,
        commercialValueDate: "2026-02-14",
        notes: "Equipo para determinación de agua en materias primas y producto terminado.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2026-11-05", lastDone: "2025-11-04", cost: 1500, provider: "Metrohm Chile", contract: "SVC-MET-22" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-11-05", lastDone: "2025-11-04", cost: 680, provider: "Metrología Andes", contract: "CAL-MA-21" },
          { type: "Monitoreo", frequencyMonths: 3, nextDue: "2026-07-25", lastDone: "2026-04-25", cost: 110, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2027-11-05", lastDone: "2025-11-04", cost: 1750, provider: "Metrohm Chile", contract: "OQ-MET-22" }
        ]
      },
      {
        id: "eq-007",
        assetTag: "LAB-TOC-007",
        name: "Analizador TOC",
        type: "TOC",
        manufacturer: "Shimadzu",
        provider: "Shimadzu Scientific",
        model: "TOC-L CPH",
        serial: "SHTOC-L-2401",
        location: "Agua Purificada",
        owner: "Paula Medina",
        status: "Operativo",
        criticality: "Alta",
        acquisitionDate: "2018-07-09",
        commercialValue: 58500,
        commercialValueDate: "2026-02-20",
        notes: "Equipo crítico para monitoreo de agua purificada y WFI.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2026-07-02", lastDone: "2025-07-01", cost: 3600, provider: "Shimadzu Scientific", contract: "SVC-SHI-19" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-08-18", lastDone: "2025-08-16", cost: 1450, provider: "Metrología Andes", contract: "CAL-MA-08" },
          { type: "Monitoreo", frequencyMonths: 1, nextDue: "2026-07-15", lastDone: "2026-06-15", cost: 90, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2026-09-30", lastDone: "2024-09-29", cost: 3900, provider: "Shimadzu Scientific", contract: "OQ-SHI-19" }
        ]
      },
      {
        id: "eq-008",
        assetTag: "LAB-COND-008",
        name: "Conductímetro de banco",
        type: "Conductímetro",
        manufacturer: "Mettler Toledo",
        provider: "Mettler Toledo",
        model: "SevenExcellence S470",
        serial: "MT-S470-9012",
        location: "Agua Purificada",
        owner: "Paula Medina",
        status: "Operativo",
        criticality: "Media",
        acquisitionDate: "2024-01-22",
        commercialValue: 3900,
        commercialValueDate: "2026-01-22",
        notes: "Control rutinario de conductividad en agua y soluciones buffer.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 24, nextDue: "2027-01-22", lastDone: "2025-01-22", cost: 420, provider: "Mettler Toledo", contract: "SVC-MT-15" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-09-01", lastDone: "2025-09-01", cost: 360, provider: "Metrología Andes", contract: "CAL-MA-09" },
          { type: "Monitoreo", frequencyMonths: 1, nextDue: "2026-07-08", lastDone: "2026-06-08", cost: 0, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 36, nextDue: "2028-01-22", lastDone: "2025-01-22", cost: 480, provider: "Mettler Toledo", contract: "OQ-MT-15" }
        ]
      },
      {
        id: "eq-009",
        assetTag: "LAB-EST-009",
        name: "Cámara de estabilidad",
        type: "Cámara estabilidad",
        manufacturer: "Binder",
        provider: "Binder Service",
        model: "KBF 720",
        serial: "BD-KBF720-1188",
        location: "Estabilidad 25C/60HR",
        owner: "Paula Medina",
        status: "Operativo",
        criticality: "Alta",
        acquisitionDate: "2017-05-14",
        commercialValue: 43800,
        commercialValueDate: "2026-03-02",
        notes: "Debe mantener monitoreo continuo de temperatura y humedad con alarmas.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 6, nextDue: "2026-10-01", lastDone: "2026-04-01", cost: 1200, provider: "Binder Service", contract: "SVC-BIN-33" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-10-01", lastDone: "2025-10-01", cost: 980, provider: "Metrología Andes", contract: "CAL-MA-40" },
          { type: "Monitoreo", frequencyMonths: 1, nextDue: "2026-07-05", lastDone: "2026-06-05", cost: 130, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 12, nextDue: "2026-10-01", lastDone: "2025-10-01", cost: 2100, provider: "Binder Service", contract: "OQ-BIN-33" }
        ]
      },
      {
        id: "eq-010",
        assetTag: "LAB-UPLC-010",
        name: "UPLC de alta resolución",
        type: "UPLC",
        manufacturer: "Waters",
        provider: "Waters Corporation",
        model: "ACQUITY Arc",
        serial: "WAT-ARC-4206",
        location: "Desarrollo Analítico",
        owner: "Carolina Núñez",
        status: "En mantenimiento",
        criticality: "Alta",
        acquisitionDate: "2023-12-04",
        commercialValue: 96000,
        commercialValueDate: "2026-04-18",
        notes: "En revisión por fuga en módulo de bomba. Uso restringido hasta liberación QA.",
        plans: [
          { type: "Mantenimiento proveedor", frequencyMonths: 12, nextDue: "2026-12-04", lastDone: "2025-12-04", cost: 5100, provider: "Waters Corporation", contract: "SVC-WAT-07" },
          { type: "Calibración", frequencyMonths: 12, nextDue: "2026-12-04", lastDone: "2025-12-04", cost: 2100, provider: "Metrología Andes", contract: "CAL-MA-55" },
          { type: "Monitoreo", frequencyMonths: 3, nextDue: "2026-09-04", lastDone: "2026-06-04", cost: 760, provider: "QA interno", contract: "INT-QA" },
          { type: "Calificación", frequencyMonths: 24, nextDue: "2027-12-04", lastDone: "2025-12-04", cost: 6100, provider: "Waters Corporation", contract: "OQ-WAT-07" }
        ]
      }
    ],
    events: [
      { id: "ev-001", equipmentId: "eq-001", date: "2026-04-10", type: "Monitoreo", userId: "u2", result: "Conforme", cost: 650, provider: "QA interno", notes: "Prueba de presión, ruido de línea base y carryover dentro de especificación." },
      { id: "ev-002", equipmentId: "eq-001", date: "2025-09-10", type: "Calibración", userId: "u3", result: "Conforme", cost: 1850, provider: "Metrología Andes", notes: "Certificado CAL-MA-14-2025 adjunto en carpeta QA." },
      { id: "ev-003", equipmentId: "eq-002", date: "2026-06-21", type: "Incidencia", userId: "u2", result: "Observación", cost: 0, provider: "Interno", notes: "Ruido intermitente en detector de conductividad. Se abre seguimiento." },
      { id: "ev-004", equipmentId: "eq-002", date: "2026-04-04", type: "Monitoreo", userId: "u5", result: "Conforme", cost: 520, provider: "QA interno", notes: "Revisión de blancos y estándar de control sin desviaciones." },
      { id: "ev-005", equipmentId: "eq-003", date: "2026-02-12", type: "Mantenimiento proveedor", userId: "u4", result: "Conforme", cost: 1100, provider: "Shimadzu Scientific", notes: "Limpieza óptica, verificación de lámpara y actualización de bitácora del proveedor." },
      { id: "ev-006", equipmentId: "eq-004", date: "2026-06-02", type: "Monitoreo", userId: "u5", result: "Conforme", cost: 140, provider: "QA interno", notes: "Verificación con agua purificada y estándar de densidad." },
      { id: "ev-007", equipmentId: "eq-005", date: "2026-06-18", type: "Monitoreo", userId: "u3", result: "Conforme", cost: 0, provider: "QA interno", notes: "Control diario con pesas E2 conforme." },
      { id: "ev-008", equipmentId: "eq-006", date: "2026-04-25", type: "Monitoreo", userId: "u2", result: "Conforme", cost: 110, provider: "QA interno", notes: "Factor de reactivo y drift estables." },
      { id: "ev-009", equipmentId: "eq-007", date: "2026-06-15", type: "Monitoreo", userId: "u7", result: "Conforme", cost: 90, provider: "QA interno", notes: "SST para TOC en agua purificada conforme." },
      { id: "ev-010", equipmentId: "eq-007", date: "2025-08-16", type: "Calibración", userId: "u3", result: "Conforme", cost: 1450, provider: "Metrología Andes", notes: "Curva de calibración y verificación independiente aprobadas." },
      { id: "ev-011", equipmentId: "eq-008", date: "2026-06-08", type: "Monitoreo", userId: "u7", result: "Conforme", cost: 0, provider: "QA interno", notes: "Verificación con estándar 1413 uS/cm." },
      { id: "ev-012", equipmentId: "eq-009", date: "2026-06-05", type: "Monitoreo", userId: "u7", result: "Conforme", cost: 130, provider: "QA interno", notes: "Descarga de logger sin excursiones de temperatura ni humedad." },
      { id: "ev-013", equipmentId: "eq-009", date: "2026-04-01", type: "Mantenimiento proveedor", userId: "u4", result: "Conforme", cost: 1200, provider: "Binder Service", notes: "Cambio de filtro, revisión de humidificador y prueba de alarmas." },
      { id: "ev-014", equipmentId: "eq-010", date: "2026-06-27", type: "Reparación correctiva", userId: "u4", result: "En proceso", cost: 1250, provider: "Waters Corporation", notes: "Diagnóstico preliminar indica fuga en sello de bomba. Equipo queda en mantenimiento." },
      { id: "ev-015", equipmentId: "eq-010", date: "2026-06-04", type: "Monitoreo", userId: "u1", result: "Observación", cost: 760, provider: "QA interno", notes: "Presión variable detectada durante análisis de sistema." }
    ]
  };
}

function getInitials(name) {
  return String(name || "Usuario")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function cleanCatalogName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniqueCatalogValues(values) {
  const seen = new Set();
  return values
    .map(cleanCatalogName)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLocaleLowerCase("es");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "es"));
}

function normalizeState(data) {
  const seed = createSeedData();
  const seedUsers = new Map(seed.users.map((user) => [user.id, user]));
  const users = (data.users?.length ? data.users : seed.users).map((user) => {
    const seedUser = seedUsers.get(user.id);
    const accessLevel = accessLevels[user.accessLevel] ? user.accessLevel : seedUser?.accessLevel || "viewer";
    return {
      ...user,
      initials: user.initials || getInitials(user.name),
      accessLevel,
      permissions: accessLevels[accessLevel].permissions
    };
  });

  if (!users.some((user) => user.accessLevel === "admin")) {
    users[0].accessLevel = "admin";
  }

  const activeUserId = users.some((user) => user.id === data.activeUserId)
    ? data.activeUserId
    : users[0]?.id || seed.activeUserId;

  return {
    ...seed,
    ...data,
    activeUserId,
    users,
    budgets: (data.budgets || [data.budget || seed.budget]).map(normalizeBudgetSettings),
    budget: normalizeBudgetSettings(data.budget || seed.budget),
    equipmentTypes: uniqueCatalogValues(data.equipmentTypes?.length ? data.equipmentTypes : seed.equipmentTypes),
    eventTypes: uniqueCatalogValues(data.eventTypes?.length ? data.eventTypes : eventTypes),
    ui: {
      ...seed.ui,
      ...(data.ui || {}),
      equipmentFilters: { ...seed.ui.equipmentFilters, ...(data.ui?.equipmentFilters || {}) },
      dashboardFilters: { ...seed.ui.dashboardFilters, ...(data.ui?.dashboardFilters || {}) },
      dashboardSavedViews: Array.isArray(data.ui?.dashboardSavedViews) ? data.ui.dashboardSavedViews : seed.ui.dashboardSavedViews,
      dashboardCollapsedSections: { ...seed.ui.dashboardCollapsedSections, ...(data.ui?.dashboardCollapsedSections || {}) },
      dashboardKpiOrder: Array.isArray(data.ui?.dashboardKpiOrder) ? data.ui.dashboardKpiOrder : seed.ui.dashboardKpiOrder,
      eventFilters: { ...seed.ui.eventFilters, ...(data.ui?.eventFilters || {}) },
      providerFilters: { ...seed.ui.providerFilters, ...(data.ui?.providerFilters || {}) },
      costBudgetYear: Number(data.ui?.costBudgetYear || data.budget?.year || seed.ui.costBudgetYear)
    }
  };
}

function normalizeBudgetSettings(value) {
  const base = defaultBudgetSettings();
  return {
    ...base,
    ...(value || {}),
    year: Number(value?.year || base.year),
    annualBudget: Number(value?.annualBudget || 0),
    currency: value?.currency || "CLP",
    allocationMethod: ["forecast_weighted", "asset_value_weighted", "equal_per_equipment"].includes(value?.allocationMethod)
      ? value.allocationMethod
      : base.allocationMethod,
    notes: value?.notes || base.notes
  };
}

function rowToBudget(row) {
  if (!row) return defaultBudgetSettings();
  return normalizeBudgetSettings({
    year: row.budget_year,
    annualBudget: row.annual_budget,
    currency: row.currency,
    allocationMethod: row.allocation_method,
    notes: row.notes
  });
}

function budgetToRow(budget) {
  return {
    budget_year: Number(budget.year || currentBudgetYear()),
    annual_budget: Number(budget.annualBudget || 0),
    currency: budget.currency || "CLP",
    allocation_method: budget.allocationMethod || "forecast_weighted",
    notes: budget.notes || "",
    updated_by: authSession?.user?.id || null
  };
}

function loadUiState() {
  try {
    return JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || "{}");
  } catch (error) {
    console.warn("No se pudo leer la preferencia de interfaz.", error);
    return {};
  }
}

function normalizeRemoteUser(profile) {
  return {
    id: profile.id,
    name: profile.name || profile.email || "Usuario",
    initials: profile.initials || getInitials(profile.name || profile.email),
    role: profile.job_role || "Usuario de laboratorio",
    area: profile.area || "Laboratorio",
    email: profile.email || "",
    accessLevel: profile.access_level || "viewer",
    isActive: profile.is_active !== false,
    source: "profile"
  };
}

function normalizeInvite(invite) {
  return {
    id: `invite-${invite.id}`,
    inviteId: invite.id,
    name: invite.name || invite.email,
    initials: invite.initials || getInitials(invite.name || invite.email),
    role: invite.job_role || "Usuario invitado",
    area: invite.area || "Laboratorio",
    email: invite.email || "",
    accessLevel: invite.access_level || "viewer",
    pending: invite.status === "pending",
    revoked: invite.status === "revoked",
    isActive: invite.status === "pending",
    source: "invite"
  };
}

function rowToPlan(row) {
  return {
    type: row.service_type,
    frequencyMonths: Number(row.frequency_months || 12),
    nextDue: row.next_due || "",
    lastDone: row.last_done || "",
    cost: Number(row.cost || 0),
    provider: row.provider || "",
    contract: row.contract || ""
  };
}

function rowToEquipment(row, plans) {
  return {
    id: row.id,
    assetTag: row.asset_tag,
    name: row.name,
    type: row.type,
    manufacturer: row.manufacturer || "",
    provider: row.provider || "",
    model: row.model || "",
    serial: row.serial || "",
    location: row.location || "",
    owner: row.owner_name || "",
    status: row.status || "Operativo",
    criticality: row.criticality || "Media",
    acquisitionDate: row.acquisition_date || "",
    commercialValue: Number(row.commercial_value || 0),
    commercialValueDate: row.commercial_value_date || "",
    photoPath: row.photo_path || "",
    photoUrl: "",
    notes: row.notes || "",
    plans
  };
}

function rowToEvent(row) {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    date: row.event_date,
    type: row.event_type,
    userId: row.user_id || "",
    userName: row.user_name || "",
    result: row.result,
    cost: Number(row.cost || 0),
    provider: row.provider || "",
    notes: row.notes || ""
  };
}

function equipmentToRow(equipment) {
  return {
    id: equipment.id,
    asset_tag: equipment.assetTag,
    name: equipment.name,
    type: equipment.type,
    manufacturer: equipment.manufacturer,
    provider: equipment.provider,
    model: equipment.model,
    serial: equipment.serial,
    location: equipment.location,
    owner_name: equipment.owner,
    status: equipment.status,
    criticality: equipment.criticality,
    acquisition_date: equipment.acquisitionDate || null,
    commercial_value: Number(equipment.commercialValue || 0),
    commercial_value_date: equipment.commercialValueDate || null,
    photo_path: equipment.photoPath || null,
    notes: equipment.notes,
    updated_by: authSession?.user?.id || null
  };
}

function planToRow(equipmentId, plan) {
  return {
    equipment_id: equipmentId,
    service_type: plan.type,
    frequency_months: Number(plan.frequencyMonths || 12),
    next_due: plan.nextDue || null,
    last_done: plan.lastDone || null,
    cost: Number(plan.cost || 0),
    provider: plan.provider || "",
    contract: plan.contract || ""
  };
}

function eventToRow(event) {
  const resolvedUserId = Object.prototype.hasOwnProperty.call(event, "userId")
    ? event.userId
    : authSession?.user?.id || null;
  return {
    id: event.id,
    equipment_id: event.equipmentId,
    event_date: event.date,
    event_type: event.type,
    user_id: resolvedUserId || null,
    user_name: event.userName || getActiveUser().name,
    result: event.result,
    cost: Number(event.cost || 0),
    provider: event.provider || "",
    notes: event.notes || ""
  };
}

function profileToRow(user) {
  return {
    name: user.name,
    initials: user.initials,
    job_role: user.role,
    area: user.area,
    email: user.email.toLowerCase(),
    access_level: user.accessLevel,
    is_active: user.isActive !== false
  };
}

function inviteToRow(user) {
  return {
    email: user.email.toLowerCase(),
    name: user.name,
    initials: user.initials,
    job_role: user.role,
    area: user.area,
    access_level: user.accessLevel,
    status: "pending",
    invited_by: authSession?.user?.id || null
  };
}

function requireSupabaseResponse(response) {
  if (response.error) throw response.error;
  return response.data;
}

function adminUserPayload(user, previous, targetProfile, password) {
  return {
    action: "saveUser",
    profileId: targetProfile?.id || (previous?.source === "profile" ? previous.id : ""),
    inviteId: previous?.source === "invite" ? previous.inviteId : "",
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: user.role,
    area: user.area,
    accessLevel: user.accessLevel,
    isActive: user.isActive !== false,
    password,
    redirectTo: getAuthRedirectUrl()
  };
}

async function invokeAdminUserCommand(payload) {
  if (!remoteMode) throw new Error("Supabase no está conectado.");
  const response = await supabaseClient.functions.invoke(ADMIN_USERS_FUNCTION, { body: payload });
  if (response.error) throw response.error;
  if (!response.data?.ok) throw new Error(response.data?.error || "No se pudo ejecutar la acción administrativa.");
  return response.data;
}

async function getCurrentProfile() {
  const userId = authSession?.user?.id;
  if (!userId) return null;
  const response = await supabaseClient
    .from("profiles")
    .select("id,email,name,initials,job_role,area,access_level,is_active")
    .eq("id", userId)
    .maybeSingle();
  return requireSupabaseResponse(response);
}

async function loadRemoteState() {
  const storedUi = loadUiState();
  currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    throw new Error("No existe perfil para la sesión actual. Cierra sesión y vuelve a ingresar.");
  }
  if (currentProfile.is_active === false) {
    await supabaseClient.auth.signOut();
    throw new Error("Tu cuenta está desactivada para esta aplicación.");
  }

  const canSeeInvites = currentProfile.access_level === "admin";
  const [profiles, invites, equipmentRows, planRows, eventRows, typeRows, eventTypeRows, budgetRows] = await Promise.all([
    supabaseClient.from("profiles").select("id,email,name,initials,job_role,area,access_level,is_active").order("name"),
    canSeeInvites
      ? supabaseClient.from("app_user_invites").select("id,email,name,initials,job_role,area,access_level,status").neq("status", "accepted").order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabaseClient.from("equipments").select("*").order("asset_tag"),
    supabaseClient.from("service_plans").select("*").order("next_due"),
    supabaseClient.from("equipment_events").select("*").order("event_date", { ascending: false }),
    supabaseClient.from("equipment_type_catalog").select("name").eq("is_active", true).order("sort_order").order("name"),
    supabaseClient.from("event_type_catalog").select("name").eq("is_active", true).order("sort_order").order("name"),
    supabaseClient.from("labcontrol_budgets").select("budget_year,annual_budget,currency,allocation_method,notes").order("budget_year", { ascending: false })
  ]);

  const profileData = requireSupabaseResponse(profiles);
  const inviteData = requireSupabaseResponse(invites);
  let equipmentData = requireSupabaseResponse(equipmentRows);
  let planData = requireSupabaseResponse(planRows);
  let eventData = requireSupabaseResponse(eventRows);
  const equipmentTypeData = requireSupabaseResponse(typeRows);
  const eventTypeData = requireSupabaseResponse(eventTypeRows);
  const budgetData = requireSupabaseResponse(budgetRows);
  const budgets = budgetData.map(rowToBudget);
  const requestedBudgetYear = Number((storedUi.ui || storedUi).costBudgetYear || currentBudgetYear());
  const selectedBudget = budgets.find((budget) => budget.year === requestedBudgetYear)
    || budgets.find((budget) => budget.year === currentBudgetYear())
    || budgets[0]
    || normalizeBudgetSettings({ year: requestedBudgetYear });

  if (!equipmentData.length && currentProfile.access_level === "admin") {
    await seedRemoteDemoData();
    const refreshed = await Promise.all([
      supabaseClient.from("equipments").select("*").order("asset_tag"),
      supabaseClient.from("service_plans").select("*").order("next_due"),
      supabaseClient.from("equipment_events").select("*").order("event_date", { ascending: false })
    ]);
    equipmentData = requireSupabaseResponse(refreshed[0]);
    planData = requireSupabaseResponse(refreshed[1]);
    eventData = requireSupabaseResponse(refreshed[2]);
  }

  const plansByEquipment = groupBy(planData.map(rowToPlanWithEquipment), (item) => item.equipmentId);
  let equipments = equipmentData.map((equipment) => {
    const plans = (plansByEquipment[equipment.id] || []).map(({ equipmentId, ...plan }) => plan);
    return rowToEquipment(equipment, plans);
  });
  equipments = await hydrateEquipmentPhotoUrls(equipments);

  return normalizeState({
    activeUserId: authSession.user.id,
    users: [
      ...profileData.map(normalizeRemoteUser),
      ...inviteData.map(normalizeInvite)
    ],
    budget: selectedBudget,
    budgets,
    equipmentTypes: equipmentTypeData.map((item) => item.name),
    eventTypes: eventTypeData.map((item) => item.name),
    equipments,
    events: eventData.map(rowToEvent),
    ui: storedUi.ui || storedUi
  });
}

async function hydrateEquipmentPhotoUrls(equipments) {
  if (!remoteMode) return equipments;
  return Promise.all(equipments.map(async (equipment) => {
    if (!equipment.photoPath) return equipment;
    const response = await supabaseClient.storage
      .from(EQUIPMENT_PHOTOS_BUCKET)
      .createSignedUrl(equipment.photoPath, 3600);
    if (response.error) {
      console.warn("No se pudo firmar la foto del equipo.", response.error);
      return equipment;
    }
    return { ...equipment, photoUrl: response.data?.signedUrl || "" };
  }));
}

function rowToPlanWithEquipment(row) {
  return {
    equipmentId: row.equipment_id,
    ...rowToPlan(row)
  };
}

async function seedRemoteDemoData() {
  const seed = createSeedData();
  const equipmentRows = seed.equipments.map((equipment) => ({
    ...equipmentToRow(equipment),
    created_by: authSession?.user?.id || null
  }));
  const planRows = seed.equipments.flatMap((equipment) =>
    equipment.plans.map((plan) => planToRow(equipment.id, plan))
  );
  const usersById = new Map(seed.users.map((user) => [user.id, user.name]));
  const eventRows = seed.events.map((event) =>
    eventToRow({
      ...event,
      userId: null,
      userName: usersById.get(event.userId) || "Demo LabControl"
    })
  );

  requireSupabaseResponse(await supabaseClient.from("equipments").insert(equipmentRows));
  requireSupabaseResponse(await supabaseClient.from("service_plans").insert(planRows));
  requireSupabaseResponse(await supabaseClient.from("equipment_events").insert(eventRows));
}

async function refreshRemoteState() {
  state = await loadRemoteState();
  renderApp();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return normalizeState(createSeedData());
  try {
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    console.warn("No se pudo leer el almacenamiento local, usando demo.", error);
    return normalizeState(createSeedData());
  }
}

function saveState() {
  if (remoteMode && state) {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ ui: state.ui }));
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getEquipment(id) {
  return state.equipments.find((equipment) => equipment.id === id);
}

function findUser(id) {
  return state.users.find((user) => user.id === id);
}

function getUser(id) {
  return findUser(id) || state.users[0];
}

function getAccessLevel(user = getUser(state.activeUserId)) {
  return accessLevels[user?.accessLevel] ? user.accessLevel : "viewer";
}

function getActiveUser() {
  return getUser(state.activeUserId);
}

function hasAnyAccess(levels) {
  return levels.includes(getAccessLevel());
}

function canManageUsers() {
  return hasAnyAccess(["admin"]);
}

function canEditData() {
  return hasAnyAccess(["admin", "editor"]);
}

function canExportData() {
  return hasAnyAccess(["admin", "editor"]);
}

function accessBadge(user) {
  const access = accessLevels[getAccessLevel(user)];
  return `<span class="badge ${access.tone}">${escapeHtml(access.label)}</span>`;
}

function getEventUserName(event) {
  return state.users.find((user) => user.id === event.userId)?.name || event.userName || "Usuario eliminado";
}

function guardedAction(condition, message, callback) {
  if (!condition) {
    showToast(message);
    return;
  }
  callback();
}

function getAllTasks() {
  return state.equipments.filter(isActiveEquipment).flatMap((equipment) =>
    (equipment.plans || []).filter(isScheduledServicePlan).map((plan) => ({
      id: `${equipment.id}-${plan.type}`,
      equipment,
      plan,
      due: plan.nextDue,
      ...dueInfo(plan.nextDue)
    }))
  ).sort((a, b) => a.days - b.days);
}

function annualizedForecastForEquipment(equipment) {
  return (equipment.plans || []).reduce((sum, plan) => sum + annualizedCost(plan), 0);
}

function annualizedForecastForEquipments(equipments = state.equipments) {
  return equipments.reduce((sum, equipment) => sum + annualizedForecastForEquipment(equipment), 0);
}

function getBudgetSettings() {
  const year = Number(state.ui?.costBudgetYear || state.budget?.year || currentBudgetYear());
  const selected = (state.budgets || []).find((budget) => Number(budget.year) === year);
  return normalizeBudgetSettings(selected || { year });
}

function periodBudgetFromAnnual(annualBudget, range) {
  if (!annualBudget) return null;
  return range?.days ? annualBudget * (range.days / 365) : annualBudget;
}

function annualBudgetForEquipments(equipments) {
  const budget = getBudgetSettings();
  if (!budget.annualBudget) return 0;
  const equipmentIds = new Set(equipments.map((equipment) => equipment.id));
  return budgetAllocationRows(state.equipments, budget.annualBudget, budget.allocationMethod)
    .filter((row) => equipmentIds.has(row.equipment.id))
    .reduce((sum, row) => sum + Number(row.allocated || 0), 0);
}

function getMetrics() {
  const tasks = getAllTasks();
  const activeEquipments = state.equipments.filter(isActiveEquipment);
  const activeIds = new Set(activeEquipments.map((equipment) => equipment.id));
  const totalValue = state.equipments.reduce((sum, equipment) => sum + Number(equipment.commercialValue || 0), 0);
  const budget = getBudgetSettings();
  const budgetYear = Number(budget.year || currentBudgetYear());
  const annualBudget = Number(budget.annualBudget || 0);
  const annualizedForecast = annualizedForecastForEquipments(activeEquipments);
  const ytdSpent = state.events
    .filter((event) => activeIds.has(event.equipmentId) && parseLocalDate(event.date)?.getFullYear() === budgetYear)
    .reduce((sum, event) => sum + Number(event.cost || 0), 0);
  const overdue = tasks.filter((item) => item.days < 0).length;
  const due60 = tasks.filter((item) => item.days >= 0 && item.days <= 60).length;
  const compliant = tasks.length ? Math.round(((tasks.length - overdue) / tasks.length) * 100) : 100;
  return {
    tasks,
    totalValue,
    annualBudget,
    annualizedForecast,
    forecastVsBudget: annualBudget ? annualizedForecast - annualBudget : null,
    budgetRemaining: annualBudget ? annualBudget - ytdSpent : null,
    budgetUsage: annualBudget ? Math.round((ytdSpent / annualBudget) * 100) : null,
    budgetYear,
    ytdSpent,
    overdue,
    due60,
    compliant
  };
}

function periodRange(period, offset = 0) {
  const today = todayDate();
  if (period === "all") return { start: null, end: null, days: null, label: "Todo el historial" };
  if (period === "ytd") {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = today;
    const days = Math.max(1, Math.ceil((end - start) / MS_PER_DAY) + 1);
    return offset
      ? { start: new Date(start.getFullYear() - 1, 0, 1), end: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()), days, label: "Año a la fecha anterior" }
      : { start, end, days, label: "Año a la fecha" };
  }
  const days = Number(period || 90);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (offset * days));
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days + 1);
  return { start, end, days, label: `Últimos ${days} días` };
}

function isWithinRange(dateValue, range) {
  const date = parseLocalDate(dateValue);
  if (!date) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function equipmentCategory(type) {
  const value = String(type || "").toLowerCase();
  if (/hplc|uplc|ic|cromat/.test(value)) return "Cromatografía";
  if (/uv|vis|nir|color|turbid|refract/.test(value)) return "Espectroscopía / Ópticos";
  if (/balanza|masa|peso|torqu|pie|altura|espesor|inclin/.test(value)) return "Medición dimensional / masa";
  if (/ph|conduct|toc|karl|titul|dens|viscos|humedad/.test(value)) return "Fisicoquímico";
  if (/estufa|refrigerador|term|baño|sonic|agit|purificador/.test(value)) return "Ambiente y soporte";
  return "Otros";
}

function serviceText(value) {
  return String(value || "").toLowerCase();
}

function isCalibrationService(value) {
  return /calibr|calificación|calificacion|metrolog/.test(serviceText(value));
}

function isMaintenanceExemptionService(value) {
  return serviceText(value) === serviceText(NO_MAINTENANCE_SERVICE);
}

function isMaintenanceService(value) {
  if (isMaintenanceExemptionService(value)) return false;
  return /mant|mantenimiento|preventivo|proveedor|calibración\/mantención|calibracion\/mantencion/.test(serviceText(value));
}

function isActiveEquipment(equipment) {
  return equipment?.status === "Operativo" || equipment?.status === "En mantenimiento";
}

function equipmentUseClassification(equipment) {
  if (isActiveEquipment(equipment)) return { label: "Activo", tone: "success", detail: "Equipo en uso o en intervención para volver a operar." };
  if (equipment?.status === "Observación") return { label: "No activo · Observación", tone: "warning", detail: "Fuera de la agenda activa hasta regularizar su estado." };
  if (equipment?.status === "Fuera de servicio") return { label: "No activo", tone: "neutral", detail: "Excluido de agenda, cumplimiento y proyecciones." };
  return { label: "Sin clasificación", tone: "neutral", detail: "Estado operacional no reconocido." };
}

function maintenancePlansFor(equipment) {
  return (equipment?.plans || []).filter((plan) => isMaintenanceService(plan.type));
}

function maintenanceExemptionPlan(equipment) {
  return (equipment?.plans || []).find((plan) => isMaintenanceExemptionService(plan.type));
}

function hasMaintenanceExemption(equipment) {
  return Boolean(maintenanceExemptionPlan(equipment));
}

function isScheduledServicePlan(plan) {
  return Boolean(plan?.nextDue) && !isMaintenanceExemptionService(plan.type);
}

function maintenanceEventsFor(equipment, year = null) {
  return state.events
    .filter((event) => event.equipmentId === equipment.id && isMaintenanceService(event.type))
    .filter((event) => year === null || parseLocalDate(event.date)?.getFullYear() === Number(year))
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
}

function maintenanceHistoryRecords(equipment, year = null) {
  const records = maintenanceEventsFor(equipment).map((event) => ({ ...event, source: "bitacora" }));
  maintenancePlansFor(equipment).forEach((plan) => {
    if (!plan.lastDone) return;
    const duplicate = records.some((record) => record.date === plan.lastDone && serviceText(record.type) === serviceText(plan.type));
    if (!duplicate) {
      records.push({
        id: `plan-history-${equipment.id}-${plan.type}`,
        equipmentId: equipment.id,
        date: plan.lastDone,
        type: plan.type,
        result: "Última fecha del plan maestro",
        cost: 0,
        provider: plan.provider,
        notes: "Referencia conservada desde el plan maestro.",
        source: "plan"
      });
    }
  });
  return records
    .filter((record) => year === null || parseLocalDate(record.date)?.getFullYear() === Number(year))
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
}

function maintenanceAuthorization(equipment) {
  const classification = equipmentUseClassification(equipment);
  if (!isActiveEquipment(equipment)) {
    return { authorized: false, applicable: false, exempt: hasMaintenanceExemption(equipment), label: "No aplica", tone: "neutral", detail: classification.detail, nextDue: "" };
  }
  if (hasMaintenanceExemption(equipment)) {
    if (equipment.status === "En mantenimiento") {
      return { authorized: false, applicable: false, exempt: true, label: "En intervención", tone: "warning", detail: "El plan maestro indica que no requiere mantenimiento preventivo, pero el equipo permanece temporalmente en intervención.", nextDue: "" };
    }
    return { authorized: true, applicable: false, exempt: true, label: "Autorizado · exento", tone: "success", detail: "El plan maestro declara que este equipo no requiere mantenimiento preventivo. La exención autoriza su uso mientras permanezca Operativo.", nextDue: "" };
  }
  const plans = maintenancePlansFor(equipment).filter((plan) => plan.nextDue);
  if (!plans.length) {
    return { authorized: false, applicable: true, exempt: false, label: "No autorizado", tone: "danger", detail: "Equipo activo sin plan de mantención preventiva vigente ni exención documentada.", nextDue: "" };
  }
  const ordered = [...plans].sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue));
  const nextPlan = ordered[0];
  if (ordered.some((plan) => daysUntil(plan.nextDue) < 0)) {
    return { authorized: false, applicable: true, exempt: false, label: "No autorizado", tone: "danger", detail: `Mantención preventiva vencida: ${formatDate(nextPlan.nextDue)}.`, nextDue: nextPlan.nextDue };
  }
  if (equipment.status === "En mantenimiento") {
    return { authorized: false, applicable: true, exempt: false, label: "En intervención", tone: "warning", detail: "Activo temporalmente no disponible mientras finaliza la intervención.", nextDue: nextPlan.nextDue };
  }
  return { authorized: true, applicable: true, exempt: false, label: "Autorizado", tone: "success", detail: `Mantención preventiva vigente hasta ${formatDate(nextPlan.nextDue)}.`, nextDue: nextPlan.nextDue };
}

function authorizationFilterValue(equipment) {
  const authorization = maintenanceAuthorization(equipment);
  if (authorization.authorized) return "Autorizados";
  if (authorization.label === "En intervención") return "En intervención";
  if (!authorization.applicable) return "No aplica";
  return "No autorizados";
}

function matchesAuthorizationFilter(equipment, value) {
  if (!value || value === "Todos") return true;
  const authorization = maintenanceAuthorization(equipment);
  if (value === "Autorizados") return authorization.authorized;
  if (value === "Autorizados por vigencia") return authorization.authorized && !authorization.exempt;
  if (value === "Autorizados por exención") return authorization.authorized && authorization.exempt;
  return authorizationFilterValue(equipment) === value;
}

function annualMaintenanceCompliance(equipments, year = currentBudgetYear()) {
  const active = equipments.filter(isActiveEquipment);
  const yearStart = new Date(Number(year), 0, 1);
  const yearEnd = new Date(Number(year), 11, 31);
  const cycles = active.flatMap((equipment) => maintenancePlansFor(equipment).filter((plan) => {
    const lastDone = parseLocalDate(plan.lastDone);
    const nextDue = parseLocalDate(plan.nextDue);
    return (lastDone && lastDone >= yearStart && lastDone <= yearEnd)
      || (nextDue && nextDue <= yearEnd);
  }).map((plan) => ({ equipment, plan })));
  const completed = cycles.filter(({ equipment, plan }) => {
    const lastDone = parseLocalDate(plan.lastDone);
    if (lastDone && lastDone >= yearStart && lastDone <= yearEnd) return true;
    return maintenanceEventsFor(equipment, year).some((event) => event.result !== "No conforme");
  });
  return {
    year: Number(year),
    planned: cycles.length,
    completed: completed.length,
    percent: cycles.length ? Math.round((completed.length / cycles.length) * 100) : null,
    active: active.length
  };
}

function addMonthsPreservingDay(date, months) {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function planOccurrencesForYear(plan, year) {
  const frequency = Math.max(1, Number(plan.frequencyMonths || 12));
  let due = parseLocalDate(plan.nextDue);
  if (!due) return 0;
  const start = new Date(Number(year), 0, 1);
  const end = new Date(Number(year), 11, 31);
  let guard = 0;
  while (due > end && guard < 120) {
    due = addMonthsPreservingDay(due, -frequency);
    guard += 1;
  }
  while (due < start && guard < 240) {
    due = addMonthsPreservingDay(due, frequency);
    guard += 1;
  }
  let count = 0;
  while (due <= end && guard < 360) {
    if (due >= start) count += 1;
    due = addMonthsPreservingDay(due, frequency);
    guard += 1;
  }
  return count;
}

function projectedMaintenanceCost(equipments, year) {
  return equipments.filter(isActiveEquipment).reduce((sum, equipment) => sum + maintenancePlansFor(equipment).reduce((planSum, plan) => {
    return planSum + (Number(plan.cost || 0) * planOccurrencesForYear(plan, year));
  }, 0), 0);
}

function maintenanceCostHistory(equipments = state.equipments) {
  const ids = new Set(equipments.map((equipment) => equipment.id));
  const grouped = groupBy(state.events.filter((event) => ids.has(event.equipmentId) && isMaintenanceService(event.type)), (event) => String(parseLocalDate(event.date)?.getFullYear() || "Sin fecha"));
  return Object.entries(grouped).map(([year, events]) => ({
    year,
    events: events.length,
    equipmentCount: new Set(events.map((event) => event.equipmentId)).size,
    cost: events.reduce((sum, event) => sum + Number(event.cost || 0), 0),
    hasCost: events.some((event) => Number(event.cost || 0) > 0)
  })).sort((a, b) => String(a.year).localeCompare(String(b.year)));
}

function isFailureEvent(event) {
  const text = `${event.type || ""} ${event.result || ""} ${event.notes || ""}`.toLowerCase();
  return /falla|incidencia|reparación correctiva|reparacion correctiva|no conforme|observación|observacion|en proceso/.test(text);
}

function isRepairEvent(event) {
  const text = `${event.type || ""} ${event.result || ""}`.toLowerCase();
  return /repar|mant|correctiva|conforme/.test(text);
}

function downtimeHoursForEvent(event) {
  const match = String(event.notes || "").match(/(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hora|horas)\b/i);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function lifecycleStage(equipment) {
  const acquisition = parseLocalDate(equipment.acquisitionDate);
  if (!acquisition) return "Sin fecha";
  const ageYears = (todayDate() - acquisition) / (MS_PER_DAY * 365.25);
  if (ageYears < 2) return "Nuevo";
  if (ageYears < 7) return "Operativo";
  if (ageYears < 10) return "Envejecido";
  if (equipment.criticality === "Alta") return "Candidato a reemplazo";
  return "Obsoleto";
}

function dashboardFilterOptions() {
  return {
    periods: [
      ["30", "Últimos 30 días"],
      ["60", "Últimos 60 días"],
      ["90", "Últimos 90 días"],
      ["180", "Últimos 180 días"],
      ["365", "Últimos 12 meses"],
      ["ytd", "Año a la fecha"],
      ["all", "Todo el historial"]
    ],
    locations: uniqueValues("location"),
    categories: uniqueCatalogValues(state.equipments.map((equipment) => equipmentCategory(equipment.type))),
    types: uniqueValues("type"),
    statuses: uniqueValues("status"),
    criticalities: uniqueValues("criticality"),
    owners: uniqueValues("owner"),
    providers: uniqueCatalogValues([
      ...state.equipments.map((equipment) => equipment.provider),
      ...state.equipments.flatMap((equipment) => (equipment.plans || []).map((plan) => plan.provider)),
      ...state.events.map((event) => event.provider)
    ]),
    manufacturers: uniqueValues("manufacturer"),
    equipments: [...state.equipments].sort((a, b) => a.name.localeCompare(b.name, "es"))
  };
}

function matchesDashboardEquipment(equipment, filters) {
  const planProviders = (equipment.plans || []).map((plan) => plan.provider);
  return (filters.location === "Todos" || equipment.location === filters.location)
    && (filters.category === "Todos" || equipmentCategory(equipment.type) === filters.category)
    && (filters.type === "Todos" || equipment.type === filters.type)
    && (filters.status === "Todos" || equipment.status === filters.status)
    && (filters.criticality === "Todos" || equipment.criticality === filters.criticality)
    && (filters.owner === "Todos" || equipment.owner === filters.owner)
    && (filters.manufacturer === "Todos" || equipment.manufacturer === filters.manufacturer)
    && (filters.equipmentId === "Todos" || equipment.id === filters.equipmentId)
    && matchesAuthorizationFilter(equipment, filters.authorization)
    && (filters.provider === "Todos" || equipment.provider === filters.provider || planProviders.includes(filters.provider));
}

function dashboardContext() {
  const filters = state.ui.dashboardFilters || createSeedData().ui.dashboardFilters;
  const range = periodRange(filters.period);
  const previousRange = periodRange(filters.period, -1);
  const equipments = state.equipments.filter((equipment) => matchesDashboardEquipment(equipment, filters));
  const equipmentIds = new Set(equipments.map((equipment) => equipment.id));
  const activeEquipments = equipments.filter(isActiveEquipment);
  const activeEquipmentIds = new Set(activeEquipments.map((equipment) => equipment.id));
  const events = state.events.filter((event) =>
    equipmentIds.has(event.equipmentId)
    && isWithinRange(event.date, range)
    && (filters.provider === "Todos" || event.provider === filters.provider)
  );
  const previousEvents = state.events.filter((event) =>
    equipmentIds.has(event.equipmentId)
    && isWithinRange(event.date, previousRange)
    && (filters.provider === "Todos" || event.provider === filters.provider)
  );
  const tasks = activeEquipments.flatMap((equipment) =>
    (equipment.plans || []).filter(isScheduledServicePlan).map((plan) => ({
      id: `${equipment.id}-${plan.type}`,
      equipment,
      plan,
      due: plan.nextDue,
      ...dueInfo(plan.nextDue)
    }))
  ).sort((a, b) => a.days - b.days);
  const activeEvents = events.filter((event) => activeEquipmentIds.has(event.equipmentId));
  const previousActiveEvents = previousEvents.filter((event) => activeEquipmentIds.has(event.equipmentId));
  return { filters, range, previousRange, equipments, activeEquipments, activeEvents, previousActiveEvents, events, previousEvents, tasks };
}

function calcCompliance(tasks, matcher) {
  const applicable = tasks.filter((task) => matcher(task.plan.type));
  if (!applicable.length) return null;
  const current = applicable.filter((task) => task.days >= 0).length;
  return Math.round((current / applicable.length) * 100);
}

function metricDelta(current, previous, suffix = "") {
  if (previous === null || previous === undefined || Number.isNaN(previous)) return "Sin comparación histórica";
  const diff = Number(current || 0) - Number(previous || 0);
  if (!diff) return `Sin variación${suffix ? ` ${suffix}` : ""}`;
  return `${diff > 0 ? "+" : ""}${formatNumber(diff)}${suffix} vs periodo anterior`;
}

function percentDelta(current, previous) {
  if (previous === null || previous === undefined || Number.isNaN(previous)) return "Sin comparación histórica";
  const diff = Number(current || 0) - Number(previous || 0);
  if (!diff) return "Sin variación";
  return `${diff > 0 ? "+" : ""}${formatNumber(diff)} pts vs periodo anterior`;
}

function dashboardMetrics(context = dashboardContext()) {
  const totalInventory = context.equipments.length;
  const total = context.activeEquipments.length;
  const available = context.activeEquipments.filter((equipment) => equipment.status === "Operativo").length;
  const out = context.equipments.filter((equipment) => equipment.status === "Fuera de servicio").length;
  const observed = context.equipments.filter((equipment) => equipment.status === "Observación").length;
  const maintenance = context.activeEquipments.filter((equipment) => equipment.status === "En mantenimiento").length;
  const availability = total ? Math.round((available / total) * 100) : null;
  const calibrationCompliance = calcCompliance(context.tasks, isCalibrationService);
  const maintenanceCompliance = calcCompliance(context.tasks, isMaintenanceService);
  const calibrationOverdue = context.tasks.filter((task) => isCalibrationService(task.plan.type) && task.days < 0).length;
  const maintenanceOverdue = context.tasks.filter((task) => isMaintenanceService(task.plan.type) && task.days < 0).length;
  const due30 = context.tasks.filter((task) => task.days >= 0 && task.days <= 30).length;
  const failures = context.activeEvents.filter(isFailureEvent).length;
  const previousFailures = context.previousActiveEvents.filter(isFailureEvent).length;
  const cost = context.activeEvents.reduce((sum, event) => sum + Number(event.cost || 0), 0);
  const previousCost = context.previousActiveEvents.reduce((sum, event) => sum + Number(event.cost || 0), 0);
  const annualizedForecast = annualizedForecastForEquipments(context.activeEquipments);
  const annualBudget = annualBudgetForEquipments(context.activeEquipments);
  const periodBudget = periodBudgetFromAnnual(annualBudget, context.range);
  const downtimeValues = context.activeEvents.map(downtimeHoursForEvent).filter((value) => value !== null);
  const downtimeHours = downtimeValues.length ? downtimeValues.reduce((sum, value) => sum + value, 0) : null;
  const repairs = context.activeEvents.filter(isRepairEvent).length;
  const operatingHours = context.range.days && downtimeHours !== null ? Math.max(0, (context.range.days * 24 * total) - downtimeHours) : null;
  const mtbf = operatingHours !== null && failures ? operatingHours / failures : null;
  const mttr = downtimeHours !== null && repairs ? downtimeHours / repairs : null;
  const healthRows = context.equipments.map((equipment) => equipmentHealth(equipment));
  const highRiskCritical = healthRows.filter((row) => row.equipment.criticality === "Alta" && row.score < 70).length;
  const authorizations = context.activeEquipments.map((equipment) => ({ equipment, ...maintenanceAuthorization(equipment) }));
  const authorized = authorizations.filter((item) => item.authorized).length;
  const exemptAuthorized = authorizations.filter((item) => item.authorized && item.exempt).length;
  const authorizedByMaintenance = authorizations.filter((item) => item.authorized && !item.exempt).length;
  const unauthorized = authorizations.filter((item) => item.applicable && !item.authorized).length;
  const operative = context.activeEquipments.filter((equipment) => equipment.status === "Operativo");
  const operativeMaintained = operative.filter((equipment) => maintenanceAuthorization(equipment).authorized).length;
  const operativeMaintainedPercent = operative.length ? Math.round((operativeMaintained / operative.length) * 100) : null;
  const annualMaintenance = annualMaintenanceCompliance(context.activeEquipments, currentBudgetYear());
  return {
    totalInventory,
    total,
    available,
    out,
    observed,
    maintenance,
    availability,
    calibrationCompliance,
    maintenanceCompliance,
    calibrationOverdue,
    maintenanceOverdue,
    due30,
    downtimeHours,
    failures,
    mtbf,
    mttr,
    cost,
    previousCost,
    annualBudget,
    annualizedForecast,
    periodBudget,
    budgetVariance: periodBudget ? cost - periodBudget : null,
    failureRate: total ? failures / total : null,
    highRiskCritical,
    authorizations,
    authorized,
    exemptAuthorized,
    authorizedByMaintenance,
    unauthorized,
    operativeMaintained,
    operativeMaintainedPercent,
    annualMaintenance,
    healthRows,
    comparisons: {
      failures: metricDelta(failures, previousFailures),
      cost: metricDelta(cost, previousCost, " CLP"),
      availability: "Estado actual del inventario filtrado",
      compliance: "Calculado contra vencimientos actuales"
    }
  };
}

function equipmentHealth(equipment) {
  const now = todayDate();
  const events12 = state.events.filter((event) => event.equipmentId === equipment.id && isWithinRange(event.date, { start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), end: now }));
  const failures12 = events12.filter(isFailureEvent).length;
  const cost12 = events12.reduce((sum, event) => sum + Number(event.cost || 0), 0);
  const downtimeValues = events12.map(downtimeHoursForEvent).filter((value) => value !== null);
  const downtime = downtimeValues.length ? downtimeValues.reduce((sum, value) => sum + value, 0) : null;
  const calibrationPlans = (equipment.plans || []).filter((plan) => isCalibrationService(plan.type));
  const maintenancePlans = (equipment.plans || []).filter((plan) => isMaintenanceService(plan.type));
  const maintenanceExempt = hasMaintenanceExemption(equipment);
  const nextCalibration = [...calibrationPlans].sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue))[0];
  const nextMaintenance = [...maintenancePlans].sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue))[0];
  const lastCalibration = [...calibrationPlans].sort((a, b) => parseLocalDate(b.lastDone || "") - parseLocalDate(a.lastDone || ""))[0];
  const lastMaintenance = [...maintenancePlans].sort((a, b) => parseLocalDate(b.lastDone || "") - parseLocalDate(a.lastDone || ""))[0];
  const reasons = [];
  let score = 100;
  const penalize = (points, reason) => {
    score -= points;
    reasons.push(`-${points}: ${reason}`);
  };
  if (isActiveEquipment(equipment)) {
    if (!calibrationPlans.length) penalize(12, "sin plan de calibración aplicable");
    else if (calibrationPlans.some((plan) => daysUntil(plan.nextDue) < 0)) penalize(25, "calibración vencida");
    else if (calibrationPlans.some((plan) => daysUntil(plan.nextDue) <= 30)) penalize(10, "calibración próxima");
    if (maintenanceExempt) reasons.push("Mantención preventiva no aplicable por exención documentada en el plan maestro");
    else if (!maintenancePlans.length) penalize(12, "sin plan de mantenimiento ni exención documentada");
    else if (maintenancePlans.some((plan) => daysUntil(plan.nextDue) < 0)) penalize(22, "mantenimiento vencido");
    else if (maintenancePlans.some((plan) => daysUntil(plan.nextDue) <= 30)) penalize(9, "mantenimiento próximo");
  } else {
    reasons.push("Planes excluidos del cumplimiento mientras el equipo no esté activo");
  }
  if (equipment.status === "Observación") penalize(10, "estado en observación");
  if (equipment.status === "En mantenimiento") penalize(20, "equipo en mantenimiento");
  if (equipment.status === "Fuera de servicio") penalize(35, "equipo fuera de servicio");
  if (failures12) penalize(Math.min(18, failures12 * 6), `${failures12} falla(s) en 12 meses`);
  const acquisition = parseLocalDate(equipment.acquisitionDate);
  if (!acquisition) penalize(4, "sin fecha de adquisición");
  else {
    const ageYears = (now - acquisition) / (MS_PER_DAY * 365.25);
    if (ageYears >= 10) penalize(10, "antigüedad mayor o igual a 10 años");
    else if (ageYears >= 7) penalize(6, "equipo envejecido");
  }
  if (!equipment.owner) penalize(8, "sin responsable");
  if (!equipment.serial) penalize(4, "sin número de serie");
  if (!equipment.model) penalize(4, "sin modelo");
  if (equipment.criticality === "Alta" && score < 75) penalize(5, "criticidad alta amplifica el riesgo");
  const scoreValue = Math.max(0, Math.min(100, Math.round(score)));
  const recentFailures = events12.filter((event) => isFailureEvent(event) && daysUntil(event.date) >= -180).length;
  const previousFailures = events12.filter((event) => isFailureEvent(event) && daysUntil(event.date) < -180).length;
  const trend = recentFailures > previousFailures ? "Sube" : recentFailures < previousFailures ? "Baja" : "Estable";
  return {
    equipment,
    score: scoreValue,
    tone: scoreValue >= 85 ? "success" : scoreValue >= 70 ? "info" : scoreValue >= 50 ? "warning" : "danger",
    tooltip: reasons.length ? reasons.join(" | ") : "100: planes vigentes, sin fallas recientes ni brechas documentales detectadas.",
    lastCalibration: lastCalibration?.lastDone || "",
    nextCalibration: nextCalibration?.nextDue || "",
    lastMaintenance: lastMaintenance?.lastDone || "",
    nextMaintenance: nextMaintenance?.nextDue || "",
    maintenanceExempt,
    failures12,
    downtime,
    cost12,
    trend
  };
}

function groupBy(items, callback) {
  return items.reduce((groups, item) => {
    const key = callback(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function getPlanFor(equipment, type) {
  return (equipment.plans || []).find((plan) => plan.type === type);
}

function getSoonestPlan(equipment) {
  return (equipment.plans || []).filter(isScheduledServicePlan).sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue))[0];
}

function equipmentFrequencyValues(equipment) {
  return uniqueCatalogValues((equipment.plans || []).map((plan) => isMaintenanceExemptionService(plan.type) ? "Mantención no requerida" : formatFrequency(plan.frequencyMonths)));
}

function equipmentFrequencyOptions() {
  return uniqueCatalogValues(state.equipments.flatMap(equipmentFrequencyValues));
}

function equipmentFrequencyBadges(equipment) {
  const values = equipmentFrequencyValues(equipment);
  return values.length
    ? values.map((value) => `<span class="badge neutral">${escapeHtml(value)}</span>`).join(" ")
    : `<span class="badge neutral">Sin frecuencia</span>`;
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setShellVisible(visible) {
  $("#appShell")?.classList.toggle("is-hidden", !visible);
  $("#authRoot")?.classList.toggle("is-hidden", visible);
}

function renderSetupScreen() {
  setShellVisible(false);
  $("#authRoot").innerHTML = `
    <div class="auth-card">
      <div class="brand auth-brand">
        <div class="brand-mark" aria-hidden="true">LH</div>
        <div>
          <strong>LabControl-EquiposHG</strong>
          <span>Gestión de Equipos</span>
        </div>
      </div>
      <h1>Conecta Supabase para activar sesiones</h1>
      <p class="auth-copy">Completa <strong>app-config.js</strong> con la URL del proyecto y la llave publishable. Después aplica la migración incluida en la carpeta <strong>supabase/migrations</strong>.</p>
      <div class="setup-snippet">
        <code>window.LABCONTROL_CONFIG = { supabaseUrl: "...", supabasePublishableKey: "..." };</code>
      </div>
    </div>
  `;
}

function renderAuthScreen(mode = "signin", message = "") {
  const isSignup = mode === "signup" && ALLOW_SELF_SIGNUP;
  setShellVisible(false);
  $("#authRoot").innerHTML = `
    <div class="landing-shell">
      <section class="landing-hero" aria-label="Gestión de Equipos">
        <div class="landing-hero-content">
          <div class="landing-brand"><span class="brand-mark" aria-hidden="true">LH</span><strong>LabControl-EquiposHG</strong></div>
          <p class="landing-eyebrow">Laboratorio conectado</p>
          <h1>Gestión de Equipos</h1>
          <p class="landing-copy">Visibilidad, trazabilidad y planificación para el ciclo completo de los activos de laboratorio.</p>
          <div class="landing-signals"><span>Inventario</span><span>Servicios</span><span>Costos</span><span>Bitácora</span></div>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <div class="auth-panel-heading">
            <p class="eyebrow">Acceso seguro</p>
            <h2>${isSignup ? "Crear cuenta" : "Iniciar sesión"}</h2>
          </div>
          ${message ? `<div class="auth-message">${escapeHtml(message)}</div>` : ""}
          <form class="auth-form" data-form="auth" data-mode="${isSignup ? "signup" : "signin"}">
            ${isSignup ? field("Nombre completo", "name", "", "text", true) : ""}
            ${field("Correo", "email", "", "email", true)}
            ${field("Contraseña", "password", "", "password", true)}
            <button class="action-button" type="submit">${icon("shield")} ${isSignup ? "Crear cuenta" : "Ingresar"}</button>
          </form>
          ${ALLOW_SELF_SIGNUP ? `
            <button class="link-button" type="button" data-auth-mode="${isSignup ? "signin" : "signup"}">
              ${isSignup ? "Ya tengo una cuenta" : "Registrar nuevo usuario"}
            </button>
          ` : `<div class="auth-message">El acceso lo habilita un administrador de LabControl.</div>`}
        </div>
      </section>
    </div>
  `;
}

async function handleAuthSubmit(form) {
  if (!remoteMode) {
    renderSetupScreen();
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  try {
    if (form.dataset.mode === "signup") {
      if (!ALLOW_SELF_SIGNUP) {
        renderAuthScreen("signin", "El registro lo habilita un administrador.");
        return;
      }
      const response = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name: String(data.name || "").trim() },
          emailRedirectTo: getAuthRedirectUrl()
        }
      });
      if (response.error) throw response.error;
      if (!response.data.session) {
        renderAuthScreen("signin", "Cuenta creada. Revisa tu correo si Supabase solicita confirmación.");
        return;
      }
    } else {
      const response = await supabaseClient.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
    }
    await startAuthenticatedApp();
  } catch (error) {
    renderAuthScreen(form.dataset.mode, error.message || "No se pudo iniciar sesión.");
  }
}

async function signOut() {
  if (remoteMode) await supabaseClient.auth.signOut();
  authSession = null;
  currentProfile = null;
  state = null;
  renderAuthScreen("signin", "Sesión cerrada.");
}

async function startAuthenticatedApp() {
  const sessionResponse = await supabaseClient.auth.getSession();
  authSession = sessionResponse.data.session;
  if (!authSession) {
    renderAuthScreen("signin");
    return;
  }
  setShellVisible(true);
  setupEventListeners();
  state = await loadRemoteState();
  document.title = APP_NAME;
  renderApp();
}

function setActiveView(viewName) {
  state.ui.activeView = viewName;
  saveState();
  renderApp();
}

function renderApp() {
  const viewName = state.ui.activeView;
  $("#appShell")?.classList.toggle("sidebar-collapsed", Boolean(state.ui.sidebarCollapsed));
  renderNav();
  renderActiveUserSelect();
  renderGlobalAccessControls();
  $("#viewTitle").textContent = views[viewName].title;
  $$(".view").forEach((view) => view.classList.remove("active-view"));
  $(`#${viewName}View`).classList.add("active-view");

  const renderers = {
    dashboard: renderDashboard,
    equipos: renderEquipos,
    calendario: renderCalendario,
    bitacora: renderBitacora,
    costos: renderCostos,
    proveedores: renderProveedores,
    usuarios: renderUsuarios,
    configuracion: renderConfiguracion
  };
  renderers[viewName]();
}

function renderNav() {
  $$(".nav-item").forEach((button) => {
    const viewName = button.dataset.view;
    button.innerHTML = `${icon(views[viewName].icon)}<span>${views[viewName].label}</span>`;
    button.classList.toggle("active", state.ui.activeView === viewName);
    button.title = views[viewName].label;
  });
  const toggle = $("#sidebarToggle");
  if (toggle) {
    const collapsed = Boolean(state.ui.sidebarCollapsed);
    toggle.innerHTML = icon("sidebar");
    toggle.title = collapsed ? "Expandir menú" : "Minimizar menú";
    toggle.setAttribute("aria-label", toggle.title);
    toggle.setAttribute("aria-pressed", String(collapsed));
  }
}

function renderActiveUserSelect() {
  const select = $("#activeUserSelect");
  const user = getActiveUser();
  select.innerHTML = `
    <option value="${escapeHtml(user.id)}" selected>
      ${escapeHtml(user.name)} - ${escapeHtml(accessLevels[getAccessLevel(user)].shortLabel)}
    </option>
  `;
  select.disabled = true;
}

function renderGlobalAccessControls() {
  const exportButton = $("#exportAllBtn");
  const resetButton = $("#resetDemoBtn");
  exportButton.disabled = !canExportData();
  exportButton.title = canExportData() ? "Exportar datos" : "Disponible para administradores y editores";
  if (resetButton) {
    resetButton.disabled = !canManageUsers();
    resetButton.title = canManageUsers() ? "Restaurar datos demo" : "Disponible solo para administradores";
  }
}

function renderDashboard(options = {}) {
  const context = dashboardContext();
  const metrics = dashboardMetrics(context);
  const alerts = dashboardAlerts(context, metrics).slice(0, 12);
  const projection = dashboardProjection90(context);
  const filterOptions = dashboardFilterOptions();
  const lastUpdated = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());

  $("#dashboardView").innerHTML = `
    <div class="dashboard-executive">
      ${renderDashboardHeader(context, lastUpdated)}
      ${dashboardSection(
        "kpis",
        "Indicadores ejecutivos",
        "Arrastra cada tarjeta para definir el orden de lectura del dashboard.",
        "layout",
        `<div class="kpi-grid executive-kpis" data-kpi-grid>
          ${renderDashboardKpis(metrics)}
        </div>`,
        "kpi-section"
      )}
      ${dashboardSection(
        "fleetControl",
        "Control de la flota activa",
        "La autorización se obtiene desde el estado del equipo, la vigencia preventiva o una exención documentada en el plan maestro.",
        "shield",
        renderFleetControl(metrics),
        "fleet-control-section"
      )}
      ${dashboardSection(
        "inventoryValue",
        "Valor del inventario",
        "Valorización comercial de todos los equipos registrados, desglosada por estado operacional.",
        "wallet",
        renderInventoryValueSummary(),
        "inventory-value-section"
      )}
      ${state.ui.dashboardFiltersVisible ? renderDashboardFilters(context, filterOptions) : ""}
      ${dashboardSection(
        "attention",
        "Atención requerida",
        "Ordenado por impacto, urgencia, criticidad y costo potencial.",
        "bell",
        `<div class="attention-list">
          ${alerts.length ? alerts.map(renderAttentionAlert).join("") : emptyState("No hay alertas críticas para los filtros seleccionados.")}
        </div>`,
        "attention-panel",
        `<button class="action-button secondary" type="button" data-action="export-dashboard-csv">${icon("download")} CSV</button>
        <button class="action-button secondary" type="button" data-action="print-dashboard">${icon("file")} PDF</button>`
      )}

      ${dashboardSection(
        "insights",
        "Visualizaciones principales",
        "Lecturas operativas sobre la flota activa; el inventario no activo se mantiene visible solo como contexto.",
        "chart",
        `<div class="insight-grid">
          ${renderStatusDistribution(context)}
          ${renderAuthorizationDistribution(context)}
          ${renderComplianceByArea(context, isCalibrationService, "Cumplimiento calibración por área")}
          ${renderComplianceByArea(context, isMaintenanceService, "Cumplimiento mantenimiento por área")}
          ${renderUpcomingTimeline(context)}
          ${renderMaintenanceCostTrend(context)}
          ${renderFailurePareto(context)}
          ${renderFailureCausePareto(context)}
          ${renderCostInsights(context)}
          ${renderCriticalAvailability(context, metrics)}
          ${renderRiskHeatmap(metrics.healthRows)}
          ${renderWorkloadDistribution(context)}
          ${renderLifecycleDistribution(context)}
        </div>`
      )}

      ${renderHealthTable(metrics.healthRows)}
      ${renderProjection90(projection)}
    </div>
  `;
  if (options.restoreHealthSearchFocus) {
    const input = $("#dashboardHealthSearch");
    if (input) {
      input.focus();
      const cursor = options.healthCursor ?? input.value.length;
      input.setSelectionRange(cursor, cursor);
    }
  }
  saveState();
}

function renderFleetControl(metrics) {
  const unauthorized = metrics.authorizations
    .filter((item) => item.applicable && !item.authorized)
    .sort((a, b) => daysUntil(a.nextDue) - daysUntil(b.nextDue))
    .slice(0, 6);
  return `
    <div class="fleet-control-grid">
      <div class="fleet-control-summary">
        <div class="authorization-ring ${thresholdTone(metrics.operativeMaintainedPercent, 100, 95)}" style="--ring:${metrics.operativeMaintainedPercent || 0}%">
          <div><strong>${percentOrInfo(metrics.operativeMaintainedPercent)}</strong><span>Operativos autorizados</span></div>
        </div>
        <div class="fleet-control-copy">
          <span class="eyebrow">Criterio de uso</span>
          <h3>Activo = Operativo + En mantenimiento</h3>
          <p>La autorización exige mantención preventiva vigente o una exención explícita. Los equipos en Observación o Fuera de servicio conservan su historial, pero no generan agenda ni cumplimiento.</p>
        </div>
      </div>
      <div class="authorization-queue">
        <div class="section-title compact-title">
          <div><h3>Activos que requieren regularización</h3><p>Antes de autorizar su uso o devolverlos a operación.</p></div>
          <span class="badge ${unauthorized.length ? "danger" : "success"}">${formatNumber(unauthorized.length)}</span>
        </div>
        ${unauthorized.length ? unauthorized.map((item) => `
          <button class="authorization-row" type="button" data-action="select-equipment" data-id="${escapeHtml(item.equipment.id)}">
            <span><strong>${escapeHtml(item.equipment.assetTag)} · ${escapeHtml(item.equipment.name)}</strong><small>${escapeHtml(item.detail)}</small></span>
            <span class="badge ${item.tone}">${escapeHtml(item.label)}</span>
          </button>
        `).join("") : `<div class="authorization-empty">${icon("check")} Toda la flota activa cumple la regla de autorización.</div>`}
      </div>
    </div>
  `;
}

function renderInventoryValueSummary() {
  const total = state.equipments.reduce((sum, equipment) => sum + Number(equipment.commercialValue || 0), 0);
  const byStatus = groupBy(state.equipments, (equipment) => equipment.status || "Sin estado");
  const items = Object.entries(byStatus)
    .map(([status, equipments]) => ({
      status,
      count: equipments.length,
      value: equipments.reduce((sum, equipment) => sum + Number(equipment.commercialValue || 0), 0)
    }))
    .sort((a, b) => b.value - a.value);
  return `
    <div class="inventory-value-summary">
      <div class="inventory-value-total">
        <span>Valor comercial total</span>
        <strong>${formatMoney(total)}</strong>
        <small>${formatNumber(state.equipments.length)} equipos valorizados</small>
      </div>
      <div class="inventory-value-by-status">
        ${items.map((item) => `
          <div class="inventory-value-status">
            ${statusBadge(item.status)}
            <strong>${formatMoney(item.value)}</strong>
            <span>${formatNumber(item.count)} equipo(s)</span>
          </div>
        `).join("") || emptyState("No hay equipos valorizados.")}
      </div>
    </div>
  `;
}

function dashboardSection(id, title, subtitle, iconName, content, extraClass = "", actions = "") {
  const collapsed = Boolean(state.ui.dashboardCollapsedSections?.[id]);
  return `
    <section class="panel pad span-12 dashboard-section ${extraClass} ${collapsed ? "is-collapsed" : ""}" data-section-id="${escapeHtml(id)}">
      <div class="section-title dashboard-section-title">
        <div class="dashboard-section-copy">
          <h2>${icon(iconName)} ${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <div class="table-actions dashboard-section-actions">
          ${actions}
          <button class="action-button secondary compact minimize-button" type="button" title="${collapsed ? "Expandir sección" : "Minimizar sección"}" data-action="toggle-dashboard-section" data-section="${escapeHtml(id)}">
            ${icon(collapsed ? "plus" : "minus")} ${collapsed ? "Expandir" : "Minimizar"}
          </button>
        </div>
      </div>
      <div class="dashboard-section-body">
        ${collapsed ? "" : content}
      </div>
    </section>
  `;
}

function dashboardKpiDefinitions(metrics) {
  return [
    { id: "total", html: executiveKpiCard("total", "Flota activa", metrics.total, "Operativos + en mantenimiento", "microscope", "info", `${formatNumber(metrics.totalInventory)} equipos en inventario`) },
    { id: "available", html: executiveKpiCard("available", "Operativos", metrics.available, "Disponibles para uso hoy", "check", metrics.availability >= 95 ? "success" : "warning", metrics.comparisons.availability, `data-action="dashboard-shortcut" data-filter="status" data-value="Operativo"`) },
    { id: "authorized", html: executiveKpiCard("authorized", "Autorizados", metrics.authorized, "Por vigencia o exención documentada", "shield", metrics.unauthorized ? "warning" : "success", `${formatNumber(metrics.authorizedByMaintenance)} vigentes · ${formatNumber(metrics.exemptAuthorized)} exentos · ${formatNumber(metrics.unauthorized)} por regularizar`) },
    { id: "maintenance", html: executiveKpiCard("maintenance", "En mantenimiento", metrics.maintenance, "Intervenciones abiertas", "wrench", metrics.maintenance ? "warning" : "success", "Semáforo: 0 verde", `data-action="dashboard-shortcut" data-filter="status" data-value="En mantenimiento"`) },
    { id: "availability", html: executiveKpiCard("availability", "Disponibilidad operacional", percentOrInfo(metrics.availability), "Operativos / flota activa", "layout", thresholdTone(metrics.availability, 95, 85), "Umbral: >=95 verde, >=85 amarillo") },
    { id: "operativeMaintained", html: executiveKpiCard("operativeMaintained", "Operativos autorizados", percentOrInfo(metrics.operativeMaintainedPercent), `${formatNumber(metrics.operativeMaintained)} de ${formatNumber(metrics.available)} vigentes o exentos`, "shield", thresholdTone(metrics.operativeMaintainedPercent, 100, 95), "Objetivo: 100%") },
    { id: "annualMaintenance", html: executiveKpiCard("annualMaintenance", `Cumplimiento mantención ${metrics.annualMaintenance.year}`, percentOrInfo(metrics.annualMaintenance.percent), `${formatNumber(metrics.annualMaintenance.completed)} de ${formatNumber(metrics.annualMaintenance.planned)} ciclos aplicables`, "clock", thresholdTone(metrics.annualMaintenance.percent, 95, 85), "Las exenciones documentadas no forman parte del denominador") },
    { id: "calCompliance", html: executiveKpiCard("calCompliance", "Calibración vigente", percentOrInfo(metrics.calibrationCompliance), "Solo flota activa con plan", "shield", thresholdTone(metrics.calibrationCompliance, 95, 85), "Excluye equipos no activos") },
    { id: "calOverdue", html: executiveKpiCard("calOverdue", "Calibraciones vencidas", metrics.calibrationOverdue, "Servicios con fecha superada", "alert", metrics.calibrationOverdue ? "danger" : "success", "0 esperado") },
    { id: "maintOverdue", html: executiveKpiCard("maintOverdue", "Mantenimientos vencidos", metrics.maintenanceOverdue, "Preventivos fuera de plazo", "wrench", metrics.maintenanceOverdue ? "danger" : "success", "0 esperado") },
    { id: "due30", html: executiveKpiCard("due30", "Próximos 30 días", metrics.due30, "Actividades por vencer", "calendar", metrics.due30 ? "warning" : "success", "Planificar capacidad", `data-action="go-calendar"`) },
    { id: "cost", html: executiveKpiCard("cost", "Costo mantenimiento", formatMoney(metrics.cost), "Eventos del periodo", "wallet", metrics.cost > metrics.periodBudget ? "warning" : "success", metrics.comparisons.cost) },
    { id: "budget", html: executiveKpiCard("budget", "Variación presupuesto", metrics.budgetVariance === null ? "Sin info" : formatMoney(metrics.budgetVariance), "Costo real vs presupuesto periodo", "wallet", metrics.budgetVariance > 0 ? "danger" : "success", metrics.periodBudget ? `Presupuesto: ${formatMoney(metrics.periodBudget)}` : "Sin presupuesto aplicable") },
    { id: "observed", html: executiveKpiCard("observed", "En observación", metrics.observed, "Fuera de agenda activa", "alert", metrics.observed ? "warning" : "success", "Revisar clasificación", `data-action="dashboard-shortcut" data-filter="status" data-value="Observación"`) },
    { id: "out", html: executiveKpiCard("out", "Fuera de servicio", metrics.out, "Excluidos de agenda y cumplimiento", "alert", "neutral", "Historial preservado", `data-action="dashboard-shortcut" data-filter="status" data-value="Fuera de servicio"`) },
    { id: "risk", html: executiveKpiCard("risk", "Críticos alto riesgo", metrics.highRiskCritical, "Health Score < 70", "shield", metrics.highRiskCritical ? "danger" : "success", "Prioridad ejecutiva") }
  ];
}

function renderDashboardKpis(metrics) {
  const definitions = dashboardKpiDefinitions(metrics);
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const savedOrder = state.ui.dashboardKpiOrder || [];
  const orderedIds = [...savedOrder.filter((id) => byId.has(id)), ...definitions.map((item) => item.id).filter((id) => !savedOrder.includes(id))];
  return orderedIds.map((id) => byId.get(id).html).join("");
}

function renderDashboardHeader(context, lastUpdated) {
  const activeFilters = dashboardActiveFilterCount(context.filters);
  return `
    <section class="dashboard-hero span-12">
      <div>
        <span class="eyebrow">Centro ejecutivo y operacional</span>
        <h2>LabControl-EquiposHG</h2>
        <p>${formatNumber(context.activeEquipments.length)} activos en gestión de ${formatNumber(context.equipments.length)} equipos filtrados. Agenda y cumplimiento consideran solo Operativos y En mantenimiento. Última actualización: ${escapeHtml(lastUpdated)}.</p>
      </div>
      <div class="dashboard-actions">
        <button class="action-button secondary ${state.ui.dashboardFiltersVisible ? "active-filter-button" : ""}" type="button" data-action="toggle-dashboard-filters">${icon("filter")} Filtros${activeFilters ? ` (${activeFilters})` : ""}</button>
        <button class="action-button secondary" type="button" data-action="reset-dashboard-filters">${icon("rotate")} Restablecer filtros</button>
        <button class="action-button secondary" type="button" data-action="save-dashboard-view">${icon("save")} Guardar vista</button>
      </div>
    </section>
  `;
}

function dashboardActiveFilterCount(filters) {
  const defaults = createSeedData().ui.dashboardFilters;
  return ["period", "location", "category", "type", "status", "criticality", "owner", "provider", "manufacturer", "equipmentId", "authorization"]
    .filter((key) => String(filters[key] ?? defaults[key]) !== String(defaults[key])).length;
}

function renderDashboardFilters(context, options) {
  const filters = context.filters;
  const savedViews = state.ui.dashboardSavedViews || [];
  return dashboardSection(
    "filters",
    "Filtros globales",
    "Todos los indicadores, tablas y visualizaciones responden a estos filtros.",
    "filter",
    `<div class="filter-grid executive-filter-grid">
        ${filterSelect("Periodo", "dashboardPeriod", options.periods.map(([value, label]) => ({ value, label })), filters.period)}
        ${filterSelect("Área / ubicación", "dashboardLocation", ["Todos", ...options.locations], filters.location)}
        ${filterSelect("Categoría", "dashboardCategory", ["Todos", ...options.categories], filters.category)}
        ${filterSelect("Tipo", "dashboardType", ["Todos", ...options.types], filters.type)}
        ${filterSelect("Estado", "dashboardStatus", ["Todos", ...options.statuses], filters.status)}
        ${filterSelect("Criticidad", "dashboardCriticality", ["Todos", ...options.criticalities], filters.criticality)}
        ${filterSelect("Responsable", "dashboardOwner", ["Todos", ...options.owners], filters.owner)}
        ${filterSelect("Proveedor", "dashboardProvider", ["Todos", ...options.providers], filters.provider)}
        ${filterSelect("Fabricante", "dashboardManufacturer", ["Todos", ...options.manufacturers], filters.manufacturer)}
        ${filterSelect("Equipo", "dashboardEquipment", [{ value: "Todos", label: "Todos" }, ...options.equipments.map((equipment) => ({ value: equipment.id, label: `${equipment.assetTag} · ${equipment.name}` }))], filters.equipmentId)}
        ${filterSelect("Autorización", "dashboardAuthorization", ["Todos", "Autorizados", "Autorizados por vigencia", "Autorizados por exención", "No autorizados", "En intervención", "No aplica"], filters.authorization || "Todos")}
        ${filterSelect("Vista guardada", "dashboardSavedView", [{ value: "", label: "Seleccionar" }, ...savedViews.map((view) => ({ value: view.name, label: view.name }))], filters.savedView || "")}
      </div>`,
    "dashboard-filters"
  );
}

function filterSelect(label, id, values, selected) {
  const normalized = values.map((item) => typeof item === "string" ? { value: item, label: item } : item);
  return `
    <div class="control">
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <select id="${escapeHtml(id)}">
        ${normalized.map((item) => `<option value="${escapeHtml(item.value)}" ${String(item.value) === String(selected) ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
      </select>
    </div>
  `;
}

function executiveKpiCard(kpiId, label, value, sub, iconName, tone, compare, shortcutAttrs = "") {
  return `
    <button class="kpi-card executive ${tone}" type="button" data-action="open-kpi-details" draggable="true" data-kpi-id="${escapeHtml(kpiId)}" title="Abrir detalle: ${escapeHtml(sub)}">
      <div class="kpi-label"><span>${escapeHtml(label)}</span>${icon(iconName)}</div>
      <strong class="kpi-value">${escapeHtml(value)}</strong>
      <span class="kpi-sub">${escapeHtml(sub)}</span>
      <span class="kpi-delta">${escapeHtml(compare || "Sin comparación")}</span>
    </button>
  `;
}

function thresholdTone(value, good, warning) {
  if (value === null || value === undefined) return "neutral";
  if (value >= good) return "success";
  if (value >= warning) return "warning";
  return "danger";
}

function percentOrInfo(value) {
  return value === null || value === undefined ? "Sin info" : `${formatNumber(value)}%`;
}

function numberOrInfo(value) {
  return value === null || value === undefined ? "Sin información suficiente" : formatNumber(value);
}

function hoursOrInfo(value) {
  return value === null || value === undefined ? "Sin información suficiente" : `${formatNumber(Math.round(value))} h`;
}

function uniqueEquipments(items) {
  const map = new Map();
  items.filter(Boolean).forEach((equipment) => map.set(equipment.id, equipment));
  return [...map.values()];
}

function kpiEquipmentDetail(kpiId, context, metrics) {
  const overdueCalibration = context.tasks.filter((task) => task.days < 0 && isCalibrationService(task.plan.type));
  const overdueMaintenance = context.tasks.filter((task) => task.days < 0 && isMaintenanceService(task.plan.type));
  const due30 = context.tasks.filter((task) => task.days >= 0 && task.days <= 30);
  const periodCost = (equipment) => context.activeEvents.filter((event) => event.equipmentId === equipment.id).reduce((sum, event) => sum + Number(event.cost || 0), 0);
  const definitions = {
    total: { title: "Flota activa", description: "Equipos Operativos o En mantenimiento incluidos en la gestión activa.", equipments: context.activeEquipments },
    available: { title: "Equipos operativos", description: "Equipos disponibles para uso según su estado operacional.", equipments: context.activeEquipments.filter((equipment) => equipment.status === "Operativo") },
    authorized: { title: "Equipos autorizados", description: "Operativos con mantención preventiva vigente o exención documentada en el plan maestro.", equipments: context.activeEquipments.filter((equipment) => maintenanceAuthorization(equipment).authorized) },
    maintenance: { title: "Equipos en mantenimiento", description: "Activos temporalmente intervenidos para recuperar o conservar su condición operacional.", equipments: context.activeEquipments.filter((equipment) => equipment.status === "En mantenimiento") },
    availability: { title: "Base de disponibilidad operacional", description: "Flota activa utilizada como denominador del indicador de disponibilidad.", equipments: context.activeEquipments },
    operativeMaintained: { title: "Operativos autorizados", description: "Equipos Operativos con mantención vigente o exención documentada.", equipments: context.activeEquipments.filter((equipment) => equipment.status === "Operativo" && maintenanceAuthorization(equipment).authorized) },
    annualMaintenance: { title: `Cumplimiento anual de mantención ${metrics.annualMaintenance.year}`, description: "Equipos activos con ciclos preventivos aplicables; las exenciones documentadas no forman parte del denominador.", equipments: context.activeEquipments.filter((equipment) => maintenancePlansFor(equipment).some((plan) => Number(plan.lastDone?.slice(0, 4)) === metrics.annualMaintenance.year || Number(plan.nextDue?.slice(0, 4)) <= metrics.annualMaintenance.year)) },
    calCompliance: { title: "Vigencia de calibración", description: "Equipos activos con al menos un plan de calibración aplicable.", equipments: context.activeEquipments.filter((equipment) => (equipment.plans || []).some((plan) => isCalibrationService(plan.type))) },
    calOverdue: { title: "Calibraciones vencidas", description: "Equipos activos con una o más calibraciones fuera de plazo.", equipments: uniqueEquipments(overdueCalibration.map((task) => task.equipment)) },
    maintOverdue: { title: "Mantenciones vencidas", description: "Equipos activos con mantención preventiva fuera de plazo.", equipments: uniqueEquipments(overdueMaintenance.map((task) => task.equipment)) },
    due30: { title: "Actividades próximas a 30 días", description: "Equipos activos con servicios que vencen durante los próximos 30 días.", equipments: uniqueEquipments(due30.map((task) => task.equipment)) },
    cost: { title: "Costos del periodo", description: "Equipos activos con costos registrados en los eventos del periodo seleccionado.", equipments: context.activeEquipments.filter((equipment) => periodCost(equipment) > 0) },
    budget: { title: "Base de variación presupuestaria", description: "Equipos activos considerados en la asignación y el forecast del presupuesto.", equipments: context.activeEquipments },
    observed: { title: "Equipos en observación", description: "Equipos no activos pendientes de revisión de su condición operacional.", equipments: context.equipments.filter((equipment) => equipment.status === "Observación") },
    out: { title: "Equipos fuera de servicio", description: "Equipos excluidos de agenda y cumplimiento, con historial preservado.", equipments: context.equipments.filter((equipment) => equipment.status === "Fuera de servicio") },
    risk: { title: "Equipos críticos con riesgo alto", description: "Equipos de criticidad Alta cuyo Health Score es menor a 70.", equipments: metrics.healthRows.filter((row) => row.equipment.criticality === "Alta" && row.score < 70).map((row) => row.equipment) }
  };
  const detail = definitions[kpiId] || definitions.total;
  return { ...detail, equipments: uniqueEquipments(detail.equipments), periodCost };
}

function openKpiDetailModal(kpiId) {
  const context = dashboardContext();
  const metrics = dashboardMetrics(context);
  const detail = kpiEquipmentDetail(kpiId, context, metrics);
  const rows = [...detail.equipments].sort((a, b) => {
    const authDiff = Number(maintenanceAuthorization(a).authorized) - Number(maintenanceAuthorization(b).authorized);
    return authDiff || a.name.localeCompare(b.name, "es");
  });
  openModal(`
    <div class="modal management-modal kpi-detail-modal">
      <div class="modal-header">
        <div>
          <span class="eyebrow">Detalle del indicador</span>
          <h2>${escapeHtml(detail.title)}</h2>
          <p>${escapeHtml(detail.description)}</p>
        </div>
        ${modalWindowControls()}
      </div>
      <div class="modal-body">
        <div class="modal-summary-strip">
          <div><span>Equipos relacionados</span><strong>${formatNumber(rows.length)}</strong></div>
          <div><span>Autorizados</span><strong>${formatNumber(rows.filter((equipment) => maintenanceAuthorization(equipment).authorized).length)}</strong></div>
          <div><span>Exentos de mantención</span><strong>${formatNumber(rows.filter((equipment) => maintenanceAuthorization(equipment).authorized && maintenanceAuthorization(equipment).exempt).length)}</strong></div>
          <div><span>Valor inventario</span><strong>${formatMoney(rows.reduce((sum, equipment) => sum + Number(equipment.commercialValue || 0), 0))}</strong></div>
          <div><span>Costo periodo</span><strong>${formatMoney(rows.reduce((sum, equipment) => sum + detail.periodCost(equipment), 0))}</strong></div>
        </div>
        <div class="table-wrap">
          <table class="kpi-detail-table">
            <thead><tr><th>Equipo</th><th>Área</th><th>Estado</th><th>Autorización</th><th>Responsable</th><th>Próx. mantención</th><th class="right">Costo periodo</th><th>Acción</th></tr></thead>
            <tbody>${rows.length ? rows.map((equipment) => {
              const authorization = maintenanceAuthorization(equipment);
              return `<tr>
                <td><div class="row-title">${escapeHtml(equipment.name)}</div><span class="row-sub">${escapeHtml(equipment.assetTag)} · ${escapeHtml(equipment.type)}</span></td>
                <td>${escapeHtml(equipment.location || "Sin área")}</td>
                <td>${statusBadge(equipment.status)}</td>
                <td><span class="badge ${authorization.tone}" title="${escapeHtml(authorization.detail)}">${escapeHtml(authorization.label)}</span></td>
                <td>${escapeHtml(equipment.owner || "Sin responsable")}</td>
                <td>${formatDate(authorization.nextDue)}</td>
                <td class="right nowrap">${formatMoney(detail.periodCost(equipment))}</td>
                <td><button class="table-action secondary" type="button" title="Ver ficha" data-action="select-equipment" data-id="${escapeHtml(equipment.id)}">${icon("eye")}</button></td>
              </tr>`;
            }).join("") : `<tr><td colspan="8">${emptyState("No hay equipos asociados a este indicador con los filtros actuales.")}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer"><span class="item-meta">Los resultados responden a los filtros actuales del Dashboard.</span><button class="action-button secondary" type="button" data-action="close-modal">Cerrar</button></div>
    </div>
  `);
}

function modalWindowControls() {
  return `<div class="modal-window-controls">
    <button class="icon-button secondary" type="button" title="Minimizar" data-action="minimize-modal">${icon("minus")}</button>
    <button class="icon-button secondary" type="button" title="Maximizar o restaurar" data-action="maximize-modal">${icon("maximize")}</button>
    <button class="icon-button secondary" type="button" title="Cerrar" data-action="close-modal">${icon("x")}</button>
  </div>`;
}

function toggleModalWindow(mode) {
  const modal = $(".modal", $("#modalRoot"));
  if (!modal) return;
  if (mode === "minimize") {
    modal.classList.toggle("is-minimized");
    modal.classList.remove("is-maximized");
    return;
  }
  modal.classList.remove("is-minimized");
  modal.classList.toggle("is-maximized");
}

function dashboardAlerts(context, metrics) {
  const alerts = [];
  const pushAlert = (alert) => alerts.push(alert);
  context.tasks.forEach((task) => {
    if (task.days < 0 && isCalibrationService(task.plan.type)) {
      pushAlert({ score: 100 + Math.abs(task.days), tone: "danger", type: "Calibración vencida", equipment: task.equipment, due: task.due, action: "Registrar calibración", actionType: "event", service: task.plan.type, detail: `${Math.abs(task.days)} día(s) de atraso` });
    }
    if (task.days < 0 && isMaintenanceService(task.plan.type)) {
      pushAlert({ score: 95 + Math.abs(task.days), tone: "danger", type: "Mantenimiento vencido", equipment: task.equipment, due: task.due, action: "Registrar mantenimiento", actionType: "event", service: task.plan.type, detail: `${Math.abs(task.days)} día(s) de atraso` });
    }
    if (task.days >= 0 && task.days <= 30) {
      pushAlert({ score: 55 - task.days + (task.equipment.criticality === "Alta" ? 20 : 0), tone: task.days <= 7 ? "warning" : "info", type: "Actividad próxima", equipment: task.equipment, due: task.due, action: "Ver equipo", actionType: "view", service: task.plan.type, detail: `vence en ${task.days} día(s)` });
    }
  });
  context.equipments.forEach((equipment) => {
    if (!isActiveEquipment(equipment)) return;
    const authorization = maintenanceAuthorization(equipment);
    const needsAuthorizationAlert = (!maintenancePlansFor(equipment).length && !hasMaintenanceExemption(equipment)) || equipment.status === "En mantenimiento";
    if (authorization.applicable && !authorization.authorized && needsAuthorizationAlert) {
      pushAlert({ score: authorization.tone === "danger" ? 115 : 85, tone: authorization.tone, type: authorization.label, equipment, due: authorization.nextDue, action: "Regularizar mantención", actionType: "event", service: "Mantención preventiva", detail: authorization.detail });
    }
    if (!equipment.owner) {
      pushAlert({ score: 70, tone: "warning", type: "Equipo sin responsable", equipment, due: "", action: "Editar equipo", actionType: "edit", service: "Responsabilidad", detail: "asignación pendiente" });
    }
    if (!maintenancePlansFor(equipment).length && !hasMaintenanceExemption(equipment)) {
      pushAlert({ score: 75, tone: "warning", type: "Sin criterio preventivo", equipment, due: "", action: "Editar plan", actionType: "edit", service: "Plan maestro", detail: "sin mantención preventiva ni exención documentada" });
    }
  });
  const failuresByEquipment = groupBy(context.events.filter(isFailureEvent), (event) => event.equipmentId);
  Object.entries(failuresByEquipment).forEach(([equipmentId, events]) => {
    if (events.length >= 2) {
      const equipment = getEquipment(equipmentId);
      if (equipment) pushAlert({ score: 80 + events.length, tone: "warning", type: "Fallas repetitivas", equipment, due: events[0].date, action: "Ver bitácora", actionType: "events", service: "Confiabilidad", detail: `${events.length} eventos del periodo` });
    }
  });
  const costs = metrics.healthRows.map((row) => row.cost12).filter((value) => value > 0);
  const avgCost = costs.length ? costs.reduce((sum, value) => sum + value, 0) / costs.length : 0;
  metrics.healthRows.filter((row) => isActiveEquipment(row.equipment)).forEach((row) => {
    if (avgCost && row.cost12 > avgCost * 1.5) {
      pushAlert({ score: 65, tone: "warning", type: "Costo sobre promedio", equipment: row.equipment, due: "", action: "Ver equipo", actionType: "view", service: "Costo", detail: `${formatMoney(row.cost12)} últimos 12 meses` });
    }
  });
  return alerts.sort((a, b) => b.score - a.score);
}

function renderAttentionAlert(alert) {
  const daysLate = alert.due ? daysUntil(alert.due) : null;
  const action = alert.actionType === "event" ? "add-event"
    : alert.actionType === "edit" ? "edit-equipment"
      : alert.actionType === "events" ? "view-equipment-events"
        : "select-equipment";
  return `
    <article class="attention-item ${alert.tone}">
      <div>
        <div class="item-title">
          <span>${escapeHtml(alert.type)}</span>
          <span class="badge ${alert.equipment.criticality === "Alta" ? "danger" : "neutral"}">${escapeHtml(alert.equipment.criticality)}</span>
        </div>
        <div class="item-meta">
          ${escapeHtml(alert.equipment.assetTag)} · ${escapeHtml(alert.equipment.name)} · ${escapeHtml(alert.equipment.location || "Sin área")} · Resp. ${escapeHtml(alert.equipment.owner || "Sin responsable")}
        </div>
        <div class="item-meta">${escapeHtml(alert.service)} · ${alert.due ? `fecha límite ${formatDate(alert.due)} · ${daysLate < 0 ? `${Math.abs(daysLate)} día(s) atraso` : `${daysLate} día(s)`}` : "sin fecha límite"} · ${escapeHtml(alert.detail)}</div>
      </div>
      <button class="action-button compact ${alert.tone === "danger" ? "danger-soft" : "secondary"}" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(alert.equipment.id)}" data-type="${escapeHtml(alert.service)}">${escapeHtml(alert.action)}</button>
    </article>
  `;
}

function dashboardBar(label, value, max, formatter = formatNumber, tone = "") {
  const width = max ? Math.max(3, Math.round((Number(value || 0) / max) * 100)) : 0;
  return `
    <div class="bar-row">
      <strong>${escapeHtml(label)}</strong>
      <div class="bar-track"><div class="bar-fill ${tone}" style="--bar-value:${width}%"></div></div>
      <span class="nowrap">${escapeHtml(formatter(value))}</span>
    </div>
  `;
}

function renderBar(label, value, max, formatterOrTone = formatNumber, tone = "") {
  if (typeof formatterOrTone === "string") {
    return dashboardBar(label, value, max, formatNumber, formatterOrTone);
  }
  return dashboardBar(label, value, max, formatterOrTone, tone);
}

function rederBar(...args) {
  return renderBar(...args);
}

function insightCard(title, subtitle, content, action = "") {
  return `
    <article class="insight-card">
      <div class="insight-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        ${action}
      </div>
      <div class="metric-row">${content}</div>
    </article>
  `;
}

function renderStatusDistribution(context) {
  const items = Object.entries(groupBy(context.equipments, (equipment) => `${equipment.status}${isActiveEquipment(equipment) ? " · Activo" : " · No activo"}`)).map(([label, rows]) => ({ label, value: rows.length }));
  const max = Math.max(...items.map((item) => item.value), 1);
  return insightCard("Estado y clasificación de uso", "La agenda se genera solo desde la flota activa.", items.map((item) => dashboardBar(item.label, item.value, max)).join("") || emptyState("Sin equipos."));
}

function renderAuthorizationDistribution(context) {
  const authorizationCategory = (equipment) => {
    const authorization = maintenanceAuthorization(equipment);
    if (authorization.authorized && authorization.exempt) return "Autorizados exentos";
    if (authorization.authorized) return "Autorizados vigentes";
    return authorizationFilterValue(equipment);
  };
  const order = ["Autorizados vigentes", "Autorizados exentos", "No autorizados", "En intervención", "No aplica"];
  const grouped = groupBy(context.equipments, authorizationCategory);
  const items = order.map((label) => ({ label, value: (grouped[label] || []).length })).filter((item) => item.value > 0);
  const max = Math.max(...items.map((item) => item.value), 1);
  const tones = { "Autorizados vigentes": "success", "Autorizados exentos": "info", "No autorizados": "danger", "En intervención": "warning", "No aplica": "neutral" };
  return insightCard("Autorización operacional", "Distingue vigencia preventiva, exención documentada y condición de uso.", items.map((item) => dashboardBar(item.label, item.value, max, formatNumber, tones[item.label])).join("") || emptyState("Sin equipos para los filtros seleccionados."));
}

function renderComplianceByArea(context, matcher, title) {
  const byArea = Object.entries(groupBy(context.activeEquipments, (equipment) => equipment.location || "Sin área")).map(([area, equipments]) => {
    const tasks = equipments.flatMap((equipment) => (equipment.plans || []).filter((plan) => matcher(plan.type)).map((plan) => ({ plan, days: daysUntil(plan.nextDue) })));
    return { label: area, value: tasks.length ? Math.round((tasks.filter((task) => task.days >= 0).length / tasks.length) * 100) : null };
  }).filter((item) => item.value !== null).sort((a, b) => a.value - b.value).slice(0, 6);
  return insightCard(title, "Áreas con menor cumplimiento arriba.", byArea.map((item) => dashboardBar(item.label, item.value, 100, (value) => `${value}%`, thresholdTone(item.value, 95, 85))).join("") || emptyState("Sin planes aplicables."));
}

function renderMaintenanceCostTrend(context) {
  const history = maintenanceCostHistory(context.activeEquipments).slice(-6);
  const nextYear = currentBudgetYear() + 1;
  const projection = projectedMaintenanceCost(context.activeEquipments, nextYear);
  const valued = history.filter((item) => item.hasCost);
  const max = Math.max(...valued.map((item) => item.cost), projection, 1);
  const rows = history.map((item) => item.hasCost
    ? dashboardBar(item.year, item.cost, max, formatMoney, "blue")
    : `<div class="bar-row cost-missing"><strong>${escapeHtml(item.year)}</strong><div class="bar-track"></div><span>Sin costo informado · ${formatNumber(item.events)} evento(s)</span></div>`
  );
  rows.push(dashboardBar(`${nextYear} estimado`, projection, max, formatMoney, "gold"));
  return insightCard("Costo anual de mantención", "Histórico registrado y próximo año estimado por plan/frecuencia.", rows.join("") || emptyState("Sin historial de mantención."));
}

function renderUpcomingTimeline(context) {
  const rows = context.tasks.filter((task) => task.days >= 0 && task.days <= 90).slice(0, 8);
  return insightCard("Línea de tiempo 90 días", "Próximas calibraciones y mantenimientos.", rows.map((task) => `
    <button class="insight-row" type="button" data-action="select-equipment" data-id="${escapeHtml(task.equipment.id)}">
      <span>${escapeHtml(task.equipment.assetTag)} · ${escapeHtml(task.plan.type)}</span>
      <strong>${formatDate(task.due)}</strong>
    </button>
  `).join("") || emptyState("Sin vencimientos próximos."));
}

function monthlyBuckets(events) {
  const buckets = {};
  events.forEach((event) => {
    const date = parseLocalDate(event.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = buckets[key] || [];
    buckets[key].push(event);
  });
  return buckets;
}

function renderMonthlyFailures(context) {
  const items = Object.entries(monthlyBuckets(context.events.filter(isFailureEvent))).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([label, events]) => ({ label, value: events.length }));
  const max = Math.max(...items.map((item) => item.value), 1);
  return insightCard("Fallas por mes", "Evolución de incidencias del periodo.", items.map((item) => dashboardBar(item.label, item.value, max, formatNumber, item.value ? "gold" : "")).join("") || emptyState("Sin fallas registradas."));
}

function renderFailurePareto(context) {
  const items = Object.entries(groupBy(context.events.filter(isFailureEvent), (event) => event.equipmentId)).map(([equipmentId, events]) => {
    const equipment = getEquipment(equipmentId);
    return { label: equipment ? equipment.assetTag : "Equipo eliminado", value: events.length, id: equipmentId };
  }).sort((a, b) => b.value - a.value).slice(0, 6);
  const max = Math.max(...items.map((item) => item.value), 1);
  return insightCard("Pareto equipos con fallas", "Prioriza análisis causa raíz.", items.map((item) => `<button class="insight-row bar-button" type="button" data-action="select-equipment" data-id="${escapeHtml(item.id)}">${dashboardBar(item.label, item.value, max)}</button>`).join("") || emptyState("Sin fallas del periodo."));
}

function renderFailureCausePareto(context) {
  const items = Object.entries(groupBy(context.events.filter(isFailureEvent), (event) => event.type || "Sin tipo")).map(([label, events]) => ({ label, value: events.length })).sort((a, b) => b.value - a.value).slice(0, 6);
  const max = Math.max(...items.map((item) => item.value), 1);
  return insightCard("Pareto causas de falla", "Basado en tipo de evento registrado.", items.map((item) => dashboardBar(item.label, item.value, max)).join("") || emptyState("Sin causas registradas."));
}

function renderCostInsights(context) {
  const items = Object.entries(groupBy(context.activeEvents, (event) => getEquipment(event.equipmentId)?.location || "Sin área")).map(([label, events]) => ({ label, value: events.reduce((sum, event) => sum + Number(event.cost || 0), 0) })).sort((a, b) => b.value - a.value).slice(0, 6);
  const max = Math.max(...items.map((item) => item.value), 1);
  return insightCard("Costos por área", "Eventos valorizados del periodo.", items.map((item) => dashboardBar(item.label, item.value, max, formatMoney, "blue")).join("") || emptyState("Sin costos del periodo."));
}

function renderCriticalAvailability(context) {
  const critical = context.activeEquipments.filter((equipment) => equipment.criticality === "Alta");
  const available = critical.filter((equipment) => equipment.status === "Operativo").length;
  const percent = critical.length ? Math.round((available / critical.length) * 100) : null;
  return insightCard("Disponibilidad críticos", "Equipos de criticidad alta operativos.", `
    <div class="progress-ring small" style="--ring:${percent || 0}%"><div class="ring-label">${percent === null ? "Sin info" : `${percent}%`}</div></div>
    <p class="insight-note">${formatNumber(available)} de ${formatNumber(critical.length)} equipos críticos disponibles.</p>
  `);
}

function renderRiskHeatmap(healthRows) {
  const criticalities = ["Alta", "Media", "Baja"];
  const areas = uniqueCatalogValues(healthRows.map((row) => row.equipment.location || "Sin área")).slice(0, 6);
  return insightCard("Mapa de calor riesgo", "Promedio Health Score por área y criticidad.", `
    <div class="heatmap">
      ${areas.flatMap((area) => criticalities.map((criticality) => {
        const rows = healthRows.filter((row) => (row.equipment.location || "Sin área") === area && row.equipment.criticality === criticality);
        const avg = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : null;
        return `<span class="heat-cell ${thresholdTone(avg, 85, 70)}" title="${escapeHtml(area)} · ${escapeHtml(criticality)}">${escapeHtml(area.slice(0, 14))}<strong>${escapeHtml(criticality)} ${avg === null ? "S/I" : avg}</strong></span>`;
      })).join("")}
    </div>
  `);
}

function renderWorkloadDistribution(context) {
  const upcoming = context.tasks.filter((task) => task.days >= 0 && task.days <= 90);
  const byOwner = Object.entries(groupBy(upcoming, (task) => task.equipment.owner || task.plan.provider || "Sin responsable")).map(([label, rows]) => ({ label, value: rows.length })).sort((a, b) => b.value - a.value).slice(0, 6);
  const max = Math.max(...byOwner.map((item) => item.value), 1);
  return insightCard("Trabajo pendiente", "Carga por responsable/proveedor a 90 días.", byOwner.map((item) => dashboardBar(item.label, item.value, max)).join("") || emptyState("Sin carga pendiente."));
}

function renderLifecycleDistribution(context) {
  const items = Object.entries(groupBy(context.equipments, lifecycleStage)).map(([label, rows]) => ({ label, value: rows.length }));
  const max = Math.max(...items.map((item) => item.value), 1);
  return insightCard("Ciclo de vida", "Nuevo, operativo, envejecido u obsoleto.", items.map((item) => dashboardBar(item.label, item.value, max)).join("") || emptyState("Sin fechas de adquisición."));
}

function renderHealthTable(healthRows) {
  const filters = state.ui.dashboardFilters;
  const search = String(filters.healthSearch || "").toLowerCase();
  let rows = healthRows.filter((row) => {
    const text = [row.equipment.assetTag, row.equipment.name, row.equipment.location, row.equipment.owner, row.equipment.type].join(" ").toLowerCase();
    return !search || text.includes(search);
  });
  rows = rows.sort((a, b) => {
    if (filters.healthSort === "costDesc") return b.cost12 - a.cost12;
    if (filters.healthSort === "failuresDesc") return b.failures12 - a.failures12;
    if (filters.healthSort === "criticality") return ["Alta", "Media", "Baja"].indexOf(a.equipment.criticality) - ["Alta", "Media", "Baja"].indexOf(b.equipment.criticality);
    return a.score - b.score;
  }).slice(0, 25);
  return dashboardSection(
    "health",
    "Salud de los equipos",
    "Health Score transparente: calibración, mantenimiento, disponibilidad, fallas, antigüedad, criticidad y documentación.",
    "shield",
    `
      <div class="table-actions health-controls">
          <input id="dashboardHealthSearch" class="compact-input" type="search" placeholder="Buscar en salud..." value="${escapeHtml(filters.healthSearch || "")}" />
          <select id="dashboardHealthSort" class="compact-input">
            ${renderOptions(["healthAsc", "criticality", "failuresDesc", "costDesc"], filters.healthSort, (value) => ({
              healthAsc: "Menor Health Score",
              criticality: "Criticidad",
              failuresDesc: "Más fallas",
              costDesc: "Mayor costo"
            })[value])}
          </select>
      </div>
      <div class="table-wrap">
        <table class="health-table">
          <thead><tr><th>Código</th><th>Equipo</th><th>Área</th><th>Criticidad</th><th>Estado</th><th>Clasificación</th><th>Autorización</th><th>Health</th><th>Últ. cal.</th><th>Próx. cal.</th><th>Últ. mant.</th><th>Próx. mant.</th><th>Fallas 12m</th><th>Detención</th><th>Costo</th><th>Responsable</th><th>Tendencia</th><th>Acción</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.equipment.assetTag)}</td>
                <td>${escapeHtml(row.equipment.name)}</td>
                <td>${escapeHtml(row.equipment.location || "Sin área")}</td>
                <td>${criticalityBadge(row.equipment.criticality)}</td>
                <td>${statusBadge(row.equipment.status)}</td>
                <td><span class="badge ${equipmentUseClassification(row.equipment).tone}">${escapeHtml(equipmentUseClassification(row.equipment).label)}</span></td>
                <td><span class="badge ${maintenanceAuthorization(row.equipment).tone}" title="${escapeHtml(maintenanceAuthorization(row.equipment).detail)}">${escapeHtml(maintenanceAuthorization(row.equipment).label)}</span></td>
                <td><span class="score-pill ${row.tone}" title="${escapeHtml(row.tooltip)}">${row.score}</span></td>
                <td>${formatDate(row.lastCalibration)}</td>
                <td>${formatDate(row.nextCalibration)}</td>
                <td>${row.maintenanceExempt ? "No aplica" : formatDate(row.lastMaintenance)}</td>
                <td>${row.maintenanceExempt ? `<span class="badge info">Exento</span>` : formatDate(row.nextMaintenance)}</td>
                <td>${formatNumber(row.failures12)}</td>
                <td>${row.downtime === null ? "Sin info" : `${formatNumber(row.downtime)} h`}</td>
                <td>${formatMoney(row.cost12)}</td>
                <td>${escapeHtml(row.equipment.owner || "Sin responsable")}</td>
                <td>${escapeHtml(row.trend)}</td>
                <td><button class="table-action secondary" type="button" title="Ver equipo" data-action="select-equipment" data-id="${escapeHtml(row.equipment.id)}">${icon("eye")}</button></td>
              </tr>
            `).join("") : `<tr><td colspan="18">${emptyState("No hay equipos para la búsqueda aplicada.")}</td></tr>`}
          </tbody>
        </table>
      </div>
    `
  );
}

function dashboardProjection90(context) {
  const horizonEnd = new Date(todayDate().getFullYear(), todayDate().getMonth(), todayDate().getDate() + 90);
  const upcoming = context.tasks.filter((task) => {
    const due = parseLocalDate(task.due);
    return due && due >= todayDate() && due <= horizonEnd;
  });
  const months = Object.entries(groupBy(upcoming, (task) => task.due.slice(0, 7))).map(([label, rows]) => ({
    label,
    calibrations: rows.filter((task) => isCalibrationService(task.plan.type)).length,
    maintenances: rows.filter((task) => isMaintenanceService(task.plan.type)).length,
    cost: rows.reduce((sum, task) => sum + Number(task.plan.cost || 0), 0)
  })).sort((a, b) => a.label.localeCompare(b.label));
  const workload = Object.entries(groupBy(upcoming, (task) => task.equipment.owner || task.plan.provider || "Sin responsable")).map(([label, rows]) => ({ label, value: rows.length })).sort((a, b) => b.value - a.value);
  const weeks = Object.entries(groupBy(upcoming, (task) => {
    const due = parseLocalDate(task.due);
    const oneJan = new Date(due.getFullYear(), 0, 1);
    return `${due.getFullYear()}-S${String(Math.ceil((((due - oneJan) / MS_PER_DAY) + oneJan.getDay() + 1) / 7)).padStart(2, "0")}`;
  })).map(([label, rows]) => ({ label, value: rows.length })).filter((item) => item.value >= 6);
  const risk = context.activeEquipments.map((equipment) => equipmentHealth(equipment)).filter((row) => row.score < 70).sort((a, b) => a.score - b.score).slice(0, 6);
  return { months, workload, weeks, risk, upcoming };
}

function renderProjection90(projection) {
  const maxCost = Math.max(...projection.months.map((item) => item.cost), 1);
  const maxWork = Math.max(...projection.workload.map((item) => item.value), 1);
  return dashboardSection(
    "projection",
    "Proyección a 90 días",
    "Estimación basada en vencimientos, frecuencia de mantenimiento, historial de fallas y Health Score. No es predicción estadística.",
    "calendar",
    `
      <div class="projection-grid">
        ${insightCard("Calibraciones y mantenimientos por mes", "Volumen y costo proyectado.", projection.months.map((item) => dashboardBar(`${item.label} · C${item.calibrations}/M${item.maintenances}`, item.cost, maxCost, formatMoney)).join("") || emptyState("Sin vencimientos a 90 días."))}
        ${insightCard("Carga por responsable", "Cantidad de actividades próximas.", projection.workload.slice(0, 8).map((item) => dashboardBar(item.label, item.value, maxWork)).join("") || emptyState("Sin carga proyectada."))}
        ${insightCard("Semanas con sobrecarga", "Regla transparente: 6 o más actividades/semana.", projection.weeks.map((item) => dashboardBar(item.label, item.value, 10, formatNumber, "gold")).join("") || emptyState("No se detectan semanas sobrecargadas."))}
        ${insightCard("Probable indisponibilidad", "Equipos con Health Score bajo.", projection.risk.map((row) => `
          <button class="insight-row" type="button" data-action="select-equipment" data-id="${escapeHtml(row.equipment.id)}">
            <span>${escapeHtml(row.equipment.assetTag)} · ${escapeHtml(row.equipment.name)}</span><strong>${row.score}</strong>
          </button>
        `).join("") || emptyState("Sin equipos con riesgo alto."))}
      </div>
    `,
    "",
    `<span class="badge info">${formatNumber(projection.upcoming.length)} actividades proyectadas</span>`
  );
}

function resetDashboardFilters() {
  state.ui.dashboardFilters = { ...createSeedData().ui.dashboardFilters };
  saveState();
  renderApp();
  showToast("Filtros del dashboard restablecidos.");
}

function toggleDashboardSection(sectionId) {
  state.ui.dashboardCollapsedSections = state.ui.dashboardCollapsedSections || {};
  state.ui.dashboardCollapsedSections[sectionId] = !state.ui.dashboardCollapsedSections[sectionId];
  saveState();
  renderApp();
}

function handleDashboardShortcut(target) {
  const filter = target.dataset.filter;
  if (filter && Object.prototype.hasOwnProperty.call(state.ui.dashboardFilters, filter)) {
    state.ui.dashboardFilters[filter] = target.dataset.value || "Todos";
    state.ui.dashboardFilters.savedView = "";
    saveState();
    renderApp();
  }
}

function saveDashboardView() {
  const name = cleanCatalogName(prompt("Nombre para la vista personalizada:"));
  if (!name) return;
  const views = state.ui.dashboardSavedViews || [];
  const filters = { ...state.ui.dashboardFilters, savedView: name };
  const existingIndex = views.findIndex((view) => view.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
  const nextView = { name, filters, updatedAt: new Date().toISOString() };
  state.ui.dashboardSavedViews = existingIndex >= 0
    ? views.map((view, index) => index === existingIndex ? nextView : view)
    : [...views, nextView].slice(-12);
  state.ui.dashboardFilters = filters;
  saveState();
  renderApp();
  showToast("Vista del dashboard guardada.");
}

function handleDashboardFilterChange(target) {
  const mapping = {
    dashboardPeriod: "period",
    dashboardLocation: "location",
    dashboardCategory: "category",
    dashboardType: "type",
    dashboardStatus: "status",
    dashboardCriticality: "criticality",
    dashboardOwner: "owner",
    dashboardProvider: "provider",
    dashboardManufacturer: "manufacturer",
    dashboardEquipment: "equipmentId",
    dashboardAuthorization: "authorization",
    dashboardHealthSort: "healthSort"
  };
  if (target.id === "dashboardSavedView") {
    const view = (state.ui.dashboardSavedViews || []).find((item) => item.name === target.value);
    if (view) {
      state.ui.dashboardFilters = { ...createSeedData().ui.dashboardFilters, ...view.filters, savedView: view.name };
    } else {
      state.ui.dashboardFilters.savedView = "";
    }
    saveState();
    renderApp();
    return true;
  }
  const key = mapping[target.id];
  if (!key) return false;
  state.ui.dashboardFilters[key] = target.value;
  state.ui.dashboardFilters.savedView = "";
  saveState();
  renderApp();
  return true;
}

function currentDashboardKpiOrder() {
  const ids = dashboardKpiDefinitions(dashboardMetrics(dashboardContext())).map((item) => item.id);
  const savedOrder = state.ui.dashboardKpiOrder || [];
  return [...savedOrder.filter((id) => ids.includes(id)), ...ids.filter((id) => !savedOrder.includes(id))];
}

function reorderDashboardKpi(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const order = currentDashboardKpiOrder();
  const fromIndex = order.indexOf(sourceId);
  const toIndex = order.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0) return;
  const [moved] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, moved);
  state.ui.dashboardKpiOrder = order;
  saveState();
  renderApp();
  showToast("Orden de indicadores actualizado.");
}

function handleMainDragStart(event) {
  const card = event.target.closest("[data-kpi-id]");
  if (!card || state.ui.activeView !== "dashboard") return;
  draggedKpiId = card.dataset.kpiId;
  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedKpiId);
}

function handleMainDragOver(event) {
  const card = event.target.closest("[data-kpi-id]");
  if (!card || !draggedKpiId || card.dataset.kpiId === draggedKpiId) return;
  event.preventDefault();
  card.classList.add("is-drop-target");
  event.dataTransfer.dropEffect = "move";
}

function handleMainDragLeave(event) {
  const card = event.target.closest("[data-kpi-id]");
  if (card) card.classList.remove("is-drop-target");
}

function handleMainDrop(event) {
  const card = event.target.closest("[data-kpi-id]");
  if (!card || !draggedKpiId) return;
  event.preventDefault();
  const sourceId = event.dataTransfer.getData("text/plain") || draggedKpiId;
  const targetId = card.dataset.kpiId;
  draggedKpiId = "";
  reorderDashboardKpi(sourceId, targetId);
}

function handleMainDragEnd() {
  draggedKpiId = "";
  $$("[data-kpi-id]").forEach((card) => card.classList.remove("is-dragging", "is-drop-target"));
}

function renderEquipos(options = {}) {
  const filters = state.ui.equipmentFilters;
  const editable = canEditData();
  const filtered = getFilteredEquipments();
  const activeFilters = equipmentActiveFilterCount(filters);

  $("#equiposView").innerHTML = `
    <div class="tool-panel">
      <div class="toolbar">
        ${state.ui.equipmentFiltersVisible ? `<div class="filter-grid">
          <div class="control">
            <label for="equipmentSearch">Buscar equipo</label>
            <input id="equipmentSearch" type="search" value="${escapeHtml(filters.search)}" placeholder="Nombre, modelo, serie, proveedor..." />
          </div>
          <div class="control">
            <label for="typeFilter">Tipo</label>
            <select id="typeFilter">${renderOptions(["Todos", ...uniqueValues("type")], filters.type)}</select>
          </div>
          <div class="control">
            <label for="statusFilter">Estado</label>
            <select id="statusFilter">${renderOptions(["Todos", "Operativo", "Observación", "En mantenimiento", "Fuera de servicio"], filters.status)}</select>
          </div>
          <div class="control">
            <label for="criticalityFilter">Criticidad</label>
            <select id="criticalityFilter">${renderOptions(["Todos", "Alta", "Media", "Baja"], filters.criticality)}</select>
          </div>
          <div class="control">
            <label for="frequencyFilter">Frecuencia</label>
            <select id="frequencyFilter">${renderOptions(["Todos", ...equipmentFrequencyOptions()], filters.frequency || "Todos")}</select>
          </div>
          <div class="control">
            <label for="authorizationFilter">Autorización</label>
            <select id="authorizationFilter">${renderOptions(["Todos", "Autorizados", "Autorizados por vigencia", "Autorizados por exención", "No autorizados", "En intervención", "No aplica"], filters.authorization || "Todos")}</select>
          </div>
        </div>` : `<div class="filter-summary">${activeFilters ? `${formatNumber(activeFilters)} filtro(s) aplicado(s)` : "Sin filtros aplicados"}</div>`}
        <div class="table-actions">
          <button class="action-button secondary ${state.ui.equipmentFiltersVisible ? "active-filter-button" : ""}" type="button" data-action="toggle-equipment-filters">${icon("filter")} Filtros${activeFilters ? ` (${activeFilters})` : ""}</button>
          ${canExportData() ? `
            <button class="action-button secondary" type="button" data-action="export-equipments-xlsx" title="Exportar el listado filtrado a Excel">${icon("download")} Excel</button>
            <button class="action-button secondary" type="button" data-action="export-equipments-pdf" title="Exportar el listado filtrado a PDF">${icon("file")} PDF</button>
          ` : `<span class="badge neutral">Exportación no disponible</span>`}
          ${editable ? `<button class="action-button" type="button" data-action="add-equipment">${icon("plus")} Nuevo equipo</button>` : `<span class="badge neutral">Modo lectura</span>`}
        </div>
      </div>
    </div>

    <div class="table-wrap equipment-table-wrap">
      <table>
        <thead>
          <tr>
            ${renderEquipmentSortHeader("Equipo", "name")}
            ${renderEquipmentSortHeader("Tipo", "type")}
            ${renderEquipmentSortHeader("Frecuencia", "frequency")}
            ${renderEquipmentSortHeader("Modelo / Serie", "model")}
            ${renderEquipmentSortHeader("Estado", "status")}
            ${renderEquipmentSortHeader("Próximo vencimiento", "nextDue")}
            ${renderEquipmentSortHeader("Valor", "value", "right")}
            <th class="right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map(renderEquipmentRow).join("") : `
            <tr><td colspan="8">${emptyState("No hay equipos que coincidan con los filtros.")}</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;
  saveState();
  if (options.restoreSearchFocus) {
    const searchInput = $("#equipmentSearch");
    if (searchInput) {
      const cursor = Number.isFinite(options.searchCursor) ? options.searchCursor : searchInput.value.length;
      searchInput.focus({ preventScroll: true });
      try {
        searchInput.setSelectionRange(cursor, cursor);
      } catch (error) {
        console.warn("No se pudo restaurar el cursor del buscador.", error);
      }
    }
  }
}

function equipmentActiveFilterCount(filters) {
  return ["search", "type", "status", "criticality", "frequency", "authorization"].filter((key) => {
    const value = filters[key];
    return key === "search" ? Boolean(String(value || "").trim()) : Boolean(value && value !== "Todos");
  }).length;
}

function renderEquipmentSortHeader(label, key, className = "") {
  const filters = state.ui.equipmentFilters;
  const active = filters.sortKey === key;
  const direction = active ? filters.sortDirection : "";
  const symbol = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
  const nextDirection = active && direction === "asc" ? "descendente" : "ascendente";
  return `
    <th class="${className}">
      <button class="table-sort-button ${active ? "active" : ""}" type="button" data-action="sort-equipment" data-sort-key="${escapeHtml(key)}" aria-label="Ordenar por ${escapeHtml(label)} ${nextDirection}" aria-sort="${active ? (direction === "asc" ? "ascending" : "descending") : "none"}">
        <span>${escapeHtml(label)}</span><span class="sort-indicator" aria-hidden="true">${symbol}</span>
      </button>
    </th>
  `;
}

function getFilteredEquipments() {
  const filters = state.ui.equipmentFilters;
  const search = filters.search.trim().toLowerCase();
  const filtered = state.equipments.filter((equipment) => {
    const text = [
      equipment.assetTag,
      equipment.name,
      equipment.type,
      equipment.manufacturer,
      equipment.provider,
      equipment.model,
      equipment.serial,
      equipment.location,
      equipment.owner
    ].join(" ").toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesType = filters.type === "Todos" || equipment.type === filters.type;
    const matchesStatus = filters.status === "Todos" || equipment.status === filters.status;
    const matchesCriticality = filters.criticality === "Todos" || equipment.criticality === filters.criticality;
    const matchesFrequency = (filters.frequency || "Todos") === "Todos" || equipmentFrequencyValues(equipment).includes(filters.frequency);
    const matchesAuthorization = matchesAuthorizationFilter(equipment, filters.authorization);
    return matchesSearch && matchesType && matchesStatus && matchesCriticality && matchesFrequency && matchesAuthorization;
  });
  return sortEquipments(filtered, filters.sortKey || "name", filters.sortDirection || "asc");
}

function equipmentSortValue(equipment, key) {
  const nextPlan = getSoonestPlan(equipment);
  if (key === "frequency") {
    const frequencies = (equipment.plans || []).filter((plan) => !isMaintenanceExemptionService(plan.type)).map((plan) => Number(plan.frequencyMonths || Infinity));
    return frequencies.length ? Math.min(...frequencies) : Infinity;
  }
  if (key === "nextDue") return nextPlan?.nextDue ? parseLocalDate(nextPlan.nextDue).getTime() : Infinity;
  if (key === "value") return Number(equipment.commercialValue || 0);
  if (key === "status") {
    const order = { "Fuera de servicio": 1, "En mantenimiento": 2, "Observación": 3, "Operativo": 4 };
    return `${String(order[equipment.status] || 9).padStart(2, "0")} ${equipment.criticality || ""}`;
  }
  if (key === "model") return `${equipment.model || ""} ${equipment.serial || ""}`;
  return equipment[key] || "";
}

function sortEquipments(equipments, key, direction) {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...equipments].sort((left, right) => {
    const a = equipmentSortValue(left, key);
    const b = equipmentSortValue(right, key);
    const comparison = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
    if (comparison) return comparison * multiplier;
    return left.name.localeCompare(right.name, "es", { numeric: true, sensitivity: "base" });
  });
}

function toggleEquipmentSort(key) {
  const filters = state.ui.equipmentFilters;
  filters.sortDirection = filters.sortKey === key && filters.sortDirection === "asc" ? "desc" : "asc";
  filters.sortKey = key;
  saveState();
  renderEquipos();
}

function renderEquipmentRow(equipment) {
  const nextPlan = getSoonestPlan(equipment);
  const info = dueInfo(nextPlan?.nextDue);
  const maintenanceExempt = hasMaintenanceExemption(equipment);
  const classification = equipmentUseClassification(equipment);
  const authorization = maintenanceAuthorization(equipment);
  const editable = canEditData();
  return `
    <tr data-equipment-id="${escapeHtml(equipment.id)}">
      <td>
        <div class="equipment-row-main">
          ${equipmentPhotoMarkup(equipment, "equipment-thumb")}
          <div>
            <div class="row-title">${escapeHtml(equipment.name)}</div>
            <span class="row-sub">${escapeHtml(equipment.assetTag)} · ${escapeHtml(equipment.location)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(equipment.type)}</td>
      <td>${equipmentFrequencyBadges(equipment)}</td>
      <td>
        ${escapeHtml(equipment.manufacturer)} ${escapeHtml(equipment.model)}
        <span class="row-sub">Serie ${escapeHtml(equipment.serial)}</span>
      </td>
      <td>
        <div class="equipment-status-stack">
          <span>${statusBadge(equipment.status)} ${criticalityBadge(equipment.criticality)}</span>
          <span><span class="badge ${classification.tone}">${escapeHtml(classification.label)}</span> <span class="badge ${authorization.tone}">${escapeHtml(authorization.label)}</span></span>
        </div>
      </td>
      <td>
        <strong>${escapeHtml(nextPlan?.type || (maintenanceExempt ? NO_MAINTENANCE_SERVICE : "Sin plan"))}</strong>
        ${nextPlan
          ? `<span class="row-sub">${formatDate(nextPlan.nextDue)} · <span class="badge ${info.tone}">${escapeHtml(info.label)}</span></span>`
          : maintenanceExempt
            ? `<span class="row-sub"><span class="badge info">Exención documentada</span></span>`
            : `<span class="row-sub"><span class="badge danger">Sin planificación</span></span>`}
      </td>
      <td class="right nowrap">${formatMoney(equipment.commercialValue)}</td>
      <td>
        <div class="table-actions">
          <button class="table-action secondary" type="button" title="Ver detalle" data-action="select-equipment" data-id="${escapeHtml(equipment.id)}">${icon("eye")}</button>
          <button class="table-action secondary" type="button" title="Ver bitácora" data-action="view-equipment-events" data-id="${escapeHtml(equipment.id)}">${icon("book")}</button>
          ${editable ? `<button class="table-action secondary" type="button" title="Editar equipo" data-action="edit-equipment" data-id="${escapeHtml(equipment.id)}">${icon("edit")}</button>` : ""}
          ${editable ? `<button class="table-action" type="button" title="Registrar evento" data-action="add-event" data-id="${escapeHtml(equipment.id)}">${icon("plus")}</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function equipmentPhotoMarkup(equipment, className = "equipment-photo") {
  if (equipment.photoUrl) {
    return `<img class="${escapeHtml(className)}" src="${escapeHtml(equipment.photoUrl)}" alt="Foto de ${escapeHtml(equipment.name)}" loading="lazy" />`;
  }
  return `
    <div class="${escapeHtml(className)} equipment-photo-placeholder" aria-hidden="true">
      ${icon("microscope")}
    </div>
  `;
}

function openEquipmentDetailModal(equipmentId) {
  const equipment = getEquipment(equipmentId);
  if (!equipment) {
    showToast("No se encontró el equipo seleccionado.");
    return;
  }
  state.ui.selectedEquipmentId = equipment.id;
  saveState();
  openModal(renderEquipmentDetail(equipment));
}

function renderEquipmentDetail(equipment) {
  const editable = canEditData();
  const events = state.events
    .filter((event) => event.equipmentId === equipment.id)
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
    .slice(0, 6);
  const health = equipmentHealth(equipment);
  const classification = equipmentUseClassification(equipment);
  const authorization = maintenanceAuthorization(equipment);
  return `
    <div class="modal equipment-detail-modal">
      <div class="modal-header equipment-detail-header">
        <div>
          <span class="eyebrow">${escapeHtml(equipment.assetTag)} · ${escapeHtml(equipment.type)}</span>
          <h2>${escapeHtml(equipment.name)}</h2>
          <p>${escapeHtml(equipment.location || "Sin ubicación")} · Responsable: ${escapeHtml(equipment.owner || "Sin responsable")}</p>
        </div>
        <div class="table-actions">
          <button class="icon-button secondary" type="button" title="Cerrar" data-action="close-modal">${icon("x")}</button>
        </div>
      </div>

      <div class="modal-body equipment-detail-body">
        <section class="authorization-banner ${authorization.tone}">
          <div class="authorization-banner-icon">${icon(authorization.authorized ? "check" : authorization.applicable ? "alert" : "minus")}</div>
          <div>
            <span class="eyebrow">Autorización operacional</span>
            <h3>${escapeHtml(authorization.label)}</h3>
            <p>${escapeHtml(authorization.detail)}</p>
          </div>
          <div class="authorization-banner-meta">
            <span class="badge ${classification.tone}">${escapeHtml(classification.label)}</span>
            <small>${authorization.nextDue ? `Vigencia / vencimiento: ${formatDate(authorization.nextDue)}` : "Sin vigencia aplicable"}</small>
          </div>
        </section>
        <section class="equipment-detail-hero">
          ${equipmentPhotoMarkup(equipment, "equipment-hero-photo")}
          <div class="equipment-hero-summary">
            <div class="item-title">
              ${statusBadge(equipment.status)}
              ${criticalityBadge(equipment.criticality)}
              <span class="score-pill ${health.tone}" title="${escapeHtml(health.tooltip)}">Health ${health.score}</span>
            </div>
            <div class="detail-grid">
              ${detailField("Marca / modelo", `${equipment.manufacturer} ${equipment.model}`)}
              ${detailField("N° de serie", equipment.serial)}
              ${detailField("Proveedor", equipment.provider)}
              ${detailField("Valor comercial", formatMoney(equipment.commercialValue))}
              ${detailField("Fecha adquisición", formatDate(equipment.acquisitionDate))}
              ${detailField("Fecha valor", formatDate(equipment.commercialValueDate))}
            </div>
            ${equipment.notes ? `<div class="equipment-notes">${escapeHtml(equipment.notes)}</div>` : ""}
            <div class="table-actions equipment-detail-actions">
              ${editable ? `<button class="action-button secondary" type="button" data-action="edit-equipment" data-id="${escapeHtml(equipment.id)}">${icon("edit")} Editar ficha</button>` : ""}
              ${editable ? `<button class="action-button" type="button" data-action="add-event" data-id="${escapeHtml(equipment.id)}">${icon("plus")} Registrar evento</button>` : `<span class="badge neutral">Modo lectura</span>`}
              <button class="action-button secondary" type="button" data-action="view-equipment-events" data-id="${escapeHtml(equipment.id)}">${icon("book")} Ver bitácora completa</button>
            </div>
          </div>
        </section>

        <section class="equipment-detail-grid">
          <div class="plan-stack">
            <div class="section-title">
              <h2>${icon("calendar")} Plan maestro</h2>
              ${editable ? `<button class="action-button compact secondary" type="button" data-action="edit-equipment" data-id="${escapeHtml(equipment.id)}">${icon("edit")} Editar plan</button>` : ""}
            </div>
            ${(equipment.plans || []).length ? (equipment.plans || []).map((plan) => {
              const exempt = isMaintenanceExemptionService(plan.type);
              const info = exempt ? { tone: "info", label: "Exención vigente" } : dueInfo(plan.nextDue);
              return `
                <div class="plan-item">
                  <div>
                    <div class="item-title"><span>${escapeHtml(plan.type)}</span><span class="badge ${info.tone}">${escapeHtml(info.label)}</span></div>
                    <div class="item-meta">${exempt ? `Sin frecuencia · Sin costo${plan.contract ? ` · ${escapeHtml(plan.contract)}` : ""}` : `${formatFrequency(plan.frequencyMonths)} · ${escapeHtml(plan.provider)} · ${formatMoney(plan.cost)}`}</div>
                    ${!isActiveEquipment(equipment) ? `<div class="item-meta"><span class="badge neutral">Fuera de agenda activa</span></div>` : ""}
                  </div>
                  <div class="plan-actions">
                    <span class="nowrap">${exempt ? "No aplica" : formatDate(plan.nextDue)}</span>
                    ${editable ? `<button class="table-action secondary" type="button" title="Editar servicio" data-action="edit-plan" data-id="${escapeHtml(equipment.id)}" data-type="${escapeHtml(plan.type)}">${icon("edit")}</button>` : ""}
                    ${editable ? `<button class="table-action danger-soft" type="button" title="Eliminar servicio" data-action="delete-plan" data-id="${escapeHtml(equipment.id)}" data-type="${escapeHtml(plan.type)}">${icon("trash")}</button>` : ""}
                  </div>
                </div>
              `;
            }).join("") : emptyState("Este equipo no tiene servicios activos en el plan maestro.")}
          </div>

          <div class="plan-stack">
            <div class="section-title">
              <h2>${icon("book")} Bitácora reciente</h2>
              <button class="action-button compact secondary" type="button" data-action="view-equipment-events" data-id="${escapeHtml(equipment.id)}">${icon("eye")} Ver todo</button>
            </div>
            ${events.length ? events.map(renderCompactEvent).join("") : emptyState("Este equipo todavía no tiene eventos registrados.")}
          </div>
        </section>

        ${renderEquipmentMaintenanceHistory(equipment)}
      </div>
      <div class="modal-footer">
        <span class="item-meta">Ficha técnica ampliada · ${escapeHtml(equipment.assetTag)}</span>
        <div class="table-actions">
          <button class="action-button secondary" type="button" data-action="close-modal">Cerrar</button>
          ${editable ? `<button class="action-button" type="button" data-action="edit-equipment" data-id="${escapeHtml(equipment.id)}">${icon("edit")} Editar equipo</button>` : ""}
        </div>
      </div>
    </div>
  `;
}

function maintenanceYearSummary(equipment, year) {
  const events = maintenanceHistoryRecords(equipment, year);
  const occurrences = maintenancePlansFor(equipment).reduce((sum, plan) => sum + planOccurrencesForYear(plan, year), 0);
  const cost = events.reduce((sum, event) => sum + Number(event.cost || 0), 0);
  const hasCost = events.some((event) => Number(event.cost || 0) > 0);
  const currentYear = currentBudgetYear();
  let label = "Sin ciclo registrado";
  let tone = "neutral";
  if (events.length) {
    label = events.some((event) => event.source === "bitacora") ? "Mantención registrada" : "Fecha conservada en plan";
    tone = "success";
  } else if (occurrences && year < currentYear) {
    label = "Sin registro histórico";
  } else if (occurrences && year >= currentYear) {
    label = "Mantención planificada";
    tone = year === currentYear ? "warning" : "info";
  }
  return { year, events, occurrences, cost, hasCost, label, tone };
}

function renderMaintenanceYearCard(summary) {
  const isPast = summary.year < currentBudgetYear();
  return `
    <article class="maintenance-year-card ${summary.tone}">
      <div class="maintenance-year-head"><strong>${summary.year}</strong><span class="badge ${summary.tone}">${escapeHtml(summary.label)}</span></div>
      <div class="maintenance-year-value">${summary.hasCost ? formatMoney(summary.cost) : summary.events.length || isPast ? "Costo no informado" : summary.occurrences ? "Costo estimado en plan" : "Sin información"}</div>
      <p>${summary.events.length ? `${formatNumber(summary.events.length)} registro(s) histórico(s)` : `${formatNumber(summary.occurrences)} ciclo(s) según frecuencia`}</p>
      ${summary.events.slice(0, 2).map((event) => `<small>${formatDate(event.date)} · ${escapeHtml(event.result)}${event.provider ? ` · ${escapeHtml(event.provider)}` : ""}</small>`).join("")}
    </article>
  `;
}

function renderEquipmentMaintenanceHistory(equipment) {
  const currentYear = currentBudgetYear();
  const history = maintenanceHistoryRecords(equipment);
  const previousEvent = history.find((event) => parseLocalDate(event.date)?.getFullYear() < currentYear);
  const summaries = [currentYear - 1, currentYear, currentYear + 1].map((year) => maintenanceYearSummary(equipment, year));
  const nextYearProjection = projectedMaintenanceCost([equipment], currentYear + 1);
  return `
    <section class="maintenance-history-panel">
      <div class="section-title">
        <div>
          <h2>${icon("wrench")} Historia y ciclo de mantención</h2>
          <p>Cada intervención permanece en la bitácora; actualizar el plan no reemplaza ni elimina los registros anteriores.</p>
        </div>
        <span class="badge info">${formatNumber(history.length)} registro(s)</span>
      </div>
      <div class="maintenance-cycle-grid">
        ${summaries.map(renderMaintenanceYearCard).join("")}
        <article class="maintenance-year-card projection">
          <div class="maintenance-year-head"><strong>Proyección ${currentYear + 1}</strong><span class="badge info">Estimación</span></div>
          <div class="maintenance-year-value">${formatMoney(nextYearProjection)}</div>
          <p>Calculada con costo del plan, próxima fecha y frecuencia vigente.</p>
          <small>No corresponde a una predicción estadística.</small>
        </article>
      </div>
      <div class="maintenance-history-list">
        <h3>Registro histórico de mantenciones</h3>
        ${history.length ? history.slice(0, 10).map((event) => `
          <div class="maintenance-history-row">
            <span class="timeline-date">${formatDate(event.date)}</span>
            <span><strong>${escapeHtml(event.type)}</strong><small>${escapeHtml(event.result)} · ${escapeHtml(event.provider || "Sin proveedor")}</small></span>
            <strong>${Number(event.cost || 0) > 0 ? formatMoney(event.cost) : "Costo no informado"}</strong>
          </div>
        `).join("") : emptyState("No hay mantenciones históricas registradas para este equipo.")}
        ${previousEvent ? `<p class="history-note">Última mantención anterior registrada: ${formatDate(previousEvent.date)}.</p>` : ""}
      </div>
    </section>
  `;
}

function detailField(label, value) {
  return `
    <div class="detail-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderCompactEvent(event) {
  const equipment = getEquipment(event.equipmentId);
  const editable = canEditData();
  return `
    <div class="activity-item">
      <div class="event-line">
        <div>
          <div class="item-title"><span>${escapeHtml(event.type)}</span><span class="badge neutral">${formatDate(event.date)}</span></div>
          <div class="item-meta">${escapeHtml(equipment?.name || "Equipo eliminado")} · ${escapeHtml(getEventUserName(event))} · ${escapeHtml(event.result)} · ${formatMoney(event.cost)}</div>
        </div>
        ${editable ? `
          <div class="table-actions">
            <button class="table-action secondary" type="button" title="Editar evento" data-action="edit-event" data-id="${escapeHtml(event.id)}">${icon("edit")}</button>
            <button class="table-action danger-soft" type="button" title="Eliminar evento" data-action="delete-event" data-id="${escapeHtml(event.id)}">${icon("trash")}</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function getCalendarWindow() {
  const offset = Number(state.ui.calendarMonthOffset || 0);
  const start = addMonths(startOfMonth(todayDate()), offset);
  return {
    start,
    end: addMonths(start, 3),
    months: [start, addMonths(start, 1), addMonths(start, 2)]
  };
}

function renderQuarterCalendar(tasks) {
  const editable = canEditData();
  const { start, end, months } = getCalendarWindow();
  const windowTasks = tasks.filter((task) => {
    const due = parseLocalDate(task.due);
    return due && due >= start && due < end;
  });
  const tasksByDate = groupBy(windowTasks, (task) => task.due);
  const totalCost = windowTasks.reduce((sum, task) => sum + Number(task.plan.cost || 0), 0);

  return `
    <section class="calendar-dashboard">
      <div class="calendar-dashboard-head">
      <div>
        <span class="eyebrow">Próximos 3 meses</span>
        <h2>Eventos planificados</h2>
        <p>${formatMonthLabel(months[0])} - ${formatMonthLabel(months[2])} · Solo flota activa</p>
        </div>
        <div class="calendar-summary">
          <span class="badge info">${windowTasks.length} servicios</span>
          <span class="badge neutral">${formatMoney(totalCost)} estimado</span>
          <div class="table-actions">
            <button class="table-action secondary" type="button" title="Tres meses anteriores" data-action="calendar-prev">${icon("clock")}</button>
            <button class="table-action secondary" type="button" title="Volver al mes actual" data-action="calendar-today">${icon("calendar")}</button>
            <button class="table-action secondary" type="button" title="Tres meses siguientes" data-action="calendar-next">${icon("plus")}</button>
          </div>
        </div>
      </div>
      <div class="calendar-months">
        ${months.map((month) => renderCalendarMonth(month, tasksByDate, editable)).join("")}
      </div>
    </section>
  `;
}

function renderCalendarMonth(monthDate, tasksByDate, editable) {
  const start = startOfMonth(monthDate);
  const firstWeekday = (start.getDay() + 6) % 7;
  const todayKey = dateKey(todayDate());
  const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];
  const cells = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(start.getFullYear(), start.getMonth(), 1 - firstWeekday + index);
    const key = dateKey(cellDate);
    const isCurrentMonth = cellDate.getMonth() === start.getMonth();
    const dayTasks = isCurrentMonth ? (tasksByDate[key] || []) : [];
    const classes = [
      "calendar-day",
      isCurrentMonth ? "" : "muted-day",
      key === todayKey ? "today" : "",
      dayTasks.length ? "has-events" : ""
    ].filter(Boolean).join(" ");

    return `
      <div class="${classes}">
        <span class="day-number">${cellDate.getDate()}</span>
        <div class="calendar-day-events">
          ${dayTasks.slice(0, 2).map((task) => renderCalendarTaskChip(task, editable)).join("")}
          ${dayTasks.length > 2 ? `<span class="more-events">+${dayTasks.length - 2}</span>` : ""}
        </div>
      </div>
    `;
  });

  return `
    <article class="calendar-month-card">
      <div class="calendar-month-title">${formatMonthLabel(monthDate)}</div>
      <div class="calendar-weekdays">
        ${dayLabels.map((label) => `<span>${label}</span>`).join("")}
      </div>
      <div class="calendar-grid">
        ${cells.join("")}
      </div>
    </article>
  `;
}

function renderCalendarTaskChip(task, editable) {
  const action = editable ? "edit-plan" : "view-equipment-events";
  const assetLabel = task.equipment.assetTag.replace(/^LAB-/, "");
  return `
    <button
      class="calendar-chip ${task.tone}"
      type="button"
      title="${escapeHtml(`${task.equipment.name} · ${task.plan.type}`)}"
      data-action="${action}"
      data-id="${escapeHtml(task.equipment.id)}"
      data-type="${escapeHtml(task.plan.type)}"
    >
      <span>${escapeHtml(assetLabel)}</span>
      <small>${escapeHtml(task.plan.type)}</small>
    </button>
  `;
}

function renderCalendario() {
  const editable = canEditData();
  const horizon = Number(state.ui.calendarHorizon || 180);
  const calendarTypeOptions = ["Todos", ...serviceCatalog().filter((type) => !isMaintenanceExemptionService(type))];
  const activeCalendarType = calendarTypeOptions.includes(state.ui.calendarType) ? state.ui.calendarType : "Todos";
  state.ui.calendarType = activeCalendarType;
  const filteredTasks = getAllTasks().filter((task) => {
    const matchesHorizon = task.days <= horizon || task.days < 0;
    const matchesType = activeCalendarType === "Todos" || task.plan.type === activeCalendarType;
    return matchesHorizon && matchesType;
  });
  const grouped = groupBy(filteredTasks, (task) => task.days < 0 ? "Vencidos" : formatMonth(task.due));
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Vencidos") return -1;
    if (b === "Vencidos") return 1;
    return parseLocalDate(grouped[a][0].due) - parseLocalDate(grouped[b][0].due);
  });

  $("#calendarioView").innerHTML = `
    <div class="toolbar">
      <div class="filter-grid">
        <div class="control">
          <label for="calendarHorizon">Horizonte</label>
          <select id="calendarHorizon">${renderOptions(["30", "60", "90", "180", "365"], String(state.ui.calendarHorizon), (value) => `${value} días`)}</select>
        </div>
        <div class="control">
          <label for="calendarType">Tipo de servicio</label>
          <select id="calendarType">${renderOptions(calendarTypeOptions, activeCalendarType)}</select>
        </div>
      </div>
      ${editable ? `<button class="action-button" type="button" data-action="add-event">${icon("plus")} Registrar evento</button>` : `<span class="badge neutral">Modo lectura</span>`}
    </div>

    ${renderQuarterCalendar(filteredTasks)}

    <div class="calendar-groups agenda-list">
      ${groupKeys.length ? groupKeys.map((key) => `
        <section class="month-band">
          <div class="month-title">
            <h2>${escapeHtml(key)}</h2>
            <span class="badge neutral">${grouped[key].length} actividades</span>
          </div>
          ${grouped[key].map(renderDueItem).join("")}
        </section>
      `).join("") : emptyState("No hay vencimientos en el horizonte seleccionado.")}
    </div>
  `;
}

function renderDueItem(task) {
  const editable = canEditData();
  return `
    <div class="due-item">
      <div class="timeline-date">${formatDate(task.due)}</div>
      <div>
        <div class="item-title">
          <span>${escapeHtml(task.equipment.name)}</span>
          <span class="badge ${task.tone}">${escapeHtml(task.label)}</span>
          ${criticalityBadge(task.equipment.criticality)}
        </div>
        <div class="item-meta">${escapeHtml(task.plan.type)} · ${escapeHtml(task.equipment.location)} · ${escapeHtml(task.plan.provider)} · ${formatMoney(task.plan.cost)}</div>
      </div>
      ${editable ? `
        <div class="due-actions">
          <button class="table-action secondary" type="button" title="Editar servicio planificado" data-action="edit-plan" data-id="${escapeHtml(task.equipment.id)}" data-type="${escapeHtml(task.plan.type)}">${icon("edit")}</button>
          <button class="table-action secondary" type="button" title="Registrar este servicio" data-action="add-event" data-id="${escapeHtml(task.equipment.id)}" data-type="${escapeHtml(task.plan.type)}">${icon("plus")}</button>
        </div>
      ` : `<span class="badge neutral">Lectura</span>`}
    </div>
  `;
}

function renderBitacora() {
  const filters = state.ui.eventFilters;
  const editable = canEditData();
  const exportable = canExportData();
  const eventTypeOptions = ["Todos", ...eventTypeCatalog()];
  if (!eventTypeOptions.includes(filters.type)) filters.type = "Todos";
  const filtered = getFilteredEvents();
  $("#bitacoraView").innerHTML = `
    <div class="toolbar">
      <div class="filter-grid">
        <div class="control">
          <label for="eventEquipmentFilter">Equipo</label>
          <select id="eventEquipmentFilter">
            <option value="Todos">Todos los equipos</option>
            ${state.equipments.map((equipment) => `<option value="${escapeHtml(equipment.id)}" ${filters.equipmentId === equipment.id ? "selected" : ""}>${escapeHtml(equipment.name)}</option>`).join("")}
          </select>
        </div>
        <div class="control">
          <label for="eventTypeFilter">Tipo de evento</label>
          <select id="eventTypeFilter">${renderOptions(eventTypeOptions, filters.type)}</select>
        </div>
      </div>
      ${editable ? `<button class="action-button" type="button" data-action="add-event">${icon("plus")} Registrar evento</button>` : `<span class="badge neutral">Modo lectura</span>`}
    </div>
    <div class="panel pad">
      <div class="section-title">
        <div>
          <h2>${icon("book")} Historial trazable</h2>
          <p>${filtered.length} registros encontrados.</p>
        </div>
        ${exportable ? `<button class="action-button secondary" type="button" data-action="export-events">${icon("download")} CSV</button>` : `<span class="badge neutral">CSV no disponible</span>`}
      </div>
      <div class="timeline">
        ${filtered.length ? filtered.map(renderTimelineItem).join("") : emptyState("No hay eventos para los filtros seleccionados.")}
      </div>
    </div>
  `;
}

function getFilteredEvents() {
  const filters = state.ui.eventFilters;
  return [...state.events]
    .filter((event) => filters.equipmentId === "Todos" || event.equipmentId === filters.equipmentId)
    .filter((event) => filters.type === "Todos" || event.type === filters.type)
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
}

function renderTimelineItem(event) {
  const equipment = getEquipment(event.equipmentId);
  const resultTone = event.result === "Conforme" ? "success" : event.result === "No conforme" ? "danger" : "warning";
  const editable = canEditData();
  return `
    <div class="timeline-item">
      <div class="timeline-date">${formatDate(event.date)}</div>
      <div class="timeline-body">
        <div class="item-title">
          <span>${escapeHtml(event.type)}</span>
          <span class="badge ${resultTone}">${escapeHtml(event.result)}</span>
          ${editable ? `
            <span class="timeline-actions">
              <button class="table-action secondary" type="button" title="Editar evento" data-action="edit-event" data-id="${escapeHtml(event.id)}">${icon("edit")}</button>
              <button class="table-action danger-soft" type="button" title="Eliminar evento" data-action="delete-event" data-id="${escapeHtml(event.id)}">${icon("trash")}</button>
            </span>
          ` : ""}
        </div>
        <div class="item-meta">
          ${escapeHtml(equipment?.name || "Equipo eliminado")} · ${escapeHtml(getEventUserName(event))} · ${escapeHtml(event.provider)} · ${formatMoney(event.cost)}
        </div>
        <p class="item-meta">${escapeHtml(event.notes)}</p>
      </div>
    </div>
  `;
}

const costPalette = ["#e41d2d", "#171717", "#d99b00", "#275b9f", "#0f8a5f", "#7b4bb7", "#7a7a80", "#ff7580"];

function budgetAllocationLabel(method) {
  return {
    forecast_weighted: "Según forecast de planes",
    asset_value_weighted: "Según valor comercial",
    equal_per_equipment: "Equitativo por equipo"
  }[method] || "Según forecast de planes";
}

function compactCostItems(items, limit = 7) {
  const sorted = items.filter((item) => Number(item.value || 0) > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;
  const visible = sorted.slice(0, limit);
  const otherValue = sorted.slice(limit).reduce((sum, item) => sum + Number(item.value || 0), 0);
  return [...visible, { label: "Otros", value: otherValue }];
}

function renderPieChartCard(title, subtitle, items, emptyText = "Sin costos registrados.") {
  const compactItems = compactCostItems(items);
  const total = compactItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) {
    return `
      <section class="panel pad span-6 cost-pie-card">
        <div class="section-title">
          <div>
            <h2>${icon("chart")} ${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
        </div>
        ${emptyState(emptyText)}
      </section>
    `;
  }
  let cursor = 0;
  const gradient = compactItems.map((item, index) => {
    const start = cursor;
    const end = cursor + (Number(item.value || 0) / total) * 100;
    cursor = end;
    return `${costPalette[index % costPalette.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(", ");
  return `
    <section class="panel pad span-6 cost-pie-card">
      <div class="section-title">
        <div>
          <h2>${icon("chart")} ${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="cost-pie-layout">
        <div class="pie-chart" style="background: conic-gradient(${gradient});">
          <span>${formatMoney(total)}</span>
        </div>
        <div class="pie-legend">
          ${compactItems.map((item, index) => {
            const percent = Math.round((Number(item.value || 0) / total) * 100);
            return `
              <div class="pie-legend-row">
                <span class="legend-swatch" style="background:${costPalette[index % costPalette.length]}"></span>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${formatMoney(item.value)} · ${formatNumber(percent)}%</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function groupCostItems(items, callback) {
  const grouped = groupBy(items, callback);
  return Object.entries(grouped).map(([label, rows]) => ({
    label,
    value: rows.reduce((sum, row) => sum + Number(row.cost || row.value || 0), 0)
  })).sort((a, b) => b.value - a.value);
}

function actualCostForEquipment(equipmentId, year = getBudgetSettings().year || currentBudgetYear()) {
  return state.events
    .filter((event) => event.equipmentId === equipmentId && parseLocalDate(event.date)?.getFullYear() === year)
    .reduce((sum, event) => sum + Number(event.cost || 0), 0);
}

function budgetAllocationRows(equipments, annualBudget, method, year = getBudgetSettings().year || currentBudgetYear()) {
  const totalForecast = annualizedForecastForEquipments(equipments);
  const totalValue = equipments.reduce((sum, equipment) => sum + Number(equipment.commercialValue || 0), 0);
  const equalWeight = equipments.length ? 1 / equipments.length : 0;
  return equipments.map((equipment) => {
    const forecast = annualizedForecastForEquipment(equipment);
    const commercialValue = Number(equipment.commercialValue || 0);
    let weight = equalWeight;
    if (method === "forecast_weighted" && totalForecast) weight = forecast / totalForecast;
    if (method === "asset_value_weighted" && totalValue) weight = commercialValue / totalValue;
    const allocated = Number(annualBudget || 0) * weight;
    const actual = actualCostForEquipment(equipment.id, year);
    return {
      equipment,
      forecast,
      allocated,
      actual,
      variance: allocated ? forecast - allocated : null,
      usage: allocated ? Math.round((actual / allocated) * 100) : null
    };
  }).sort((a, b) => b.forecast - a.forecast);
}

function renderMaintenanceCostHistoryPanel(history, selectedYear, selected, nextYearProjection) {
  const visible = history.slice(-7);
  const max = Math.max(...visible.filter((item) => item.hasCost).map((item) => item.cost), nextYearProjection, 1);
  return `
    <section class="panel pad span-12 maintenance-cost-panel">
      <div class="section-title">
        <div>
          <h2>${icon("wrench")} Costo histórico de mantención</h2>
          <p>Solo flota activa. Los años con eventos sin valor se muestran como datos incompletos, no como costo cero.</p>
        </div>
        <div class="table-actions">
          <span class="badge info">${escapeHtml(String(selectedYear))}: ${selected?.hasCost ? formatMoney(selected.cost) : selected?.events ? "Costo no informado" : "Sin eventos"}</span>
          <span class="badge neutral">${Number(selectedYear) + 1} estimado: ${formatMoney(nextYearProjection)}</span>
        </div>
      </div>
      <div class="maintenance-cost-history">
        <div class="metric-row">
          ${visible.map((item) => item.hasCost
            ? dashboardBar(item.year, item.cost, max, formatMoney, "blue")
            : `<div class="bar-row cost-missing"><strong>${escapeHtml(item.year)}</strong><div class="bar-track"></div><span>Sin costo informado · ${formatNumber(item.events)} evento(s)</span></div>`
          ).join("") || emptyState("No hay mantenciones registradas.")}
          ${dashboardBar(`${Number(selectedYear) + 1} estimado`, nextYearProjection, max, formatMoney, "gold")}
        </div>
        <div class="cost-method-note">
          <strong>Cómo se calcula la proyección</strong>
          <p>Costo vigente de cada plan de mantención x ocurrencias esperadas según próxima fecha y frecuencia. No incluye equipos en Observación o Fuera de servicio.</p>
        </div>
      </div>
    </section>
  `;
}

function renderCostos() {
  const metrics = getMetrics();
  const exportable = canExportData();
  const editable = canEditData();
  const budget = getBudgetSettings();
  const activeEquipments = state.equipments.filter(isActiveEquipment);
  const activeIds = new Set(activeEquipments.map((equipment) => equipment.id));
  const budgetYears = [...new Set([
    currentBudgetYear(),
    ...(state.budgets || []).map((item) => Number(item.year)),
    ...state.events.map((event) => parseLocalDate(event.date)?.getFullYear()).filter(Boolean)
  ])].sort((a, b) => b - a);
  const costServiceTypes = serviceCatalog().filter((type) => !isMaintenanceExemptionService(type));
  const forecastByService = costServiceTypes.map((type) => ({
    type,
    cost: metrics.tasks.filter((task) => task.plan.type === type).reduce((sum, task) => sum + annualizedCost(task.plan), 0)
  }));
  const maxForecast = Math.max(...forecastByService.map((item) => item.cost), 1);
  const forecastByEquipment = activeEquipments.map((equipment) => ({
    equipment,
    cost: annualizedForecastForEquipment(equipment)
  })).sort((a, b) => b.cost - a.cost);
  const allocationRows = budgetAllocationRows(activeEquipments, metrics.annualBudget, budget.allocationMethod, metrics.budgetYear);
  const maintenanceHistory = maintenanceCostHistory(activeEquipments);
  const maintenanceSelected = maintenanceHistory.find((item) => Number(item.year) === Number(metrics.budgetYear));
  const nextYearMaintenanceProjection = projectedMaintenanceCost(activeEquipments, Number(metrics.budgetYear) + 1);
  const monthlyActuals = Array.from({ length: 12 }, (_, month) => {
      const cost = state.events
      .filter((event) => {
        const date = parseLocalDate(event.date);
        return activeIds.has(event.equipmentId) && date?.getFullYear() === metrics.budgetYear && date.getMonth() === month;
      })
      .reduce((sum, event) => sum + Number(event.cost || 0), 0);
    return { label: new Intl.DateTimeFormat("es-CL", { month: "short" }).format(new Date(metrics.budgetYear, month, 1)), cost };
  });
  const maxActual = Math.max(...monthlyActuals.map((item) => item.cost), 1);
  const forecastByArea = groupCostItems(forecastByEquipment.map((item) => ({ ...item, value: item.cost })), (item) => item.equipment.location || "Sin área");
  const allocationByArea = groupCostItems(allocationRows.map((item) => ({ value: item.allocated, equipment: item.equipment })), (item) => item.equipment.location || "Sin área");
  const budgetStatusTone = metrics.budgetRemaining === null ? "neutral" : metrics.budgetRemaining >= 0 ? "success" : "danger";
  const forecastStatusTone = metrics.forecastVsBudget === null ? "neutral" : metrics.forecastVsBudget <= 0 ? "success" : "warning";

  $("#costosView").innerHTML = `
    <div class="cost-summary-grid">
      <div class="summary-tile"><span>Presupuesto anual</span><strong>${metrics.annualBudget ? formatMoney(metrics.annualBudget) : "Sin definir"}</strong><p class="item-meta">Monto autorizado ${escapeHtml(String(budget.year))}</p></div>
      <div class="summary-tile"><span>Forecast anualizado</span><strong>${formatMoney(metrics.annualizedForecast)}</strong><p class="item-meta">Planes de servicio x frecuencia</p></div>
      <div class="summary-tile"><span>Gasto real YTD</span><strong>${formatMoney(metrics.ytdSpent)}</strong><p class="item-meta">${metrics.budgetUsage === null ? "Sin presupuesto base" : `${formatNumber(metrics.budgetUsage)}% del presupuesto`}</p></div>
      <div class="summary-tile"><span>Disponible / brecha</span><strong class="${budgetStatusTone}">${metrics.budgetRemaining === null ? "Sin info" : formatMoney(metrics.budgetRemaining)}</strong><p class="item-meta ${forecastStatusTone}">Forecast vs presupuesto: ${metrics.forecastVsBudget === null ? "Sin info" : formatMoney(metrics.forecastVsBudget)}</p></div>
    </div>

    <div class="dashboard-grid">
      ${renderMaintenanceCostHistoryPanel(maintenanceHistory, metrics.budgetYear, maintenanceSelected, nextYearMaintenanceProjection)}
      <section class="panel pad span-12 budget-control-panel">
        <div class="section-title">
          <div>
            <h2>${icon("wallet")} Presupuesto anual de mantenimiento</h2>
            <p>Define el monto anual autorizado para la flota activa y compáralo con forecast y gasto real.</p>
          </div>
          ${exportable ? `<button class="action-button secondary" type="button" data-action="export-costs">${icon("download")} CSV</button>` : `<span class="badge neutral">CSV no disponible</span>`}
        </div>
        <form class="budget-form" data-form="annual-budget">
          <div class="control">
            <label for="costBudgetYear">Año de análisis</label>
            <select id="costBudgetYear" name="budgetYear">
              ${budgetYears.map((year) => `<option value="${year}" ${Number(budget.year) === year ? "selected" : ""}>${year}${(state.budgets || []).some((item) => Number(item.year) === year) ? "" : " · sin presupuesto"}</option>`).join("")}
            </select>
          </div>
          <div class="control">
            <label for="annualBudget">Presupuesto anual CLP</label>
            <input id="annualBudget" name="annualBudget" type="number" min="0" step="1" value="${escapeHtml(budget.annualBudget)}" ${editable ? "" : "disabled"} />
          </div>
          <div class="control">
            <label for="allocationMethod">Distribución</label>
            <select id="allocationMethod" name="allocationMethod" ${editable ? "" : "disabled"}>
              <option value="forecast_weighted" ${budget.allocationMethod === "forecast_weighted" ? "selected" : ""}>Según forecast de planes</option>
              <option value="asset_value_weighted" ${budget.allocationMethod === "asset_value_weighted" ? "selected" : ""}>Según valor comercial</option>
              <option value="equal_per_equipment" ${budget.allocationMethod === "equal_per_equipment" ? "selected" : ""}>Equitativo por equipo</option>
            </select>
          </div>
          <div class="control wide">
            <label for="budgetNotes">Notas</label>
            <input id="budgetNotes" name="budgetNotes" value="${escapeHtml(budget.notes)}" placeholder="Referencia, versión o criterio de presupuesto" ${editable ? "" : "disabled"} />
          </div>
          ${editable ? `<button class="action-button" type="submit">${icon("save")} Guardar presupuesto</button>` : `<span class="badge neutral">Modo lectura</span>`}
        </form>
      </section>

      ${renderPieChartCard("Distribución de presupuesto por área", budgetAllocationLabel(budget.allocationMethod), allocationByArea, "Define un presupuesto anual para visualizar la distribución.")}
      ${renderPieChartCard("Forecast anualizado por área", "Costo esperado según planes y frecuencias.", forecastByArea, "No hay planes con costo anualizado.")}

      <section class="panel pad span-6">
        <div class="section-title">
          <div>
            <h2>${icon("chart")} Forecast por tipo</h2>
            <p>Costo anualizado según frecuencia de cada plan.</p>
          </div>
        </div>
        <div class="metric-row">
          ${forecastByService.map((item, index) => dashboardBar(item.type, item.cost, maxForecast, formatMoney, ["", "dark", "gold", "blue"][index] || "")).join("") || emptyState("Sin planes de servicio.")}
        </div>
      </section>

      <section class="panel pad span-6">
        <div class="section-title">
          <div>
            <h2>${icon("wallet")} Gasto mensual real</h2>
            <p>Basado en costos registrados en bitácora durante ${escapeHtml(metrics.budgetYear)}.</p>
          </div>
        </div>
        <div class="metric-row">
          ${monthlyActuals.map((item) => dashboardBar(item.label, item.cost, maxActual, formatMoney, item.cost ? "dark" : "")).join("")}
        </div>
      </section>

      <section class="panel pad span-12">
        <div class="section-title">
          <div>
            <h2>${icon("microscope")} Presupuesto, forecast y gasto por equipo</h2>
            <p>La distribución ayuda a detectar equipos sobre presupuestados, subpresupuestados o candidatos a revisión contractual.</p>
          </div>
          <span class="badge info">${escapeHtml(budgetAllocationLabel(budget.allocationMethod))}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Criticidad</th>
                <th>Proveedor principal</th>
                <th>Frecuencias</th>
                <th class="right">Presupuesto asignado</th>
                <th class="right">Forecast anualizado</th>
                <th class="right">Gasto YTD</th>
                <th class="right">Brecha forecast</th>
              </tr>
            </thead>
            <tbody>
              ${allocationRows.map(({ equipment, allocated, forecast, actual, variance }) => `
                <tr>
                  <td><div class="row-title">${escapeHtml(equipment.name)}</div><span class="row-sub">${escapeHtml(equipment.assetTag)} · ${escapeHtml(equipment.type)} · ${escapeHtml(equipment.location || "Sin área")}</span></td>
                  <td>${criticalityBadge(equipment.criticality)}</td>
                  <td>${escapeHtml(equipment.provider)}</td>
                  <td>${equipmentFrequencyBadges(equipment)}</td>
                  <td class="right nowrap">${metrics.annualBudget ? formatMoney(allocated) : "Sin definir"}</td>
                  <td class="right nowrap">${formatMoney(forecast)}</td>
                  <td class="right nowrap">${formatMoney(actual)}</td>
                  <td class="right nowrap ${variance !== null && variance > 0 ? "warning" : "success"}">${variance === null ? "Sin info" : formatMoney(variance)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function providerNames() {
  return uniqueCatalogValues([
    ...state.equipments.map((equipment) => equipment.provider),
    ...state.equipments.flatMap((equipment) => (equipment.plans || []).map((plan) => plan.provider)),
    ...state.events.map((event) => event.provider)
  ]);
}

function providerEvaluationLabel(score) {
  if (score === null || score === undefined) return { label: "Sin información", tone: "neutral" };
  if (score >= 90) return { label: "Excelente", tone: "success" };
  if (score >= 75) return { label: "Adecuado", tone: "info" };
  if (score >= 60) return { label: "En seguimiento", tone: "warning" };
  return { label: "Crítico", tone: "danger" };
}

function providerMetric(name, year = currentBudgetYear()) {
  const equipments = state.equipments.filter((equipment) => equipment.provider === name || (equipment.plans || []).some((plan) => plan.provider === name) || state.events.some((event) => event.equipmentId === equipment.id && event.provider === name));
  const activeEquipments = equipments.filter(isActiveEquipment);
  const plans = equipments.flatMap((equipment) => (equipment.plans || []).filter((plan) => plan.provider === name && !isMaintenanceExemptionService(plan.type)).map((plan) => ({ equipment, plan })));
  const activePlans = plans.filter(({ equipment }) => isActiveEquipment(equipment));
  const events = state.events.filter((event) => event.provider === name);
  const yearEvents = events.filter((event) => parseLocalDate(event.date)?.getFullYear() === Number(year));
  const overdue = activePlans.filter(({ plan }) => plan.nextDue && daysUntil(plan.nextDue) < 0);
  const upcoming90 = activePlans.filter(({ plan }) => {
    const days = daysUntil(plan.nextDue);
    return days >= 0 && days <= 90;
  });
  const compliance = activePlans.length ? Math.round(((activePlans.length - overdue.length) / activePlans.length) * 100) : null;
  const planTraceability = plans.length ? Math.round((plans.filter(({ plan }) => plan.nextDue && plan.frequencyMonths && plan.contract).length / plans.length) * 100) : null;
  const costTraceability = plans.length ? Math.round((plans.filter(({ plan }) => Number(plan.cost || 0) > 0).length / plans.length) * 100) : null;
  const scoreComponents = [
    { value: compliance, weight: 0.65 },
    { value: planTraceability, weight: 0.2 },
    { value: costTraceability, weight: 0.15 }
  ].filter((component) => component.value !== null);
  const componentWeight = scoreComponents.reduce((sum, component) => sum + component.weight, 0);
  const score = componentWeight
    ? Math.round(scoreComponents.reduce((sum, component) => sum + (component.value * component.weight), 0) / componentWeight)
    : null;
  const evaluation = providerEvaluationLabel(score);
  return {
    name,
    equipments,
    activeEquipments,
    plans,
    activePlans,
    events,
    yearEvents,
    overdue,
    upcoming90,
    compliance,
    planTraceability,
    costTraceability,
    score,
    evaluation,
    annualCost: yearEvents.reduce((sum, event) => sum + Number(event.cost || 0), 0),
    forecast: activePlans.reduce((sum, item) => sum + annualizedCost(item.plan), 0),
    contracts: uniqueCatalogValues(plans.map(({ plan }) => plan.contract))
  };
}

function renderProveedores(options = {}) {
  const filters = state.ui.providerFilters || createSeedData().ui.providerFilters;
  const years = [...new Set([currentBudgetYear(), ...state.events.map((event) => parseLocalDate(event.date)?.getFullYear()).filter(Boolean)])].sort((a, b) => b - a);
  const metrics = providerNames().map((name) => providerMetric(name, filters.year));
  const search = String(filters.search || "").trim().toLowerCase();
  const filtered = metrics.filter((metric) => (!search || [metric.name, ...metric.contracts, ...metric.equipments.map((equipment) => equipment.name)].join(" ").toLowerCase().includes(search))
    && (filters.evaluation === "Todos" || metric.evaluation.label === filters.evaluation));
  const totalCost = filtered.reduce((sum, metric) => sum + metric.annualCost, 0);
  const totalForecast = filtered.reduce((sum, metric) => sum + metric.forecast, 0);
  const withOverdue = filtered.filter((metric) => metric.overdue.length).length;
  const scored = filtered.filter((metric) => metric.score !== null);
  const averageScore = scored.length ? Math.round(scored.reduce((sum, metric) => sum + metric.score, 0) / scored.length) : null;
  const maxCost = Math.max(...filtered.map((metric) => metric.annualCost), 1);
  const maxPortfolio = Math.max(...filtered.map((metric) => metric.activeEquipments.length), 1);
  const maxOverdue = Math.max(...filtered.map((metric) => metric.overdue.length), 1);

  $("#proveedoresView").innerHTML = `
    <div class="provider-hero">
      <div><span class="eyebrow">Gestión de terceros</span><h2>Proveedores de servicio</h2><p>Evaluación operacional basada en cumplimiento de planes, trazabilidad documental y registro de costos.</p></div>
      <button class="action-button secondary" type="button" data-action="export-providers">${icon("download")} Exportar CSV</button>
    </div>
    <div class="cost-summary-grid provider-summary-grid">
      <div class="summary-tile"><span>Proveedores</span><strong>${formatNumber(filtered.length)}</strong><p class="item-meta">Con actividad, planes o equipos asociados</p></div>
      <div class="summary-tile"><span>Evaluación promedio</span><strong>${percentOrInfo(averageScore)}</strong><p class="item-meta">Puntaje operacional ponderado</p></div>
      <div class="summary-tile"><span>Con servicios vencidos</span><strong class="${withOverdue ? "danger" : "success"}">${formatNumber(withOverdue)}</strong><p class="item-meta">Solo planes de la flota activa</p></div>
      <div class="summary-tile"><span>Costo real ${escapeHtml(String(filters.year))}</span><strong>${formatMoney(totalCost)}</strong><p class="item-meta">Forecast anual: ${formatMoney(totalForecast)}</p></div>
    </div>
    <div class="toolbar provider-toolbar">
      <div class="filter-grid">
        <div class="control"><label for="providerSearch">Buscar</label><input id="providerSearch" type="search" value="${escapeHtml(filters.search || "")}" placeholder="Proveedor, contrato o equipo..." /></div>
        <div class="control"><label for="providerEvaluationFilter">Evaluación</label><select id="providerEvaluationFilter">${renderOptions(["Todos", "Excelente", "Adecuado", "En seguimiento", "Crítico", "Sin información"], filters.evaluation)}</select></div>
        <div class="control"><label for="providerYearFilter">Año de costos</label><select id="providerYearFilter">${renderOptions(years.map(String), String(filters.year))}</select></div>
      </div>
    </div>
    <div class="insight-grid provider-insights">
      ${insightCard("Costo real por proveedor", `Eventos valorizados durante ${filters.year}.`, [...filtered].sort((a, b) => b.annualCost - a.annualCost).slice(0, 8).map((metric) => dashboardBar(metric.name, metric.annualCost, maxCost, formatMoney, "blue")).join("") || emptyState("Sin costos registrados."))}
      ${insightCard("Equipos activos administrados", "Cobertura operacional por proveedor.", [...filtered].sort((a, b) => b.activeEquipments.length - a.activeEquipments.length).slice(0, 8).map((metric) => dashboardBar(metric.name, metric.activeEquipments.length, maxPortfolio)).join("") || emptyState("Sin equipos asociados."))}
      ${insightCard("Servicios vencidos", "Pendientes en la flota activa.", filtered.filter((metric) => metric.overdue.length).sort((a, b) => b.overdue.length - a.overdue.length).slice(0, 8).map((metric) => dashboardBar(metric.name, metric.overdue.length, maxOverdue, formatNumber, "danger")).join("") || emptyState("No hay servicios vencidos."))}
    </div>
    <section class="panel pad provider-table-panel">
      <div class="section-title"><div><h2>${icon("provider")} Evaluación y cartera</h2><p>El puntaje no mide calidad técnica: resume cumplimiento vigente (65%), trazabilidad del plan (20%) y costos informados (15%).</p></div><span class="badge info">${formatNumber(filtered.length)} resultado(s)</span></div>
      <div class="table-wrap">
        <table class="provider-table">
          <thead><tr><th>Proveedor</th><th>Evaluación</th><th class="right">Score</th><th class="right">Equipos activos</th><th class="right">Planes</th><th class="right">Vencidos</th><th class="right">Próx. 90 días</th><th class="right">Costo ${escapeHtml(String(filters.year))}</th><th class="right">Forecast</th><th>Contratos</th><th>Acción</th></tr></thead>
          <tbody>${filtered.length ? filtered.map((metric) => `<tr>
            <td><div class="row-title">${escapeHtml(metric.name)}</div><span class="row-sub">${formatNumber(metric.events.length)} evento(s) registrados</span></td>
            <td><span class="badge ${metric.evaluation.tone}">${escapeHtml(metric.evaluation.label)}</span></td>
            <td class="right"><span class="score-pill ${thresholdTone(metric.score, 90, 75)}" title="Cumplimiento ${percentOrInfo(metric.compliance)} · trazabilidad ${percentOrInfo(metric.planTraceability)} · costos ${percentOrInfo(metric.costTraceability)}">${metric.score === null ? "S/I" : metric.score}</span></td>
            <td class="right">${formatNumber(metric.activeEquipments.length)}</td><td class="right">${formatNumber(metric.plans.length)}</td>
            <td class="right ${metric.overdue.length ? "danger" : "success"}">${formatNumber(metric.overdue.length)}</td><td class="right">${formatNumber(metric.upcoming90.length)}</td>
            <td class="right nowrap">${formatMoney(metric.annualCost)}</td><td class="right nowrap">${formatMoney(metric.forecast)}</td>
            <td>${metric.contracts.length ? metric.contracts.slice(0, 3).map((contract) => `<span class="badge neutral">${escapeHtml(contract)}</span>`).join(" ") : "Sin referencia"}</td>
            <td><button class="table-action secondary" type="button" title="Ver proveedor" data-action="view-provider" data-provider="${escapeHtml(metric.name)}">${icon("eye")}</button></td>
          </tr>`).join("") : `<tr><td colspan="11">${emptyState("No hay proveedores que coincidan con los filtros.")}</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
  if (options.restoreSearchFocus) {
    const input = $("#providerSearch");
    if (input) { input.focus(); input.setSelectionRange(options.searchCursor ?? input.value.length, options.searchCursor ?? input.value.length); }
  }
}

function openProviderModal(name) {
  const metric = providerMetric(name, state.ui.providerFilters?.year || currentBudgetYear());
  openModal(`
    <div class="modal management-modal provider-detail-modal">
      <div class="modal-header"><div><span class="eyebrow">Ficha de proveedor</span><h2>${escapeHtml(metric.name)}</h2><p>Evaluación operacional y cartera de servicios asociada.</p></div>${modalWindowControls()}</div>
      <div class="modal-body">
        <div class="modal-summary-strip">
          <div><span>Evaluación</span><strong>${metric.score === null ? "S/I" : `${metric.score}/100`}</strong></div>
          <div><span>Equipos activos</span><strong>${formatNumber(metric.activeEquipments.length)}</strong></div>
          <div><span>Servicios vencidos</span><strong>${formatNumber(metric.overdue.length)}</strong></div>
          <div><span>Forecast anual</span><strong>${formatMoney(metric.forecast)}</strong></div>
        </div>
        <div class="provider-score-breakdown">
          ${dashboardBar("Cumplimiento de servicios · 65%", metric.compliance || 0, 100, (value) => metric.compliance === null ? "Sin info" : `${value}%`, thresholdTone(metric.compliance, 95, 85))}
          ${dashboardBar("Trazabilidad de planes · 20%", metric.planTraceability || 0, 100, (value) => metric.planTraceability === null ? "Sin info" : `${value}%`, thresholdTone(metric.planTraceability, 95, 80))}
          ${dashboardBar("Costos informados · 15%", metric.costTraceability || 0, 100, (value) => metric.costTraceability === null ? "Sin info" : `${value}%`, thresholdTone(metric.costTraceability, 90, 70))}
        </div>
        <section><div class="section-title"><div><h3>Equipos administrados</h3><p>Incluye proveedor principal, planes o eventos asociados.</p></div></div><div class="table-wrap"><table><thead><tr><th>Equipo</th><th>Estado</th><th>Autorización</th><th>Área</th><th>Responsable</th><th>Acción</th></tr></thead><tbody>${metric.equipments.map((equipment) => `<tr><td><div class="row-title">${escapeHtml(equipment.name)}</div><span class="row-sub">${escapeHtml(equipment.assetTag)}</span></td><td>${statusBadge(equipment.status)}</td><td><span class="badge ${maintenanceAuthorization(equipment).tone}">${escapeHtml(maintenanceAuthorization(equipment).label)}</span></td><td>${escapeHtml(equipment.location || "Sin área")}</td><td>${escapeHtml(equipment.owner || "Sin responsable")}</td><td><button class="table-action secondary" type="button" data-action="select-equipment" data-id="${escapeHtml(equipment.id)}">${icon("eye")}</button></td></tr>`).join("") || `<tr><td colspan="6">${emptyState("Sin equipos asociados.")}</td></tr>`}</tbody></table></div></section>
        <section><div class="section-title"><div><h3>Servicios y contratos</h3><p>Próximas fechas, frecuencias y referencias contractuales.</p></div></div><div class="table-wrap"><table><thead><tr><th>Equipo</th><th>Servicio</th><th>Frecuencia</th><th>Próxima fecha</th><th>Estado</th><th>Contrato</th><th class="right">Costo</th></tr></thead><tbody>${metric.plans.map(({ equipment, plan }) => { const due = dueInfo(plan.nextDue); return `<tr><td>${escapeHtml(equipment.assetTag)}</td><td>${escapeHtml(plan.type)}</td><td>${formatFrequency(plan.frequencyMonths)}</td><td>${formatDate(plan.nextDue)}</td><td><span class="badge ${isActiveEquipment(equipment) ? due.tone : "neutral"}">${isActiveEquipment(equipment) ? escapeHtml(due.label) : "Fuera de agenda"}</span></td><td>${escapeHtml(plan.contract || "Sin referencia")}</td><td class="right">${formatMoney(plan.cost)}</td></tr>`; }).join("") || `<tr><td colspan="7">${emptyState("Sin planes asociados.")}</td></tr>`}</tbody></table></div></section>
      </div>
      <div class="modal-footer"><span class="item-meta">Evaluación calculada con datos disponibles en Supabase.</span><button class="action-button secondary" type="button" data-action="close-modal">Cerrar</button></div>
    </div>
  `);
}

function exportProvidersCsv() {
  const year = Number(state.ui.providerFilters?.year || currentBudgetYear());
  const rows = [["Proveedor", "Evaluación", "Score", "Equipos activos", "Planes", "Vencidos", "Próximos 90 días", `Costo ${year} CLP`, "Forecast CLP", "Cumplimiento %", "Trazabilidad %", "Costos informados %", "Contratos"]];
  providerNames().map((name) => providerMetric(name, year)).forEach((metric) => rows.push([metric.name, metric.evaluation.label, metric.score ?? "Sin información", metric.activeEquipments.length, metric.plans.length, metric.overdue.length, metric.upcoming90.length, metric.annualCost, metric.forecast, metric.compliance ?? "", metric.planTraceability ?? "", metric.costTraceability ?? "", metric.contracts.join(" | ")]));
  downloadFile(`proveedores-labcontrol-${year}.csv`, toCsv(rows), "text/csv;charset=utf-8");
}

function renderUsuarios() {
  const activeUser = getActiveUser();
  const adminMode = canManageUsers();
  const accessCounts = Object.keys(accessLevels).reduce((counts, level) => {
    counts[level] = state.users.filter((user) => getAccessLevel(user) === level && user.isActive !== false).length;
    return counts;
  }, {});
  $("#usuariosView").innerHTML = `
    <div class="cost-summary-grid">
      ${Object.entries(accessLevels).map(([level, access]) => `
        <div class="summary-tile">
          <span>${escapeHtml(access.label)}</span>
          <strong>${formatNumber(accessCounts[level] || 0)}</strong>
          <p class="item-meta">${escapeHtml(access.description)}</p>
        </div>
      `).join("")}
    </div>
    <div class="panel pad">
      <div class="section-title">
        <div>
          <h2>${icon("users")} ${formatNumber(state.users.length)} usuarios e invitaciones</h2>
          <p>Los permisos activos se leen desde Supabase en cada sesión.</p>
        </div>
        <div class="table-actions">
          <span class="badge info">Activo: ${escapeHtml(activeUser.name)}</span>
          ${accessBadge(activeUser)}
          ${adminMode ? `<button class="action-button" type="button" data-action="add-user">${icon("plus")} Nuevo usuario</button>` : `<span class="badge neutral">Gestión de usuarios bloqueada</span>`}
        </div>
      </div>
      <div class="user-grid">
        ${state.users.map(renderUserCard).join("")}
      </div>
    </div>
  `;
}

function renderUserCard(user) {
  const access = accessLevels[getAccessLevel(user)];
  const isActive = user.id === state.activeUserId;
  const adminMode = canManageUsers();
  const stateBadge = user.pending
    ? `<span class="badge warning">Invitación pendiente</span>`
    : user.isActive === false
      ? `<span class="badge neutral">Desactivado</span>`
      : `<span class="badge success">Activo</span>`;
  return `
    <article class="user-card ${isActive ? "active-user" : ""}">
      <div class="user-card-head">
        <div class="user-avatar">${escapeHtml(user.initials || getInitials(user.name))}</div>
        <div class="stack-inline">${stateBadge}${accessBadge(user)}</div>
      </div>
      <div class="user-name">${escapeHtml(user.name)}</div>
      <div class="item-meta">${escapeHtml(user.role)} · ${escapeHtml(user.area)}</div>
      <div class="item-meta">${escapeHtml(user.email)}</div>
      <div class="permission-list">
        ${access.permissions.map((permission) => `<span class="badge neutral">${escapeHtml(permission)}</span>`).join("")}
      </div>
      <div class="user-card-actions">
        ${isActive ? `<span class="badge info">Sesión actual</span>` : ""}
        ${adminMode ? `<button class="table-action secondary" type="button" title="Editar usuario" data-action="edit-user" data-id="${escapeHtml(user.id)}">${icon("edit")}</button>` : ""}
        ${adminMode ? `<button class="table-action danger-soft" type="button" title="Quitar usuario" data-action="delete-user" data-id="${escapeHtml(user.id)}">${icon("trash")}</button>` : ""}
      </div>
    </article>
  `;
}

function equipmentTypeUsageCount(type) {
  return state.equipments.filter((equipment) => equipment.type === type).length;
}

function renderEquipmentTypeManager(adminMode) {
  const types = equipmentTypeCatalog();
  return `
    <section class="config-card catalog-card">
      <h3>${icon("microscope")} Tipos de equipos</h3>
      ${adminMode ? `
        <form class="catalog-form" data-form="equipment-type">
          <div class="control">
            <label for="equipmentTypeName">Nuevo tipo</label>
            <input id="equipmentTypeName" name="equipmentTypeName" type="text" placeholder="Ej. Espectrofotómetro IR" autocomplete="off" required />
          </div>
          <button class="action-button" type="submit">${icon("plus")} Agregar tipo</button>
        </form>
      ` : `<span class="badge neutral">Catálogo editable solo por administradores</span>`}
      <div class="type-chip-list">
        ${types.map((type) => {
          const usage = equipmentTypeUsageCount(type);
          return `
            <span class="type-chip">
              <span>${escapeHtml(type)} <small>${formatNumber(usage)}</small></span>
              ${adminMode ? `<button class="table-action danger-soft" type="button" title="Quitar del catálogo" data-action="delete-equipment-type" data-type="${escapeHtml(type)}">${icon("trash")}</button>` : ""}
            </span>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function eventTypeUsageCount(type) {
  return state.events.filter((event) => event.type === type).length;
}

function renderEventTypeManager(adminMode) {
  const types = eventTypeCatalog();
  return `
    <section class="config-card catalog-card">
      <h3>${icon("book")} Tipos de eventos</h3>
      ${adminMode ? `
        <form class="catalog-form" data-form="event-type">
          <div class="control">
            <label for="eventTypeName">Nuevo tipo</label>
            <input id="eventTypeName" name="eventTypeName" type="text" placeholder="Ej. Validación de método" autocomplete="off" required />
          </div>
          <button class="action-button" type="submit">${icon("plus")} Agregar tipo</button>
        </form>
      ` : `<span class="badge neutral">Catálogo editable solo por administradores</span>`}
      <div class="type-chip-list">
        ${types.map((type) => `
          <span class="type-chip">
            <span>${escapeHtml(type)} <small>${formatNumber(eventTypeUsageCount(type))}</small></span>
            ${adminMode ? `<button class="table-action danger-soft" type="button" title="Quitar del catálogo" data-action="delete-event-type" data-type="${escapeHtml(type)}">${icon("trash")}</button>` : ""}
          </span>
        `).join("")}
      </div>
    </section>
  `;
}

function renderConfiguracion() {
  const exportable = canExportData();
  const adminMode = canManageUsers();
  $("#configuracionView").innerHTML = `
    <div class="config-grid">
      <section class="config-card">
        <h3>${icon("calendar")} Reglas de alerta</h3>
        <ul>
          <li>Vencido: fecha menor al día actual.</li>
          <li>Crítico: equipos de criticidad alta con actividades a 90 días.</li>
          <li>Próximo: alerta visible desde 60 días antes.</li>
          <li>Urgente: alerta amarilla desde 30 días antes.</li>
        </ul>
      </section>
      <section class="config-card">
        <h3>${icon("wrench")} Servicios gestionados</h3>
        <ul>
          ${serviceCatalog().map((type) => `<li>${escapeHtml(type)}</li>`).join("")}
          <li>Reparaciones correctivas e incidencias quedan en bitácora.</li>
        </ul>
      </section>
      <section class="config-card">
        <h3>${icon("wallet")} Modelo de costos</h3>
        <ul>
          <li>Cada plan guarda costo unitario por ejecución.</li>
          <li>El forecast se anualiza con 12 / frecuencia en meses.</li>
          <li>El presupuesto anual se edita desde Costos y se distribuye por equipo.</li>
          <li>La bitácora refleja gasto real registrado por usuario.</li>
        </ul>
      </section>
      <section class="config-card">
        <h3>${icon("shield")} Campos maestros por equipo</h3>
        <ul>
          <li>Nombre, código interno, tipo, marca, modelo y serie.</li>
          <li>Ubicación, responsable, proveedor y estado operativo.</li>
          <li>Valor comercial, fecha de valorización y criticidad.</li>
        </ul>
      </section>
      ${renderEquipmentTypeManager(adminMode)}
      ${renderEventTypeManager(adminMode)}
      <section class="config-card">
        <h3>${icon("users")} Niveles de acceso</h3>
        <ul>
          <li>Administrador: acceso total y gestión de usuarios.</li>
          <li>Editor operativo: edita equipos y eventos, sin gestionar usuarios.</li>
          <li>Solo visualización: consulta sin crear, editar, eliminar ni exportar.</li>
        </ul>
      </section>
      <section class="config-card">
        <h3>${icon("download")} Portabilidad</h3>
        <ul>
          <li>Exportación JSON completa para respaldo.</li>
          <li>Exportación CSV de inventario, bitácora y costos.</li>
          <li>Persistencia centralizada en Supabase con RLS.</li>
        </ul>
      </section>
      <section class="config-card">
        <h3>${icon("settings")} Acciones de datos</h3>
        <div class="plan-stack">
          ${exportable ? `<button class="action-button secondary" type="button" data-action="export-inventory">${icon("download")} Inventario CSV</button>` : `<span class="badge neutral">Inventario CSV bloqueado</span>`}
          ${exportable ? `<button class="action-button secondary" type="button" data-action="export-events">${icon("download")} Bitácora CSV</button>` : `<span class="badge neutral">Bitácora CSV bloqueada</span>`}
          ${adminMode ? `<button class="action-button danger-soft" type="button" data-action="reset-demo" title="Requiere clave de autorización">${icon("rotate")} Restaurar datos demo</button>` : `<span class="badge neutral">Restaurar demo solo administrador</span>`}
          ${adminMode ? `<span class="badge warning">Restauración protegida con clave</span>` : ""}
        </div>
      </section>
    </div>
  `;
}

function uniqueValues(field) {
  return [...new Set(state.equipments.map((equipment) => equipment[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function renderOptions(values, selected, labelCallback = (value) => value) {
  return values.map((value) => `
    <option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(labelCallback(value))}</option>
  `).join("");
}

function serviceCatalog(extraValues = []) {
  const plannedTypes = (state?.equipments || []).flatMap((equipment) =>
    (equipment.plans || []).map((plan) => plan.type)
  );
  return [...new Set([...serviceTypes, ...plannedTypes, ...extraValues].filter(Boolean))];
}

function equipmentTypeCatalog(extraValues = []) {
  const baseTypes = state?.equipmentTypes?.length ? state.equipmentTypes : defaultEquipmentTypes;
  return uniqueCatalogValues([...baseTypes, ...extraValues]);
}

function eventTypeCatalog(extraValues = []) {
  const savedEventTypes = (state?.events || []).map((event) => event.type);
  const configuredTypes = state?.eventTypes?.length ? state.eventTypes : eventTypes;
  return uniqueCatalogValues([...configuredTypes, ...serviceCatalog().filter((type) => !isMaintenanceExemptionService(type)), ...savedEventTypes, ...extraValues].filter(Boolean));
}

function renderServiceTypeOptions(selected, extraValues = []) {
  return renderOptions(serviceCatalog([selected, ...extraValues]), selected);
}

function statusBadge(status) {
  const tone = {
    "Operativo": "success",
    "Observación": "warning",
    "En mantenimiento": "info",
    "Fuera de servicio": "danger"
  }[status] || "neutral";
  return `<span class="badge ${tone}">${escapeHtml(status)}</span>`;
}

function criticalityBadge(criticality) {
  const tone = { Alta: "danger", Media: "warning", Baja: "success" }[criticality] || "neutral";
  return `<span class="badge ${tone}">${escapeHtml(criticality)}</span>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function openEquipmentModal(equipmentId) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const equipment = equipmentId ? getEquipment(equipmentId) : null;
  const isEdit = Boolean(equipment);
  const defaultEquipmentType = equipmentTypeCatalog()[0] || "Otro";
  const draft = equipment || {
    assetTag: suggestedAssetTag(),
    name: "",
    type: defaultEquipmentType,
    manufacturer: "",
    provider: "",
    model: "",
    serial: "",
    location: "",
    owner: getUser(state.activeUserId).name,
    status: "Operativo",
    criticality: "Media",
    acquisitionDate: dateInputValue(),
    commercialValue: 0,
    commercialValueDate: dateInputValue(),
    photoPath: "",
    photoUrl: "",
    notes: "",
    plans: []
  };
  const planDrafts = isEdit
    ? (draft.plans || [])
    : serviceTypes.filter((type) => !isMaintenanceExemptionService(type)).map((type) => defaultPlanForService(type, draft.provider));

  openModal(`
    <form class="modal" data-form="equipment" data-id="${escapeHtml(equipmentId || "")}">
      <div class="modal-header">
        <h2>${isEdit ? "Editar equipo" : "Nuevo equipo"}</h2>
        <button class="icon-button secondary" type="button" title="Cerrar" data-action="close-modal">${icon("x")}</button>
      </div>
      <div class="modal-body">
        <section class="form-section">
          <h3>Ficha técnica</h3>
          <div class="equipment-photo-editor">
            ${equipmentPhotoMarkup(draft, "equipment-edit-photo")}
            <div class="control">
              <label for="photoFile">Foto del equipo</label>
              <input id="photoFile" name="photoFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
              <span class="field-hint">Formatos JPG, PNG, WEBP o GIF. Máximo 8 MB.</span>
            </div>
          </div>
          <div class="form-grid">
            ${field("Código interno", "assetTag", draft.assetTag, "text", true)}
            ${field("Nombre del equipo", "name", draft.name, "text", true, "wide")}
            ${selectField("Tipo", "type", equipmentTypeCatalog([draft.type]), draft.type)}
            ${field("Marca", "manufacturer", draft.manufacturer, "text", true)}
            ${field("Modelo", "model", draft.model, "text", true)}
            ${field("N° de serie", "serial", draft.serial, "text", true)}
            ${field("Proveedor de marca", "provider", draft.provider, "text", true)}
            ${field("Ubicación", "location", draft.location, "text", true)}
            ${field("Responsable", "owner", draft.owner, "text", true)}
            ${selectField("Estado", "status", ["Operativo", "Observación", "En mantenimiento", "Fuera de servicio"], draft.status)}
            ${selectField("Criticidad", "criticality", ["Alta", "Media", "Baja"], draft.criticality)}
            ${field("Fecha adquisición", "acquisitionDate", draft.acquisitionDate, "date", true)}
            ${field("Valor comercial CLP", "commercialValue", draft.commercialValue, "number", true)}
            ${field("Fecha valorización", "commercialValueDate", draft.commercialValueDate, "date", true)}
            <div class="control full">
              <label for="notes">Notas operativas</label>
              <textarea id="notes" name="notes">${escapeHtml(draft.notes)}</textarea>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <h3>Plan maestro de servicio</h3>
            <button class="action-button compact secondary" type="button" data-action="add-plan-row">${icon("plus")} Agregar servicio</button>
          </div>
          <div id="planRows" class="plan-row-list">
            ${planDrafts.length ? planDrafts.map((plan, index) => renderPlanFormRow(plan, index, draft.provider)).join("") : emptyState("No hay servicios activos. Agrega solo los que apliquen a este equipo.")}
          </div>
        </section>
      </div>
      <div class="modal-footer">
        <button class="action-button secondary" type="button" data-action="close-modal">Cancelar</button>
        <button class="action-button" type="submit">${icon("save")} Guardar equipo</button>
      </div>
    </form>
  `);
}

function openEventModal(equipmentId = "", type = "", eventId = "") {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const existingEvent = eventId ? state.events.find((event) => event.id === eventId) : null;
  const selectedEquipmentId = existingEvent?.equipmentId || equipmentId;
  const selectedEquipment = selectedEquipmentId ? getEquipment(selectedEquipmentId) : null;
  const selectedType = existingEvent?.type || type || "Mantenimiento proveedor";
  const selectedPlan = selectedEquipment ? getPlanFor(selectedEquipment, selectedType) : null;
  openModal(`
    <form class="modal small" data-form="event" data-id="${escapeHtml(existingEvent?.id || "")}">
      <div class="modal-header">
        <h2>${existingEvent ? "Editar evento de equipo" : "Registrar evento de equipo"}</h2>
        <button class="icon-button secondary" type="button" title="Cerrar" data-action="close-modal">${icon("x")}</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="control wide">
            <label for="eventEquipmentId">Equipo</label>
            <select id="eventEquipmentId" name="equipmentId" required>
              <option value="">Seleccionar equipo</option>
              ${state.equipments.map((equipment) => `<option value="${escapeHtml(equipment.id)}" ${equipment.id === selectedEquipmentId ? "selected" : ""}>${escapeHtml(equipment.name)} · ${escapeHtml(equipment.assetTag)}</option>`).join("")}
            </select>
          </div>
          ${selectField("Tipo de evento", "type", eventTypeCatalog([selectedType]), selectedType)}
          ${field("Fecha", "date", existingEvent?.date || dateInputValue(), "date", true)}
          ${selectField("Resultado", "result", ["Conforme", "Observación", "No conforme", "En proceso"], existingEvent?.result || "Conforme")}
          ${field("Costo CLP", "cost", existingEvent?.cost ?? selectedPlan?.cost ?? 0, "number", true)}
          ${field("Proveedor / ejecutor", "provider", existingEvent?.provider || selectedPlan?.provider || selectedEquipment?.provider || "", "text", true)}
          ${field("Nuevo vencimiento", "nextDue", "", "date", false)}
          <div class="control full">
            <label for="eventNotes">Detalle del evento</label>
            <textarea id="eventNotes" name="notes" placeholder="Resultado, número de certificado, repuestos, observaciones, acciones pendientes..." required>${escapeHtml(existingEvent?.notes || "")}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${existingEvent ? `<button class="action-button danger-soft" type="button" data-action="delete-event-modal" data-id="${escapeHtml(existingEvent.id)}">${icon("trash")} Eliminar</button>` : "<span></span>"}
        <button class="action-button secondary" type="button" data-action="close-modal">Cancelar</button>
        <button class="action-button" type="submit">${icon("save")} ${existingEvent ? "Actualizar evento" : "Guardar evento"}</button>
      </div>
    </form>
  `);
}

function openPlanModal(equipmentId, planType = "") {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const equipment = getEquipment(equipmentId);
  if (!equipment) {
    showToast("Selecciona un equipo válido.");
    return;
  }
  const existingPlan = planType ? getPlanFor(equipment, planType) : null;
  const draft = existingPlan || defaultPlanForService(planType || "Mantenimiento proveedor", equipment.provider);
  openModal(`
    <form class="modal small" data-form="plan" data-equipment-id="${escapeHtml(equipment.id)}" data-original-type="${escapeHtml(existingPlan?.type || "")}">
      <div class="modal-header">
        <h2>${existingPlan ? "Editar servicio planificado" : "Agregar servicio planificado"}</h2>
        <button class="icon-button secondary" type="button" title="Cerrar" data-action="close-modal">${icon("x")}</button>
      </div>
      <div class="modal-body">
        <div class="item-meta">${escapeHtml(equipment.name)} · ${escapeHtml(equipment.assetTag)}</div>
        <div class="form-grid">
          ${selectField("Tipo de servicio", "type", serviceCatalog([draft.type]), draft.type)}
          <div class="control">
            <label for="frequencyMonths">Frecuencia</label>
            <select id="frequencyMonths" name="frequencyMonths" required>${renderOptions(["1", "3", "6", "12", "24", "36"], String(draft.frequencyMonths), formatFrequency)}</select>
          </div>
          ${field("Próximo vencimiento", "nextDue", draft.nextDue, "date", true)}
          ${field("Último servicio", "lastDone", draft.lastDone || "", "date", false)}
          ${field("Costo CLP", "cost", draft.cost, "number", true)}
          ${field("Proveedor", "provider", draft.provider || equipment.provider, "text", true, "wide")}
          <div class="control full">
            <label for="contract">Contrato / referencia</label>
            <input id="contract" name="contract" value="${escapeHtml(draft.contract || "")}" />
          </div>
          <div class="plan-exemption-note full" data-plan-exemption-note>
            ${icon("shield")} Esta exención autoriza el uso del equipo operativo y lo excluye de vencimientos, cumplimiento preventivo y costos proyectados. Usa la referencia para documentar la justificación.
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${existingPlan ? `<button class="action-button danger-soft" type="button" data-action="delete-plan-modal">${icon("trash")} Eliminar servicio</button>` : "<span></span>"}
        <button class="action-button secondary" type="button" data-action="close-modal">Cancelar</button>
        <button class="action-button" type="submit">${icon("save")} Guardar servicio</button>
      </div>
    </form>
  `);
}

function openUserModal(userId = "") {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede crear o editar usuarios.");
    return;
  }

  const user = userId ? findUser(userId) : null;
  const draft = user || {
    name: "",
    initials: "",
    role: "",
    area: "",
    email: "",
    accessLevel: "viewer",
    isActive: true
  };
  const accessOptions = Object.entries(accessLevels).map(([value, access]) => ({
    value,
    label: access.label
  }));
  const passwordLabel = user && user.source === "profile" ? "Nueva contraseña (opcional)" : "Contraseña inicial (opcional)";
  const passwordHelp = user && user.source === "profile"
    ? "Si dejas estos campos en blanco, la contraseña actual no cambia."
    : "Si dejas estos campos en blanco, Supabase enviará una invitación para que el usuario defina su contraseña.";

  openModal(`
    <form class="modal small" data-form="user" data-id="${escapeHtml(userId)}">
      <div class="modal-header">
        <h2>${user ? "Editar usuario" : "Nuevo usuario"}</h2>
        <button class="icon-button secondary" type="button" title="Cerrar" data-action="close-modal">${icon("x")}</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          ${field("Nombre completo", "name", draft.name, "text", true, "wide")}
          ${field("Iniciales", "initials", draft.initials || (draft.name ? getInitials(draft.name) : ""), "text", false)}
          ${field("Cargo", "role", draft.role, "text", true)}
          ${field("Área", "area", draft.area, "text", true)}
          ${field("Correo", "email", draft.email, "email", true)}
          <div class="control wide">
            <label for="accessLevel">Nivel de acceso</label>
            <select id="accessLevel" name="accessLevel" required>
              ${accessOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === draft.accessLevel ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </div>
          ${user && user.source === "profile" ? `
            <div class="control wide">
              <label for="isActive">Estado de cuenta</label>
              <select id="isActive" name="isActive">
                <option value="true" ${draft.isActive !== false ? "selected" : ""}>Activo</option>
                <option value="false" ${draft.isActive === false ? "selected" : ""}>Desactivado</option>
              </select>
            </div>
          ` : ""}
          ${remoteMode ? `
            <div class="control">
              <label for="newPassword">${escapeHtml(passwordLabel)}</label>
              <input id="newPassword" name="newPassword" type="password" minlength="8" autocomplete="new-password" />
            </div>
            <div class="control">
              <label for="confirmPassword">Confirmar contraseña</label>
              <input id="confirmPassword" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" />
            </div>
            <div class="auth-message full">${escapeHtml(passwordHelp)}</div>
          ` : ""}
          <div class="control full">
            <label>Alcance del nivel seleccionado</label>
            <div class="permission-list">
              ${Object.entries(accessLevels).map(([level, access]) => `<span class="badge ${access.tone}">${escapeHtml(access.label)}: ${escapeHtml(access.description)}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="action-button secondary" type="button" data-action="close-modal">Cancelar</button>
        <button class="action-button" type="submit">${icon("save")} Guardar usuario</button>
      </div>
    </form>
  `);
}

function field(label, name, value, type = "text", required = false, extraClass = "") {
  const inputAttrs = type === "number" ? 'min="0" step="1"' : "";
  const autocompleteMap = {
    email: "email",
    password: "current-password",
    name: "name"
  };
  const autocomplete = autocompleteMap[name] || autocompleteMap[type] || "";
  return `
    <div class="control ${extraClass}">
      <label for="${escapeHtml(name)}">${escapeHtml(label)}</label>
      <input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${required ? "required" : ""} ${autocomplete ? `autocomplete="${escapeHtml(autocomplete)}"` : ""} ${inputAttrs} />
    </div>
  `;
}

function selectField(label, name, options, selected, extraClass = "") {
  return `
    <div class="control ${extraClass}">
      <label for="${escapeHtml(name)}">${escapeHtml(label)}</label>
      <select id="${escapeHtml(name)}" name="${escapeHtml(name)}" required>${renderOptions(options, selected)}</select>
    </div>
  `;
}

function suggestedAssetTag() {
  const next = state.equipments.length + 1;
  return `LAB-EQ-${String(next).padStart(3, "0")}`;
}

function defaultPlanForService(type = "Mantenimiento proveedor", provider = "") {
  if (isMaintenanceExemptionService(type)) {
    return {
      type: NO_MAINTENANCE_SERVICE,
      frequencyMonths: 12,
      nextDue: "",
      lastDone: "",
      cost: 0,
      provider: "",
      contract: ""
    };
  }
  return {
    type,
    frequencyMonths: type === "Monitoreo" ? 3 : 12,
    nextDue: dateInputValue(),
    lastDone: "",
    cost: 0,
    provider,
    contract: ""
  };
}

function renderPlanFormRow(plan, index, fallbackProvider = "") {
  const draft = {
    ...defaultPlanForService(plan?.type || "Mantenimiento proveedor", fallbackProvider),
    ...(plan || {})
  };
  return `
    <div class="inline-grid plan-form-row" data-plan-row data-index="${escapeHtml(index)}" data-original-type="${escapeHtml(plan?.type || "")}">
      <div class="inline-field">
        <label>Servicio</label>
        <select name="plan_${escapeHtml(index)}_type" required>${renderServiceTypeOptions(draft.type)}</select>
      </div>
      <div class="inline-field">
        <label>Frecuencia</label>
        <select name="plan_${escapeHtml(index)}_frequency">${renderOptions(["1", "3", "6", "12", "24", "36"], String(draft.frequencyMonths), formatFrequency)}</select>
      </div>
      <div class="inline-field">
        <label>Próximo vencimiento</label>
        <input type="date" name="plan_${escapeHtml(index)}_nextDue" value="${escapeHtml(draft.nextDue)}" required />
      </div>
      <div class="inline-field">
        <label>Último servicio</label>
        <input type="date" name="plan_${escapeHtml(index)}_lastDone" value="${escapeHtml(draft.lastDone || "")}" />
      </div>
      <div class="inline-field">
        <label>Costo CLP</label>
        <input type="number" min="0" step="1" name="plan_${escapeHtml(index)}_cost" value="${escapeHtml(draft.cost)}" />
      </div>
      <div class="inline-field wide">
        <label>Proveedor</label>
        <input name="plan_${escapeHtml(index)}_provider" value="${escapeHtml(draft.provider || fallbackProvider || "")}" />
      </div>
      <div class="inline-field wide">
        <label>Contrato / referencia</label>
        <input name="plan_${escapeHtml(index)}_contract" value="${escapeHtml(draft.contract || "")}" />
      </div>
      <div class="inline-field plan-row-remove">
        <label>Acción</label>
        <button class="table-action danger-soft" type="button" title="Quitar servicio" data-action="remove-plan-row">${icon("trash")}</button>
      </div>
      <div class="plan-exemption-note" data-plan-exemption-note>
        ${icon("shield")} Exención documentada: sin frecuencia, vencimiento, costo ni proveedor de mantenimiento.
      </div>
    </div>
  `;
}

function syncPlanExemptionControls(container) {
  const typeSelect = container.matches?.("[data-plan-row]")
    ? $("select[name$='_type']", container)
    : $("select[name='type']", container);
  if (!typeSelect) return;
  const exempt = isMaintenanceExemptionService(typeSelect.value);
  container.classList.toggle("is-maintenance-exempt", exempt);
  const fields = container.matches?.("[data-plan-row]")
    ? ["select[name$='_frequency']", "input[name$='_nextDue']", "input[name$='_lastDone']", "input[name$='_cost']", "input[name$='_provider']"]
    : ["select[name='frequencyMonths']", "input[name='nextDue']", "input[name='lastDone']", "input[name='cost']", "input[name='provider']"];
  fields.forEach((selector) => {
    const field = $(selector, container);
    if (!field) return;
    if (exempt && field.dataset.exemptionDisabled !== "true") {
      field.dataset.exemptionDisabled = "true";
      field.dataset.previousValue = field.value;
      if (field.tagName === "SELECT") {
        field.dataset.previousOptions = field.innerHTML;
        field.innerHTML = '<option value="12">No aplica</option>';
        field.value = "12";
      } else {
        field.value = "";
      }
    } else if (!exempt && field.dataset.exemptionDisabled === "true") {
      if (field.tagName === "SELECT" && field.dataset.previousOptions) field.innerHTML = field.dataset.previousOptions;
      field.value = field.dataset.previousValue || "";
      delete field.dataset.exemptionDisabled;
      delete field.dataset.previousValue;
      delete field.dataset.previousOptions;
    }
    field.disabled = exempt;
    if (field.name.endsWith("nextDue")) field.required = !exempt;
  });
}

function syncAllPlanExemptionControls(root = document) {
  $$('[data-plan-row]', root).forEach(syncPlanExemptionControls);
  const planForm = $('form[data-form="plan"]', root);
  if (planForm) syncPlanExemptionControls(planForm);
}

function maintenancePlanConflict(plans) {
  return plans.some((plan) => isMaintenanceExemptionService(plan.type))
    && plans.some((plan) => isMaintenanceService(plan.type));
}

function appendPlanRowToModal() {
  const modalRoot = $("#modalRoot");
  const list = $("#planRows", modalRoot);
  if (!list) return;
  const selectedTypes = $$("[data-plan-row] select[name$='_type']", modalRoot).map((select) => select.value);
  const nextType = serviceTypes.find((type) => !selectedTypes.includes(type)) || "Mantenimiento proveedor";
  const provider = $("input[name='provider']", modalRoot)?.value || "";
  const index = nextId("plan").replace(/-/g, "_");
  $(".empty-state", list)?.remove();
  list.insertAdjacentHTML("beforeend", renderPlanFormRow(defaultPlanForService(nextType, provider), index, provider));
  const row = $(`[data-plan-row][data-index="${index}"]`, list);
  if (row) syncPlanExemptionControls(row);
}

function openModal(content) {
  const modalRoot = $("#modalRoot");
  modalRoot.innerHTML = content;
  modalRoot.classList.add("open");
  modalRoot.setAttribute("aria-hidden", "false");
  syncAllPlanExemptionControls(modalRoot);
  const firstInput = $("input, select, textarea, button", modalRoot);
  if (firstInput) firstInput.focus();
}

function closeModal() {
  const modalRoot = $("#modalRoot");
  modalRoot.classList.remove("open");
  modalRoot.setAttribute("aria-hidden", "true");
  modalRoot.innerHTML = "";
}

function sanitizeStorageFileName(name) {
  const safe = String(name || "equipo.jpg")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe || "equipo.jpg";
}

async function uploadEquipmentPhoto(equipmentId, file) {
  if (!file || !file.size) return "";
  if (!file.type.startsWith("image/")) throw new Error("La foto debe ser una imagen.");
  if (file.size > 8 * 1024 * 1024) throw new Error("La foto no puede superar 8 MB.");
  const path = `${equipmentId}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
  const response = await supabaseClient.storage
    .from(EQUIPMENT_PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
  if (response.error) throw response.error;
  return response.data.path;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveEquipmentForm(form) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const photoFile = formData.get("photoFile");
  const id = form.dataset.id || nextId("eq");
  const previous = getEquipment(id);
  const seenPlanTypes = new Set();
  const plans = [];
  for (const row of $$("[data-plan-row]", form)) {
    const index = row.dataset.index;
    const type = String(data[`plan_${index}_type`] || "").trim();
    if (!type) continue;
    if (seenPlanTypes.has(type)) {
      showToast(`El servicio "${type}" está duplicado en el plan maestro.`);
      return;
    }
    seenPlanTypes.add(type);
    const originalType = row.dataset.originalType || type;
    const previousPlan = previous
      ? getPlanFor(previous, originalType) || getPlanFor(previous, type)
      : null;
    const exempt = isMaintenanceExemptionService(type);
    plans.push({
      type,
      frequencyMonths: exempt ? 12 : Number(data[`plan_${index}_frequency`] || 12),
      nextDue: exempt ? "" : data[`plan_${index}_nextDue`],
      lastDone: exempt ? "" : data[`plan_${index}_lastDone`] || previousPlan?.lastDone || "",
      cost: exempt ? 0 : Number(data[`plan_${index}_cost`] || 0),
      provider: exempt ? "" : data[`plan_${index}_provider`] || data.provider,
      contract: data[`plan_${index}_contract`] || ""
    });
  }
  if (maintenancePlanConflict(plans)) {
    showToast(`"${NO_MAINTENANCE_SERVICE}" no puede coexistir con una mantención preventiva programada.`);
    return;
  }
  const missingDue = plans.find((plan) => !isMaintenanceExemptionService(plan.type) && !plan.nextDue);
  if (missingDue) {
    showToast(`Define el próximo vencimiento para "${missingDue.type}".`);
    return;
  }
  const equipment = {
    id,
    assetTag: data.assetTag.trim(),
    name: data.name.trim(),
    type: data.type,
    manufacturer: data.manufacturer.trim(),
    provider: data.provider.trim(),
    model: data.model.trim(),
    serial: data.serial.trim(),
    location: data.location.trim(),
    owner: data.owner.trim(),
    status: data.status,
    criticality: data.criticality,
    acquisitionDate: data.acquisitionDate,
    commercialValue: Number(data.commercialValue || 0),
    commercialValueDate: data.commercialValueDate,
    photoPath: previous?.photoPath || "",
    photoUrl: previous?.photoUrl || "",
    notes: data.notes.trim(),
    plans
  };

  if (remoteMode) {
    try {
      const previousPhotoPath = previous?.photoPath || "";
      if (photoFile instanceof File && photoFile.size) {
        equipment.photoPath = await uploadEquipmentPhoto(id, photoFile);
      }
      const equipmentRow = equipmentToRow(equipment);
      if (!previous) equipmentRow.created_by = authSession?.user?.id || null;
      requireSupabaseResponse(await supabaseClient.from("equipments").upsert(equipmentRow, { onConflict: "id" }));
      requireSupabaseResponse(await supabaseClient.from("service_plans").delete().eq("equipment_id", id));
      if (plans.length) {
        requireSupabaseResponse(await supabaseClient.from("service_plans").insert(plans.map((plan) => planToRow(id, plan))));
      }

      if (!previous) {
        requireSupabaseResponse(await supabaseClient.from("equipment_events").insert(eventToRow({
          id: nextId("ev"),
          equipmentId: id,
          date: dateInputValue(),
          type: "Alta inventario",
          userId: authSession?.user?.id || null,
          userName: getActiveUser().name,
          result: "Conforme",
          cost: 0,
          provider: "Interno",
          notes: "Equipo creado en el inventario maestro."
        })));
      }
      if (previousPhotoPath && equipment.photoPath && previousPhotoPath !== equipment.photoPath) {
        const removeResponse = await supabaseClient.storage
          .from(EQUIPMENT_PHOTOS_BUCKET)
          .remove([previousPhotoPath]);
        if (removeResponse.error) console.warn("No se pudo eliminar la foto anterior.", removeResponse.error);
      }

      state.ui.selectedEquipmentId = id;
      saveState();
      closeModal();
      await refreshRemoteState();
      showToast(previous ? "Equipo actualizado." : "Equipo creado y agregado al inventario.");
    } catch (error) {
      showToast(error.message || "No se pudo guardar el equipo.");
    }
    return;
  }

  if (photoFile instanceof File && photoFile.size) {
    equipment.photoPath = `local-${id}-${Date.now()}`;
    equipment.photoUrl = await readFileAsDataUrl(photoFile);
  }

  if (previous) {
    state.equipments = state.equipments.map((item) => item.id === id ? equipment : item);
    showToast("Equipo actualizado.");
  } else {
    state.equipments.push(equipment);
    state.events.unshift({
      id: nextId("ev"),
      equipmentId: id,
      date: dateInputValue(),
      type: "Alta inventario",
      userId: state.activeUserId,
      userName: getActiveUser().name,
      result: "Conforme",
      cost: 0,
      provider: "Interno",
      notes: "Equipo creado en el inventario maestro."
    });
    showToast("Equipo creado y agregado al inventario.");
  }
  state.ui.selectedEquipmentId = id;
  saveState();
  closeModal();
  renderApp();
}

async function saveEventForm(form) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const equipment = getEquipment(data.equipmentId);
  if (!equipment) {
    showToast("Selecciona un equipo válido.");
    return;
  }
  const previousEvent = form.dataset.id
    ? state.events.find((item) => item.id === form.dataset.id)
    : null;
  const event = {
    id: previousEvent?.id || nextId("ev"),
    equipmentId: data.equipmentId,
    date: data.date,
    type: data.type,
    userId: previousEvent?.userId || authSession?.user?.id || state.activeUserId,
    userName: previousEvent?.userName || getActiveUser().name,
    result: data.result,
    cost: Number(data.cost || 0),
    provider: data.provider.trim(),
    notes: data.notes.trim()
  };

  if (remoteMode) {
    try {
      if (previousEvent) {
        requireSupabaseResponse(await supabaseClient
          .from("equipment_events")
          .update(eventToRow(event))
          .eq("id", event.id));
      } else {
        requireSupabaseResponse(await supabaseClient.from("equipment_events").insert(eventToRow(event)));
      }

      const plan = getPlanFor(equipment, data.type);
      if (plan) {
        const planPatch = {
          last_done: data.date,
          updated_at: new Date().toISOString()
        };
        if (data.nextDue) planPatch.next_due = data.nextDue;
        if (event.cost > 0) planPatch.cost = event.cost;
        if (event.provider) planPatch.provider = event.provider;
        requireSupabaseResponse(await supabaseClient
          .from("service_plans")
          .update(planPatch)
          .eq("equipment_id", equipment.id)
          .eq("service_type", data.type));
      }

      let nextStatus = equipment.status;
      if (data.result === "No conforme") nextStatus = "Observación";
      if (data.result === "En proceso") nextStatus = "En mantenimiento";
      if (data.result === "Conforme" && equipment.status === "En mantenimiento") nextStatus = "Operativo";
      if (nextStatus !== equipment.status) {
        requireSupabaseResponse(await supabaseClient
          .from("equipments")
          .update({ status: nextStatus, updated_by: authSession?.user?.id || null })
          .eq("id", equipment.id));
      }

      state.ui.selectedEquipmentId = equipment.id;
      saveState();
      closeModal();
      await refreshRemoteState();
      showToast(previousEvent ? "Evento actualizado en la bitácora." : "Evento registrado en la bitácora.");
    } catch (error) {
      showToast(error.message || "No se pudo guardar el evento.");
    }
    return;
  }

  if (previousEvent) {
    state.events = state.events.map((item) => item.id === event.id ? event : item);
  } else {
    state.events.unshift(event);
  }

  const plan = getPlanFor(equipment, data.type);
  if (plan) {
    plan.lastDone = data.date;
    if (data.nextDue) plan.nextDue = data.nextDue;
    if (event.cost > 0) plan.cost = event.cost;
    if (event.provider) plan.provider = event.provider;
  }
  if (data.result === "No conforme") equipment.status = "Observación";
  if (data.result === "En proceso") equipment.status = "En mantenimiento";
  if (data.result === "Conforme" && equipment.status === "En mantenimiento") equipment.status = "Operativo";

  state.ui.selectedEquipmentId = equipment.id;
  saveState();
  closeModal();
  renderApp();
  showToast(previousEvent ? "Evento actualizado en la bitácora." : "Evento registrado en la bitácora.");
}

async function savePlanForm(form) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const equipment = getEquipment(form.dataset.equipmentId);
  if (!equipment) {
    showToast("Selecciona un equipo válido.");
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const originalType = form.dataset.originalType || "";
  const type = String(data.type || "").trim();
  if (!type) {
    showToast("Selecciona el tipo de servicio.");
    return;
  }
  const duplicate = (equipment.plans || []).some((plan) => plan.type === type && plan.type !== originalType);
  if (duplicate) {
    showToast(`El servicio "${type}" ya existe para este equipo.`);
    return;
  }

  const otherPlans = (equipment.plans || []).filter((item) => item.type !== originalType);
  if ((isMaintenanceExemptionService(type) && otherPlans.some((item) => isMaintenanceService(item.type)))
    || (isMaintenanceService(type) && otherPlans.some((item) => isMaintenanceExemptionService(item.type)))) {
    showToast(`"${NO_MAINTENANCE_SERVICE}" no puede coexistir con una mantención preventiva programada.`);
    return;
  }
  if (!isMaintenanceExemptionService(type) && !data.nextDue) {
    showToast("Define el próximo vencimiento del servicio.");
    return;
  }

  const exempt = isMaintenanceExemptionService(type);
  const plan = {
    type,
    frequencyMonths: exempt ? 12 : Number(data.frequencyMonths || 12),
    nextDue: exempt ? "" : data.nextDue,
    lastDone: exempt ? "" : data.lastDone || "",
    cost: exempt ? 0 : Number(data.cost || 0),
    provider: exempt ? "" : String(data.provider || "").trim(),
    contract: data.contract.trim()
  };

  if (remoteMode) {
    try {
      if (originalType && originalType !== type) {
        requireSupabaseResponse(await supabaseClient
          .from("service_plans")
          .delete()
          .eq("equipment_id", equipment.id)
          .eq("service_type", originalType));
      }
      requireSupabaseResponse(await supabaseClient
        .from("service_plans")
        .upsert(planToRow(equipment.id, plan), { onConflict: "equipment_id,service_type" }));
      closeModal();
      await refreshRemoteState();
      showToast(originalType ? "Servicio del plan maestro actualizado." : "Servicio agregado al plan maestro.");
    } catch (error) {
      showToast(error.message || "No se pudo guardar el servicio.");
    }
    return;
  }

  if (originalType) {
    equipment.plans = (equipment.plans || []).map((item) => item.type === originalType ? plan : item);
  } else {
    equipment.plans = [...(equipment.plans || []), plan];
  }
  saveState();
  closeModal();
  renderApp();
  showToast(originalType ? "Servicio del plan maestro actualizado." : "Servicio agregado al plan maestro.");
}

async function saveBudgetForm(form) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const budget = normalizeBudgetSettings({
    year: Number(data.budgetYear || currentBudgetYear()),
    annualBudget: Number(data.annualBudget || 0),
    allocationMethod: data.allocationMethod || "forecast_weighted",
    notes: String(data.budgetNotes || "").trim()
  });

  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient
        .from("labcontrol_budgets")
        .upsert(budgetToRow(budget), { onConflict: "budget_year" }));
      state.budget = budget;
      state.ui.costBudgetYear = budget.year;
      saveState();
      await refreshRemoteState();
      showToast("Presupuesto anual actualizado.");
    } catch (error) {
      showToast(error.message || "No se pudo guardar el presupuesto.");
    }
    return;
  }

  state.budget = budget;
  state.budgets = [...(state.budgets || []).filter((item) => Number(item.year) !== budget.year), budget];
  state.ui.costBudgetYear = budget.year;
  saveState();
  renderApp();
  showToast("Presupuesto anual actualizado.");
}

async function deleteEvent(id) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  const equipment = getEquipment(event.equipmentId);
  const confirmed = confirm(`¿Eliminar este ingreso de bitácora de ${equipment?.name || "equipo eliminado"}?`);
  if (!confirmed) return;

  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient.from("equipment_events").delete().eq("id", id));
      closeModal();
      await refreshRemoteState();
      showToast("Ingreso de bitácora eliminado.");
    } catch (error) {
      showToast(error.message || "No se pudo eliminar el ingreso.");
    }
    return;
  }

  state.events = state.events.filter((item) => item.id !== id);
  closeModal();
  saveState();
  renderApp();
  showToast("Ingreso de bitácora eliminado.");
}

async function deletePlan(equipmentId, planType) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const equipment = getEquipment(equipmentId);
  const plan = equipment ? getPlanFor(equipment, planType) : null;
  if (!equipment || !plan) return;
  const confirmed = confirm(`¿Eliminar "${plan.type}" del plan maestro de ${equipment.name}?`);
  if (!confirmed) return;

  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient
        .from("service_plans")
        .delete()
        .eq("equipment_id", equipment.id)
        .eq("service_type", plan.type));
      closeModal();
      await refreshRemoteState();
      showToast("Servicio eliminado del plan maestro.");
    } catch (error) {
      showToast(error.message || "No se pudo eliminar el servicio.");
    }
    return;
  }

  equipment.plans = (equipment.plans || []).filter((item) => item.type !== plan.type);
  closeModal();
  saveState();
  renderApp();
  showToast("Servicio eliminado del plan maestro.");
}

async function saveUserForm(form) {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede gestionar usuarios.");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const id = form.dataset.id || nextId("u");
  const previous = findUser(id);
  const newPassword = String(data.newPassword || "");
  const confirmPassword = String(data.confirmPassword || "");
  const nextAccessLevel = accessLevels[data.accessLevel] ? data.accessLevel : "viewer";
  const adminCount = state.users.filter((user) => getAccessLevel(user) === "admin").length;

  if (newPassword || confirmPassword) {
    if (newPassword.length < 8) {
      showToast("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Las contraseñas no coinciden.");
      return;
    }
  }

  if (previous && getAccessLevel(previous) === "admin" && nextAccessLevel !== "admin" && adminCount <= 1) {
    showToast("Debe existir al menos un administrador.");
    return;
  }

  const user = {
    id,
    name: data.name.trim(),
    initials: (data.initials.trim() || getInitials(data.name)).slice(0, 3).toUpperCase(),
    role: data.role.trim(),
    area: data.area.trim(),
    email: data.email.trim().toLowerCase(),
    accessLevel: nextAccessLevel,
    isActive: data.isActive !== "false",
    permissions: accessLevels[nextAccessLevel].permissions
  };

  if (remoteMode) {
    try {
      const existingProfile = state.users.find((item) =>
        item.source === "profile" &&
        item.email.toLowerCase() === user.email.toLowerCase()
      );
      const targetProfile = previous?.source === "profile" ? previous : existingProfile;
      const activeAdmins = state.users.filter((item) =>
        item.source === "profile" &&
        item.isActive !== false &&
        getAccessLevel(item) === "admin"
      );

      if (
        targetProfile &&
        getAccessLevel(targetProfile) === "admin" &&
        (nextAccessLevel !== "admin" || user.isActive === false) &&
        activeAdmins.length <= 1
      ) {
        showToast("Debe existir al menos un administrador activo.");
        return;
      }

      const result = await invokeAdminUserCommand(adminUserPayload(user, previous, targetProfile, newPassword));
      const messages = {
        user_created: "Usuario creado con contraseña inicial.",
        profile_updated: newPassword ? "Usuario actualizado y contraseña cambiada." : "Usuario actualizado.",
        invite_sent: "Invitación enviada por correo.",
        invite_updated: "Invitación actualizada."
      };
      showToast(messages[result.mode] || "Usuario guardado.");

      closeModal();
      await refreshRemoteState();
    } catch (error) {
      showToast(error.message || "No se pudo guardar el usuario.");
    }
    return;
  }

  if (previous) {
    state.users = state.users.map((item) => item.id === id ? user : item);
    state.events = state.events.map((event) => event.userId === id ? { ...event, userName: user.name } : event);
    showToast("Usuario actualizado.");
  } else {
    state.users.push(user);
    showToast("Usuario creado.");
  }

  saveState();
  closeModal();
  renderApp();
}

async function deleteUser(id) {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede quitar usuarios.");
    return;
  }
  const user = findUser(id);
  if (!user) return;
  if (user.id === state.activeUserId) {
    showToast("No puedes quitar tu propia sesión activa.");
    return;
  }
  if (
    getAccessLevel(user) === "admin" &&
    state.users.filter((item) =>
      item.source === "profile" &&
      item.isActive !== false &&
      getAccessLevel(item) === "admin"
    ).length <= 1
  ) {
    showToast("Debe existir al menos un administrador.");
    return;
  }
  const confirmed = confirm(`¿Quitar a ${user.name}? Sus eventos conservarán el nombre en la bitácora.`);
  if (!confirmed) return;

  if (remoteMode) {
    try {
      if (user.source === "invite") {
        requireSupabaseResponse(await supabaseClient
          .from("app_user_invites")
          .delete()
          .eq("id", user.inviteId));
      } else {
        requireSupabaseResponse(await supabaseClient
          .from("profiles")
          .update({ is_active: false })
          .eq("id", user.id));
      }
      await refreshRemoteState();
      showToast("Usuario quitado.");
    } catch (error) {
      showToast(error.message || "No se pudo quitar el usuario.");
    }
    return;
  }

  state.events = state.events.map((event) => event.userId === id ? { ...event, userName: user.name } : event);
  state.users = state.users.filter((item) => item.id !== id);
  saveState();
  renderApp();
  showToast("Usuario quitado.");
}

async function saveEquipmentTypeForm(form) {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede administrar tipos de equipos.");
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const name = cleanCatalogName(data.equipmentTypeName);
  if (!name) {
    showToast("Ingresa un tipo de equipo válido.");
    return;
  }
  const duplicate = (state.equipmentTypes || []).some((type) =>
    type.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")
  );
  if (duplicate) {
    showToast("Ese tipo de equipo ya existe en el catálogo.");
    return;
  }

  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient
        .from("equipment_type_catalog")
        .upsert({
          name,
          sort_order: ((state.equipmentTypes || []).length + 1) * 10,
          is_active: true,
          created_by: authSession?.user?.id || null
        }, { onConflict: "name" }));
      form.reset();
      await refreshRemoteState();
      showToast("Tipo de equipo agregado.");
    } catch (error) {
      showToast(error.message || "No se pudo agregar el tipo de equipo.");
    }
    return;
  }

  state.equipmentTypes = equipmentTypeCatalog([name]);
  form.reset();
  saveState();
  renderConfiguracion();
  showToast("Tipo de equipo agregado.");
}

async function deleteEquipmentType(type) {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede administrar tipos de equipos.");
    return;
  }
  const name = cleanCatalogName(type);
  if (!name) return;
  const usage = equipmentTypeUsageCount(name);
  const confirmed = confirm(
    usage
      ? `¿Quitar "${name}" del catálogo? ${usage} equipo(s) existente(s) conservarán este tipo.`
      : `¿Quitar "${name}" del catálogo?`
  );
  if (!confirmed) return;

  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient
        .from("equipment_type_catalog")
        .delete()
        .eq("name", name));
      if (state.ui.equipmentFilters.type === name) state.ui.equipmentFilters.type = "Todos";
      await refreshRemoteState();
      showToast("Tipo de equipo quitado del catálogo.");
    } catch (error) {
      showToast(error.message || "No se pudo quitar el tipo de equipo.");
    }
    return;
  }

  state.equipmentTypes = (state.equipmentTypes || []).filter((item) =>
    item.toLocaleLowerCase("es") !== name.toLocaleLowerCase("es")
  );
  if (state.ui.equipmentFilters.type === name) state.ui.equipmentFilters.type = "Todos";
  saveState();
  renderConfiguracion();
  showToast("Tipo de equipo quitado del catálogo.");
}

async function saveEventTypeForm(form) {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede administrar tipos de eventos.");
    return;
  }
  const name = cleanCatalogName(new FormData(form).get("eventTypeName"));
  if (!name) {
    showToast("Ingresa un tipo de evento válido.");
    return;
  }
  if (eventTypeCatalog().some((type) => type.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) {
    showToast("Ese tipo de evento ya existe en el catálogo.");
    return;
  }
  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient.from("event_type_catalog").upsert({
        name,
        sort_order: ((state.eventTypes || []).length + 1) * 10,
        is_active: true,
        created_by: authSession?.user?.id || null
      }, { onConflict: "name" }));
      await refreshRemoteState();
      showToast("Tipo de evento agregado.");
    } catch (error) {
      showToast(error.message || "No se pudo agregar el tipo de evento.");
    }
    return;
  }
  state.eventTypes = eventTypeCatalog([name]);
  saveState();
  renderConfiguracion();
  showToast("Tipo de evento agregado.");
}

async function deleteEventType(type) {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede administrar tipos de eventos.");
    return;
  }
  const name = cleanCatalogName(type);
  if (!name) return;
  const usage = eventTypeUsageCount(name);
  if (!confirm(usage ? `¿Quitar "${name}" del catálogo? ${usage} registro(s) histórico(s) conservarán este tipo.` : `¿Quitar "${name}" del catálogo?`)) return;
  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient.from("event_type_catalog").delete().eq("name", name));
      if (state.ui.eventFilters.type === name) state.ui.eventFilters.type = "Todos";
      await refreshRemoteState();
      showToast("Tipo de evento quitado del catálogo.");
    } catch (error) {
      showToast(error.message || "No se pudo quitar el tipo de evento.");
    }
    return;
  }
  state.eventTypes = (state.eventTypes || []).filter((item) => item.toLocaleLowerCase("es") !== name.toLocaleLowerCase("es"));
  if (state.ui.eventFilters.type === name) state.ui.eventFilters.type = "Todos";
  saveState();
  renderConfiguracion();
  showToast("Tipo de evento quitado del catálogo.");
}

async function deleteEquipment(id) {
  if (!canEditData()) {
    showToast("Tu nivel de acceso solo permite visualizar.");
    return;
  }
  const equipment = getEquipment(id);
  if (!equipment) return;
  const confirmed = confirm(`¿Eliminar ${equipment.name}? También se eliminarán sus eventos de bitácora.`);
  if (!confirmed) return;

  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient.from("equipments").delete().eq("id", id));
      if (equipment.photoPath) {
        const removeResponse = await supabaseClient.storage
          .from(EQUIPMENT_PHOTOS_BUCKET)
          .remove([equipment.photoPath]);
        if (removeResponse.error) console.warn("No se pudo eliminar la foto del equipo.", removeResponse.error);
      }
      state.ui.selectedEquipmentId = state.equipments.find((item) => item.id !== id)?.id || "";
      saveState();
      await refreshRemoteState();
      showToast("Equipo eliminado.");
    } catch (error) {
      showToast(error.message || "No se pudo eliminar el equipo.");
    }
    return;
  }

  state.equipments = state.equipments.filter((item) => item.id !== id);
  state.events = state.events.filter((event) => event.equipmentId !== id);
  state.ui.selectedEquipmentId = state.equipments[0]?.id || "";
  saveState();
  renderApp();
  showToast("Equipo eliminado.");
}

function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function equipmentExportFilterSummary() {
  const filters = state.ui.equipmentFilters;
  const labels = [
    filters.search ? `Búsqueda: ${filters.search}` : "",
    filters.type !== "Todos" ? `Tipo: ${filters.type}` : "",
    filters.status !== "Todos" ? `Estado: ${filters.status}` : "",
    filters.criticality !== "Todos" ? `Criticidad: ${filters.criticality}` : "",
    filters.frequency !== "Todos" ? `Frecuencia: ${filters.frequency}` : "",
    filters.authorization !== "Todos" ? `Autorización: ${filters.authorization}` : ""
  ].filter(Boolean);
  return labels.length ? labels.join(" | ") : "Sin filtros aplicados";
}

function equipmentExportData() {
  return getFilteredEquipments().map((equipment) => {
    const authorization = maintenanceAuthorization(equipment);
    const nextPlan = getSoonestPlan(equipment);
    return {
      equipment,
      authorization,
      nextPlan,
      inventory: {
        "Código": equipment.assetTag || "",
        "Equipo": equipment.name || "",
        "Tipo": equipment.type || "",
        "Marca": equipment.manufacturer || "",
        "Modelo": equipment.model || "",
        "N° de serie": equipment.serial || "",
        "Ubicación": equipment.location || "",
        "Responsable": equipment.owner || "",
        "Estado": equipment.status || "",
        "Clasificación": equipmentUseClassification(equipment).label,
        "Autorización": authorization.label,
        "Detalle autorización": authorization.detail,
        "Criticidad": equipment.criticality || "",
        "Fecha adquisición": equipment.acquisitionDate || "",
        "Valor comercial CLP": Number(equipment.commercialValue || 0),
        "Fecha valorización": equipment.commercialValueDate || "",
        "Proveedor de marca": equipment.provider || "",
        "Frecuencia(s)": equipmentFrequencyValues(equipment).join(", ") || "Sin plan",
        "Próximo servicio": nextPlan?.type || (hasMaintenanceExemption(equipment) ? NO_MAINTENANCE_SERVICE : "Sin plan"),
        "Próximo vencimiento": nextPlan?.nextDue || "",
        "Cantidad de planes": (equipment.plans || []).length,
        "Notas": equipment.notes || ""
      }
    };
  });
}

function exportEquipmentsXlsx() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  if (!window.XLSX) {
    showToast("No se pudo cargar el generador de Excel. Revisa tu conexión e inténtalo nuevamente.");
    return;
  }
  const data = equipmentExportData();
  if (!data.length) {
    showToast("No hay equipos para exportar con los filtros actuales.");
    return;
  }

  const inventoryRows = data.map((item) => item.inventory);
  const planRows = data.flatMap(({ equipment }) => (equipment.plans || []).map((plan) => ({
    "Código": equipment.assetTag || "",
    "Equipo": equipment.name || "",
    "Estado": equipment.status || "",
    "Servicio": plan.type || "",
    "Frecuencia (meses)": isMaintenanceExemptionService(plan.type) ? "" : Number(plan.frequencyMonths || 0),
    "Frecuencia": isMaintenanceExemptionService(plan.type) ? "No aplica" : formatFrequency(plan.frequencyMonths),
    "Última ejecución": plan.lastDone || "",
    "Próximo vencimiento": isMaintenanceExemptionService(plan.type) ? "" : plan.nextDue || "",
    "Estado del plazo": isMaintenanceExemptionService(plan.type) ? "Exención vigente" : dueInfo(plan.nextDue).label,
    "Costo CLP": Number(plan.cost || 0),
    "Proveedor": plan.provider || "",
    "Contrato": plan.contract || ""
  })));
  const summaryRows = [
    ["LabControl-EquiposHG - Inventario de equipos"],
    ["Generado", new Date().toLocaleString("es-CL")],
    ["Filtros", equipmentExportFilterSummary()],
    ["Equipos exportados", data.length],
    ["Valor total CLP", data.reduce((sum, item) => sum + Number(item.equipment.commercialValue || 0), 0)]
  ];

  const workbook = XLSX.utils.book_new();
  const inventorySheet = XLSX.utils.json_to_sheet(inventoryRows);
  const plansSheet = planRows.length ? XLSX.utils.json_to_sheet(planRows) : XLSX.utils.aoa_to_sheet([["Sin planes de servicio para los equipos filtrados"]]);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  inventorySheet["!autofilter"] = { ref: inventorySheet["!ref"] };
  inventorySheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  inventorySheet["!cols"] = Object.keys(inventoryRows[0]).map((key) => ({ wch: Math.min(42, Math.max(12, key.length + 2)) }));
  if (planRows.length) {
    plansSheet["!autofilter"] = { ref: plansSheet["!ref"] };
    plansSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    plansSheet["!cols"] = Object.keys(planRows[0]).map((key) => ({ wch: Math.min(34, Math.max(12, key.length + 2)) }));
  }
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
  XLSX.utils.book_append_sheet(workbook, inventorySheet, "Equipos");
  XLSX.utils.book_append_sheet(workbook, plansSheet, "Planes de servicio");
  XLSX.writeFile(workbook, `equipos-labcontrol-${dateInputValue()}.xlsx`);
  showToast(`${formatNumber(data.length)} equipo(s) exportado(s) a Excel.`);
}

function exportEquipmentsPdf() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  const data = equipmentExportData();
  if (!data.length) {
    showToast("No hay equipos para exportar con los filtros actuales.");
    return;
  }
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) {
    showToast("No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo nuevamente.");
    return;
  }

  const documentPdf = new JsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
  const generatedAt = new Date().toLocaleString("es-CL");
  const totalValue = data.reduce((sum, item) => sum + Number(item.equipment.commercialValue || 0), 0);
  documentPdf.setFillColor(228, 29, 45);
  documentPdf.rect(0, 0, 297, 18, "F");
  documentPdf.setTextColor(255, 255, 255);
  documentPdf.setFont("helvetica", "bold");
  documentPdf.setFontSize(16);
  documentPdf.text("LabControl-EquiposHG", 12, 11);
  documentPdf.setFontSize(9);
  documentPdf.text("Inventario de equipos", 285, 11, { align: "right" });
  documentPdf.setTextColor(38, 38, 38);
  documentPdf.setFont("helvetica", "normal");
  documentPdf.setFontSize(8);
  documentPdf.text(`Generado: ${generatedAt} | Equipos: ${data.length} | Valor total: ${formatMoney(totalValue)}`, 12, 24);
  const filterText = `Filtros: ${equipmentExportFilterSummary()}`;
  const filterLines = documentPdf.splitTextToSize(filterText, 273);
  documentPdf.text(filterLines, 12, 29);

  documentPdf.autoTable({
    startY: 31 + (filterLines.length * 4),
    head: [["Código", "Equipo", "Tipo", "Marca / modelo", "Serie", "Área", "Estado", "Autorización", "Crit.", "Próximo servicio", "Vencimiento", "Valor CLP"]],
    body: data.map(({ equipment, authorization, nextPlan }) => [
      equipment.assetTag || "",
      equipment.name || "",
      equipment.type || "",
      [equipment.manufacturer, equipment.model].filter(Boolean).join(" "),
      equipment.serial || "",
      equipment.location || "",
      equipment.status || "",
      authorization.label,
      equipment.criticality || "",
      nextPlan?.type || (hasMaintenanceExemption(equipment) ? NO_MAINTENANCE_SERVICE : "Sin plan"),
      nextPlan?.nextDue ? formatDate(nextPlan.nextDue) : "No aplica",
      Number(equipment.commercialValue || 0).toLocaleString("es-CL")
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 6.5, cellPadding: 1.7, textColor: [45, 45, 45], lineColor: [225, 225, 225], lineWidth: 0.15, overflow: "linebreak" },
    headStyles: { fillColor: [58, 58, 58], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    columnStyles: {
      0: { cellWidth: 19 }, 1: { cellWidth: 31 }, 2: { cellWidth: 20 }, 3: { cellWidth: 29 },
      4: { cellWidth: 23 }, 5: { cellWidth: 23 }, 6: { cellWidth: 20 }, 7: { cellWidth: 24 },
      8: { cellWidth: 12 }, 9: { cellWidth: 28 }, 10: { cellWidth: 20 }, 11: { cellWidth: 23, halign: "right" }
    },
    margin: { left: 8, right: 8 },
    didDrawPage: (hookData) => {
      const page = documentPdf.internal.getNumberOfPages();
      documentPdf.setFontSize(7);
      documentPdf.setTextColor(115, 115, 115);
      documentPdf.text(`Página ${page}`, 289, 205, { align: "right" });
      documentPdf.text("LabControl-EquiposHG · Gestión de Equipos", 8, 205);
    }
  });
  documentPdf.save(`equipos-labcontrol-${dateInputValue()}.pdf`);
  showToast(`${formatNumber(data.length)} equipo(s) exportado(s) a PDF.`);
}

function exportInventoryCsv() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  const rows = [
    ["Código", "Equipo", "Tipo", "Marca", "Modelo", "Serie", "Ubicación", "Responsable", "Estado", "Clasificación", "Autorización", "Detalle autorización", "Criticidad", "Valor CLP", "Proveedor"]
  ];
  state.equipments.forEach((equipment) => {
    const authorization = maintenanceAuthorization(equipment);
    rows.push([
      equipment.assetTag,
      equipment.name,
      equipment.type,
      equipment.manufacturer,
      equipment.model,
      equipment.serial,
      equipment.location,
      equipment.owner,
      equipment.status,
      equipmentUseClassification(equipment).label,
      authorization.label,
      authorization.detail,
      equipment.criticality,
      equipment.commercialValue,
      equipment.provider
    ]);
  });
  downloadFile("inventario-equipos-laboratorio.csv", toCsv(rows), "text/csv;charset=utf-8");
}

function exportEventsCsv() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  const rows = [["Fecha", "Equipo", "Código", "Tipo", "Usuario", "Resultado", "Costo CLP", "Proveedor", "Notas"]];
  getFilteredEvents().forEach((event) => {
    const equipment = getEquipment(event.equipmentId);
    rows.push([
      event.date,
      equipment?.name || "Equipo eliminado",
      equipment?.assetTag || "",
      event.type,
      getEventUserName(event),
      event.result,
      event.cost,
      event.provider,
      event.notes
    ]);
  });
  downloadFile("bitacora-equipos-laboratorio.csv", toCsv(rows), "text/csv;charset=utf-8");
}

function exportCostsCsv() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  const metrics = getMetrics();
  const budget = getBudgetSettings();
  const allocationByEquipment = new Map(budgetAllocationRows(state.equipments, metrics.annualBudget, budget.allocationMethod, metrics.budgetYear).map((row) => [row.equipment.id, row]));
  const rows = [
    ["LabControl-EquiposHG - Costos"],
    ["Año presupuesto", budget.year, "Presupuesto anual CLP", metrics.annualBudget || "", "Método distribución", budgetAllocationLabel(budget.allocationMethod)],
    ["Forecast anualizado CLP", metrics.annualizedForecast, "Gasto real YTD CLP", metrics.ytdSpent, "Disponible CLP", metrics.budgetRemaining ?? ""],
    [],
    ["Equipo", "Código", "Área", "Presupuesto asignado CLP", "Forecast equipo CLP", "Gasto YTD CLP", "Servicio", "Frecuencia meses", "Frecuencia", "Próximo vencimiento", "Costo ejecución CLP", "Costo anualizado CLP", "Proveedor"]
  ];
  state.equipments.forEach((equipment) => {
    const allocation = allocationByEquipment.get(equipment.id);
    (equipment.plans || []).forEach((plan) => {
      rows.push([
        equipment.name,
        equipment.assetTag,
        equipment.location,
        allocation?.allocated ?? "",
        allocation?.forecast ?? "",
        allocation?.actual ?? "",
        plan.type,
        isMaintenanceExemptionService(plan.type) ? "" : plan.frequencyMonths,
        isMaintenanceExemptionService(plan.type) ? "No aplica" : formatFrequency(plan.frequencyMonths),
        isMaintenanceExemptionService(plan.type) ? "No aplica" : plan.nextDue,
        isMaintenanceExemptionService(plan.type) ? 0 : plan.cost,
        annualizedCost(plan),
        isMaintenanceExemptionService(plan.type) ? "No aplica" : plan.provider
      ]);
    });
  });
  downloadFile("costos-anualizados-equipos-laboratorio.csv", toCsv(rows), "text/csv;charset=utf-8");
}

function exportDashboardCsv() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  const context = dashboardContext();
  const metrics = dashboardMetrics(context);
  const alerts = dashboardAlerts(context, metrics);
  const rows = [
    ["LabControl-EquiposHG - Dashboard filtrado"],
    ["Periodo", context.filters.period, "Flota activa", context.activeEquipments.length, "Inventario filtrado", context.equipments.length, "Eventos", context.events.length, "Generado", new Date().toISOString()],
    [],
    ["Indicador", "Valor"],
    ["Total equipos activos", metrics.total],
    ["Equipos operativos", metrics.available],
    ["Equipos autorizados", metrics.authorized],
    ["Autorizados por mantención vigente", metrics.authorizedByMaintenance],
    ["Autorizados por exención", metrics.exemptAuthorized],
    ["Operativos autorizados %", metrics.operativeMaintainedPercent ?? "Sin información suficiente"],
    [`Cumplimiento anual mantención ${metrics.annualMaintenance.year} %`, metrics.annualMaintenance.percent ?? "Sin información suficiente"],
    ["Fuera de servicio", metrics.out],
    ["En mantenimiento", metrics.maintenance],
    ["Disponibilidad operacional %", metrics.availability ?? "Sin información suficiente"],
    ["Cumplimiento calibración %", metrics.calibrationCompliance ?? "Sin información suficiente"],
    ["Cumplimiento mantenimiento preventivo %", metrics.maintenanceCompliance ?? "Sin información suficiente"],
    ["Calibraciones vencidas", metrics.calibrationOverdue],
    ["Mantenimientos vencidos", metrics.maintenanceOverdue],
    ["Actividades próximas 30 días", metrics.due30],
    ["Costo mantenimiento CLP", metrics.cost],
    ["Presupuesto anual CLP", metrics.annualBudget || "Sin información suficiente"],
    ["Forecast anualizado CLP", metrics.annualizedForecast],
    ["Presupuesto periodo CLP", metrics.periodBudget ?? "Sin información suficiente"],
    ["Variación presupuesto CLP", metrics.budgetVariance ?? "Sin información suficiente"],
    ["Críticos alto riesgo", metrics.highRiskCritical],
    [],
    ["Atención requerida", "Equipo", "Código", "Área", "Criticidad", "Responsable", "Fecha límite", "Detalle"]
  ];
  alerts.forEach((alert) => {
    rows.push([
      alert.type,
      alert.equipment.name,
      alert.equipment.assetTag,
      alert.equipment.location || "Sin área",
      alert.equipment.criticality,
      alert.equipment.owner || "Sin responsable",
      alert.due || "",
      alert.detail
    ]);
  });
  rows.push([], ["Salud de los equipos"], ["Código", "Nombre", "Área", "Criticidad", "Estado", "Clasificación", "Autorización", "Health Score", "Última calibración", "Próxima calibración", "Último mantenimiento", "Próximo mantenimiento", "Fallas 12m", "Horas detención", "Costo acumulado CLP", "Responsable", "Tendencia", "Detalle cálculo"]);
  metrics.healthRows.forEach((row) => {
    rows.push([
      row.equipment.assetTag,
      row.equipment.name,
      row.equipment.location || "Sin área",
      row.equipment.criticality,
      row.equipment.status,
      equipmentUseClassification(row.equipment).label,
      maintenanceAuthorization(row.equipment).label,
      row.score,
      row.lastCalibration,
      row.nextCalibration,
      row.lastMaintenance,
      row.nextMaintenance,
      row.failures12,
      row.downtime ?? "Sin información suficiente",
      row.cost12,
      row.equipment.owner || "Sin responsable",
      row.trend,
      row.tooltip
    ]);
  });
  downloadFile("dashboard-labcontrol-equiposhg.csv", toCsv(rows), "text/csv;charset=utf-8");
}

function printDashboardPdf() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  showToast("Se abrirá el diálogo de impresión. Elige Guardar como PDF.");
  window.setTimeout(() => window.print(), 250);
}

function exportAllJson() {
  if (!canExportData()) {
    showToast("Tu nivel de acceso no permite exportar datos.");
    return;
  }
  downloadFile("respaldo-labcontrol.json", JSON.stringify(state, null, 2), "application/json;charset=utf-8");
}

function authorizeDemoReset() {
  const key = prompt("Clave de autorización para restaurar datos demo:");
  if (key === null) return false;
  if (key.trim() !== DEMO_RESET_KEY) {
    showToast("Clave de autorización incorrecta.");
    return false;
  }
  const phrase = prompt('Para confirmar, escribe exactamente: RESTAURAR DEMO');
  if (phrase === null) return false;
  if (phrase.trim().toUpperCase() !== "RESTAURAR DEMO") {
    showToast("Restauración cancelada por confirmación inválida.");
    return false;
  }
  return true;
}

async function resetDemoData() {
  if (!canManageUsers()) {
    showToast("Solo un administrador puede restaurar la demo.");
    return;
  }
  if (!authorizeDemoReset()) return;
  const confirmed = confirm("¿Restaurar los datos demo? Se reemplazarán equipos, planes y bitácora.");
  if (!confirmed) return;
  if (remoteMode) {
    try {
      requireSupabaseResponse(await supabaseClient.from("equipment_events").delete().neq("id", ""));
      requireSupabaseResponse(await supabaseClient.from("service_plans").delete().neq("equipment_id", ""));
      requireSupabaseResponse(await supabaseClient.from("equipments").delete().neq("id", ""));
      await seedRemoteDemoData();
      await refreshRemoteState();
      showToast("Datos demo restaurados.");
    } catch (error) {
      showToast(error.message || "No se pudo restaurar la demo.");
    }
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  state = normalizeState(createSeedData());
  saveState();
  renderApp();
  showToast("Datos demo restaurados.");
}

function viewEquipmentEvents(id) {
  const equipment = getEquipment(id);
  if (!equipment) return;
  state.ui.eventFilters.equipmentId = id;
  state.ui.eventFilters.type = "Todos";
  state.ui.selectedEquipmentId = id;
  saveState();
  setActiveView("bitacora");
}

function shiftCalendar(months) {
  state.ui.calendarMonthOffset = Number(state.ui.calendarMonthOffset || 0) + months;
  saveState();
  renderApp();
}

function handleMainClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    const row = event.target.closest("tr[data-equipment-id]");
    if (row && state.ui.activeView === "equipos") {
      state.ui.selectedEquipmentId = row.dataset.equipmentId;
      saveState();
      openEquipmentDetailModal(row.dataset.equipmentId);
    }
    return;
  }
  const { action, id, type } = actionTarget.dataset;
  const actionMap = {
    "go-calendar": () => setActiveView("calendario"),
    "open-kpi-details": () => openKpiDetailModal(actionTarget.dataset.kpiId),
    "dashboard-shortcut": () => handleDashboardShortcut(actionTarget),
    "toggle-dashboard-section": () => toggleDashboardSection(actionTarget.dataset.section),
    "toggle-dashboard-filters": () => {
      state.ui.dashboardFiltersVisible = !state.ui.dashboardFiltersVisible;
      saveState();
      renderDashboard();
    },
    "toggle-equipment-filters": () => {
      state.ui.equipmentFiltersVisible = !state.ui.equipmentFiltersVisible;
      saveState();
      renderEquipos();
    },
    "reset-dashboard-filters": resetDashboardFilters,
    "save-dashboard-view": saveDashboardView,
    "export-dashboard-csv": exportDashboardCsv,
    "print-dashboard": printDashboardPdf,
    "add-equipment": () => openEquipmentModal(),
    "edit-equipment": () => openEquipmentModal(id),
    "delete-equipment": () => deleteEquipment(id),
    "add-user": () => openUserModal(),
    "edit-user": () => openUserModal(id),
    "delete-user": () => deleteUser(id),
    "delete-equipment-type": () => deleteEquipmentType(type),
    "delete-event-type": () => deleteEventType(type),
    "sort-equipment": () => toggleEquipmentSort(actionTarget.dataset.sortKey),
    "toggle-sidebar": toggleSidebar,
    "select-equipment": () => {
      state.ui.selectedEquipmentId = id;
      saveState();
      openEquipmentDetailModal(id);
    },
    "view-equipment-events": () => viewEquipmentEvents(id),
    "add-event": () => openEventModal(id || "", type || ""),
    "edit-event": () => openEventModal("", "", id),
    "delete-event": () => deleteEvent(id),
    "edit-plan": () => openPlanModal(id, type || ""),
    "delete-plan": () => deletePlan(id, type),
    "calendar-prev": () => shiftCalendar(-3),
    "calendar-next": () => shiftCalendar(3),
    "calendar-today": () => {
      state.ui.calendarMonthOffset = 0;
      saveState();
      renderApp();
    },
    "export-inventory": exportInventoryCsv,
    "export-equipments-xlsx": exportEquipmentsXlsx,
    "export-equipments-pdf": exportEquipmentsPdf,
    "export-events": exportEventsCsv,
    "export-costs": exportCostsCsv,
    "export-providers": exportProvidersCsv,
    "view-provider": () => openProviderModal(actionTarget.dataset.provider || ""),
    "reset-demo": resetDemoData,
    "set-user": () => {
      state.activeUserId = id;
      saveState();
      renderApp();
      showToast("Usuario activo actualizado.");
    }
  };
  if (actionMap[action]) actionMap[action]();
}

function handleMainInput(event) {
  if (event.target.id === "equipmentSearch") {
    const cursor = event.target.selectionStart ?? event.target.value.length;
    state.ui.equipmentFilters.search = event.target.value;
    saveState();
    renderEquipos({ restoreSearchFocus: true, searchCursor: cursor });
  }
  if (event.target.id === "dashboardHealthSearch") {
    const cursor = event.target.selectionStart ?? event.target.value.length;
    state.ui.dashboardFilters.healthSearch = event.target.value;
    state.ui.dashboardFilters.savedView = "";
    saveState();
    renderDashboard({ restoreHealthSearchFocus: true, healthCursor: cursor });
  }
  if (event.target.id === "providerSearch") {
    const cursor = event.target.selectionStart ?? event.target.value.length;
    state.ui.providerFilters.search = event.target.value;
    saveState();
    renderProveedores({ restoreSearchFocus: true, searchCursor: cursor });
  }
}

async function handleMainSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  if (form.dataset.form === "equipment-type") {
    event.preventDefault();
    await saveEquipmentTypeForm(form);
  }
  if (form.dataset.form === "event-type") {
    event.preventDefault();
    await saveEventTypeForm(form);
  }
  if (form.dataset.form === "annual-budget") {
    event.preventDefault();
    await saveBudgetForm(form);
  }
}

function handleMainChange(event) {
  const target = event.target;
  if (handleDashboardFilterChange(target)) return;
  const mapping = {
    typeFilter: ["equipmentFilters", "type"],
    statusFilter: ["equipmentFilters", "status"],
    criticalityFilter: ["equipmentFilters", "criticality"],
    frequencyFilter: ["equipmentFilters", "frequency"],
    authorizationFilter: ["equipmentFilters", "authorization"],
    providerEvaluationFilter: ["providerFilters", "evaluation"],
    providerYearFilter: ["providerFilters", "year"],
    calendarHorizon: ["calendarHorizon"],
    calendarType: ["calendarType"],
    eventEquipmentFilter: ["eventFilters", "equipmentId"],
    eventTypeFilter: ["eventFilters", "type"]
    ,costBudgetYear: ["costBudgetYear"]
  };
  const path = mapping[target.id];
  if (!path) return;
  if (path.length === 1) {
    state.ui[path[0]] = target.value;
  } else {
    state.ui[path[0]][path[1]] = target.value;
  }
  saveState();
  renderApp();
}

function toggleSidebar() {
  state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
  saveState();
  document.querySelector("#appShell")?.classList.toggle("sidebar-collapsed", state.ui.sidebarCollapsed);
  const button = $("#sidebarToggle");
  if (button) {
    const label = state.ui.sidebarCollapsed ? "Expandir menú" : "Minimizar menú";
    button.setAttribute("aria-pressed", String(state.ui.sidebarCollapsed));
    button.setAttribute("aria-label", label);
    button.title = label;
  }
}

function setupEventListeners() {
  if (listenersReady) return;
  listenersReady = true;

  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });
  $("#sidebarToggle")?.addEventListener("click", toggleSidebar);

  $("#activeUserSelect").addEventListener("change", (event) => {
    if (!remoteMode) {
      state.activeUserId = event.target.value;
      saveState();
      renderApp();
      showToast("Usuario activo actualizado.");
    }
  });

  $("#exportAllBtn").innerHTML = icon("download");
  $("#exportAllBtn").addEventListener("click", exportAllJson);
  const resetDemoButton = $("#resetDemoBtn");
  if (resetDemoButton) {
    resetDemoButton.innerHTML = icon("rotate");
    resetDemoButton.addEventListener("click", resetDemoData);
  }
  $("#signOutBtn").innerHTML = icon("x");
  $("#signOutBtn").addEventListener("click", signOut);

  $(".main-area").addEventListener("click", handleMainClick);
  $(".main-area").addEventListener("input", handleMainInput);
  $(".main-area").addEventListener("change", handleMainChange);
  $(".main-area").addEventListener("submit", handleMainSubmit);
  $(".main-area").addEventListener("dragstart", handleMainDragStart);
  $(".main-area").addEventListener("dragover", handleMainDragOver);
  $(".main-area").addEventListener("dragleave", handleMainDragLeave);
  $(".main-area").addEventListener("drop", handleMainDrop);
  $(".main-area").addEventListener("dragend", handleMainDragEnd);

  $("#modalRoot").addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget?.dataset.action === "close-modal") {
      closeModal();
      return;
    }
    if (!actionTarget) return;
    const { action, id, type } = actionTarget.dataset;
    if (action === "minimize-modal") {
      toggleModalWindow("minimize");
      return;
    }
    if (action === "maximize-modal") {
      toggleModalWindow("maximize");
      return;
    }
    if (action === "select-equipment") {
      closeModal();
      openEquipmentDetailModal(id);
      return;
    }
    if (action === "add-plan-row") {
      appendPlanRowToModal();
    }
    if (action === "remove-plan-row") {
      actionTarget.closest("[data-plan-row]")?.remove();
    }
    if (action === "delete-event-modal") {
      deleteEvent(id);
    }
    if (action === "delete-plan-modal") {
      const form = actionTarget.closest("form");
      deletePlan(form?.dataset.equipmentId, form?.dataset.originalType);
    }
    if (action === "edit-equipment") {
      closeModal();
      openEquipmentModal(id);
    }
    if (action === "add-event") {
      closeModal();
      openEventModal(id || "", type || "");
    }
    if (action === "view-equipment-events") {
      closeModal();
      viewEquipmentEvents(id);
    }
    if (action === "edit-plan") {
      closeModal();
      openPlanModal(id, type || "");
    }
    if (action === "delete-plan") {
      deletePlan(id, type);
    }
  });

  $("#modalRoot").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.form === "equipment") await saveEquipmentForm(form);
    if (form.dataset.form === "event") await saveEventForm(form);
    if (form.dataset.form === "plan") await savePlanForm(form);
    if (form.dataset.form === "user") await saveUserForm(form);
  });

  $("#modalRoot").addEventListener("change", (event) => {
    const target = event.target;
    if (!target.matches("select[name='type'], select[name$='_type']")) return;
    const container = target.closest("[data-plan-row]") || target.closest('form[data-form="plan"]');
    if (container) syncPlanExemptionControls(container);
  });

  $("#modalRoot").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("input:not([type='submit']), select")) {
      event.preventDefault();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#modalRoot").classList.contains("open")) closeModal();
  });
}

function setupAuthListeners() {
  if (authListenersReady) return;
  authListenersReady = true;

  $("#authRoot").addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-mode]");
    if (!button) return;
    renderAuthScreen(button.dataset.authMode);
  });

  $("#authRoot").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.form === "auth") await handleAuthSubmit(form);
  });
}

async function init() {
  document.title = APP_NAME;
  setupAuthListeners();

  if (!remoteMode) {
    renderSetupScreen();
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    authSession = session;
  });

  try {
    const response = await supabaseClient.auth.getSession();
    authSession = response.data.session;
    if (authSession) {
      await startAuthenticatedApp();
    } else {
      renderAuthScreen("signin");
    }
  } catch (error) {
    renderAuthScreen("signin", error.message || "No se pudo validar la sesión.");
  }
}

window.addEventListener("DOMContentLoaded", init);
