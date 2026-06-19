import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { obtenerNegocioId, perteneceAlTenant } from '../utils/tenant';

const docsFromSnap = (snap, user) => snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(item => perteneceAlTenant(user, item));

export const getTenantDocs = async (coleccion, user, filtros = []) => {
    const negocioId = obtenerNegocioId(user);
    const ref = collection(db, coleccion);

    if (!negocioId || negocioId === 'super_admin') {
        const snap = await getDocs(filtros.length ? query(ref, ...filtros) : ref);
        return docsFromSnap(snap, user);
    }

    try {
        const snap = await getDocs(query(ref, where('negocioId', '==', negocioId), ...filtros));
        return docsFromSnap(snap, user);
    } catch (error) {
        console.warn(`Sellix: consulta tenant optimizada fallida en ${coleccion}. Usando fallback local.`, error);
        const snap = await getDocs(filtros.length ? query(ref, ...filtros) : ref);
        return docsFromSnap(snap, user);
    }
};

export const ordenarPorCampoTexto = (items, campo = 'nombre') => [...items].sort((a, b) =>
    String(a[campo] || '').localeCompare(String(b[campo] || ''), 'es-MX')
);
