import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment, limit, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const VentaEmpleado = () => {
    const { user } = useAuth();
    const [busqueda, setBusqueda] = useState('');
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [sucursalNombre, setSucursalNombre] = useState('');
    const [fondoInicial, setFondoInicial] = useState(0);
    const [mostrarModalFondo, setMostrarModalFondo] = useState(false);
    const [inputFondo, setInputFondo] = useState('');
    const [verificandoCaja, setVerificandoCaja] = useState(true);
    const [mostrarModalMov, setMostrarModalMov] = useState(false);
    const [movTipo, setMovTipo] = useState('entrada');
    const [movCantidad, setMovCantidad] = useState('');
    const [movMotivo, setMovMotivo] = useState('');
    const [mostrarCorte, setMostrarCorte] = useState(false);
    const [verDetallesCorte, setVerDetallesCorte] = useState(false);
    const [ventasHoy, setVentasHoy] = useState([]);
    const [movimientosHoy, setMovimientosHoy] = useState([]);
    const [mostrarModalTemp, setMostrarModalTemp] = useState(false);
    const [tempNombre, setTempNombre] = useState('');
    const [tempPrecio, setTempPrecio] = useState('');
    const [procesandoVenta, setProcesandoVenta] = useState(false);

    const inputBusqueda = useRef(null);

    const getFechaLocalID = () => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    useEffect(() => { if (user) { obtenerSucursal(); verificarCajaHoy(); } }, [user]);
    const enfocarBuscador = () => setTimeout(() => inputBusqueda.current?.focus(), 150);

    const obtenerSucursal = async () => {
        if (user?.sucursalId) {
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const miSuc = sucSnap.docs.find(d => d.id === user.sucursalId);
            setSucursalNombre(miSuc?.data().nombre || 'Mi Sucursal');
        }
    };

    const verificarCajaHoy = async () => {
        setVerificandoCaja(true);
        try {
            const docRef = doc(db, "cajas_inicio", `${user.sucursalId}_${getFechaLocalID()}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setFondoInicial(Number(docSnap.data().monto) || 0);
                setMostrarModalFondo(false);
            } else { setMostrarModalFondo(true); }
        } catch (error) { setMostrarModalFondo(true); } finally { setVerificandoCaja(false); }
    };

    const abrirCaja = async () => {
        if (!inputFondo || isNaN(inputFondo) || parseFloat(inputFondo) < 0) return alert("Monto no válido");
        try {
            await setDoc(doc(db, "cajas_inicio", `${user.sucursalId}_${getFechaLocalID()}`), {
                monto: parseFloat(inputFondo), sucursalId: user.sucursalId, empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado', fecha: Timestamp.now(), fechaString: getFechaLocalID()
            });
            setFondoInicial(parseFloat(inputFondo)); setMostrarModalFondo(false);
        } catch (e) { alert("Error"); }
    };

    const registrarMovimiento = async () => {
        if (!movCantidad || !movMotivo) return alert("Faltan datos");
        try {
            await addDoc(collection(db, "movimientos_caja"), {
                tipo: movTipo, monto: parseFloat(movCantidad), motivo: movMotivo, sucursalId: user.sucursalId,
                empleadoId: user.uid, nombreEmpleado: user.nombre || 'Empleado', fecha: Timestamp.now(), fechaString: getFechaLocalID()
            });
            setMostrarModalMov(false); setMovCantidad(''); setMovMotivo(''); alert("Registrado");
        } catch (e) { alert("Error"); }
    };

    const consultarCorteCompleto = async () => {
        try {
            const fechaHoy = getFechaLocalID();
            const [snapV, snapM] = await Promise.all([
                getDocs(query(collection(db, "ventas"), where("sucursalId", "==", user.sucursalId))),
                getDocs(query(collection(db, "movimientos_caja"), where("sucursalId", "==", user.sucursalId)))
            ]);
            const vData = snapV.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.fecha && `${String(v.fecha.toDate().getDate()).padStart(2, '0')}-${String(v.fecha.toDate().getMonth() + 1).padStart(2, '0')}-${v.fecha.toDate().getFullYear()}` === fechaHoy).sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
            const mData = snapM.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.fechaString === fechaHoy).sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
            setVentasHoy(vData); setMovimientosHoy(mData); setMostrarCorte(true);
        } catch (error) { alert("Error"); }
    };

    const totalVentas = ventasHoy.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const totalEntradas = movimientosHoy.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const totalSalidas = movimientosHoy.filter(m => m.tipo === 'salida').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const netoCaja = Number(fondoInicial) + totalVentas + totalEntradas - totalSalidas;

    const descargarPDFCorteDetallado = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold"); doc.text("CORTE DE CAJA DETALLADO", 14, 20);
        autoTable(doc, { startY: 35, head: [['Concepto', 'Monto']], body: [['Fondo Inicial', fondoInicial], ['Ventas', totalVentas], ['Entradas', totalEntradas], ['Salidas', totalSalidas], ['TOTAL', netoCaja]], theme: 'grid' });
        doc.save(`corte_${sucursalNombre}.pdf`);
    };

    const finalizarVenta = async () => {
        if (carrito.length === 0 || procesandoVenta) return;
        setProcesandoVenta(true);
        try {
            await addDoc(collection(db, "ventas"), {
                empleadoId: user.uid, nombreEmpleado: user.nombre || 'Empleado', sucursalId: user.sucursalId,
                productos: carrito, total: carrito.reduce((acc, i) => acc + (i.precio * i.cantidadVenta), 0), fecha: Timestamp.now()
            });
            for (const item of carrito) { if (!item.esTemporal) await updateDoc(doc(db, "inventarios", item.id), { cantidad: increment(-item.cantidadVenta) }); }
            alert("Venta procesada con éxito"); setCarrito([]);
        } catch (e) { alert("Error"); } finally { setProcesandoVenta(false); }
    };

    const buscarProducto = async (e) => {
        if (e) e.preventDefault();
        const snap = await getDocs(query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId)));
        const enc = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.codigos?.includes(busqueda) || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()));
        if (enc.length === 1 && enc[0].codigos?.includes(busqueda)) agregarAlCarrito(enc[0]); else setProductos(enc);
    };

    const agregarAlCarrito = (p) => {
        const ex = carrito.find(i => i.id === p.id);
        if (ex) setCarrito(carrito.map(i => i.id === p.id ? { ...i, cantidadVenta: i.cantidadVenta + 1 } : i));
        else setCarrito([...carrito, { ...p, cantidadVenta: 1 }]);
        setBusqueda(''); setProductos([]); enfocarBuscador();
    };

    const eliminarDelCarrito = (id) => {
        setCarrito(carrito.filter(item => item.id !== id));
    };

    const agregarTempAlCarrito = () => {
        agregarAlCarrito({ id: `TEMP-${Date.now()}`, descripcion: `(TEMP) ${tempNombre}`, precio: parseFloat(tempPrecio), esTemporal: true, cantidad: 999 });
        setTempNombre(''); setTempPrecio(''); setMostrarModalTemp(false);
    };

    if (verificandoCaja) return <div className="pos-container items-center justify-center font-black italic text-blue-600">SINCRONIZANDO...</div>;

    return (
        <div className="pos-container">
            {mostrarModalFondo && (
                <div className="modal-apertura-overlay">
                    <div className="modal-content-sm text-gray-800">
                        <h2 className="text-3xl font-black italic uppercase">Apertura</h2>
                        <p className="text-gray-400 font-bold mb-8 uppercase text-[10px] tracking-widest">{sucursalNombre}</p>
                        <input type="number" className="w-full p-5 border-4 border-blue-50 rounded-[30px] text-5xl font-black text-center mb-8 outline-none" value={inputFondo} onChange={(e) => setInputFondo(e.target.value)} autoFocus />
                        <button onClick={abrirCaja} className="btn-primary w-full py-6 text-2xl rounded-[30px]">Abrir Turno</button>
                    </div>
                </div>
            )}

            <div className="pos-main-panel">
                <header className="mb-4 flex justify-between items-center text-gray-800">
                    <h2 className="text-2xl font-black text-blue-600 italic uppercase">{sucursalNombre}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setMostrarModalMov(true)} className="btn-dark">💸 Efectivo</button>
                        <button onClick={() => auth.signOut()} className="text-gray-400 font-bold text-xs uppercase">Salir</button>
                    </div>
                </header>
                <div className="flex gap-3 mb-6">
                    <button onClick={() => setMostrarModalTemp(true)} className="btn-orange">➕ Temporal</button>
                    <button onClick={consultarCorteCompleto} className="btn-primary">📊 Corte</button>
                </div>
                <form onSubmit={buscarProducto} className="mb-6">
                    <input ref={inputBusqueda} type="text" className="input-pos" placeholder="Escanear producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </form>
                <div className="space-y-3">
                    {productos.map(p => (
                        <div key={p.id} className="product-card text-gray-800">
                            <span className="font-bold uppercase text-sm">{p.descripcion}</span>
                            <button onClick={() => agregarAlCarrito(p)} className="btn-primary">${p.precio}</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pos-sidebar">
                <h3 className="text-2xl font-black italic uppercase mb-6 tracking-tighter text-gray-800">🛒 Venta Actual</h3>
                <div className="flex-1 overflow-y-auto space-y-4 text-gray-700">
                    {carrito.map(item => (
                        <div key={item.id} className="ticket-item">
                            <div className="flex-1"><p className="font-bold uppercase text-xs">{item.descripcion}</p><p className="text-[10px] text-gray-400">{item.cantidadVenta} x ${item.precio}</p></div>
                            <div className="flex items-center gap-3">
                                <p className="font-black text-blue-600">${(item.cantidadVenta * item.precio).toFixed(2)}</p>
                                <button onClick={() => eliminarDelCarrito(item.id)} className="btn-remove">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t-4 border-double">
                    <p className="text-4xl font-black text-green-600 mb-6 text-center">${carrito.reduce((acc, i) => acc + (i.precio * i.cantidadVenta), 0).toFixed(2)}</p>
                    <button onClick={finalizarVenta} disabled={carrito.length === 0 || procesandoVenta} className="btn-green w-full uppercase">
                        {procesandoVenta ? "Procesando..." : "Cobrar"}
                    </button>
                </div>
            </div>

            {/* MODALES */}
            {mostrarCorte && (
                <div className="modal-overlay">
                    <div className="modal-content text-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic">Resumen Diario</h3>
                            <button onClick={() => { setMostrarCorte(false); setVerDetallesCorte(false); }} className="text-3xl">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                            <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-black text-gray-400 uppercase">Fondo</p><p className="text-xl font-black">${Number(fondoInicial).toFixed(2)}</p></div>
                            <div className="p-4 bg-green-50 rounded-2xl text-green-700"><p className="text-[10px] font-black uppercase">Ventas</p><p className="text-xl font-black">${totalVentas.toFixed(2)}</p></div>
                            <div className="p-4 bg-red-50 rounded-2xl text-red-700"><p className="text-[10px] font-black uppercase">Salidas</p><p className="text-xl font-black">${totalSalidas.toFixed(2)}</p></div>
                            <div className="p-4 bg-blue-600 rounded-2xl text-white"><p className="text-[10px] font-black uppercase font-black">Caja Actual</p><p className="text-xl font-black">${netoCaja.toFixed(2)}</p></div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setVerDetallesCorte(!verDetallesCorte)} className="btn-dark flex-1">👁️ Detalles</button>
                            <button onClick={descargarPDFCorteDetallado} className="btn-primary flex-1">📄 PDF Auditoría</button>
                        </div>
                        {verDetallesCorte && (
                            <div className="flex-1 overflow-y-auto space-y-4 italic text-sm">
                                {ventasHoy.map((v, i) => (
                                    <div key={i} className="border-b pb-1 mb-2">
                                        <div className="flex justify-between text-[10px] font-black text-gray-400">
                                            <span>{v.fecha?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="uppercase text-blue-500">Vendedor: {v.nombreEmpleado || 'N/A'}</span>
                                        </div>
                                        {v.productos.map((p, idx) => <div key={idx} className="flex justify-between"><span>{p.cantidadVenta}x {p.descripcion}</span><span className="font-bold">${p.precio}</span></div>)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {mostrarModalMov && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-gray-800">
                        <h3 className="text-2xl font-black mb-6 italic uppercase text-center">Movimiento Efectivo</h3>
                        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
                            <button onClick={() => setMovTipo('entrada')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'entrada' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400'}`}>ENTRADA</button>
                            <button onClick={() => setMovTipo('salida')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'salida' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400'}`}>SALIDA</button>
                        </div>
                        <input type="number" placeholder="Monto $" className="input-modal" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} />
                        <input type="text" placeholder="Motivo..." className="input-modal" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} />
                        <button onClick={registrarMovimiento} className="btn-dark w-full py-4 rounded-2xl">Registrar</button>
                    </div>
                </div>
            )}

            {mostrarModalTemp && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-gray-800">
                        <h3 className="text-2xl font-black mb-6 italic uppercase">Venta Manual</h3>
                        <input type="text" placeholder="¿Qué es?" className="input-modal" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} />
                        <input type="number" placeholder="Precio $" className="input-modal" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} />
                        <button onClick={agregarTempAlCarrito} className="btn-orange w-full py-4 rounded-xl mb-2">Añadir</button>
                        <button onClick={() => setMostrarModalTemp(false)} className="text-xs font-bold text-gray-400 uppercase">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentaEmpleado;