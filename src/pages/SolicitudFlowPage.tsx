import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CircleAlert,
  CircleHelp,
  Clock3,
  Eye,
  FileText,
  FileUp,
  ImagePlus,
  Lock,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  UserRound,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChoiceCard } from "../features/solicitud/components/ChoiceCard";
import { QuestionScreen } from "../features/solicitud/components/QuestionScreen";
import {
  acceptAuthorization,
  confirmIneReview,
  createSolicitudFlow,
  getSolicitudFlow,
  getSolicitudFlowByRecoveryFolio,
  loadSolicitudRequiredDocuments,
  persistSolicitudDraft,
  removeDocumentFile,
  saveBasicData,
  saveBusinessData,
  saveDocumentFile,
  saveFiscalIdentity,
  saveIneFile,
  sendPhoneVerificationCode,
  SolicitudCorrectionError,
  startSolicitudProcessing,
  setCollateralChoice,
  setGuarantorChoice,
  selectApplicantKind,
  submitSolicitudFlow,
  updateSolicitudStep,
  verifyPhoneCode,
} from "../features/solicitud/services/solicitudFlowService";
import { getAddressCatalogByZipCode, getStateCatalog } from "../features/onboarding/services/onboardingService";
import type {
  ApplicantKind,
  BusinessData,
  FiscalIdentity,
  OnboardingGeneralData,
  SolicitudCorrectionIssue,
  SolicitudDocument,
  SolicitudFlowState,
  SolicitudStep,
  StoredFile,
} from "../features/solicitud/types/solicitud.types";
import { PUBLIC_DOCUMENT_STATUS_LABELS } from "../features/solicitud/types/solicitud.types";
import { demoScenarioPersonTypeWarning, parseDemoCreditScenario } from "../features/solicitud/utils/demoCreditScenario";
import {
  FALLBACK_STATES,
  isFiscalIdentityComplete,
  isFiscalIdentityConsistent,
  isGeneralDataComplete,
  mapAddressCatalog,
  mapStatesCatalog,
  normalizeGeneralDataInput,
  normalizeFiscalIdentity,
  onlyDigits,
  type ColonyOption,
  type StateOption,
  toTitleCase,
  validateFiscalIdentity,
  validateFiscalIdentityConsistency,
  validateGeneralData,
} from "../features/solicitud/utils/generalData";
import { Button } from "../shared/components/Button";
import { Input } from "../shared/components/Input";
import { Select } from "../shared/components/Select";
import { AlpezLogo } from "../shared/components/AlpezLogo";
import { fileToBase64 } from "../shared/lib/fileToBase64";
import { cx } from "../shared/lib/formatters";

const TOTAL_STEPS = 11;

const STEP_NUMBER: Record<Exclude<SolicitudStep, "final" | "bienvenida">, number> = {
  tipo_solicitante: 2,
  ine: 3,
  revision_ine: 4,
  datos_basicos: 5,
  fiscal_identity: 6,
  datos_negocio: 7,
  documentos: 8,
  phone_verification: 9,
  autorizacion: 10,
  processing: 11,
};

function storedFileFromFile(file: File): Promise<StoredFile> {
  return fileToBase64(file).then((previewUrl) => ({
    name: file.name,
    type: file.type || "archivo",
    size: file.size,
    previewUrl,
  })).catch(() => {
    throw new Error("No pudimos leer el archivo. Intenta seleccionarlo nuevamente.");
  });
}

function validateSelectedFile(file: File, imagesOnly = false): string | null {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) return "El archivo es demasiado grande. Selecciona uno menor a 10 MB.";
  if (imagesOnly && !file.type.startsWith("image/")) {
    return "Selecciona una imagen JPG, PNG o HEIC de tu identificación.";
  }
  if (!imagesOnly && !file.type.startsWith("image/") && file.type !== "application/pdf") {
    return "Selecciona una imagen o un archivo PDF.";
  }
  return null;
}

function isImageFile(file?: StoredFile): boolean {
  return Boolean(file?.type.startsWith("image/") && file.previewUrl);
}

function documentStatusClass(status: SolicitudDocument["status"]): string {
  if (status === "uploaded") return "bg-emerald-50 text-emerald-700";
  if (status === "review_pending") return "bg-sky-50 text-sky-700";
  if (status === "needs_change") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function getDocument(flow: SolicitudFlowState, id: string): SolicitudDocument | undefined {
  return flow.documents.find((document) => document.id === id);
}

function visibleSolicitudDocuments(flow: SolicitudFlowState): SolicitudDocument[] {
  return flow.documents.filter((document) => {
    const isAvalDocument =
      document.backendGroup === "aval" ||
      document.applicationType === "ine_aval" ||
      document.applicationType === "comprobante_domicilio_aval";
    const isGuaranteeDocument = document.backendGroup === "garantia" || document.applicationType === "garantia";

    if (isAvalDocument && !flow.hasGuarantor) {
      return Boolean(flow.hasGuarantor);
    }
    if (isGuaranteeDocument && !flow.hasCollateral) return false;
    return true;
  });
}

function documentCounts(flow: SolicitudFlowState): { added: number; pending: number } {
  const requiredDocuments = visibleSolicitudDocuments(flow).filter((document) => !document.optional);
  const added = requiredDocuments.filter((document) => document.status !== "missing").length;
  return { added, pending: requiredDocuments.length - added };
}

function FilePreview({ file }: { file?: StoredFile }) {
  if (!file) return null;
  if (isImageFile(file)) {
    return (
      <img
        alt={file.name}
        className="mt-3 h-36 w-full rounded-[8px] border border-slate-200 object-cover sm:h-28"
        src={file.previewUrl}
      />
    );
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-[8px] bg-slate-50 p-3 text-sm text-slate-600">
      <FileText className="h-5 w-5 text-[#0F4C81]" />
      <span>Archivo agregado</span>
    </div>
  );
}

function IneUploadCard({
  title,
  file,
  disabled = false,
  onSelect,
}: {
  title: string;
  file?: StoredFile;
  disabled?: boolean;
  onSelect: (file: File) => void;
}) {
  const handleSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.currentTarget.value = "";
    if (selectedFile) onSelect(selectedFile);
  };

  return (
    <article
      className={cx(
        "relative flex min-h-48 min-w-0 flex-col overflow-hidden rounded-[8px] border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition md:min-h-52 md:items-center md:justify-center md:p-5 md:hover:border-[#0F4C81] md:hover:bg-[#F5FAFF]",
        disabled && "opacity-60",
      )}
    >
      <FileUp className="mx-auto mb-3 h-8 w-8 shrink-0 text-[#0F4C81]" />
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      {file ? (
        <p className="mt-2 break-words text-sm leading-5 text-slate-500">{file.name}</p>
      ) : (
        <>
          <p className="mt-2 break-words text-sm leading-5 text-slate-500 md:hidden">
            Toma una foto o elige una imagen guardada
          </p>
          <p className="mt-2 hidden break-words text-sm leading-5 text-slate-500 md:block">
            Selecciona una imagen guardada en tu dispositivo
          </p>
        </>
      )}
      <FilePreview file={file} />

      <div className="relative z-20 mt-4 grid w-full grid-cols-2 gap-2 md:hidden">
        <label
          className={cx(
            "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#0F4C81] px-2.5 text-xs font-semibold text-white",
            disabled && "pointer-events-none",
          )}
        >
          <Camera className="h-4 w-4 shrink-0" />
          <span>{file ? "Tomar otra" : "Tomar foto"}</span>
          <input
            accept="image/*"
            aria-label={`Tomar foto de ${title}`}
            capture="environment"
            className="sr-only"
            disabled={disabled}
            type="file"
            onChange={handleSelection}
          />
        </label>
        <label
          className={cx(
            "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700",
            disabled && "pointer-events-none",
          )}
        >
          <ImagePlus className="h-4 w-4 shrink-0" />
          <span>Elegir imagen</span>
          <input
            accept="image/*"
            aria-label={`Elegir imagen de ${title}`}
            className="sr-only"
            disabled={disabled}
            type="file"
            onChange={handleSelection}
          />
        </label>
      </div>

      <p className="mt-3 hidden text-xs font-semibold text-[#0F4C81] md:block">
        Haz clic para seleccionar una imagen
      </p>
      <input
        accept="image/*"
        aria-label={`Agregar ${title}`}
        className="absolute inset-0 z-10 hidden h-full w-full cursor-pointer opacity-0 md:block"
        disabled={disabled}
        type="file"
        onChange={handleSelection}
      />
    </article>
  );
}

function canContinueBasicData(flow: SolicitudFlowState): boolean {
  return isGeneralDataComplete(flow.generalData);
}

function canContinueBusinessData(data: BusinessData): boolean {
  return Boolean(
    data.activity.trim() &&
    data.seniorityYears.trim() &&
    Number(data.seniorityYears) >= 0 &&
    data.monthlyIncome.trim() &&
    Number(data.monthlyIncome) > 0,
  );
}

function GeneralDataSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4">
      <h2 className="mb-4 text-sm font-bold uppercase text-slate-500">{title}</h2>
      <div className="grid min-w-0 gap-4">{children}</div>
    </section>
  );
}

function GeneralDataFields({
  value,
  onChange,
  stateOptions,
  colonyOptions,
  zipMessage,
  zipLoading,
}: {
  value: OnboardingGeneralData;
  onChange: (value: OnboardingGeneralData) => void;
  stateOptions: StateOption[];
  colonyOptions: ColonyOption[];
  zipMessage?: string;
  zipLoading?: boolean;
}) {
  const errors = validateGeneralData(value);
  const today = new Date();
  const latestAdultBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const patch = (field: keyof OnboardingGeneralData, fieldValue: string | number | null) =>
    onChange({ ...value, [field]: fieldValue });
  const normalizeNameField = (field: keyof Pick<OnboardingGeneralData, "primerNombre" | "segundoNombre" | "apellidoPaterno" | "apellidoMaterno">) =>
    patch(field, toTitleCase(String(value[field])));
  const stateSelectOptions = [
    { label: "Selecciona una opción", value: "" },
    ...stateOptions.map((state) => ({ label: state.name, value: state.id })),
  ];
  const colonySelectOptions = [
    { label: "Selecciona colonia", value: "" },
    ...colonyOptions.map((colony) => ({ label: colony.name, value: colony.id })),
  ];

  return (
    <div className="grid gap-5">
      <GeneralDataSection title="Datos personales">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <Input
            className="h-12 text-base"
            error={errors.primerNombre}
            label="Primer nombre"
            value={value.primerNombre}
            onChange={(event) => patch("primerNombre", event.target.value)}
            onBlur={() => normalizeNameField("primerNombre")}
          />
          <Input
            className="h-12 text-base"
            label="Segundo nombre"
            value={value.segundoNombre}
            onChange={(event) => patch("segundoNombre", event.target.value)}
            onBlur={() => normalizeNameField("segundoNombre")}
          />
          <Input
            className="h-12 text-base"
            error={errors.apellidoPaterno}
            label="Apellido paterno"
            value={value.apellidoPaterno}
            onChange={(event) => patch("apellidoPaterno", event.target.value)}
            onBlur={() => normalizeNameField("apellidoPaterno")}
          />
          <Input
            className="h-12 text-base"
            label="Apellido materno"
            value={value.apellidoMaterno}
            onChange={(event) => patch("apellidoMaterno", event.target.value)}
            onBlur={() => normalizeNameField("apellidoMaterno")}
          />
          <Input
            className="h-12 text-base"
            error={errors.fechaNacimiento}
            label="Fecha de nacimiento"
            max={latestAdultBirthDate}
            type="date"
            value={value.fechaNacimiento}
            onChange={(event) => patch("fechaNacimiento", event.target.value)}
          />
          <Select
            className="h-12 text-base"
            error={errors.genero}
            label="Género"
            options={[
              { label: "Selecciona una opción", value: "" },
              { label: "Masculino", value: "M" },
              { label: "Femenino", value: "F" },
              { label: "Otro / Prefiero no decirlo", value: "O" },
            ]}
            value={value.genero}
            onChange={(event) => patch("genero", event.target.value)}
          />
        </div>
      </GeneralDataSection>

      <GeneralDataSection title="Contacto">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <Input
            className="h-12 text-base"
            error={errors.telefono}
            inputMode="numeric"
            label="Celular"
            maxLength={10}
            value={value.telefono}
            onChange={(event) => patch("telefono", onlyDigits(event.target.value).slice(0, 10))}
          />
          <Input
            className="h-12 text-base"
            error={errors.correo}
            label="Correo electrónico"
            type="email"
            value={value.correo}
            onChange={(event) => patch("correo", event.target.value)}
            onBlur={() => patch("correo", value.correo.trim().toLowerCase())}
          />
        </div>
      </GeneralDataSection>

      <GeneralDataSection title="Identificación">
        <div className="grid min-w-0 gap-4">
          <Select
            className="h-12 text-base"
            error={errors.estadoNacimientoId}
            label="Estado de nacimiento"
            options={stateSelectOptions}
            value={value.estadoNacimientoId ? String(value.estadoNacimientoId) : ""}
            onChange={(event) => patch("estadoNacimientoId", event.target.value ? Number(event.target.value) : null)}
          />
        </div>
      </GeneralDataSection>

      <GeneralDataSection title="Dirección">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <Input
            className="h-12 text-base"
            error={errors.codigoPostal}
            helperText={zipLoading ? "Buscando código postal..." : zipMessage}
            inputMode="numeric"
            label="Código postal"
            maxLength={5}
            value={value.codigoPostal}
            onChange={(event) => patch("codigoPostal", onlyDigits(event.target.value).slice(0, 5))}
          />
          <Input
            className="h-12 text-base"
            error={errors.direccion}
            label="Calle"
            value={value.direccion}
            onChange={(event) => patch("direccion", event.target.value)}
            onBlur={() => patch("direccion", toTitleCase(value.direccion))}
          />
          <Input
            className="h-12 text-base"
            error={errors.numExt}
            label="Número exterior"
            value={value.numExt}
            onChange={(event) => patch("numExt", event.target.value)}
          />
          <Input
            className="h-12 text-base"
            label="Número interior"
            value={value.numInt}
            onChange={(event) => patch("numInt", event.target.value)}
          />
          <Input
            className="h-12 text-base"
            error={errors.estadoId}
            label="Estado"
            value={value.estadoNombre}
            onChange={(event) => onChange({ ...value, estadoNombre: event.target.value, estadoId: value.estadoId || event.target.value })}
          />
          <Input
            className="h-12 text-base"
            error={errors.municipioId}
            label="Municipio"
            value={value.municipioNombre}
            onChange={(event) => onChange({ ...value, municipioNombre: event.target.value, municipioId: value.municipioId || event.target.value })}
          />
          {colonyOptions.length > 0 ? (
            <Select
              className="h-12 text-base sm:col-span-2"
              error={errors.coloniaId}
              label="Colonia"
              options={colonySelectOptions}
              value={value.coloniaId}
              onChange={(event) => {
                const colony = colonyOptions.find((item) => item.id === event.target.value);
                onChange({ ...value, coloniaId: event.target.value, coloniaNombre: colony?.name ?? "" });
              }}
            />
          ) : (
            <Input
              className="h-12 text-base sm:col-span-2"
              error={errors.coloniaId}
              label="Colonia"
              value={value.coloniaNombre}
              onChange={(event) => onChange({ ...value, coloniaNombre: event.target.value, coloniaId: event.target.value })}
              onBlur={() => onChange({ ...value, coloniaNombre: toTitleCase(value.coloniaNombre), coloniaId: value.coloniaId || toTitleCase(value.coloniaNombre) })}
            />
          )}
        </div>
      </GeneralDataSection>
    </div>
  );
}

