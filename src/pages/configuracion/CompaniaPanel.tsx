import { useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchCompanyInfo, updateCompanyInfo, uploadCompanyLogo, type CompanyInfo } from '../../api/clinicaSettings';
import { getErrorMessage } from '../../api/client';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

export function CompaniaPanel() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [pais, setPais] = useState('Chile');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  const [legalName, setLegalName] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [legalEmail, setLegalEmail] = useState('');
  const [legalPhone, setLegalPhone] = useState('');
  const [legalWebsite, setLegalWebsite] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  function applyCompany(data: CompanyInfo) {
    setCompany(data);
    setName(data.name ?? '');
    setRut(data.rut ?? '');
    setPais(data.pais ?? 'Chile');
    setAddress(data.address ?? '');
    setEmail(data.email ?? '');
    setPhone(data.phone ?? '');
    setWebsite(data.website ?? '');
    setLegalName(data.legalName ?? '');
    setLegalAddress(data.legalAddress ?? '');
    setLegalEmail(data.legalEmail ?? '');
    setLegalPhone(data.legalPhone ?? '');
    setLegalWebsite(data.legalWebsite ?? '');
    setContactName(data.contactName ?? '');
    setContactEmail(data.contactEmail ?? '');
    setContactPhone(data.contactPhone ?? '');
    setContactAddress(data.contactAddress ?? '');
  }

  useEffect(() => {
    setLoading(true);
    fetchCompanyInfo()
      .then(applyCompany)
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la información de la compañía')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const updated = await updateCompanyInfo({
        name,
        rut,
        pais,
        address,
        email,
        phone,
        website,
        legalName,
        legalAddress,
        legalEmail,
        legalPhone,
        legalWebsite,
        contactName,
        contactEmail,
        contactPhone,
        contactAddress,
      });
      applyCompany(updated);
      setNotice('Información guardada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la información'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoChange(file: File | null) {
    if (!file) return;
    setError(null);
    setIsUploadingLogo(true);
    try {
      const updated = await uploadCompanyLogo(file);
      applyCompany(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo subir el logo'));
    } finally {
      setIsUploadingLogo(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploadingLogo}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-60"
          >
            {isUploadingLogo ? (
              'Subiendo...'
            ) : company?.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              'LOGO'
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleLogoChange(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Información Compañía</h2>
            <p className="text-xs text-slate-500">Se usa en el encabezado de los documentos que genera el sistema.</p>
          </div>
        </div>

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        {notice && <p className="mb-3 text-xs text-emerald-600">{notice}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" value={name} onChange={setName} placeholder="Clínica Dental Providencia" />
          <Field label="RUT" value={rut} onChange={setRut} placeholder="76.123.456-7" />
          <Field label="Dirección" value={address} onChange={setAddress} placeholder="Av. Providencia 1234, Santiago" />
          <Field label="País" value={pais} onChange={setPais} />
          <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="contacto@clinica.cl" />
          <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+56 2 2345 6789" />
          <Field label="Sitio web" value={website} onChange={setWebsite} placeholder="www.clinica.cl" />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Información legal</h2>
        <p className="mb-4 text-xs text-slate-500">Para emisión de documentos tributarios — solo si difiere de lo de arriba.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Razón social" value={legalName} onChange={setLegalName} />
          <Field label="Dirección" value={legalAddress} onChange={setLegalAddress} />
          <Field label="Email" value={legalEmail} onChange={setLegalEmail} type="email" />
          <Field label="Teléfono" value={legalPhone} onChange={setLegalPhone} />
          <Field label="Sitio web" value={legalWebsite} onChange={setLegalWebsite} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Información de contacto</h2>
        <p className="mb-4 text-xs text-slate-500">El contacto principal del sistema.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" value={contactName} onChange={setContactName} />
          <Field label="Email personal" value={contactEmail} onChange={setContactEmail} type="email" />
          <Field label="Teléfono" value={contactPhone} onChange={setContactPhone} />
          <Field label="Dirección" value={contactAddress} onChange={setContactAddress} />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
