# 01 — Domain Model Spec

## Objetivo

Definir las entidades, tipos, campos y relaciones mínimas que necesita el frontend del MVP ALPEZ.

El modelo debe ser suficiente para:

- Renderizar dashboard.
- Listar solicitudes.
- Crear solicitudes mock.
- Mostrar detalle.
- Validar visualmente documentos.
- Ejecutar reglas demo de decisión.
- Simular respuestas de API.

## Entidades principales

1. Solicitud.
2. Persona Física.
3. Persona Moral.
4. Representante Legal.
5. Aval.
6. Documento.
7. Validación.
8. Decisión Crediticia.
9. Evento de Timeline.
10. Usuario Demo.
11. Dashboard Summary.

---

## Tipo: PersonType

```ts
export type PersonType = "fisica" | "moral";


## Tipo: ApplicationScenario

```ts
export type ApplicationScenario =
  | "persona_fisica_hit_buro"
  | "persona_moral_hit_buro"
  | "persona_moral_no_hit_buro";


## Tipo: ApplicationStatus

```ts
export type ApplicationStatus =
  | "nueva"
  | "captura_datos"
  | "validacion_ine"
  | "documentos_pendientes"
  | "documentos_revision"
  | "sms_pendiente"
  | "consulta_buro"
  | "validacion_listas"
  | "modelo_decision"
  | "analisis_credito"
  | "investigacion_legal"
  | "contratos"
  | "aprobada"
  | "rechazada";

## Tipo: ApplicationDecision

```ts
export type ApplicationDecision =
  | "pendiente"
  | "aprobada"
  | "rechazada"
  | "observada";

## Tipo: RiskLevel

```ts
export type RiskLevel =
  | "alto"
  | "medio"
  | "bajo"
  | "no_aplica";

## RejectionReaction

```ts
export type RejectionReason =
  | "ine_vencida"
  | "ine_calidad_baja"
  | "ine_no_encontrada"
  | "rechazo_knockouts"
  | "cliente_existente"
  | "documentos_incompletos"
  | "sin_historial_crediticio"
  | "score_insuficiente"
  | "validacion_listas_rechazada"
  | "analisis_credito_rechazado"
  | "modelo_decision_rechazado"
  | "no_aplica";

## Entidad: Application

```ts
export interface Application {
  id: string;
  folio: string;

  personType: PersonType;
  scenario: ApplicationScenario;

  status: ApplicationStatus;
  decision: ApplicationDecision;
  rejectionReason?: RejectionReason;

  applicantName: string;
  applicantRfc?: string;
  applicantCurp?: string;

  requestedAmount: number;
  assignedCreditLine: number | null;

  bureauScore: number | null;
  finalScore: number | null;
  riskLevel: RiskLevel;

  executiveName: string;

  physicalPerson?: PhysicalPerson;
  moralPerson?: MoralPerson;
  legalRepresentative?: LegalRepresentative;
  guarantor?: Guarantor;

  documents: DocumentItem[];
  validations: ValidationItem[];
  decisionResult?: CreditDecision;
  timeline: TimelineEvent[];

  createdAt: string;
  updatedAt: string;
}

##  Reglas de aplicación

```txt
- Si personType es "fisica", debe existir physicalPerson.
- Si personType es "moral", debe existir moralPerson.
- Si personType es "moral", debe existir legalRepresentative.
- assignedCreditLine puede ser null cuando aún no hay decisión.
- bureauScore puede ser null en escenarios sin hit Buró.
- finalScore puede ser usado para Persona Moral sin hit Buró.
- decision debe iniciar en "pendiente".
- documents debe inicializarse según tipo de persona.
- validations debe inicializarse como pendientes.
- timeline debe reflejar los cambios de estado.

## Entidad: PhysicalPerson

```ts
export interface PhysicalPerson {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;

  rfc: string;
  curp: string;
  birthDate: string;

  phone: string;
  email: string;

  personalAddress: Address;
  businessAddress: Address;

  businessActivity?: string;
  businessSeniorityYears?: number;
  averageMonthlyIncome?: number;
}

## Entidad: MoralPerson

```ts
export interface MoralPerson {
  legalName: string;
  commercialName?: string;
  rfc: string;

  businessLine: string;
  constitutionDate?: string;
  companySeniorityYears?: number;

  companyAddress: Address;

  averageMonthlyIncome?: number;
  annualSales?: number;

  currentAssets?: number;
  currentLiabilities?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  annualOperatingProfit?: number;

  bankAccountSeniorityMonths?: number;
  averageBankBalance?: number;
}

## Entidad: LegalRepresentative

```ts
export interface LegalRepresentative {
  fullName: string;
  rfc: string;
  curp: string;
  phone: string;
  email: string;
  address?: Address;
}

## Entidad: Guarantor

```ts
export interface Guarantor {
  fullName: string;
  rfc?: string;
  curp?: string;
  phone?: string;
  email?: string;
  address?: Address;
}

## Entidad: Adress

