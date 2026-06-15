import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  ApplicationScenario,
  CreateApplicationPayload,
  DocumentItem,
  DocumentStatus,
  PersonType,
} from "../features/applications/types/application.types";
import { createApplication } from "../features/applications/services/applicationService";
import { DocumentChecklist } from "../features/documents/components/DocumentChecklist";
import { getInitialDocuments } from "../features/documents/services/documentService";
import { Badge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { Input } from "../shared/components/Input";
import { PageHeader } from "../shared/components/PageHeader";
import { Select } from "../shared/components/Select";
import { formatMoney, fullScenarioLabels, personTypeLabels } from "../shared/lib/formatters";

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardForm {
  scenario: ApplicationScenario | "";
  requestedAmount: string;
  executiveName: string;
  firstName: string;
  lastName: string;
  secondLastName: string;
  rfc: string;
  curp: string;
  birthDate: string;
  phone: string;
  email: string;
  businessActivity: string;
  businessSeniorityYears: string;
  personalStreet: string;
  personalNeighborhood: string;
  personalMunicipality: string;
  personalState: string;
  personalZipCode: string;
  businessStreet: string;
  businessNeighborhood: string;
  businessMunicipality: string;
  businessState: string;
  businessZipCode: string;
  legalName: string;
  commercialName: string;
  companyRfc: string;
  businessLine: string;
  constitutionDate: string;
  companySeniorityYears: string;
  companyStreet: string;
  companyNeighborhood: string;
  companyMunicipality: string;
  companyState: string;
  companyZipCode: string;
  representativeName: string;
  representativeRfc: string;
  representativeCurp: string;
  representativePhone: string;
  representativeEmail: string;
  averageMonthlyIncome: string;
  annualSales: string;
  averageBankBalance: string;
  bankAccountSeniorityMonths: string;
  currentAssets: string;
  currentLiabilities: string;
  totalAssets: string;
  totalLiabilities: string;
  annualOperatingProfit: string;
}

const initialForm: WizardForm = {
  scenario: "",
  requestedAmount: "50000",
  executiveName: "Ejecutivo Demo",
  firstName: "Mariana",
  lastName: "García",
  secondLastName: "López",
  rfc: "GALM900101AB2",
  curp: "GALM900101MPLRPR04",
  birthDate: "1990-01-01",
  phone: "2225550144",
  email: "mariana.demo@alpez.local",
  businessActivity: "Tienda de conveniencia",
  businessSeniorityYears: "3",
  personalStreet: "Av. Reforma 120",
  personalNeighborhood: "Centro",
  personalMunicipality: "Puebla",
  personalState: "Puebla",
  personalZipCode: "72000",
  businessStreet: "Calle Comercio 45",
  businessNeighborhood: "La Paz",
  businessMunicipality: "Puebla",
  businessState: "Puebla",
  businessZipCode: "72160",
  legalName: "Comercial Demo Puebla S.A. de C.V.",
  commercialName: "Comercial Demo Puebla",
  companyRfc: "CDP2101018A1",
  businessLine: "Comercio al por menor",
  constitutionDate: "2021-01-01",
  companySeniorityYears: "4",
  companyStreet: "Blvd. Empresarial 818",
  companyNeighborhood: "Angelópolis",
  companyMunicipality: "Puebla",
  companyState: "Puebla",
  companyZipCode: "72830",
  representativeName: "Daniela Ruiz Legal",
  representativeRfc: "RULD870930Q81",
  representativeCurp: "RULD870930MPLZGL02",
  representativePhone: "2225550123",
  representativeEmail: "legal.demo@alpez.local",
  averageMonthlyIncome: "90000",
  annualSales: "1200000",
  averageBankBalance: "65000",
  bankAccountSeniorityMonths: "30",
  currentAssets: "300000",
  currentLiabilities: "120000",
  totalAssets: "750000",
  totalLiabilities: "320000",
  annualOperatingProfit: "210000",
};

const scenarioOptions: ApplicationScenario[] = [
  "persona_fisica_hit_buro",
  "persona_moral_hit_buro",
  "persona_moral_no_hit_buro",
];

function getPersonType(scenario: ApplicationScenario | ""): PersonType | null {
  if (!scenario) return null;
  return scenario === "persona_fisica_hit_buro" ? "fisica" : "moral";
}

function numberValue(value: string): number {
  return Number(value || 0);
}

function baseAddress(street: string, neighborhood: string, municipality: string, state: string, zipCode: string) {
  return {
    street,
    neighborhood,
    municipality,
    state,
    zipCode,
    country: "México",
  };
}

function validateFormat(form: WizardForm, personType: PersonType | null): Record<string, string> {
  const errors: Record<string, string> = {};
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;
  const phoneRegex = /^\d{10}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const zipRegex = /^\d{5}$/;

  if (!personType) return errors;

  if (personType === "fisica") {
    if (!form.firstName) errors.firstName = "Nombre requerido";
    if (!form.lastName) errors.lastName = "Primer apellido requerido";
    if (!rfcRegex.test(form.rfc)) errors.rfc = "RFC con formato básico inválido";
    if (!curpRegex.test(form.curp)) errors.curp = "CURP con formato básico inválido";
    if (!phoneRegex.test(form.phone)) errors.phone = "Teléfono de 10 dígitos";
    if (!emailRegex.test(form.email)) errors.email = "Correo inválido";
    if (!form.personalStreet) errors.personalStreet = "Domicilio titular requerido";
    if (!form.businessStreet) errors.businessStreet = "Domicilio negocio requerido";
    if (!zipRegex.test(form.personalZipCode)) errors.personalZipCode = "CP de 5 dígitos";
    if (!zipRegex.test(form.businessZipCode)) errors.businessZipCode = "CP de 5 dígitos";
  } else {
    if (!form.legalName) errors.legalName = "Razón social requerida";
    if (!rfcRegex.test(form.companyRfc)) errors.companyRfc = "RFC empresa inválido";
    if (!form.businessLine) errors.businessLine = "Giro requerido";
    if (!form.companyStreet) errors.companyStreet = "Domicilio empresa requerido";
    if (!form.representativeName) errors.representativeName = "Representante requerido";
    if (!rfcRegex.test(form.representativeRfc)) errors.representativeRfc = "RFC representante inválido";
    if (!curpRegex.test(form.representativeCurp)) errors.representativeCurp = "CURP representante inválida";
    if (!phoneRegex.test(form.representativePhone)) errors.representativePhone = "Teléfono de 10 dígitos";
    if (!emailRegex.test(form.representativeEmail)) errors.representativeEmail = "Correo inválido";
    if (!zipRegex.test(form.companyZipCode)) errors.companyZipCode = "CP de 5 dígitos";
  }

  return errors;
}

export function NewApplicationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<WizardForm>(initialForm);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const personType = getPersonType(form.scenario);
  const pendingDocuments = documents.filter((document) => document.required && document.status === "pendiente").length;

  useEffect(() => {
    if (!personType) {
      setDocuments([]);
      return;
    }

    void getInitialDocuments(personType).then(setDocuments);
  }, [personType]);

  const stepLabels = ["Tipo de solicitud", "Datos generales", "Información financiera", "Documentos", "Revisión"];

  function updateField(field: keyof WizardForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateStep(currentStep: WizardStep): boolean {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.scenario) nextErrors.scenario = "Selecciona un escenario";
      if (numberValue(form.requestedAmount) <= 0) nextErrors.requestedAmount = "Monto mayor a 0";
      if (!form.executiveName) nextErrors.executiveName = "Ejecutivo requerido";
    }

    if (currentStep === 2) {
      Object.assign(nextErrors, validateFormat(form, personType));
    }

    if (currentStep === 3) {
      const numericFields: Array<keyof WizardForm> = [
        "averageMonthlyIncome",
        "annualSales",
        "businessSeniorityYears",
        "companySeniorityYears",
        "requestedAmount",
        "totalAssets",
        "totalLiabilities",
        "annualOperatingProfit",
      ];
      if (form.scenario === "persona_moral_no_hit_buro") {
        numericFields.push("averageBankBalance", "bankAccountSeniorityMonths", "currentAssets", "currentLiabilities");
      }
      numericFields.forEach((field) => {
        if (numberValue(form[field]) < 0) nextErrors[field] = "No puede ser negativo";
      });
      if (numberValue(form.requestedAmount) <= 0) nextErrors.requestedAmount = "Monto mayor a 0";
      if (form.scenario === "persona_moral_no_hit_buro" && numberValue(form.averageBankBalance) <= 0) {
        nextErrors.averageBankBalance = "Saldo promedio requerido";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, 5) as WizardStep);
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 1) as WizardStep);
  }

  function simulateLocalUpload(documentId: string) {
    setBusyDocumentId(documentId);
    window.setTimeout(() => {
      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId
            ? {
                ...document,
                status: "cargado",
                fileName: `${document.type}.pdf`,
                fileSizeMb: 2,
                fileType: "pdf",
                uploadedAt: new Date().toISOString(),
                comments: undefined,
              }
            : document,
        ),
      );
      setBusyDocumentId(null);
    }, 250);
  }

  function updateLocalDocumentStatus(documentId: string, status: DocumentStatus, comments?: string) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? {
              ...document,
              status,
              comments: status === "rechazado" ? comments || "Documento observado para corrección." : comments,
              fileName: status !== "pendiente" ? document.fileName ?? `${document.type}.pdf` : document.fileName,
              fileSizeMb: status !== "pendiente" ? document.fileSizeMb ?? 2 : document.fileSizeMb,
              fileType: status !== "pendiente" ? document.fileType ?? "pdf" : document.fileType,
              uploadedAt: status !== "pendiente" ? document.uploadedAt ?? new Date().toISOString() : document.uploadedAt,
            }
          : document,
      ),
    );
  }

  const createPayload = useMemo<CreateApplicationPayload | null>(() => {
    if (!form.scenario || !personType) return null;
    const requestedAmount = numberValue(form.requestedAmount);
    const initialDocumentStatuses = Object.fromEntries(
      documents.map((document) => [document.type, document.status]),
    ) as CreateApplicationPayload["initialDocumentStatuses"];

    if (personType === "fisica") {
      return {
        personType,
        scenario: form.scenario,
        requestedAmount,
        executiveName: form.executiveName,
        initialDocumentStatuses,
        physicalPerson: {
          firstName: form.firstName,
          lastName: form.lastName,
          secondLastName: form.secondLastName,
          rfc: form.rfc.toUpperCase(),
          curp: form.curp.toUpperCase(),
          birthDate: form.birthDate,
          phone: form.phone,
          email: form.email,
          personalAddress: baseAddress(
            form.personalStreet,
            form.personalNeighborhood,
            form.personalMunicipality,
            form.personalState,
            form.personalZipCode,
          ),
          businessAddress: baseAddress(
            form.businessStreet,
            form.businessNeighborhood,
            form.businessMunicipality,
            form.businessState,
            form.businessZipCode,
          ),
          businessActivity: form.businessActivity,
          businessSeniorityYears: numberValue(form.businessSeniorityYears),
          averageMonthlyIncome: numberValue(form.averageMonthlyIncome),
        },
        guarantor: {
          fullName: "Aval Demo",
          phone: "2225550177",
          email: "aval.demo@alpez.local",
        },
      };
    }

    return {
      personType,
      scenario: form.scenario,
      requestedAmount,
      executiveName: form.executiveName,
      initialDocumentStatuses,
      moralPerson: {
        legalName: form.legalName,
        commercialName: form.commercialName,
        rfc: form.companyRfc.toUpperCase(),
        businessLine: form.businessLine,
        constitutionDate: form.constitutionDate,
        companySeniorityYears: numberValue(form.companySeniorityYears),
        companyAddress: baseAddress(
          form.companyStreet,
          form.companyNeighborhood,
          form.companyMunicipality,
          form.companyState,
          form.companyZipCode,
        ),
        averageMonthlyIncome: numberValue(form.averageMonthlyIncome),
        annualSales: numberValue(form.annualSales),
        currentAssets: numberValue(form.currentAssets),
        currentLiabilities: numberValue(form.currentLiabilities),
        totalAssets: numberValue(form.totalAssets),
        totalLiabilities: numberValue(form.totalLiabilities),
        annualOperatingProfit: numberValue(form.annualOperatingProfit),
        averageBankBalance: numberValue(form.averageBankBalance),
        bankAccountSeniorityMonths: numberValue(form.bankAccountSeniorityMonths),
      },
      legalRepresentative: {
        fullName: form.representativeName,
        rfc: form.representativeRfc.toUpperCase(),
        curp: form.representativeCurp.toUpperCase(),
        phone: form.representativePhone,
        email: form.representativeEmail,
      },
      guarantor: {
        fullName: "Socio Aval Demo",
        phone: "2225550188",
        email: "socio.aval@alpez.local",
      },
    };
  }, [documents, form, personType]);

  async function submit() {
    if (!validateStep(5) || !createPayload) return;
    setCreating(true);
    try {
      const application = await createApplication(createPayload);
      navigate(`/solicitudes/${application.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader title="Nueva solicitud" description="Wizard de originación demo en 5 pasos" />
      <div className="mb-5 grid gap-2 md:grid-cols-5">
        {stepLabels.map((label, index) => {
          const itemStep = (index + 1) as WizardStep;
          return (
            <div
              key={label}
              className={`rounded-xl border p-3 text-sm ${
                step === itemStep ? "border-[#0F4C81] bg-[#E6F0FA] text-[#0F4C81]" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <p className="text-xs font-bold">Paso {itemStep}</p>
              <p className="font-semibold">{label}</p>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card title="Tipo de solicitud" description="Selecciona el escenario y monto inicial">
          <div className="grid gap-3 md:grid-cols-3">
            {scenarioOptions.map((scenario) => (
              <button
                key={scenario}
                className={`rounded-2xl border p-4 text-left transition ${
                  form.scenario === scenario ? "border-[#0F4C81] bg-[#E6F0FA]" : "border-slate-200 hover:border-slate-300"
                }`}
                type="button"
                onClick={() => updateField("scenario", scenario)}
              >
                <FileText className="mb-3 h-5 w-5 text-[#0F4C81]" />
                <p className="font-bold text-slate-950">{fullScenarioLabels[scenario]}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {scenario === "persona_moral_no_hit_buro" ? "Modelo alternativo por KPIs." : "Consulta Buró simulada."}
                </p>
              </button>
            ))}
          </div>
          {errors.scenario && <p className="mt-2 text-sm text-red-600">{errors.scenario}</p>}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input
              error={errors.requestedAmount}
              label="Monto solicitado"
              min={1}
              type="number"
              value={form.requestedAmount}
              onChange={(event) => updateField("requestedAmount", event.target.value)}
            />
            <Input
              error={errors.executiveName}
              label="Ejecutivo asignado"
              value={form.executiveName}
              onChange={(event) => updateField("executiveName", event.target.value)}
            />
          </div>
        </Card>
      )}

      {step === 2 && personType === "fisica" && (
        <Card title="Datos generales Persona Física">
          <div className="grid gap-4 md:grid-cols-2">
            <Input error={errors.firstName} label="Nombre" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
            <Input error={errors.lastName} label="Primer apellido" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
            <Input label="Segundo apellido" value={form.secondLastName} onChange={(event) => updateField("secondLastName", event.target.value)} />
            <Input error={errors.rfc} label="RFC" value={form.rfc} onChange={(event) => updateField("rfc", event.target.value.toUpperCase())} />
            <Input error={errors.curp} label="CURP" value={form.curp} onChange={(event) => updateField("curp", event.target.value.toUpperCase())} />
            <Input label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} />
            <Input error={errors.phone} label="Teléfono" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            <Input error={errors.email} label="Correo" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            <Input label="Actividad/giro del negocio" value={form.businessActivity} onChange={(event) => updateField("businessActivity", event.target.value)} />
            <Input label="Antigüedad negocio (años)" type="number" value={form.businessSeniorityYears} onChange={(event) => updateField("businessSeniorityYears", event.target.value)} />
            <Input error={errors.personalStreet} label="Calle domicilio titular" value={form.personalStreet} onChange={(event) => updateField("personalStreet", event.target.value)} />
            <Input label="Colonia titular" value={form.personalNeighborhood} onChange={(event) => updateField("personalNeighborhood", event.target.value)} />
            <Input label="Municipio titular" value={form.personalMunicipality} onChange={(event) => updateField("personalMunicipality", event.target.value)} />
            <Input label="Estado titular" value={form.personalState} onChange={(event) => updateField("personalState", event.target.value)} />
            <Input error={errors.personalZipCode} label="CP titular" value={form.personalZipCode} onChange={(event) => updateField("personalZipCode", event.target.value)} />
            <Input error={errors.businessStreet} label="Calle domicilio negocio" value={form.businessStreet} onChange={(event) => updateField("businessStreet", event.target.value)} />
            <Input label="Colonia negocio" value={form.businessNeighborhood} onChange={(event) => updateField("businessNeighborhood", event.target.value)} />
            <Input label="Municipio negocio" value={form.businessMunicipality} onChange={(event) => updateField("businessMunicipality", event.target.value)} />
            <Input label="Estado negocio" value={form.businessState} onChange={(event) => updateField("businessState", event.target.value)} />
            <Input error={errors.businessZipCode} label="CP negocio" value={form.businessZipCode} onChange={(event) => updateField("businessZipCode", event.target.value)} />
          </div>
        </Card>
      )}

      {step === 2 && personType === "moral" && (
        <Card title="Datos generales Persona Moral">
          <div className="grid gap-4 md:grid-cols-2">
            <Input error={errors.legalName} label="Razón social" value={form.legalName} onChange={(event) => updateField("legalName", event.target.value)} />
            <Input label="Nombre comercial" value={form.commercialName} onChange={(event) => updateField("commercialName", event.target.value)} />
            <Input error={errors.companyRfc} label="RFC empresa" value={form.companyRfc} onChange={(event) => updateField("companyRfc", event.target.value.toUpperCase())} />
            <Input error={errors.businessLine} label="Giro" value={form.businessLine} onChange={(event) => updateField("businessLine", event.target.value)} />
            <Input label="Fecha de constitución" type="date" value={form.constitutionDate} onChange={(event) => updateField("constitutionDate", event.target.value)} />
            <Input label="Antigüedad empresa (años)" type="number" value={form.companySeniorityYears} onChange={(event) => updateField("companySeniorityYears", event.target.value)} />
            <Input error={errors.companyStreet} label="Calle domicilio empresa" value={form.companyStreet} onChange={(event) => updateField("companyStreet", event.target.value)} />
            <Input label="Colonia empresa" value={form.companyNeighborhood} onChange={(event) => updateField("companyNeighborhood", event.target.value)} />
            <Input label="Municipio empresa" value={form.companyMunicipality} onChange={(event) => updateField("companyMunicipality", event.target.value)} />
            <Input label="Estado empresa" value={form.companyState} onChange={(event) => updateField("companyState", event.target.value)} />
            <Input error={errors.companyZipCode} label="CP empresa" value={form.companyZipCode} onChange={(event) => updateField("companyZipCode", event.target.value)} />
            <Input error={errors.representativeName} label="Nombre representante legal" value={form.representativeName} onChange={(event) => updateField("representativeName", event.target.value)} />
            <Input error={errors.representativeRfc} label="RFC representante" value={form.representativeRfc} onChange={(event) => updateField("representativeRfc", event.target.value.toUpperCase())} />
            <Input error={errors.representativeCurp} label="CURP representante" value={form.representativeCurp} onChange={(event) => updateField("representativeCurp", event.target.value.toUpperCase())} />
            <Input error={errors.representativePhone} label="Teléfono representante" value={form.representativePhone} onChange={(event) => updateField("representativePhone", event.target.value)} />
            <Input error={errors.representativeEmail} label="Correo representante" value={form.representativeEmail} onChange={(event) => updateField("representativeEmail", event.target.value)} />
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Información financiera" description="Datos mínimos para análisis y decisión simulada">
          <div className="grid gap-4 md:grid-cols-2">
            <Input error={errors.averageMonthlyIncome} label="Ingresos promedio mensuales" type="number" value={form.averageMonthlyIncome} onChange={(event) => updateField("averageMonthlyIncome", event.target.value)} />
            <Input error={errors.annualSales} label={personType === "fisica" ? "Ventas promedio mensuales" : "Ventas anuales"} type="number" value={form.annualSales} onChange={(event) => updateField("annualSales", event.target.value)} />
            {personType === "moral" && (
              <>
                <Input error={errors.totalAssets} label="Activo total" type="number" value={form.totalAssets} onChange={(event) => updateField("totalAssets", event.target.value)} />
                <Input error={errors.totalLiabilities} label="Pasivo total" type="number" value={form.totalLiabilities} onChange={(event) => updateField("totalLiabilities", event.target.value)} />
                <Input error={errors.annualOperatingProfit} label="Utilidad operativa anual" type="number" value={form.annualOperatingProfit} onChange={(event) => updateField("annualOperatingProfit", event.target.value)} />
              </>
            )}
            {form.scenario === "persona_moral_no_hit_buro" && (
              <>
                <Input error={errors.averageBankBalance} label="Saldo promedio bancario" type="number" value={form.averageBankBalance} onChange={(event) => updateField("averageBankBalance", event.target.value)} />
                <Input error={errors.bankAccountSeniorityMonths} label="Antigüedad cuenta bancaria (meses)" type="number" value={form.bankAccountSeniorityMonths} onChange={(event) => updateField("bankAccountSeniorityMonths", event.target.value)} />
                <Input error={errors.currentAssets} label="Activo circulante" type="number" value={form.currentAssets} onChange={(event) => updateField("currentAssets", event.target.value)} />
                <Input error={errors.currentLiabilities} label="Pasivo circulante" type="number" value={form.currentLiabilities} onChange={(event) => updateField("currentLiabilities", event.target.value)} />
              </>
            )}
            <Input error={errors.requestedAmount} label="Monto solicitado" type="number" value={form.requestedAmount} onChange={(event) => updateField("requestedAmount", event.target.value)} />
          </div>
        </Card>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {pendingDocuments > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p>Hay {pendingDocuments} documento(s) pendiente(s). Puedes continuar para efectos demo, pero la decisión podrá quedar observada.</p>
            </div>
          )}
          <DocumentChecklist
            busyDocumentId={busyDocumentId}
            documents={documents}
            onStatusChange={updateLocalDocumentStatus}
            onUpload={simulateLocalUpload}
          />
        </div>
      )}

      {step === 5 && createPayload && (
        <Card title="Revisión y simulación" description="Confirma la solicitud antes de crear el folio demo">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Solicitud</p>
              <h3 className="mt-2 text-lg font-bold text-slate-950">{fullScenarioLabels[createPayload.scenario]}</h3>
              <p className="mt-1 text-sm text-slate-600">{personTypeLabels[createPayload.personType]}</p>
              <p className="mt-3 text-2xl font-bold text-[#0F4C81]">{formatMoney(createPayload.requestedAmount)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Prospecto</p>
              <h3 className="mt-2 text-lg font-bold text-slate-950">
                {createPayload.personType === "fisica"
                  ? `${createPayload.physicalPerson?.firstName} ${createPayload.physicalPerson?.lastName}`
                  : createPayload.moralPerson?.legalName}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{createPayload.executiveName}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Documentos cargados</p>
              <p className="text-xl font-bold text-slate-950">{documents.filter((document) => document.status !== "pendiente").length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Documentos pendientes</p>
              <p className="text-xl font-bold text-slate-950">{pendingDocuments}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Advertencias</p>
              <p className="text-xl font-bold text-slate-950">{pendingDocuments > 0 ? 1 : 0}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {pendingDocuments > 0 ? <Badge tone="warning">Decisión puede quedar observada</Badge> : <Badge tone="success">Checklist listo</Badge>}
            <Badge tone="info">Sin backend real</Badge>
            <Badge tone="neutral">Store local demo</Badge>
          </div>
        </Card>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button disabled={step === 1} icon={<ArrowLeft className="h-4 w-4" />} type="button" variant="outline" onClick={previousStep}>
          Anterior
        </Button>
        {step < 5 ? (
          <Button icon={<ArrowRight className="h-4 w-4" />} type="button" onClick={nextStep}>
            Siguiente
          </Button>
        ) : (
          <Button icon={<CheckCircle2 className="h-4 w-4" />} loading={creating} type="button" onClick={submit}>
            Crear solicitud demo
          </Button>
        )}
      </div>
    </>
  );
}
