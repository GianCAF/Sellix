import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import { perteneceAlTenant } from '../utils/tenant';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [sucursales, setSucursales] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [inventario, setInventario] = useState([]);
    const [ultimaVentaPorSucursal, setUltimaVentaPorSucursal] = useState({});
    const [filtroSucursal, setFiltroSucursal] = useState('todas');
    const [sucursalAlerta, setSucursalAlerta] = useState(null);
    const [procesandoAlertaId, setProcesandoAlertaId] = useState(null);
    const [umbralVentaLenta, setUmbralVentaLenta] = useState(0);

    // Filtros de fecha (Hoy por defecto)
    const hoyStr = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(hoyStr);
    const [fechaFin, setFechaFin] = useState(hoyStr);

    const [loading, setLoading] = useState(true);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [sucSnap, invSnap, ultimasSnap] = await Promise.all([
                getDocs(collection(db, "sucursales")),
                getDocs(collection(db, "inventarios")),
                getDocs(query(collection(db, "ventas"), orderBy("fecha", "desc")))
            ]);
            const listaSucursales = sucSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sucursalesTenant = listaSucursales.filter(item => perteneceAlTenant(user, item));
            setSucursales(sucursalesTenant);
            setInventario(invSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(item => perteneceAlTenant(user, item)));
            const ultimas = {};
            ultimasSnap.docs.forEach(d => {
                const venta = { id: d.id, ...d.data() };
                if (perteneceAlTenant(user, venta) && venta.sucursalId && !ultimas[venta.sucursalId]) ultimas[venta.sucursalId] = venta;
            });
            setUltimaVentaPorSucursal(ultimas);

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
            setVentas(ventSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(item => perteneceAlTenant(user, item)));

        } catch (error) {
            console.error("Error al cargar ventas:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        cargarDatos();
    }, [filtroSucursal, fechaInicio, fechaFin, user]);

    const obtenerVentaSucursal = (sucId) => {
        return ventas
            .filter(v => v.sucursalId === sucId)
            .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    };

    const totalGlobal = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

    const obtenerAlertasStockSucursal = (sucId) => {
        const productosBajos = inventario
            .filter(item => item.sucursalId === sucId && (Number(item.cantidad) || 0) < 5)
            .sort((a, b) => (Number(a.cantidad) || 0) - (Number(b.cantidad) || 0) || (a.descripcion || '').localeCompare(b.descripcion || ''));
        const activos = productosBajos.filter(item => !item.alertaStockIgnorada);
        return {
            todos: productosBajos,
            activos,
            ignorados: productosBajos.filter(item => item.alertaStockIgnorada),
            severidad: activos.some(item => (Number(item.cantidad) || 0) <= 0) ? 'roja' : activos.length > 0 ? 'naranja' : productosBajos.length > 0 ? 'ignorada' : 'sin-alerta'
        };
    };

    const cambiarIgnorarAlertaStock = async (producto) => {
        if (procesandoAlertaId) return;
        setProcesandoAlertaId(producto.id);
        try {
            const nuevoEstado = !producto.alertaStockIgnorada;
            await updateDoc(doc(db, "inventarios", producto.id), { alertaStockIgnorada: nuevoEstado });
            setInventario(prev => prev.map(item => item.id === producto.id ? { ...item, alertaStockIgnorada: nuevoEstado } : item));
            window.sellixNotify?.(nuevoEstado ? 'Alerta de stock ignorada' : 'Alerta de stock reanudada', { type: 'success' });
        } catch (error) {
            alert("Error al actualizar alerta de stock");
        } finally {
            setProcesandoAlertaId(null);
        }
    };

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

    const formatearUltimaVenta = (venta) => {
        if (!venta?.fecha?.toDate) return 'Sin ventas registradas';
        return venta.fecha.toDate().toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const obtenerProductosPocoVendidos = () => {
        const ventasFiltradas = ventas.filter(v => filtroSucursal === 'todas' || v.sucursalId === filtroSucursal);
        const ventasPorProducto = {};
        ventasFiltradas.forEach(venta => {
            (venta.productos || []).forEach(prod => {
                const llave = `${venta.sucursalId || 'sin-sucursal'}_${prod.productoId || prod.id || prod.descripcion}`;
                if (!ventasPorProducto[llave]) ventasPorProducto[llave] = { cantidad: 0, total: 0 };
                ventasPorProducto[llave].cantidad += Number(prod.cantidadVenta) || 0;
                ventasPorProducto[llave].total += Number(prod.subtotal) || ((Number(prod.precio) || 0) * (Number(prod.cantidadVenta) || 0));
            });
        });

        return inventario
            .filter(item => filtroSucursal === 'todas' || item.sucursalId === filtroSucursal)
            .map(item => {
                const llave = `${item.sucursalId || 'sin-sucursal'}_${item.productoId || item.id || item.descripcion}`;
                const venta = ventasPorProducto[llave] || { cantidad: 0, total: 0 };
                return {
                    ...item,
                    cantidadVendidaPeriodo: venta.cantidad,
                    totalVendidoPeriodo: venta.total,
                    sucursalNombre: sucursales.find(s => s.id === item.sucursalId)?.nombre || item.sucursalNombre || 'Sucursal'
                };
            })
            .filter(item => item.cantidadVendidaPeriodo <= Number(umbralVentaLenta || 0))
            .sort((a, b) => a.cantidadVendidaPeriodo - b.cantidadVendidaPeriodo || (a.descripcion || '').localeCompare(b.descripcion || ''));
    };

    return (
        <div className="admin-page">
            <AdminNavbar />

            <div className="admin-shell">

                {/* SECCIÓN DE FILTROS Y TOTAL GLOBAL */}
                <div className="admin-dashboard-head">
                    <div className="admin-filter-bar">
                        <div className="flex flex-col">
                            <label className="admin-filter-label">Sucursal</label>
                            <select
                                className="admin-filter-select"
                                value={filtroSucursal}
                                onChange={(e) => setFiltroSucursal(e.target.value)}
                            >
                                <option value="todas">Todas</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="admin-filter-label">Desde</label>
                            <input
                                type="date"
                                className="admin-filter-input"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="admin-filter-label">Hasta</label>
                            <input
                                type="date"
                                className="admin-filter-input"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="admin-total-card">
                        <p className="text-sm font-medium text-[#67625C]">Total de ventas del periodo</p>
                        <p className="text-4xl font-black text-[#1A2517]">
                            ${totalGlobal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm font-bold text-[#1A2517]">{ventas.length} tickets</p>
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
                                    const alertaStock = obtenerAlertasStockSucursal(suc.id);
                                    return (
                                        <div key={suc.id} role="button" tabIndex={0} onClick={() => setFiltroSucursal(suc.id)} onKeyDown={(e) => { if (e.key === 'Enter') setFiltroSucursal(suc.id); }} className="admin-branch-card cursor-pointer relative">
                                            {alertaStock.todos.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setSucursalAlerta(suc); }}
                                                    className={`absolute right-5 top-5 h-11 w-11 rounded-2xl border-2 text-lg shadow-lg transition-all active:scale-95 ${alertaStock.severidad === 'roja' ? 'bg-[#F4E6E1] border-[#9A3B30] text-[#9A3B30]' : alertaStock.severidad === 'naranja' ? 'bg-[#EFE2B8] border-[#9A6B3F] text-[#9A6B3F]' : 'bg-[#F0EADC] border-[#D8C7B5] text-[#67625C]'}`}
                                                    title="Alertas de stock"
                                                >
                                                    🔔
                                                    {alertaStock.activos.length > 0 && (
                                                        <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1A2517] px-1 text-[10px] font-black text-white border-2 border-[#FFFDF7]">
                                                            {alertaStock.activos.length}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                            <div className="admin-branch-icon">🏪</div>
                                            <h3 className="admin-branch-name">{suc.nombre}</h3>
                                            <p className="admin-branch-location">{suc.ubicacion || 'Sin ubicación'}</p>

                                            <div className="admin-metric-box">
                                                <p className="admin-metric-label">Venta en Periodo</p>
                                                <p className="admin-metric-value">${totalSuc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="mt-4 w-full rounded-2xl bg-[#F8F5EC] px-4 py-3">
                                                <p className="text-[10px] font-black uppercase text-[#8A8377]">Ultima venta</p>
                                                <p className="text-xs font-black text-[#3E4635]">{formatearUltimaVenta(ultimaVentaPorSucursal[suc.id])}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="admin-table-panel mb-12">
                            <div className="p-8 border-b bg-[#F8F5EC]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="admin-section-title">Productos que se venden poco o nada</h2>
                                    <p className="admin-section-subtitle">Usa el rango de fechas y sucursal seleccionados arriba</p>
                                </div>
                                <div className="flex items-center gap-3 bg-[#FFFDF7] border border-[#E3D9C8] rounded-2xl p-3">
                                    <label className="text-[10px] font-black uppercase text-[#8A8377]">Max. piezas vendidas</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-20 bg-transparent font-black text-[#1A2517] outline-none"
                                        value={umbralVentaLenta}
                                        onChange={(e) => setUmbralVentaLenta(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="admin-table">
                                    <thead className="admin-table-head">
                                        <tr>
                                            <th className="admin-th">Producto</th>
                                            <th className="admin-th">Sucursal</th>
                                            <th className="admin-th text-center">Stock</th>
                                            <th className="admin-th text-center">Vendido</th>
                                            <th className="admin-th text-right">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F0EADC]">
                                        {obtenerProductosPocoVendidos().slice(0, 80).map(item => (
                                            <tr key={item.id} className="admin-row">
                                                <td className="admin-td">
                                                    <p className="font-black text-[#3E4635] uppercase text-sm">{item.descripcion}</p>
                                                    <p className="text-[10px] font-bold text-[#8A8377] uppercase">{item.marcaNombre || item.marca || 'N/A'} | {item.codigos?.[0] || 'Sin codigo'}</p>
                                                </td>
                                                <td className="admin-td font-black text-xs uppercase text-[#67625C]">{item.sucursalNombre}</td>
                                                <td className="admin-td text-center">
                                                    <span className="bg-[#F0EADC] text-[#1A2517] px-3 py-1 rounded-lg font-black text-xs">{Number(item.cantidad) || 0} pz</span>
                                                </td>
                                                <td className="admin-td text-center font-black text-[#9A3B30]">{item.cantidadVendidaPeriodo} pz</td>
                                                <td className="admin-td text-right font-black text-[#1A2517]">{item.totalVendidoPeriodo.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                                            </tr>
                                        ))}
                                        {obtenerProductosPocoVendidos().length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-16 text-center text-[#B8AD9D] font-black uppercase italic">
                                                    No hay productos dentro de ese criterio
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {sucursalAlerta && (
                            <div className="modal-overlay">
                                <div className="modal-content text-[#1A2517]">
                                    <div className="flex justify-between items-start gap-4 mb-6">
                                        <div>
                                            <h2 className="admin-section-title">Alertas de stock</h2>
                                            <p className="admin-section-subtitle">{sucursalAlerta.nombre}</p>
                                        </div>
                                        <button onClick={() => setSucursalAlerta(null)} className="text-3xl font-black text-[#1A2517]">X</button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-3">
                                        {obtenerAlertasStockSucursal(sucursalAlerta.id).todos.length > 0 ? obtenerAlertasStockSucursal(sucursalAlerta.id).todos.map(producto => {
                                            const cantidad = Number(producto.cantidad) || 0;
                                            const ignorada = Boolean(producto.alertaStockIgnorada);
                                            return (
                                                <div key={producto.id} className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${ignorada ? 'bg-[#F0EADC] border-[#D8C7B5] opacity-75' : cantidad <= 0 ? 'bg-[#F4E6E1] border-[#E8C9BF]' : 'bg-[#EFE2B8] border-[#D8C7B5]'}`}>
                                                    <div>
                                                        <p className="font-black uppercase text-sm">{producto.descripcion}</p>
                                                        <p className="text-[10px] font-black uppercase text-[#67625C]">
                                                            Codigo: {producto.codigos?.[0] || 'N/A'} | Stock actual
                                                        </p>
                                                        {ignorada && (
                                                            <p className="text-[10px] font-black uppercase text-[#8A8377] mt-1">Alerta ignorada temporalmente</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-4 py-2 rounded-2xl text-sm font-black ${cantidad <= 0 ? 'bg-[#9A3B30] text-white' : 'bg-[#FFFDF7] text-[#1A2517]'}`}>
                                                            {cantidad} PZ
                                                        </span>
                                                        <button
                                                            onClick={() => cambiarIgnorarAlertaStock(producto)}
                                                            disabled={procesandoAlertaId === producto.id}
                                                            className={ignorada ? 'app-dialog-confirm' : 'app-dialog-cancel'}
                                                        >
                                                            {procesandoAlertaId === producto.id ? '...' : ignorada ? 'Reanudar alerta' : 'Ignorar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="text-center py-12 text-[#B8AD9D] font-black uppercase italic">
                                                Esta sucursal no tiene productos con bajo stock
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

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
