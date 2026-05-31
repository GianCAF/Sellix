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
                    productosMap[llave].subtotalAcumulado += (Number(prod.subtotal) || (prod.cantidadVenta * prod.precio));
                } else {
                    productosMap[llave] = {
                        descripcion: prod.descripcion,
                        cantidadAcumulada: prod.cantidadVenta,
                        precioUnitario: prod.precio,
                        subtotalAcumulado: (Number(prod.subtotal) || (prod.cantidadVenta * prod.precio))
                    };
                }
            });
        });

        return Object.values(productosMap).sort((a, b) => b.cantidadAcumulada - a.cantidadAcumulada);
    };

    return (
        <div className="admin-page">
            <AdminNavbar />

            <div className="admin-shell">

                {/* SECCIÓN DE FILTROS Y TOTAL GLOBAL */}
                <div className="admin-summary-panel">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl font-black text-[#1A2517] italic uppercase leading-none">Ventas Totales</h1>
                            <p className="text-3xl font-black text-[#576238] mt-2">
                                ${totalGlobal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="admin-filter-bar">
                            <div className="flex flex-col">
                                <label className="admin-filter-label">Sede</label>
                                <select
                                    className="admin-filter-select"
                                    value={filtroSucursal}
                                    onChange={(e) => setFiltroSucursal(e.target.value)}
                                >
                                    <option value="todas">Todas</option>
                                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col border-l border-[#D8C7B5] pl-4">
                                <label className="admin-filter-label">Desde</label>
                                <input
                                    type="date"
                                    className="admin-filter-input"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col border-l border-[#D8C7B5] pl-4">
                                <label className="admin-filter-label">Hasta</label>
                                <input
                                    type="date"
                                    className="admin-filter-input"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        Sincronizando...
                    </div>
                ) : (
                    <>
                        {/* GRID DE RESUMEN POR SUCURSAL */}
                        <div className="admin-card-grid">
                            {sucursales
                                .filter(s => filtroSucursal === 'todas' || s.id === filtroSucursal)
                                .map(suc => {
                                    const totalSuc = obtenerVentaSucursal(suc.id);
                                    return (
                                        <button key={suc.id} type="button" onClick={() => setFiltroSucursal(suc.id)} className="admin-branch-card cursor-pointer">
                                            <div className="admin-branch-icon">🏪</div>
                                            <h3 className="admin-branch-name">{suc.nombre}</h3>
                                            <p className="admin-branch-location">{suc.ubicacion || 'Sin ubicación'}</p>

                                            <div className="admin-metric-box">
                                                <p className="admin-metric-label">Venta en Periodo</p>
                                                <p className="admin-metric-value">${totalSuc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>

                        {/* DESGLOSE AGRUPADO POR PRODUCTO (Solo si hay sucursal seleccionada) */}
                        {filtroSucursal !== 'todas' && (
                            <div className="admin-table-panel">
                                <div className="p-8 border-b bg-[#F8F5EC]/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="admin-section-title">Resumen de Productos Vendidos</h2>
                                        <p className="admin-section-subtitle">Consolidado del periodo seleccionado</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="admin-badge">
                                            {obtenerProductosAgrupados().length} Productos diferentes
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="admin-table">
                                        <thead className="admin-table-head">
                                            <tr>
                                                <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest">Descripción del Producto</th>
                                                <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest text-center">Cant. Acumulada</th>
                                                <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest text-center">Precio Unitario</th>
                                                <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest text-right">Total Vendido</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F0EADC]">
                                            {obtenerProductosAgrupados().length > 0 ? obtenerProductosAgrupados().map((p, idx) => (
                                                <tr key={idx} className="admin-row">
                                                    <td className="admin-td">
                                                        <p className="font-black text-[#3E4635] uppercase text-sm">{p.descripcion}</p>
                                                    </td>
                                                    <td className="admin-td text-center">
                                                        <span className="bg-[#F0EADC] text-[#1A2517] px-3 py-1 rounded-lg font-black text-xs">
                                                            {p.cantidadAcumulada} pz
                                                        </span>
                                                    </td>
                                                    <td className="admin-td text-center font-bold text-[#67625C]">
                                                        ${p.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="admin-td text-right">
                                                        <p className="text-lg font-black text-[#1A2517] italic">
                                                            ${p.subtotalAcumulado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="p-20 text-center text-[#B8AD9D] font-black uppercase italic">
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
