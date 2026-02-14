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

    // --- ESTADOS FINANCIEROS Y CAJA ---
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

    const inputBusqueda = useRef(null);

    // FUNCIÓN DE FECHA LOCAL (DD-MM-AAAA) - Nuestra "Llave" maestra
    const getFechaLocalID = () => {
        const d = new Date();
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const anio = d.getFullYear();
        return `${dia}-${mes}-${anio}`;
    };

    useEffect(() => {
        if (user) {
            obtenerSucursal();
            verificarCajaHoy();
        }
    }, [user]);

    const enfocarBuscador = () => {
        setTimeout(() => inputBusqueda.current?.focus(), 150);
    };

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
            const docID = `${user.sucursalId}_${getFechaLocalID()}`;
            const docRef = doc(db, "cajas_inicio", docID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setFondoInicial(Number(docSnap.data().monto) || 0);
                setMostrarModalFondo(false);
            } else {
                setMostrarModalFondo(true);
            }
        } catch (error) {
            setMostrarModalFondo(true);
        } finally {
            setVerificandoCaja(false);
        }
    };

    const abrirCaja = async () => {
        if (!inputFondo || isNaN(inputFondo) || parseFloat(inputFondo) < 0) {
            return alert("Monto no válido");
        }
        try {
            const docID = `${user.sucursalId}_${getFechaLocalID()}`;
            await setDoc(doc(db, "cajas_inicio", docID), {
                monto: parseFloat(inputFondo),
                sucursalId: user.sucursalId,
                empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado',
                fecha: Timestamp.now(),
                fechaString: getFechaLocalID()
            });
            setFondoInicial(parseFloat(inputFondo));
            setMostrarModalFondo(false);
        } catch (e) { alert("Error al abrir caja."); }
    };

    const registrarMovimiento = async (e) => {
        e.preventDefault();
        if (!movCantidad || !movMotivo) return alert("Faltan datos");
        try {
            await addDoc(collection(db, "movimientos_caja"), {
                tipo: movTipo,
                monto: parseFloat(movCantidad),
                motivo: movMotivo,
                sucursalId: user.sucursalId,
                empleadoId: user.uid,
                fecha: Timestamp.now(),
                fechaString: getFechaLocalID() // Guardamos el string para filtrar sin errores de índice
            });
            alert("Movimiento registrado");
            setMostrarModalMov(false);
            setMovCantidad(''); setMovMotivo('');
        } catch (e) { alert("Error al registrar"); }
    };

    // --- CORRECCIÓN DE CORTE: FILTRADO LOCAL PARA EVITAR ERRORES DE FIREBASE ---
    const consultarCorteCompleto = async () => {
        try {
            const fechaHoy = getFechaLocalID();

            // Consultamos solo por sucursal para evitar el requisito de índices compuestos
            const qV = query(collection(db, "ventas"), where("sucursalId", "==", user.sucursalId));
            const qM = query(collection(db, "movimientos_caja"), where("sucursalId", "==", user.sucursalId));

            const [snapV, snapM] = await Promise.all([getDocs(qV), getDocs(qM)]);

            // Filtramos en el cliente los que coincidan con la fecha de hoy string (DD-MM-AAAA)
            const vData = snapV.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(v => {
                    if (!v.fecha) return false;
                    const f = v.fecha.toDate();
                    const fStr = `${String(f.getDate()).padStart(2, '0')}-${String(f.getMonth() + 1).padStart(2, '0')}-${f.getFullYear()}`;
                    return fStr === fechaHoy;
                });

            const mData = snapM.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(m => m.fechaString === fechaHoy);

            setVentasHoy(vData);
            setMovimientosHoy(mData);
            setMostrarCorte(true);
        } catch (error) {
            console.error("Error en Corte:", error);
            alert("Error al generar el corte.");
        }
    };

    const totalVentas = ventasHoy.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const totalEntradas = movimientosHoy.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const totalSalidas = movimientosHoy.filter(m => m.tipo === 'salida').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const netoCaja = Number(fondoInicial) + totalVentas + totalEntradas - totalSalidas;

    const descargarPDFCorteDetallado = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("CORTE DE CAJA DETALLADO", 14, 20);
        doc.setFontSize(10);
        doc.text(`Sede: ${sucursalNombre} | Fecha: ${getFechaLocalID()}`, 14, 28);

        autoTable(doc, {
            startY: 35,
            head: [['Concepto', 'Monto']],
            body: [
                ['(+) Fondo Inicial', `$${Number(fondoInicial).toFixed(2)}`],
                ['(+) Ventas Brutas', `$${totalVentas.toFixed(2)}`],
                ['(+) Entradas', `$${totalEntradas.toFixed(2)}`],
                ['(-) Salidas', `$${totalSalidas.toFixed(2)}`],
                ['TOTAL EN CAJA', `$${netoCaja.toFixed(2)}`]
            ],
            theme: 'grid'
        });

        const prodAgrup = {};
        ventasHoy.forEach(v => v.productos?.forEach(p => {
            prodAgrup[p.descripcion] = (prodAgrup[p.descripcion] || 0) + p.cantidadVenta;
        }));

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Cant', 'Producto Vendido']],
            body: Object.entries(prodAgrup).map(([n, q]) => [q, n])
        });

        if (movimientosHoy.length > 0) {
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                head: [['Tipo', 'Motivo', 'Monto']],
                body: movimientosHoy.map(m => [m.tipo.toUpperCase(), m.motivo, `$${Number(m.monto).toFixed(2)}`]),
                headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] }
            });
        }

        doc.save(`corte_${sucursalNombre}_${getFechaLocalID()}.pdf`);
    };

    const finalizarVenta = async () => {
        if (carrito.length === 0) return;
        const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidadVenta), 0);
        try {
            await addDoc(collection(db, "ventas"), {
                empleadoId: user.uid,
                sucursalId: user.sucursalId,
                productos: carrito,
                total: total,
                fecha: Timestamp.now()
            });
            for (const item of carrito) {
                if (!item.esTemporal) {
                    await updateDoc(doc(db, "inventarios", item.id), { cantidad: increment(-item.cantidadVenta) });
                }
            }
            alert("Venta procesada");
            setCarrito([]);
        } catch (error) { alert("Error al cobrar"); }
    };

    const buscarProducto = async (e) => {
        if (e) e.preventDefault();
        if (!busqueda) return;
        const q = query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId));
        const snap = await getDocs(q);
        const encontrados = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p =>
            p.codigos?.includes(busqueda) || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
        );
        if (encontrados.length === 1 && encontrados[0].codigos?.includes(busqueda)) {
            agregarAlCarrito(encontrados[0]);
        } else { setProductos(encontrados); }
    };

    const agregarAlCarrito = (p) => {
        const existe = carrito.find(item => item.id === p.id);
        if (existe) {
            setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidadVenta: item.cantidadVenta + 1 } : item));
        } else {
            setCarrito([...carrito, { ...p, cantidadVenta: 1 }]);
        }
        setBusqueda(''); setProductos([]); enfocarBuscador();
    };

    const agregarTempAlCarrito = (e) => {
        if (e) e.preventDefault();
        if (!tempNombre || !tempPrecio) return alert("Faltan datos");
        agregarAlCarrito({
            id: `TEMP-${Date.now()}-${tempNombre.toLowerCase().trim()}`,
            descripcion: `(TEMP) ${tempNombre}`,
            precio: parseFloat(tempPrecio),
            esTemporal: true,
            cantidad: 999
        });
        setTempNombre(''); setTempPrecio(''); setMostrarModalTemp(false);
    };

    if (verificandoCaja) return <div className="min-h-screen bg-white flex items-center justify-center font-black italic uppercase text-blue-600 animate-pulse">Sincronizando Caja...</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative">
            {mostrarModalFondo && (
                <div className="fixed inset-0 bg-blue-600 flex items-center justify-center p-4 z-[500] backdrop-blur-md text-gray-800">
                    <div className="bg-white p-10 rounded-[45px] shadow-2xl w-full max-w-md text-center">
                        <h2 className="text-3xl font-black mb-1 italic uppercase">Apertura de Caja</h2>
                        <p className="text-gray-400 font-bold mb-8 uppercase text-[10px] tracking-widest">{sucursalNombre}</p>
                        <input type="number" className="w-full p-5 border-4 border-blue-50 rounded-[30px] text-5xl font-black text-center mb-8 outline-none" placeholder="0.00" value={inputFondo} onChange={(e) => setInputFondo(e.target.value)} autoFocus />
                        <button onClick={abrirCaja} className="w-full bg-blue-600 text-white py-6 rounded-[30px] font-black text-2xl shadow-xl uppercase italic">Abrir Turno</button>
                    </div>
                </div>
            )}

            <div className="flex-1 p-6 border-r overflow-y-auto">
                <header className="mb-4 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-blue-600 italic uppercase">{sucursalNombre}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setMostrarModalMov(true)} className="bg-gray-800 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-tighter">💸 Efectivo</button>
                        <button onClick={() => auth.signOut()} className="text-gray-400 font-bold text-xs uppercase tracking-tighter">SALIR</button>
                    </div>
                </header>

                <div className="flex gap-3 mb-6">
                    <button onClick={() => setMostrarModalTemp(true)} className="bg-orange-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg text-xs uppercase">➕ Temporal</button>
                    <button onClick={consultarCorteCompleto} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg text-xs uppercase">📊 Corte</button>
                </div>

                <form onSubmit={buscarProducto} className="mb-6">
                    <input ref={inputBusqueda} type="text" className="w-full p-5 rounded-2xl shadow-sm outline-none text-xl border-2 border-transparent focus:border-blue-400" placeholder="Escanear producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </form>

                <div className="space-y-3">
                    {productos.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="font-bold text-gray-700 uppercase text-sm">{p.descripcion}</span>
                            <button onClick={() => agregarAlCarrito(p)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">${p.precio}</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-[420px] bg-white p-8 shadow-2xl flex flex-col h-screen sticky top-0 text-gray-800">
                <h3 className="text-2xl font-black italic uppercase mb-6 tracking-tighter tracking-tighter">🛒 Venta Actual</h3>
                <div className="flex-1 overflow-y-auto space-y-4">
                    {carrito.map(item => (
                        <div key={item.id} className="flex justify-between border-b pb-2">
                            <div className="flex-1"><p className="font-bold uppercase text-xs">{item.descripcion}</p><p className="text-[10px] text-gray-400">{item.cantidadVenta} x ${item.precio}</p></div>
                            <p className="font-black text-blue-600">${(item.cantidadVenta * item.precio).toFixed(2)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t-4 border-double">
                    <p className="text-4xl font-black text-green-600 mb-6">${carrito.reduce((acc, i) => acc + (i.precio * i.cantidadVenta), 0).toFixed(2)}</p>
                    <button onClick={finalizarVenta} disabled={carrito.length === 0} className="w-full bg-green-500 text-white py-5 rounded-[25px] font-black text-2xl shadow-xl disabled:bg-gray-100">COBRAR</button>
                </div>
            </div>

            {/* MODAL CORTE */}
            {mostrarCorte && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col text-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic">Resumen del Día</h3>
                            <button onClick={() => { setMostrarCorte(false); setVerDetallesCorte(false); }} className="text-3xl">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400">FONDO</p><p className="text-xl font-black">${Number(fondoInicial).toFixed(2)}</p></div>
                            <div className="p-4 bg-green-50 rounded-2xl text-center text-green-700"><p className="text-[10px] font-black">VENTAS (+)</p><p className="text-xl font-black">${totalVentas.toFixed(2)}</p></div>
                            <div className="p-4 bg-red-50 rounded-2xl text-center text-red-700"><p className="text-[10px] font-black">SALIDAS (-)</p><p className="text-xl font-black">${totalSalidas.toFixed(2)}</p></div>
                            <div className="p-4 bg-blue-600 rounded-2xl text-center text-white"><p className="text-[10px] font-black uppercase font-black">Caja Actual</p><p className="text-xl font-black">${netoCaja.toFixed(2)}</p></div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setVerDetallesCorte(!verDetallesCorte)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold uppercase text-xs">👁️ Ver Detalles</button>
                            <button onClick={descargarPDFCorteDetallado} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold uppercase text-xs">📄 PDF Detallado</button>
                        </div>
                        {verDetallesCorte && (
                            <div className="flex-1 overflow-y-auto space-y-4 italic">
                                <h4 className="font-black text-blue-600 border-b uppercase text-xs">Ventas Agrupadas</h4>
                                {ventasHoy.flatMap(v => v.productos || []).map((p, i) => (
                                    <div key={i} className="flex justify-between text-sm border-b pb-1"><span>{p.cantidadVenta}x {p.descripcion}</span><span className="font-bold">${(p.cantidadVenta * p.precio).toFixed(2)}</span></div>
                                ))}
                                <h4 className="font-black text-red-600 border-b uppercase text-xs mt-4">Movimientos de Efectivo</h4>
                                {movimientosHoy.map((m, i) => (
                                    <div key={i} className="flex justify-between text-sm border-b pb-1"><span>{m.tipo.toUpperCase()}: {m.motivo}</span><span className="font-bold">${Number(m.monto).toFixed(2)}</span></div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL EFECTIVO */}
            {mostrarModalMov && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-gray-800">
                        <h3 className="text-2xl font-black mb-6 italic uppercase text-center">Movimiento Efectivo</h3>
                        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
                            <button onClick={() => setMovTipo('entrada')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'entrada' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400'}`}>ENTRADA</button>
                            <button onClick={() => setMovTipo('salida')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'salida' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400'}`}>SALIDA</button>
                        </div>
                        <input type="number" placeholder="Monto $" className="w-full p-4 border-2 rounded-2xl mb-4 font-bold" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} />
                        <input type="text" placeholder="Motivo..." className="w-full p-4 border-2 rounded-2xl mb-6 font-bold uppercase text-xs" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} />
                        <div className="flex gap-2"><button onClick={() => setMostrarModalMov(false)} className="flex-1 font-bold text-gray-400 uppercase text-xs">Cerrar</button><button onClick={registrarMovimiento} className="flex-[2] bg-gray-800 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Registrar</button></div>
                    </div>
                </div>
            )}

            {/* MODAL VENTA MANUAL */}
            {mostrarModalTemp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center text-gray-800">
                        <h3 className="text-2xl font-black mb-6 italic uppercase">Venta Manual</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="¿Qué es?" className="w-full border-2 p-4 rounded-2xl outline-none font-bold" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} />
                            <input type="number" placeholder="Precio $" className="w-full border-2 p-4 rounded-2xl outline-none font-bold" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} />
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setMostrarModalTemp(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-xs tracking-widest tracking-widest">Cerrar</button>
                                <button onClick={agregarTempAlCarrito} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase shadow-lg">Añadir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentaEmpleado;