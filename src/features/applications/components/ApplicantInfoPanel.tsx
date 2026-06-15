import type { Address, Application } from "../types/application.types";
import { Card } from "../../../shared/components/Card";
import { formatMoney } from "../../../shared/lib/formatters";

function addressText(address?: Address): string {
  if (!address) return "No capturado";
  return `${address.street}, ${address.neighborhood}, ${address.municipality}, ${address.state}, CP ${address.zipCode}`;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value ?? "No capturado"}</p>
    </div>
  );
}

export function ApplicantInfoPanel({ application }: { application: Application }) {
  const physical = application.physicalPerson;
  const moral = application.moralPerson;
  const legal = application.legalRepresentative;

  return (
    <Card title="Datos capturados" description="Información principal registrada en la solicitud">
      {application.personType === "fisica" && physical && (
        <div className="grid gap-3 md:grid-cols-2">
          <InfoRow label="Nombre completo" value={application.applicantName} />
          <InfoRow label="RFC" value={physical.rfc} />
          <InfoRow label="CURP" value={physical.curp} />
          <InfoRow label="Teléfono" value={physical.phone} />
          <InfoRow label="Correo" value={physical.email} />
          <InfoRow label="Domicilio titular" value={addressText(physical.personalAddress)} />
          <InfoRow label="Domicilio negocio" value={addressText(physical.businessAddress)} />
          <InfoRow label="Actividad" value={physical.businessActivity} />
          <InfoRow label="Ingresos promedio" value={formatMoney(physical.averageMonthlyIncome ?? 0)} />
          <InfoRow label="Antigüedad negocio" value={`${physical.businessSeniorityYears ?? 0} años`} />
        </div>
      )}
      {application.personType === "moral" && moral && (
        <div className="grid gap-3 md:grid-cols-2">
          <InfoRow label="Razón social" value={moral.legalName} />
          <InfoRow label="RFC empresa" value={moral.rfc} />
          <InfoRow label="Giro" value={moral.businessLine} />
          <InfoRow label="Domicilio empresa" value={addressText(moral.companyAddress)} />
          <InfoRow label="Representante legal" value={legal?.fullName} />
          <InfoRow label="RFC representante" value={legal?.rfc} />
          <InfoRow label="CURP representante" value={legal?.curp} />
          <InfoRow label="Teléfono representante" value={legal?.phone} />
          <InfoRow label="Correo representante" value={legal?.email} />
          <InfoRow label="Ventas anuales" value={formatMoney(moral.annualSales ?? 0)} />
          <InfoRow label="Ingresos promedio" value={formatMoney(moral.averageMonthlyIncome ?? 0)} />
          <InfoRow label="Activos" value={formatMoney(moral.totalAssets ?? 0)} />
          <InfoRow label="Pasivos" value={formatMoney(moral.totalLiabilities ?? 0)} />
          <InfoRow label="Utilidad operativa" value={formatMoney(moral.annualOperatingProfit ?? 0)} />
        </div>
      )}
    </Card>
  );
}
