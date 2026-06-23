import React, { useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { collection, doc, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { obtenerNegocioId, perteneceAlTenant } from '../utils/tenant';

const obtenerMillisFecha = (fecha) => {
    if (!fecha) return 0;
    if (typeof fecha.toMillis === 'function') return fecha.toMillis();
    const valor = new Date(fecha).getTime();
    return Number.isNaN(valor) ? 0 : valor;
};

const formatearFecha = (fecha) => {
    const millis = obtenerMillisFecha(fecha);
    if (!millis) return 'Sin fecha';
    return new Date(millis).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const TecnicoReparaciones = () => {
    const { user } = useAuth();
    const [pendientes, setPendientes] = useState([]);
    const [completandoId, setCompletandoId] = useState(null);

    useEffect(() => {
        const negocioId = obtenerNegocioId(user);
        if (!negocioId) return;
        const pendientesQuery = query(
            collection(db, "pendientes_sucursal"),
            where("negocioId", "==", negocioId),
            where("tipo", "==", "celular_por_venir")
        );

        const unsub = onSnapshot(pendientesQuery, (snap) => {
            const items = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(item => perteneceAlTenant(user, item) && (item.estado || 'pendiente') === 'pendiente')
                .sort((a, b) => obtenerMillisFecha(b.fecha) - obtenerMillisFecha(a.fecha));
            setPendientes(items);
        }, () => {
            setPendientes([]);
            alert("No pude cargar reparaciones pendientes");
        });

        return () => unsub();
    }, [user]);

    const marcarHecho = async (item) => {
        if (completandoId) return;
        setCompletandoId(item.id);
        try {
            await updateDoc(doc(db, "pendientes_sucursal", item.id), {
                estado: 'hecho',
                completadoPorId: user.uid,
                completadoPorNombre: user.nombre || 'Tecnico',
                completadoEn: Timestamp.now()
            });
            window.sellixNotify?.('Reparacion marcada como atendida', { type: 'success' });
        } catch {
            alert("No pude actualizar el pendiente");
        } finally {
            setCompletandoId(null);
        }
    };

    return (
        <div className="technician-page min-h-screen bg-[#F0EADC] pb-20">
            <nav className="technician-header bg-[#FFFDF7] border-b border-[#D8C7B5] p-4 sticky top-0 z-[100] shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="font-black text-2xl text-[#1A2517] uppercase italic tracking-tighter">Sellix Tecnico</h1>
                        <p className="text-[10px] font-black uppercase text-[#8A8377]">{user?.nombre || 'Tecnico'}</p>
                    </div>
                    <button
                        onClick={() => auth.signOut()}
                        className="bg-[#F4E6E1] text-[#9A3B30] px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-[#9A3B30] hover:text-white transition-all shadow-sm"
                    >
                        Salir
                    </button>
                </div>
            </nav>

            <main className="technician-shell admin-shell">
                <section className="admin-summary-panel">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="admin-section-title">Reparaciones por recoger</h2>
                            <p className="admin-section-subtitle">Pendientes clasificados como celular por venir</p>
                        </div>
                        <span className="admin-badge">{pendientes.length} pendientes</span>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {pendientes.map(item => (
                        <article key={item.id} className="technician-card bg-[#FFFDF7] border border-[#E3D9C8] rounded-[30px] p-6 shadow-sm text-[#1A2517]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="inline-flex rounded-full bg-[#E5EEDC] px-3 py-1 text-[9px] font-black uppercase text-[#1A2517]">
                                        Celular por venir
                                    </span>
                                    <h3 className="mt-3 text-xl font-black uppercase italic">{item.sucursalNombre || 'Sucursal'}</h3>
                                    <p className="text-[10px] font-black uppercase text-[#8A8377]">
                                        {item.creadoPorNombre || 'Empleado'} | {formatearFecha(item.fecha)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => marcarHecho(item)}
                                    disabled={completandoId === item.id}
                                    className="btn-green !text-sm !py-3 !px-5 disabled:opacity-50"
                                >
                                    {completandoId === item.id ? '...' : 'Hecho'}
                                </button>
                            </div>
                            <p className="mt-5 whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#3E4635]">{item.nota}</p>
                        </article>
                    ))}

                    {pendientes.length === 0 && (
                        <div className="admin-empty-state lg:col-span-2">
                            No hay celulares pendientes por recoger
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TecnicoReparaciones;
