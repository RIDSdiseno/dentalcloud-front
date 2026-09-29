import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { updateMySignature, deleteMySignature } from '../../api/users';
import { SignaturePad } from '../../components/SignaturePad';
import { roleLabel } from '../../utils/roles';
import { TrashIcon } from '../../components/icons';

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

// Pedido explícito del usuario (29/09): "no tienes firma, deseas guardar
// esta firma para futura utilidad?" — un lugar propio, fuera del flujo de
// la receta, donde cada profesional pueda ver, cambiar o borrar su firma.
// Reusa el mismo SignaturePad y los mismos endpoints self-service
// (PATCH/DELETE /auth/me/signature) que ya se usaban ahí.
export default function MiPerfil() {
  const { user, updateUser } = useAuth();
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSaveSignature() {
    if (!signatureDraft) return;
    setError(null);
    setIsSaving(true);
    try {
      const updated = await updateMySignature(signatureDraft);
      updateUser({ signatureUrl: updated.signatureUrl });
      setSignatureDraft(null);
      setIsEditingSignature(false);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la firma'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSignature() {
    const confirmed = window.confirm('¿Eliminar tu firma guardada? Vas a tener que dibujarla de nuevo la próxima vez que la necesites.');
    if (!confirmed) return;
    setError(null);
    setIsDeleting(true);
    try {
      const updated = await deleteMySignature();
      updateUser({ signatureUrl: updated.signatureUrl });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la firma'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mi perfil</h1>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
          {initialsOf(user.name)}
        </span>
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            {roleLabel(user.role)}
            {user.clinicaName ? ` · ${user.clinicaName}` : ''}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Mi firma</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Se usa para identificar quién generó recetas y otros documentos clínicos. Se guarda una sola vez y se reutiliza automáticamente.
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
        )}

        {user.signatureUrl && !isEditingSignature ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <img
              src={user.signatureUrl}
              alt="Tu firma guardada"
              className="h-16 w-fit rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditingSignature(true)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cambiar firma
              </button>
              <button
                type="button"
                onClick={handleDeleteSignature}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {isDeleting ? 'Eliminando...' : 'Eliminar firma'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <SignaturePad onChange={setSignatureDraft} height={140} />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={!signatureDraft || isSaving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar firma'}
              </button>
              {user.signatureUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSignature(false);
                    setSignatureDraft(null);
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
