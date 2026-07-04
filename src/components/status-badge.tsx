import { STATUS_LABELS, type ManagementStatus } from "@/lib/types";

const COLORS: Record<ManagementStatus, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  visitado: "bg-green-100 text-green-800",
  contactado: "bg-blue-100 text-blue-800",
  interesado: "bg-emerald-100 text-emerald-800",
  no_interesado: "bg-red-100 text-red-700",
  requiere_seguimiento: "bg-amber-100 text-amber-800",
  no_contactar: "bg-red-100 text-red-700",
  datos_incompletos: "bg-orange-100 text-orange-800"
};

export function StatusBadge({ status }: { status: ManagementStatus }) {
  return <span className={`badge ${COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}