function FiscalIdentityFields({
  value,
  generalData,
  onEditGeneralData,
  onChange,
}: {
  value: FiscalIdentity;
  generalData: OnboardingGeneralData;
  onEditGeneralData: () => void;
  onChange: (value: FiscalIdentity) => void;
}) {
  const errors = { ...validateFiscalIdentity(value), ...validateFiscalIdentityConsistency(value, generalData) };
  const patch = (field: "rfc", fieldValue: string) =>
    onChange({
      ...value,
      [field]: fieldValue.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
      source: "manual",
      confirmed: false,
    });

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
      <Input
        className="h-12 text-base"
        error={errors.rfc}
        label="RFC"
        maxLength={13}
        value={value.rfc}
        onChange={(event) => patch("rfc", event.target.value)}
      />
      <Input
        className="h-12 bg-slate-100 text-base text-slate-700"
        error={errors.curp}
        helperText="La CURP se obtuvo de tu identificación y no puede modificarse en este paso."
        label="CURP"
        maxLength={18}
        readOnly
        value={value.curp}
      />
      {errors.estadoNacimientoId && (
        <div className="rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-800 sm:col-span-2">
          <p className="font-bold">{errors.estadoNacimientoId}</p>
          <button className="mt-2 font-bold text-[#0F4C81] underline" type="button" onClick={onEditGeneralData}>
            Corregir estado de nacimiento
          </button>
        </div>
      )}
    </div>
  );
}

function BusinessDataFields({
  applicantKind,
  value,
  onChange,
}: {
  applicantKind?: ApplicantKind;
  value: BusinessData;
  onChange: (value: BusinessData) => void;
}) {
  const patch = (field: keyof BusinessData, fieldValue: string) => onChange({ ...value, [field]: fieldValue });

  return (
    <div className="grid min-w-0 gap-4">
      <Input
        className="h-12 text-base"
        helperText={!value.activity.trim() ? "Describe la actividad principal de tu negocio." : undefined}
        label={applicantKind === "company" ? "Giro de la empresa" : "Actividad del negocio"}
        value={value.activity}
        onChange={(event) => patch("activity", event.target.value)}
      />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <Input
          className="h-12 text-base"
          error={value.seniorityYears && Number(value.seniorityYears) < 0 ? "Ingresa cero o más años de operación." : undefined}
          label="Años de operación"
          min="0"
          type="number"
          value={value.seniorityYears}
          onChange={(event) => patch("seniorityYears", event.target.value)}
        />
        <Input
          className="h-12 text-base"
          error={value.monthlyIncome && Number(value.monthlyIncome) <= 0 ? "Ingresa un monto mayor a cero." : undefined}
          label="Ingresos mensuales"
          min="0"
          type="number"
          value={value.monthlyIncome}
          onChange={(event) => patch("monthlyIncome", event.target.value)}
        />
      </div>
      {applicantKind === "company" && (
        <Input
          className="h-12 text-base"
          label="Ventas anuales"
          min="0"
          type="number"
          value={value.annualSales}
          onChange={(event) => patch("annualSales", event.target.value)}
        />
      )}
    </div>
  );
}

function LandingDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
        src="/bg_image.png"
      />
    </div>
  );
}

const landingBenefits = [
  {
    title: "Seguro y confiable",
    description: "Tu información está protegida con los más altos estándares.",
    icon: ShieldCheck,
  },
  {
    title: "Proceso ágil",
    description: "Menos formularios y una experiencia más rápida.",
    icon: Clock3,
  },
  {
    title: "Acompañamiento experto",
    description: "Te guiamos en cada paso hasta la resolución.",
    icon: UserRound,
  },
];

