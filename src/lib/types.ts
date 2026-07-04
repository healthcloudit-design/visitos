export type ManagementStatus =
  | "pendiente" | "visitado" | "contactado" | "interesado"
  | "no_interesado" | "requiere_seguimiento" | "no_contactar" | "datos_incompletos";

export type VisitFrequency = "semanal" | "quincenal" | "mensual" | "bimestral" | "trimestral" | "personalizada";

export interface Account {
  id: string;
  org_id: string;
  name: string;
  specialty: string | null;
  institution: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  birthday: string | null;          // ISO date; año 1904 = sólo se conoce DD/MM
  visited: boolean;
  last_visit_at: string | null;
  status: ManagementStatus;
  general_notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  frequency: VisitFrequency | null;
  record_status: "activo" | "archivado";
  import_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string; account_id: string; user_id: string; body: string; created_at: string;
}

export interface ChangeLog {
  id: number; account_id: string; user_id: string | null; action: string;
  field: string | null; old_value: string | null; new_value: string | null; created_at: string;
}

export const STATUS_LABELS: Record<ManagementStatus, string> = {
  pendiente: "Pendiente",
  visitado: "Visitado",
  contactado: "Contactado",
  interesado: "Interesado",
  no_interesado: "No interesado",
  requiere_seguimiento: "Requiere seguimiento",
  no_contactar: "No contactar",
  datos_incompletos: "Datos incompletos",
};

export const FREQ_LABELS: Record<VisitFrequency, string> = {
  semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual",
  bimestral: "Bimestral", trimestral: "Trimestral", personalizada: "Personalizada",
};

export const FIELD_LABELS: Record<string, string> = {
  name: "Nombre", specialty: "Especialidad", institution: "Institución", address: "Dirección",
  neighborhood: "Barrio", city: "Localidad", province: "Provincia", phone: "Teléfono",
  whatsapp: "WhatsApp", email: "Email", birthday: "Cumpleaños", visited: "Visitado",
  last_visit_at: "Última visita", status: "Estado de gestión", general_notes: "Notas generales",
  next_action: "Próxima acción", next_action_date: "Fecha próx. acción", frequency: "Frecuencia",
  assigned_user_id: "Usuario asignado", record_status: "Estado del registro",
};