```ts
export interface Address {
  street: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood: string;
  municipality: string;
  state: string;
  zipCode: string;
  country: string;
}

## Entidad: Document Type

```ts
export type DocumentType =
  | "ine_titular"
  | "curp"
  | "constancia_situacion_fiscal"
  | "comprobante_domicilio_titular"
  | "comprobante_domicilio_negocio"
  | "comprobante_domicilio_empresa"
  | "comprobante_domicilio_representante"
  | "ine_representante_legal"
  | "opinion_positiva_sat"
  | "estados_cuenta_bancarios"
  | "declaracion_anual"
  | "estados_financieros"
  | "poder_representante_legal"
  | "acta_constitutiva"
  | "garantia"
  | "ine_aval"
  | "comprobante_domicilio_aval";

## Tipo: DocumentStatus

```ts
export type DocumentStatus =
  | "pendiente"
  | "cargado"
  | "en_revision"
  | "validado"
  | "rechazado";

## Entidad: DocumentItem

```ts
export interface DocumentItem {
  id: string;
  applicationId: string;
  type: DocumentType;
  label: string;
  required: boolean;
  status: DocumentStatus;

  fileName?: string;
  fileSizeMb?: number;
  fileType?: "pdf" | "jpg" | "jpeg" | "png";

  uploadedAt?: string;
  reviewedAt?: string;

  comments?: string;
}

## Tipo: ValidationType

```ts
export type ValidationType =
  | "ine"
  | "knockouts"
  | "cliente_existente"
  | "sms"
  | "buro"
  | "listas"
  | "documentos"
  | "modelo_decision"
  | "investigacion_legal"
  | "contratos";

## Tipo: ValidationStatus

```ts
export type ValidationType =
  | "ine"
  | "knockouts"
  | "cliente_existente"
  | "sms"
  | "buro"
  | "listas"
  | "documentos"
  | "modelo_decision"
  | "investigacion_legal"
  | "contratos";

## Entidad: ValidationItem

```ts
export interface ValidationItem {
  id: string;
  applicationId: string;

  type: ValidationType;
  label: string;
  status: ValidationStatus;

  result?: string;
  detail?: string;

  startedAt?: string;
  completedAt?: string;
}

## Entidad: IneValidationResult

```ts
export interface IneValidationResult {
  imageQuality: "ok" | "low_quality";
  isExpired: boolean;
  existsInRegistry: boolean;
  status: ValidationStatus;
  message: string;
}

## Entidad: BureauResult

```ts
export interface BureauResult {
  hasHit: boolean;
  score: number | null;
  status: ValidationStatus;
  message: string;
}

## Entidad: ListsValidationResult

```ts
export interface ListsValidationResult {
  blacklists: boolean;
  curp: boolean;
  sat: boolean;
  judicialRecords: boolean;
  publicCommerceRegistry: boolean;
  satSanctions: boolean;
  status: ValidationStatus;
  message: string;
}

## Entidad: CreditDecision

```ts
export interface CreditDecision {
  applicationId: string;

  decision: ApplicationDecision;
  status: ApplicationStatus;

  requestedAmount: number;
  assignedCreditLine: number | null;

  bureauScore: number | null;
  finalScore: number | null;

  riskLevel: RiskLevel;
  rejectionReason?: RejectionReason;

  message: string;
  evaluatedAt: string;
}

## Entidad: TimelineEvent

```ts
export interface TimelineEvent {
  id: string;
  applicationId: string;

  status: ApplicationStatus;
  title: string;
  description?: string;

  actor: string;
  createdAt: string;
}

## Entidad: DemoUser

```ts
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "ejecutivo" | "analista" | "admin_demo";
}

## Entidad: DashboardSummary

```ts
export interface DashboardSummary {
  totalApplications: number;
  newApplications: number;
  inValidation: number;
  pendingDocuments: number;
  approved: number;
  rejected: number;

  totalRequestedAmount: number;
  totalAssignedCreditLine: number;

  byStatus: {
    status: ApplicationStatus;
    count: number;
  }[];

  byScenario: {
    scenario: ApplicationScenario;
    count: number;
  }[];

  recentApplications: Application[];
}

# Catálogo de documentos por tipo de persona

## Persona Física

```ts
export const PHYSICAL_PERSON_DOCUMENTS: DocumentType[] = [
  "ine_titular",
  "curp",
  "constancia_situacion_fiscal",
  "comprobante_domicilio_titular",
  "comprobante_domicilio_negocio",
  "estados_cuenta_bancarios",
  "opinion_positiva_sat",
  "garantia",
  "ine_aval",
  "comprobante_domicilio_aval"
];

## Persona Moral

```ts
export const MORAL_PERSON_DOCUMENTS: DocumentType[] = [
  "ine_representante_legal",
  "constancia_situacion_fiscal",
  "comprobante_domicilio_empresa",
  "comprobante_domicilio_representante",
  "estados_cuenta_bancarios",
  "estados_financieros",
  "declaracion_anual",
  "poder_representante_legal",
  "acta_constitutiva",
  "opinion_positiva_sat",
  "garantia",
  "ine_aval",
  "comprobante_domicilio_aval"
];

## Reglas de consistencia

1. Toda solicitud debe tener id.
2. Toda solicitud debe tener folio.
3. Toda solicitud debe tener status.
4. Toda solicitud debe tener decision.
5. Toda solicitud debe tener scenario.
6. Toda solicitud debe tener documentos iniciales.
7. Toda solicitud debe tener timeline.
8. Toda validación debe estar ligada a una solicitud.
9. Todo documento debe estar ligado a una solicitud.
10. Ningún componente debe inventar estructuras fuera de estos tipos.

