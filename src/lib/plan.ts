export type Plan = "individual" | "profesional" | "equipo" | "empresa";

const RANK: Record<Plan, number> = { individual: 1, profesional: 2, equipo: 3, empresa: 4 };

export const FEATURE_MIN = {
  reporte: "profesional",
  mapa: "profesional",
  equipo: "equipo",
  usuarios: "equipo",
  solicitudes: "equipo",
  ia: "empresa",
} as const;

export type Feature = keyof typeof FEATURE_MIN;

export function hasFeature(plan: string | null | undefined, feature: Feature): boolean {
  const p = (plan ?? "individual") as Plan;
  const min = FEATURE_MIN[feature] as Plan;
  return (RANK[p] ?? 1) >= (RANK[min] ?? 99);
}

export const PLAN_LABEL: Record<Plan, string> = {
  individual: "Individual", profesional: "Profesional", equipo: "Equipo", empresa: "Empresa",
};