export function SolicitudFlowPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const demoScenario = import.meta.env.VITE_DEMO_MODE === "true"
    ? parseDemoCreditScenario(new URLSearchParams(window.location.search).get("demoScenario"))
    : null;
  const [flow, setFlow] = useState<SolicitudFlowState | null>(null);
  const [loading, setLoading] = useState(Boolean(flowId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [stateOptions, setStateOptions] = useState<StateOption[]>(FALLBACK_STATES);
  const [colonyOptions, setColonyOptions] = useState<ColonyOption[]>([]);
  const [zipMessage, setZipMessage] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [lastZipLookup, setLastZipLookup] = useState("");
  const [showLandingHelp, setShowLandingHelp] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryFolioInput, setRecoveryFolioInput] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);
  const [correctionIssues, setCorrectionIssues] = useState<SolicitudCorrectionIssue[]>([]);
  const actionInFlightRef = useRef(false);
  const flowRef = useRef<SolicitudFlowState | null>(null);

  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);

  useEffect(() => {
    if (!flow || flow.currentStep === "final") return undefined;
    const timer = window.setTimeout(() => {
      flowRef.current = persistSolicitudDraft(flow);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [flow]);

  useEffect(() => {
    const persistCurrentFlow = () => {
      if (!flowRef.current || flowRef.current.currentStep === "final") return;
      const saved = persistSolicitudDraft(flowRef.current);
      flowRef.current = saved;
      window.dispatchEvent(new CustomEvent("alpez:flow-saved", {
        detail: { recoveryFolio: saved.recoveryFolio, expiresAt: saved.expiresAt },
      }));
    };
    window.addEventListener("alpez:save-and-exit", persistCurrentFlow);
    window.addEventListener("pagehide", persistCurrentFlow);
    window.addEventListener("beforeunload", persistCurrentFlow);
    return () => {
      window.removeEventListener("alpez:save-and-exit", persistCurrentFlow);
      window.removeEventListener("pagehide", persistCurrentFlow);
      window.removeEventListener("beforeunload", persistCurrentFlow);
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!flowId) {
      setFlow(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void getSolicitudFlow(flowId)
      .then((result) => {
        setFlow(result);
        setOtpSuccessMessage(result?.phoneVerification.codeVerified ? "Celular verificado correctamente." : "");
      })
      .finally(() => setLoading(false));
  }, [flowId]);

  useEffect(() => {
    if (!flow || flow.ineProcessingStatus !== "processing") return undefined;
    let active = true;
    const refresh = () => {
      void getSolicitudFlow(flow.flowId).then((refreshed) => {
        if (!active || !refreshed || refreshed.ineProcessingStatus === "processing") return;
        setFlow((current) => {
          if (!current || current.flowId !== refreshed.flowId) return refreshed;
          const generalData = Object.fromEntries(
            Object.entries(refreshed.generalData).map(([field, refreshedValue]) => {
              const currentValue = current.generalData[field as keyof OnboardingGeneralData];
              const hasCurrentValue = currentValue !== null && String(currentValue).trim() !== "";
              return [field, hasCurrentValue ? currentValue : refreshedValue];
            }),
          ) as unknown as OnboardingGeneralData;
          return {
            ...refreshed,
            generalData,
            fiscalIdentity: current.fiscalIdentity.source === "manual" ? current.fiscalIdentity : refreshed.fiscalIdentity,
          };
        });
        if (refreshed.ineProcessingStatus === "failed") {
          setError(refreshed.ineProcessingMessage ?? "No pudimos terminar de revisar tu identificación. Intenta nuevamente.");
        }
      });
    };
    const interval = window.setInterval(refresh, 900);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [flow?.flowId, flow?.ineProcessingStatus]);

  useEffect(() => {
    if (!flow || flow.currentStep !== "documentos" || flow.backendDocumentsLoaded) return;
    setSaving(true);
    setError(null);
    void loadSolicitudRequiredDocuments(flow.flowId)
      .then(setFlow)
      .catch(() => setError("No pudimos cargar la lista de documentos. Mostraremos una lista base para continuar."))
      .finally(() => setSaving(false));
  }, [flow?.flowId, flow?.currentStep, flow?.backendDocumentsLoaded]);

  useEffect(() => {
    if (!flow || flow.currentStep !== "datos_basicos") return;
    let ignore = false;
    void getStateCatalog()
      .then((result) => {
        if (ignore) return;
        const mapped = mapStatesCatalog(result);
        setStateOptions(mapped.length > 0 ? mapped : FALLBACK_STATES);
      })
      .catch(() => {
        if (!ignore) setStateOptions(FALLBACK_STATES);
      });
    return () => {
      ignore = true;
    };
  }, [flow?.currentStep]);

  useEffect(() => {
    const zipCode = flow?.generalData?.codigoPostal ?? "";
    if (!flow || flow.currentStep !== "datos_basicos" || zipCode.length !== 5 || zipCode === lastZipLookup) return;

    setLastZipLookup(zipCode);
    setZipLoading(true);
    setZipMessage("");
    void getAddressCatalogByZipCode(zipCode)
      .then((result) => {
        const mapped = mapAddressCatalog(result);
        if (!mapped.estadoNombre && !mapped.municipioNombre) {
          setColonyOptions([]);
          setZipMessage("No pudimos encontrar tu código postal. Puedes revisar el dato o intentarlo nuevamente.");
          return;
        }
        setColonyOptions(mapped.colonias);
        setFlow((current) => {
          if (!current || current.flowId !== flow.flowId || current.generalData.codigoPostal !== zipCode) return current;
          const firstColony = mapped.colonias[0];
          return {
            ...current,
            generalData: {
              ...current.generalData,
              estadoId: mapped.estadoId || current.generalData.estadoId,
              estadoNombre: mapped.estadoNombre || current.generalData.estadoNombre,
              municipioId: mapped.municipioId || current.generalData.municipioId,
              municipioNombre: mapped.municipioNombre || current.generalData.municipioNombre,
              coloniaId: current.generalData.coloniaId || firstColony?.id || "",
              coloniaNombre: current.generalData.coloniaNombre || firstColony?.name || "",
            },
          };
        });
      })
      .catch(() => {
        setColonyOptions([]);
        setZipMessage("No pudimos encontrar tu código postal. Puedes revisar el dato o intentarlo nuevamente.");
      })
      .finally(() => setZipLoading(false));
  }, [flow?.flowId, flow?.currentStep, flow?.generalData?.codigoPostal, lastZipLookup]);

  const stepNumber = useMemo(() => {
    if (!flow) return 1;
    if (flow.currentStep === "final" || flow.currentStep === "bienvenida") return 1;
    return STEP_NUMBER[flow.currentStep];
  }, [flow]);

  const withActionLock = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (actionInFlightRef.current) return undefined;
    actionInFlightRef.current = true;
    setSaving(true);
    setError(null);
    setCorrectionIssues([]);
    try {
      return await action();
    } finally {
      actionInFlightRef.current = false;
      setSaving(false);
    }
  };

  const handleFlowError = (actionError: unknown, fallback: string) => {
    if (actionError instanceof SolicitudCorrectionError) {
      setCorrectionIssues(actionError.issues);
      const issueDetail = actionError.issues.map((issue) => issue.message).join(" ");
      setError(flowRef.current?.currentStep === "processing"
        ? actionError.message
        : `${actionError.message} ${issueDetail}`.trim());
      return;
    }
    setCorrectionIssues([]);
    setError(actionError instanceof Error ? actionError.message : fallback);
  };

  const runAction = async (action: () => Promise<SolicitudFlowState>, redirect?: string) => {
    try {
      const nextFlow = await withActionLock(action);
      if (!nextFlow) return;
      setFlow(nextFlow);
      if (redirect) navigate(redirect);
    } catch (actionError) {
      handleFlowError(actionError, "No pudimos guardar este paso.");
    }
  };

  const processingMessages = [
    "Revisando la información",
    "Confirmando la autorización",
    "Evaluando tu solicitud",
    "Preparando el resultado",
  ];

  async function processAndSubmitSolicitudCore(targetFlowId = flow?.flowId) {
    if (!targetFlowId) return;
    const processingFlow = await startSolicitudProcessing(targetFlowId);
    setFlow(processingFlow);
    for (let index = 0; index < processingMessages.length; index += 1) {
      setProcessingIndex(index);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
    }
    const submitted = await submitSolicitudFlow(targetFlowId);
    setFlow(submitted);
    navigate(`/solicitud/${targetFlowId}/final`);
  }

  async function processAndSubmitSolicitud(targetFlowId = flow?.flowId) {
    try {
      await withActionLock(() => processAndSubmitSolicitudCore(targetFlowId));
    } catch (actionError) {
      handleFlowError(actionError, "No fue posible completar la evaluación en este momento. Intenta nuevamente.");
    }
  }

  async function recoverSolicitud() {
    const folio = recoveryFolioInput.trim();
    if (!folio) {
      setRecoveryError("Ingresa el folio que recibiste al guardar tu solicitud.");
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError("");
    try {
      const recovered = await getSolicitudFlowByRecoveryFolio(folio);
      if (!recovered) {
        setRecoveryError("No encontramos tu solicitud. El folio puede haber vencido; puedes generar una nueva.");
        return;
      }
      setShowRecoveryDialog(false);
      navigate(recovered.currentStep === "final"
        ? `/solicitud/${recovered.flowId}/final`
        : `/solicitud/${recovered.flowId}`);
    } finally {
      setRecoveryLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[820px] items-center justify-center px-3 sm:min-h-[calc(100dvh-4rem)] sm:px-6">
        <div className="flex items-center gap-3 rounded-[8px] bg-white px-5 py-4 text-slate-600 shadow-sm ring-1 ring-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando tu solicitud
        </div>
      </section>
    );
  }

  if (!flowId) {
    const startSolicitud = () =>
      runAction(async () => {
        const created = await createSolicitudFlow(demoScenario ?? undefined);
        navigate(`/solicitud/${created.flowId}`);
        return created;
      });

    return (
      <section className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#F5FAFF] text-slate-950">
        <LandingDecor />
        <header className="relative z-10 w-full border-b border-white/80 bg-white/70 backdrop-blur">
          <div className="mx-auto flex min-h-[72px] w-full max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[88px] sm:px-10 sm:py-4 lg:px-14">
            <button
              className="w-fit rounded-[12px] outline-none transition focus:ring-2 focus:ring-[#B8D4F0]"
              type="button"
              onClick={() => navigate("/")}
            >
              <AlpezLogo className="h-10 sm:h-14" variant="horizontal" />
            </button>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[12px] px-2 text-sm font-semibold text-[#062B52] transition hover:bg-[#F3F8FD] focus:outline-none focus:ring-2 focus:ring-[#B8D4F0] sm:h-11 sm:px-3"
                type="button"
                onClick={() => setShowLandingHelp(true)}
              >
                <CircleHelp className="h-5 w-5" />
                Ayuda
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex min-h-[calc(100dvh-72px)] items-center sm:min-h-[calc(100dvh-88px)]">
          <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 py-6 sm:gap-10 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="grid min-w-0 items-center gap-8 lg:grid-cols-[minmax(0,660px)_minmax(340px,1fr)] lg:gap-14 xl:grid-cols-[minmax(0,690px)_minmax(380px,1fr)]">
              <div className="min-w-0 max-w-[690px] text-left">
                <h1 className="max-w-[720px] text-[clamp(2.25rem,10.5vw,3rem)] font-extrabold leading-[1.04] tracking-normal text-[#0F172A] sm:text-[clamp(3.1rem,4.7vw,5.1rem)] sm:leading-[0.99]">
                  Solicita tu línea de crédito{" "}
                  <br className="hidden sm:block" />
                  <span className="text-[#0F4C81]">en minutos</span>
                </h1>
                <p className="mt-5 max-w-[520px] text-base leading-7 text-[#475569] sm:mt-6 sm:text-lg sm:leading-8">
                  Completa tu información paso a paso y te guiaremos durante todo el proceso.
                </p>

                <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-row sm:items-center sm:gap-4 [&>button]:w-full sm:[&>button]:w-auto">
                  <Button
                    className="h-12 rounded-[12px] bg-[#003C69] px-7 text-base shadow-[0_14px_30px_rgba(0,60,105,0.24)] hover:bg-[#062B52] focus:ring-2 focus:ring-[#B8D4F0] sm:min-w-56"
                    icon={<FileText className="h-5 w-5" />}
                    loading={saving}
                    size="lg"
                    type="button"
                    onClick={() => void startSolicitud()}
                  >
                    Iniciar solicitud
                  </Button>
                  <Button
                    className="h-12 rounded-[12px] border-[#0F4C81] px-6 text-base text-[#062B52] hover:bg-[#F3F8FD] focus:ring-2 focus:ring-[#B8D4F0] sm:min-w-56"
                    icon={<Clock3 className="h-5 w-5" />}
                    size="lg"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRecoveryError("");
                      setShowRecoveryDialog(true);
                    }}
                  >
                    Ya tengo una solicitud
                  </Button>
                </div>

                <p className="mt-5 flex items-start gap-2 text-sm font-medium leading-6 text-[#64748B] sm:items-center">
                  <Lock className="mt-1 h-4 w-4 shrink-0 text-[#0F4C81] sm:mt-0" />
                  Tus datos se usan únicamente para revisar tu solicitud.
                </p>
              </div>

              <div className="hidden min-h-[390px] lg:block" />
            </div>

            <div className="grid w-full max-w-[1080px] gap-4 md:grid-cols-3 lg:gap-5">
              {landingBenefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article
                    className="flex min-h-28 min-w-0 items-center gap-4 rounded-[18px] border border-[#E2E8F0] bg-white/88 p-4 shadow-[0_18px_42px_rgba(15,76,129,0.1)] backdrop-blur sm:gap-5 sm:p-5 md:items-start"
                    key={benefit.title}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EAF2FB] text-[#0F4C81] ring-1 ring-[#D8E8F7]">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-[#062B52]">{benefit.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#475569]">{benefit.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </main>

        {showLandingHelp && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[calc(100dvh-0.75rem)] w-full max-w-md overflow-y-auto rounded-t-[18px] border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-[18px] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Canal de ayuda</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Un asesor puede orientarte sobre tu solicitud.</p>
                </div>
                <button
                  className="rounded-[10px] px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#B8D4F0]"
                  type="button"
                  onClick={() => setShowLandingHelp(false)}
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
                <p>Teléfono: 222 555 0100</p>
                <p>Correo: apoyo@alpez.mx</p>
                <p>Ten a la mano tu folio para recibir atención más rápido.</p>
              </div>
            </div>
          </div>
        )}
        {showRecoveryDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4">
            <form
              className="max-h-[calc(100dvh-0.75rem)] w-full max-w-md overflow-y-auto rounded-t-[18px] border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-[18px] sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void recoverSolicitud();
              }}
            >
              <h2 className="text-2xl font-bold text-slate-950">Continúa tu solicitud</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ingresa el folio de recuperación que guardaste durante el proceso.
              </p>
              <Input
                autoFocus
                className="mt-5 h-12 text-base uppercase"
                error={recoveryError || undefined}
                label="Folio de recuperación"
                placeholder="ALP-20260715-ABC123"
                value={recoveryFolioInput}
                onChange={(event) => {
                  setRecoveryError("");
                  setRecoveryFolioInput(event.target.value.toUpperCase());
                }}
              />
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowRecoveryDialog(false)}>
                  Cancelar
                </Button>
                <Button loading={recoveryLoading} type="submit">
                  Continuar solicitud
                </Button>
              </div>
            </form>
          </div>
        )}
      </section>
    );
  }

  if (!flow) {
    return (
      <QuestionScreen
        step={1}
        totalSteps={TOTAL_STEPS}
        title="No encontramos esta solicitud"
        description="Puedes iniciar una nueva solicitud cuando quieras."
        actions={
          <Button size="lg" type="button" onClick={() => navigate("/solicitud")}>
            Iniciar solicitud
          </Button>
        }
      >
        <div />
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "tipo_solicitante") {
    const demoWarning = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true"
      ? demoScenarioPersonTypeWarning(flow.demoCreditScenario, flow.applicantKind)
      : null;

    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="¿Quién solicita el crédito?"
        description="Esto nos ayuda a pedirte únicamente la información necesaria."
      >
        <div className="grid gap-4">
          <ChoiceCard
            icon={<User className="h-6 w-6" />}
            selected={flow.applicantKind === "physical"}
            title="Soy persona física"
            onClick={() => runAction(() => selectApplicantKind(flow.flowId, "physical"))}
          />
          <ChoiceCard
            icon={<Building2 className="h-6 w-6" />}
            selected={flow.applicantKind === "company"}
            title="Represento a una empresa"
            onClick={() => runAction(() => selectApplicantKind(flow.flowId, "company"))}
          />
          {demoWarning && (
            <p className="rounded-[8px] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {demoWarning}
            </p>
          )}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "ine") {
    const canContinue = Boolean(flow.ineFront && flow.ineBack);

    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Sube una foto de tu INE"
        description="Necesitamos una imagen clara del frente y reverso de tu identificación."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "tipo_solicitante"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinue}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "revision_ine"))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {[
            { key: "front", title: "Frente de la INE", file: flow.ineFront },
            { key: "back", title: "Reverso de la INE", file: flow.ineBack },
          ].map((item) => (
            <IneUploadCard
              disabled={saving}
              file={item.file}
              key={item.key}
              title={item.title}
              onSelect={(file) => {
                const fileError = validateSelectedFile(file, true);
                if (fileError) {
                  setError(fileError);
                  return;
                }
                void storedFileFromFile(file).then((storedFile) =>
                  runAction(() => saveIneFile(flow.flowId, item.key as "front" | "back", storedFile)),
                ).catch((fileReadError) => handleFlowError(fileReadError, "No pudimos leer el archivo."));
              }}
            />
          ))}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "revision_ine") {
    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Revisa que tu INE se vea bien"
        description="Antes de continuar, confirma que la información sea legible."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "ine"))}
            >
              Quiero cambiar la imagen
            </Button>
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => confirmIneReview(flow.flowId, true))}
            >
              Sí, se ve bien
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {["La foto no está borrosa", "El texto se puede leer", "La identificación aparece completa"].map((item) => (
            <div className="flex items-center gap-3 rounded-[8px] bg-slate-50 p-3 text-sm text-slate-700 sm:p-4 sm:text-base" key={item}>
              <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
          {saving && (
            <div className="flex items-start gap-3 rounded-[8px] bg-[#F5FAFF] p-4 text-sm leading-6 text-slate-700">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[#0F4C81]" />
              <p>Estamos preparando tu información. Si tarda más de lo esperado, avanzaremos automáticamente para que puedas continuar.</p>
            </div>
          )}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "datos_basicos") {
    const hasOcrPrefill = Boolean(flow.ocrPrefillFields?.length);
    const generalData = flow.generalData;
    const ineStillProcessing = flow.ineProcessingStatus === "processing";
    const ineProcessingFailed = flow.ineProcessingStatus === "failed";
    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title={flow.applicantKind === "company" ? "Datos del representante legal" : "Cuéntanos sobre ti"}
        description="Usaremos estos datos para identificar tu solicitud."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "revision_ine"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinueBasicData(flow) || ineStillProcessing || ineProcessingFailed}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => saveBasicData(flow.flowId, normalizeGeneralDataInput(generalData)))}
            >
              Continuar
            </Button>
          </>
        }
      >
        {ineStillProcessing && (
          <div className="mb-4 flex items-start gap-3 rounded-[8px] bg-[#F5FAFF] px-4 py-3 text-sm leading-6 text-slate-700">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[#0F4C81]" />
            <div>
              <p className="font-bold text-slate-950">Puedes completar tus datos mientras terminamos la revisión.</p>
              <p>El botón Continuar se habilitará automáticamente cuando esté lista.</p>
            </div>
          </div>
        )}
        {ineProcessingFailed && (
          <div className="mb-4 rounded-[8px] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            <p className="font-bold">No pudimos terminar de revisar tu identificación.</p>
            <p>Tu información capturada se conserva. Intenta nuevamente para continuar.</p>
            <Button className="mt-3" loading={saving} size="sm" type="button" variant="outline" onClick={() => runAction(() => confirmIneReview(flow.flowId, true))}>
              Reintentar revisión
            </Button>
          </div>
        )}
        {hasOcrPrefill && (
          <p className="mb-4 rounded-[8px] bg-[#F5FAFF] px-4 py-3 text-sm leading-6 text-slate-600">
            Prellenamos algunos datos desde tu identificación. Puedes revisarlos y corregirlos si es necesario.
          </p>
        )}
        <GeneralDataFields
          colonyOptions={colonyOptions}
          stateOptions={stateOptions}
          value={generalData}
          zipLoading={zipLoading}
          zipMessage={zipMessage}
          onChange={(nextGeneralData) => setFlow({ ...flow, generalData: nextGeneralData })}
        />
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "fiscal_identity") {
    const hasPrefill = flow.fiscalIdentity.source === "backend" || flow.fiscalIdentity.source === "ocr";
    const isEmpty = !flow.fiscalIdentity.rfc && !flow.fiscalIdentity.curp;
    const identityIsConsistent = isFiscalIdentityConsistent(flow.fiscalIdentity, flow.generalData);
    const identityErrors = validateFiscalIdentity(flow.fiscalIdentity);

    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title={flow.applicantKind === "company" ? "Confirma los datos fiscales del representante" : "Confirma tu RFC y CURP"}
        description="Usaremos estos datos para continuar con la revisión de tu solicitud."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_basicos"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!isFiscalIdentityComplete(flow.fiscalIdentity) || !identityIsConsistent}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => saveFiscalIdentity(flow.flowId, normalizeFiscalIdentity(flow.fiscalIdentity)))}
            >
              Continuar
            </Button>
          </>
        }
      >
        {hasPrefill && (
          <p className="mb-4 rounded-[8px] bg-[#F5FAFF] px-4 py-3 text-sm leading-6 text-slate-600">
            Prellenamos estos datos con la información capturada. Revísalos antes de continuar.
          </p>
        )}
        {isEmpty && (
          <p className="mb-4 rounded-[8px] bg-[#F5FAFF] px-4 py-3 text-sm leading-6 text-slate-600">
            No pudimos completar estos datos automáticamente. Puedes capturarlos manualmente.
          </p>
        )}
        <FiscalIdentityFields
          generalData={flow.generalData}
          value={flow.fiscalIdentity}
          onEditGeneralData={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_basicos"))}
          onChange={(fiscalIdentity) => setFlow({ ...flow, fiscalIdentity })}
        />
        {identityErrors.curp && (
          <div className="mt-4 rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <p>La CURP proviene de tu identificación. Para corregirla, vuelve a cargar las imágenes de tu INE.</p>
            <Button className="mt-3" size="sm" type="button" variant="outline" onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "ine"))}>
              Volver a cargar mi INE
            </Button>
          </div>
        )}
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "datos_negocio") {
    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title={flow.applicantKind === "company" ? "Cuéntanos sobre la empresa" : "Cuéntanos sobre tu negocio"}
        description="Esta información nos ayuda a entender mejor tu actividad."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "fiscal_identity"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinueBusinessData(flow.businessData)}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => saveBusinessData(flow.flowId, flow.businessData))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <BusinessDataFields
          applicantKind={flow.applicantKind}
          value={flow.businessData}
          onChange={(businessData) => setFlow({ ...flow, businessData })}
        />
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "documentos") {
    const counts = documentCounts(flow);
    const visibleDocuments = visibleSolicitudDocuments(flow);
    const documentsByBackendGroup = (group: SolicitudDocument["backendGroup"]) =>
      visibleDocuments.filter((document) => document.backendGroup === group);
    const documentsByType = (types: string[]) =>
      visibleDocuments.filter((document) => !document.backendGroup && types.includes(document.applicationType));
    const holderDocuments = flow.backendDocumentsLoaded
      ? documentsByBackendGroup("solicitante")
      : documentsByType([
          "ine_titular",
          "ine_representante_legal",
          "curp",
          "constancia_situacion_fiscal",
          "comprobante_domicilio_titular",
          "comprobante_domicilio_negocio",
          "comprobante_domicilio_empresa",
          "comprobante_domicilio_representante",
          "opinion_positiva_sat",
          "poder_representante_legal",
          "acta_constitutiva",
        ]);
    const guarantorDocuments = flow.backendDocumentsLoaded
      ? documentsByBackendGroup("aval")
      : documentsByType(["ine_aval", "comprobante_domicilio_aval"]);
    const guaranteeDocuments = flow.backendDocumentsLoaded
      ? documentsByBackendGroup("garantia")
      : documentsByType(["garantia"]);
    const isIneStartupDocument = (document: SolicitudDocument) => {
      const backendKey = document.backendKey?.toLowerCase() ?? "";
      return (
        document.applicationType === "ine_titular" ||
        document.applicationType === "ine_representante_legal" ||
        (document.backendGroup === "solicitante" && backendKey.includes("ine"))
      );
    };
    const saveFile = (document: SolicitudDocument, file: File) => {
      const fileError = validateSelectedFile(file);
      if (fileError) {
        setError(fileError);
        return;
      }
      void storedFileFromFile(file)
        .then((storedFile) => runAction(() => saveDocumentFile(flow.flowId, document.id, storedFile)))
        .catch((fileReadError) => handleFlowError(fileReadError, "No pudimos leer el archivo."));
    };
    const renderDocumentCard = (document: SolicitudDocument) => {
      const hasFile = Boolean(document.file);

      return (
        <div className="min-w-0 rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4" key={document.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">{document.label}</p>
                <span className={cx("rounded-full px-3 py-1 text-xs font-bold", documentStatusClass(document.status))}>
                  {PUBLIC_DOCUMENT_STATUS_LABELS[document.status]}
                </span>
              </div>
              {document.file && <p className="mt-1 truncate text-sm text-slate-500">{document.file.name}</p>}
              <FilePreview file={document.file} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
              {hasFile && (
                <Button
                  icon={<Eye className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewFile(document.file ?? null)}
                >
                  Ver archivo
                </Button>
              )}
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:h-8">
                {hasFile ? <RefreshCw className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                {hasFile ? "Cambiar" : "Agregar"}
                <input
                  accept="image/*,.pdf"
                  className="sr-only"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    event.currentTarget.value = "";
                    saveFile(document, file);
                  }}
                />
              </label>
              {hasFile && (
                <Button
                  icon={<Trash2 className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => runAction(() => removeDocumentFile(flow.flowId, document.id))}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    };
    const renderIneCard = (document: SolicitudDocument) => {
      const hasIne = document.status === "uploaded" || Boolean(flow.ineFront && flow.ineBack);
      const backendKey = document.backendKey?.toLowerCase() ?? "";
      const inePreviewFile = backendKey.includes("reverso") ? flow.ineBack : flow.ineFront;
      const canChangeIne = Boolean(flow.ineFront || flow.ineBack) && !document.backendDocumentId;

      return (
        <div className="min-w-0 rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4" key={document.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">{document.label}</p>
                <span
                  className={cx(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    hasIne ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {hasIne ? "Agregada desde el inicio" : "Falta agregar"}
                </span>
              </div>
              {hasIne ? (
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  {flow.ineFront && <p className="truncate">Frente: {flow.ineFront.name}</p>}
                  {flow.ineBack && <p className="truncate">Reverso: {flow.ineBack.name}</p>}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Necesitamos frente y reverso para continuar la revisión.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
              {hasIne && inePreviewFile?.previewUrl && (
                <Button
                  icon={<Eye className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewFile(inePreviewFile)}
                >
                  Ver archivo
                </Button>
              )}
              {(!hasIne || canChangeIne) && (
                <Button
                  icon={hasIne ? <RefreshCw className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "ine"))}
                >
                  {hasIne ? "Cambiar" : "Agregar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    };
    const renderSection = (title: string, description: string, documents: SolicitudDocument[]) =>
      documents.length > 0 ? (
        <section className="min-w-0 rounded-[8px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="grid gap-3">
            {documents.map((document) =>
              isIneStartupDocument(document)
                ? renderIneCard(document)
                : renderDocumentCard(document),
            )}
          </div>
        </section>
      ) : null;
    const renderChoice = (value: boolean | undefined, onSelect: (value: boolean) => void) => (
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {[
          { label: "Sí", value: true },
          { label: "No / aún no", value: false },
        ].map((choice) => (
          <button
            className={cx(
              "min-h-11 rounded-[8px] border px-3 text-sm font-bold transition sm:min-h-12 sm:px-4 sm:text-base",
              value === choice.value
                ? "border-[#0F4C81] bg-[#F5FAFF] text-[#0F4C81] ring-2 ring-[#E6F0FA]"
                : "border-slate-200 bg-white text-slate-800 hover:border-[#0F4C81]",
            )}
            key={choice.label}
            type="button"
            onClick={() => onSelect(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    );

    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Completa tus documentos"
        description="Puedes agregarlos ahora o continuar y completarlos después si hace falta."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_negocio"))}
            >
              Atrás
            </Button>
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "phone_verification"))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="mb-5 grid gap-2 rounded-[8px] bg-slate-50 p-3 text-sm font-semibold text-slate-600 sm:grid-cols-2 sm:gap-3 sm:p-4">
          <div>Documentos agregados: {counts.added}</div>
          <div>Pendientes por completar: {counts.pending}</div>
        </div>
        <div className="mb-5 rounded-[8px] bg-[#F5FAFF] p-4 text-sm leading-6 text-slate-700">
          Puedes continuar aunque no tengas todos los documentos. Si hace falta algo, un asesor podrá solicitarlo después.
        </div>
        <>
          <div className="grid gap-5">
            {renderSection(
              "Documentos del titular",
              "Agrega los documentos principales para revisar tu solicitud.",
              holderDocuments,
            )}
            <section className="min-w-0 rounded-[8px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">Aval</h2>
              </div>
              <div className="rounded-[8px] bg-white p-3 sm:p-4">
                <p className="mb-3 font-bold text-slate-950">¿Tu solicitud contará con aval?</p>
                {renderChoice(flow.hasGuarantor, (value) =>
                  runAction(() => setGuarantorChoice(flow.flowId, value)),
                )}
                {flow.hasGuarantor === true && <div className="mt-4 grid gap-3">{guarantorDocuments.map(renderDocumentCard)}</div>}
                {flow.hasGuarantor === false && (
                  <p className="mt-4 rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-600">
                    Puedes continuar. Si se requiere aval, un asesor te lo solicitará más adelante.
                  </p>
                )}
              </div>
            </section>
            <section className="min-w-0 rounded-[8px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">Garantía</h2>
              </div>
              <div className="rounded-[8px] bg-white p-3 sm:p-4">
                <p className="mb-3 font-bold text-slate-950">¿Cuentas con una garantía para esta solicitud?</p>
                {renderChoice(flow.hasCollateral, (value) =>
                  runAction(() => setCollateralChoice(flow.flowId, value)),
                )}
                {flow.hasCollateral === true && <div className="mt-4 grid gap-3">{guaranteeDocuments.map(renderDocumentCard)}</div>}
                {flow.hasCollateral === false && (
                  <p className="mt-4 rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-600">
                    Puedes continuar. Si se requiere garantía, un asesor te lo indicará.
                  </p>
                )}
              </div>
            </section>
          </div>
          {previewFile && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
              <div className="flex max-h-[calc(100dvh-0.5rem)] w-full max-w-4xl flex-col rounded-t-[14px] bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-[14px]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-950">{previewFile.name}</h2>
                    <p className="text-xs text-slate-500">Vista previa del archivo cargado</p>
                  </div>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setPreviewFile(null)}>
                    Cerrar
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-3 sm:p-4">
                  {isImageFile(previewFile) && (
                    <img
                      alt={previewFile.name}
                      className="mx-auto max-h-[75dvh] max-w-full rounded-[8px] object-contain sm:max-h-[72dvh]"
                      src={previewFile.previewUrl}
                    />
                  )}
                  {!isImageFile(previewFile) && previewFile.previewUrl && (
                    <iframe
                      className="h-[75dvh] w-full rounded-[8px] border border-slate-200 bg-white sm:h-[72dvh]"
                      src={previewFile.previewUrl}
                      title={previewFile.name}
                    />
                  )}
                  {!previewFile.previewUrl && (
                    <div className="rounded-[8px] bg-white p-6 text-center text-sm text-slate-600">
                      No hay vista previa disponible para este archivo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "phone_verification") {
    const verification = flow.phoneVerification;
    const hasValidPhone = verification.phone.length === 10;
    const phoneEnding = verification.phone.slice(-4);
    const canConfirmCode = otpCode.length === 6;
    const canContinue = verification.codeVerified;
    const sendCode = async (eventName?: "sms_enviado" | "otp_reenviado") => {
      setOtpSuccessMessage("");
      try {
        const nextFlow = await withActionLock(() => sendPhoneVerificationCode(flow.flowId, eventName));
        if (!nextFlow) return;
        setFlow(nextFlow);
        setOtpCode("");
        setResendCooldown(30);
        setOtpSuccessMessage("Te enviamos un código por SMS.");
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "No pudimos enviar el código.");
      }
    };
    const confirmCode = async () => {
      setOtpSuccessMessage("");
      try {
        await withActionLock(async () => {
          const nextFlow = await verifyPhoneCode(flow.flowId, otpCode);
          if (nextFlow.phoneVerification.codeVerified) {
            setOtpSuccessMessage("Celular verificado correctamente.");
            setFlow(await updateSolicitudStep(nextFlow.flowId, "autorizacion"));
          } else {
            setFlow(nextFlow);
            setError(nextFlow.phoneVerification.lastError ?? "El código no coincide. Revisa los dígitos e inténtalo de nuevo.");
          }
        });
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "No pudimos confirmar el código.");
      }
    };

    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Verifica tu celular"
        description="Te enviaremos un código para confirmar que podemos contactarte durante el proceso."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "documentos"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinue}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "autorizacion"))}
            >
              Continuar
            </Button>
          </>
        }
      >
        {!hasValidPhone ? (
          <div className="rounded-[8px] bg-amber-50 p-4 text-amber-800 sm:p-5">
            <p className="font-bold">Necesitamos tu número celular para enviarte el código.</p>
            <Button
              className="mt-4"
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_basicos"))}
            >
              Volver a datos personales
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-700 sm:p-4 sm:text-base sm:leading-7">
              <p>El código se enviará al número que capturaste en tus datos personales.</p>
              <p className="mt-2 font-bold text-slate-950">
                Enviaremos el código al número terminado en ...{phoneEnding}
              </p>
            </div>

            {!verification.codeSent && !verification.codeVerified && (
              <Button
                className="min-h-12 w-full"
                icon={<MessageSquare className="h-4 w-4" />}
                loading={saving}
                size="lg"
                type="button"
                onClick={() => void sendCode("sms_enviado")}
              >
                {saving ? "Enviando código..." : "Enviar código"}
              </Button>
            )}

            {verification.codeSent && !verification.codeVerified && (
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Código de verificación</span>
                  <input
                    className="h-14 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-center text-xl font-bold text-slate-950 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA] sm:px-4 sm:text-2xl sm:placeholder:text-base"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Código de 6 dígitos"
                    value={otpCode}
                    onChange={(event) => {
                      setError(null);
                      setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    }}
                  />
                </label>
                <Button
                  className="min-h-12 w-full"
                  disabled={!canConfirmCode}
                  loading={saving}
                  size="lg"
                  type="button"
                  onClick={() => void confirmCode()}
                >
                  {saving ? "Verificando..." : "Confirmar código"}
                </Button>
                <div className="flex flex-col gap-2 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-center">
                  <span>¿No recibiste el código?</span>
                  <button
                    className="font-bold text-[#0F4C81] disabled:text-slate-400"
                    disabled={resendCooldown > 0 || saving}
                    type="button"
                    onClick={() => void sendCode("otp_reenviado")}
                  >
                    {resendCooldown > 0 ? `Reenviar código en ${resendCooldown}s` : "Reenviar código"}
                  </button>
                </div>
              </div>
            )}

            {otpSuccessMessage && (
              <div className="rounded-[8px] bg-emerald-50 p-4 text-center font-bold text-emerald-700">
                {otpSuccessMessage}
              </div>
            )}
            {verification.attempts >= 5 && !verification.codeVerified && (
              <p className="rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Has intentado varias veces. Puedes reenviar el código o pedir ayuda.
              </p>
            )}
          </div>
        )}
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "autorizacion") {
    const continueWithAuthorization = async () => {
      if (!flow.authorizationAccepted) {
        setError("Necesitamos tu autorización para continuar con la solicitud.");
        return;
      }
      try {
        await withActionLock(async () => {
          const authorizedFlow = await acceptAuthorization(flow.flowId, true);
          setFlow(authorizedFlow);
          await processAndSubmitSolicitudCore(authorizedFlow.flowId);
        });
      } catch (actionError) {
        handleFlowError(actionError, "No fue posible completar la evaluación en este momento. Intenta nuevamente.");
      }
    };

    return (
      <QuestionScreen
        feedback={error ?? undefined}
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Autorización para revisar tu información"
        description="Necesitamos tu autorización para continuar con la evaluación de tu solicitud."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "phone_verification"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!flow.authorizationAccepted}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => void continueWithAuthorization()}
            >
              Continuar
            </Button>
          </>
        }
      >
        <label className="flex cursor-pointer gap-3 rounded-[8px] border border-slate-200 p-3 transition hover:border-[#0F4C81] sm:gap-4 sm:p-4">
          <input
            checked={flow.authorizationAccepted}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-[#0F4C81] focus:ring-[#E6F0FA]"
            type="checkbox"
            onChange={(event) => {
              setError(null);
              setFlow({ ...flow, authorizationAccepted: event.target.checked });
            }}
          />
          <span className="min-w-0 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
            Autorizo que mi información sea revisada para continuar con la evaluación de mi solicitud.
          </span>
        </label>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "processing") {
    const correctionSteps = Array.from(new Map(
      correctionIssues.map((issue) => [issue.step, issue]),
    ).values());
    const resumedReviewPending = !saving && !error;
    const processingFeedback = error ?? (resumedReviewPending
      ? "Tu información está completa y guardada. Reintenta la revisión para continuar."
      : null);
    const hasCorrectionIssues = correctionIssues.length > 0;
    const displayedProcessingIndex = processingFeedback
      ? processingMessages.length - 1
      : processingIndex;
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Estamos revisando tu solicitud"
        description="Esto tomará solo unos segundos."
      >
        <div className="grid gap-3">
          {processingMessages.map((message, index) => (
            <div
              className={cx(
                "flex items-center gap-3 rounded-[8px] p-3 text-sm font-semibold transition sm:p-4",
                index <= displayedProcessingIndex ? "bg-[#F5FAFF] text-[#0F4C81]" : "bg-slate-50 text-slate-400",
              )}
              key={message}
            >
              {processingFeedback && index === displayedProcessingIndex ? (
                <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" />
              ) : index < displayedProcessingIndex ? (
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : index === displayedProcessingIndex ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <span className="h-5 w-5 rounded-full border border-slate-300" />
              )}
              <span>{message}</span>
            </div>
          ))}
        </div>
        {processingFeedback && (
          <div
            className={cx(
              "mt-5 rounded-[8px] border p-4 sm:p-5",
              hasCorrectionIssues
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50",
            )}
            role="alert"
          >
            <h2 className={cx(
              "text-lg font-bold",
              hasCorrectionIssues ? "text-red-800" : "text-amber-900",
            )}>
              {hasCorrectionIssues
                ? "Necesitamos corregir algunos datos"
                : resumedReviewPending
                  ? "Tu revisión quedó pendiente"
                  : "La revisión está tardando más de lo esperado"}
            </h2>
            <p className={cx(
              "mt-1 text-sm leading-6",
              hasCorrectionIssues ? "text-red-700" : "text-amber-800",
            )}>
              {processingFeedback}
            </p>
            {hasCorrectionIssues ? (
              <>
                <ul className="mt-4 grid gap-2 text-left text-sm text-red-800">
                  {correctionIssues.map((issue) => (
                    <li className="rounded-[8px] bg-white/80 px-3 py-2" key={`${issue.step}-${issue.field}`}>
                      <strong>{issue.label}:</strong> {issue.message}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 grid gap-2 sm:flex sm:flex-row sm:flex-wrap [&>button]:w-full sm:[&>button]:w-auto">
                  {correctionSteps.map((issue) => (
                    <Button
                      key={issue.step}
                      type="button"
                      variant="outline"
                      onClick={() => runAction(() => updateSolicitudStep(flow.flowId, issue.step))}
                    >
                      Corregir {issue.label}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {!resumedReviewPending && (
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Tu información quedó guardada y no necesitas volver a capturarla.
                  </p>
                )}
                <Button className="mt-4" loading={saving} type="button" variant="outline" onClick={() => void processAndSubmitSolicitud(flow.flowId)}>
                  Reintentar revisión
                </Button>
              </>
            )}
          </div>
        )}
      </QuestionScreen>
    );
  }

  return (
    <QuestionScreen
      feedback={error ?? undefined}
      step={stepNumber}
      totalSteps={TOTAL_STEPS}
      title="Continuemos con tu solicitud"
      description="Volveremos al paso correspondiente para continuar."
      actions={
        <Button
          icon={<ArrowRight className="h-4 w-4" />}
          loading={saving}
          size="lg"
          type="button"
          onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "documentos"))}
        >
          Ir a documentos
        </Button>
      }
    >
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </QuestionScreen>
  );
}
