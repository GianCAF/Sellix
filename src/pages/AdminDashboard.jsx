import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminDashboard = () => {
    const [sucursales, setSucursales] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('todas');

    // Filtros de fecha (Hoy por defecto)
    const hoyStr = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(hoyStr);
    const [fechaFin, setFechaFin] = useState(hoyStr);

    const [loading, setLoading] = useState(true);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // 1. Obtener todas las sucursales
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const listaSucursales = sucSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSucursales(listaSucursales);

            // 2. Configurar el rango de tiempo (de 00:00:00 a 23:59:59)
            const inicio = new Date(fechaInicio + "T00:00:00");
            const fin = new Date(fechaFin + "T23:59:59");

            // 3. Consulta de Ventas unificada
            let qVentas;
            if (filtroSucursal === 'todas') {
                qVentas = query(
                    collection(db, "ventas"),
                    where("fecha", ">=", inicio),
                    where("fecha", "<=", fin),
                    orderBy("fecha", "desc")
                );
            } else {
                qVentas = query(
                    collection(db, "ventas"),
                    where("sucursalId", "==", filtroSucursal),
                    where("fecha", ">=", inicio),
                    where("fecha", "<=", fin),
                    orderBy("fecha", "desc")
                );
            }

            const ventSnap = await getDocs(qVentas);
            setVentas(ventSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Error al cargar ventas:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        cargarDatos();
    }, [filtroSucursal, fechaInicio, fechaFin]);

    const obtenerVentaSucursal = (sucId) => {
        return ventas
            .filter(v => v.sucursalId === sucId)
            .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    };

    const totalGlobal = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />

            <div className="p-4 md:p-8 max-w-7xl mx-auto">

                {/* SECCIÓN DE FILTROS Y TOTAL GLOBAL */}
                <div className="bg-white p-8 rounded-[30px] shadow-sm mb-8 border border-gray-100">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl font-black text-gray-800 italic uppercase leading-none">Ventas Totales</h1>
                            <p className="text-3xl font-black text-green-600 mt-2">
                                ${totalGlobal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center bg-gray-50 p-4 rounded-3xl">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Sede</label>
                                <select
                                    className="bg-transparent font-bold text-gray-700 outline-none p-1"
                                    value={filtroSucursal}
                                    onChange={(e) => setFiltroSucursal(e.target.value)}
                                >
                                    <option value="todas">Todas</option>
                                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col border-l border-gray-200 pl-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Desde</label>
                                <input
                                    type="date"
                                    className="bg-transparent font-bold text-gray-700 outline-none"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col border-l border-gray-200 pl-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Hasta</label>
                                <input
                                    type="date"
                                    className="bg-transparent font-bold text-gray-700 outline-none"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRID DE SUCURSALES (3 columnas responsivo) */}
                {loading ? (
                    <div className="text-center py-20 font-black text-gray-300 text-2xl uppercase animate-pulse italic">
                        Sincronizando...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[30px]">
                        {sucursales
                            .filter(s => filtroSucursal === 'todas' || s.id === filtroSucursal)
                            .map(suc => {
                                const totalSuc = obtenerVentaSucursal(suc.id);
                                return (
                                    <div key={suc.id} className="bg-white p-10 rounded-[45px] shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center hover:shadow-2xl hover:scale-[1.02] transition-all group">
                                        <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🏪</div>
                                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{suc.nombre}</h3>
                                        <p className="text-gray-400 text-xs font-bold mb-6 italic">{suc.ubicacion || 'Sin ubicación'}</p>

                                        <div className="bg-blue-50 w-full py-6 rounded-[30px]">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Vendido</p>
                                            <p className="text-4xl font-black text-blue-600">${totalSuc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;