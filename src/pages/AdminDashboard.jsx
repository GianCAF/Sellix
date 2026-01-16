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
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const listaSucursales = sucSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSucursales(listaSucursales);

            const inicio = new Date(fechaInicio + "T00:00:00");
            const fin = new Date(fechaFin + "T23:59:59");

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

    // --- LÓGICA DE AGRUPACIÓN PARA EL DESGLOSE ---
    const obtenerProductosAgrupados = () => {
        const productosMap = {};

        ventas.forEach(venta => {
            venta.productos?.forEach(prod => {
                const llave = prod.descripcion; // Agrupamos por nombre/descripción
                if (productosMap[llave]) {
                    productosMap[llave].cantidadAcumulada += prod.cantidadVenta;
                    productosMap[llave].subtotalAcumulado += (prod.cantidadVenta * prod.precio);
                } else {
                    productosMap[llave] = {
                        descripcion: prod.descripcion,
                        cantidadAcumulada: prod.cantidadVenta,
                        precioUnitario: prod.precio,
                        subtotalAcumulado: (prod.cantidadVenta * prod.precio)
                    };
                }
            });
        });

        return Object.values(productosMap).sort((a, b) => b.cantidadAcumulada - a.cantidadAcumulada);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
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

                {loading ? (
                    <div className="text-center py-20 font-black text-gray-300 text-2xl uppercase animate-pulse italic">
                        Sincronizando...
                    </div>
                ) : (
                    <>
                        {/* GRID DE RESUMEN POR SUCURSAL */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[30px] mb-12">
                            {sucursales
                                .filter(s => filtroSucursal === 'todas' || s.id === filtroSucursal)
                                .map(suc => {
                                    const totalSuc = obtenerVentaSucursal(suc.id);
                                    return (
                                        <div key={suc.id} className="bg-white p-10 rounded-[45px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-2xl hover:scale-[1.02] transition-all group">
                                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🏪</div>
                                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{suc.nombre}</h3>
                                            <p className="text-gray-400 text-xs font-bold mb-6 italic">{suc.ubicacion || 'Sin ubicación'}</p>

                                            <div className="bg-blue-50 w-full py-6 rounded-[30px]">
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Venta en Periodo</p>
                                                <p className="text-4xl font-black text-blue-600">${totalSuc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* DESGLOSE AGRUPADO POR PRODUCTO (Solo si hay sucursal seleccionada) */}
                        {filtroSucursal !== 'todas' && (
                            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
                                <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-800 uppercase italic">Resumen de Productos Vendidos</h2>
                                        <p className="text-gray-400 text-xs font-bold uppercase mt-1">Consolidado del periodo seleccionado</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase italic">
                                            {obtenerProductosAgrupados().length} Productos diferentes
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción del Producto</th>
                                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cant. Acumulada</th>
                                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Precio Unitario</th>
                                                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Vendido</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {obtenerProductosAgrupados().length > 0 ? obtenerProductosAgrupados().map((p, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                    <td className="p-5">
                                                        <p className="font-black text-gray-700 uppercase text-sm">{p.descripcion}</p>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-black text-xs">
                                                            {p.cantidadAcumulada} pz
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-center font-bold text-gray-500">
                                                        ${p.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <p className="text-lg font-black text-blue-600 italic">
                                                            ${p.subtotalAcumulado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="p-20 text-center text-gray-300 font-black uppercase italic">
                                                        No hay registros para agrupar
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;