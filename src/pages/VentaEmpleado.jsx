import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const VentaEmpleado = () => {
    const { user } = useAuth();
    const [busqueda, setBusqueda] = useState('');
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [sucursalNombre, setSucursalNombre] = useState('');

    const [mostrarModalTemp, setMostrarModalTemp] = useState(false);
    const [mostrarCorte, setMostrarCorte] = useState(false);
    const [ventasHoy, setVentasHoy] = useState([]);
    const [tempNombre, setTempNombre] = useState('');
    const [tempPrecio, setTempPrecio] = useState('');

    const inputBusqueda = useRef(null);

    useEffect(() => {
        obtenerSucursal();
        enfocarBuscador();
    }, [user]);

    const enfocarBuscador = () => {
        setTimeout(() => inputBusqueda.current?.focus(), 100);
    };

    const obtenerSucursal = async () => {
        if (user?.sucursalId) {
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const miSuc = sucSnap.docs.find(d => d.id === user.sucursalId);
            setSucursalNombre(miSuc?.data().nombre || 'Mi Sucursal');
        }
    };

    const agregarAlCarrito = (p) => {
        if (p.cantidad <= 0 && !p.esTemporal) return alert("Producto sin stock");

        const existe = carrito.find(item => item.id === p.id);
        if (existe) {
            if (!p.esTemporal && existe.cantidadVenta >= p.cantidad) return alert("No hay más stock");
            setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidadVenta: item.cantidadVenta + 1 } : item));
        } else {
            setCarrito([...carrito, { ...p, cantidadVenta: 1 }]);
        }
        setBusqueda('');
        setProductos([]);
        enfocarBuscador();
    };

    const buscarProducto = async (e) => {
        if (e) e.preventDefault();
        if (!busqueda) return;

        const q = query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId));
        const snap = await getDocs(q);
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const encontrados = todos.filter(p =>
            p.codigos?.includes(busqueda) ||
            p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
        );

        const exacta = encontrados.find(p => p.codigos?.includes(busqueda));
        if (exacta) {
            agregarAlCarrito(exacta);
        } else {
            setProductos(encontrados);
        }
    };

    const consultarCorte = async () => {
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            // Usamos una consulta simple primero para verificar conexión
            const q = query(
                collection(db, "ventas"),
                where("sucursalId", "==", user.sucursalId),
                where("fecha", ">=", hoy)
            );

            const snap = await getDocs(q);
            const ventasData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            setVentasHoy(ventasData);
            setMostrarCorte(true);
        } catch (error) {
            // Este log es vital: te dará el link para crear el índice si falta
            console.error("Error detallado de Firebase:", error);
            alert("Error al generar corte. Revisa la consola (F12) para el link de activación de índice.");
        }
    };

    const finalizarVenta = async () => {
        if (carrito.length === 0) return;
        const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidadVenta), 0);

        try {
            // SE GUARDA LA FECHA AUTOMÁTICAMENTE AQUÍ
            await addDoc(collection(db, "ventas"), {
                empleadoId: user.uid,
                sucursalId: user.sucursalId,
                productos: carrito,
                total: total,
                fecha: new Date() // Fecha del sistema al momento del clic
            });

            for (const item of carrito) {
                if (!item.esTemporal) {
                    const productRef = doc(db, "inventarios", item.id);
                    await updateDoc(productRef, { cantidad: increment(-item.cantidadVenta) });
                }
            }
            alert("Venta guardada exitosamente");
            setCarrito([]);
            enfocarBuscador();
        } catch (error) {
            alert("Error al procesar cobro");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            <div className="flex-1 p-6 border-r overflow-y-auto">
                <header className="mb-4 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-blue-600 italic uppercase">{sucursalNombre}</h2>
                    <button onClick={() => auth.signOut()} className="text-gray-400 font-bold text-xs uppercase">Salir</button>
                </header>

                {/* MENÚ SUPERIOR */}
                <div className="flex gap-3 mb-6">
                    <button type="button" onClick={() => { setMostrarModalTemp(true); }} className="bg-orange-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg active:scale-95 transition-all">
                        ➕ TEMPORAL
                    </button>
                    <button type="button" onClick={consultarCorte} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg active:scale-95 transition-all">
                        📊 CORTE
                    </button>
                </div>

                <form onSubmit={buscarProducto} className="mb-6">
                    <input
                        ref={inputBusqueda}
                        type="text"
                        className="w-full p-5 rounded-2xl shadow-sm outline-none text-xl border-2 border-transparent focus:border-blue-400 transition-all"
                        placeholder="Escanear producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </form>

                <div className="space-y-3">
                    {productos.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
                            <span className="font-bold text-gray-700">{p.descripcion}</span>
                            <button onClick={() => agregarAlCarrito(p)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md">
                                ${p.precio}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* TICKET DE COBRO */}
            <div className="w-full md:w-[420px] bg-white p-8 shadow-2xl flex flex-col h-screen sticky top-0">
                <h3 className="text-2xl font-black text-gray-800 italic uppercase mb-6 flex items-center gap-2">
                    <span>🛒</span> TICKET
                </h3>
                <div className="flex-1 overflow-y-auto space-y-4">
                    {carrito.map(item => (
                        <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">{item.descripcion}</p>
                                <p className="text-xs text-gray-400">{item.cantidadVenta} pz x ${item.precio}</p>
                            </div>
                            <p className="font-black text-gray-900">${(item.cantidadVenta * item.precio).toFixed(2)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t-4 border-double border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-400 font-bold">TOTAL:</span>
                        <span className="text-4xl font-black text-green-600">${carrito.reduce((acc, i) => acc + (i.precio * i.cantidadVenta), 0).toFixed(2)}</span>
                    </div>
                    <button onClick={finalizarVenta} disabled={carrito.length === 0} className="w-full bg-green-500 text-white py-5 rounded-3xl font-black text-2xl hover:bg-green-600 shadow-xl disabled:bg-gray-100 transition-all">
                        COBRAR
                    </button>
                </div>
            </div>

            {/* MODAL TEMPORAL */}
            {mostrarModalTemp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
                        <h3 className="text-2xl font-black mb-6">Venta Manual</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="¿Qué es?" className="w-full border-2 p-3 rounded-xl outline-none focus:border-orange-400" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} />
                            <input type="number" placeholder="Precio $" className="w-full border-2 p-3 rounded-xl outline-none focus:border-orange-400 font-bold" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} />
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setMostrarModalTemp(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-xs">Cerrar</button>
                                <button onClick={(e) => {
                                    const n = { id: `T-${Date.now()}`, descripcion: `(T) ${tempNombre}`, precio: parseFloat(tempPrecio), esTemporal: true, cantidad: 999 };
                                    agregarAlCarrito(n);
                                    setTempNombre(''); setTempPrecio(''); setMostrarModalTemp(false);
                                }} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg">AÑADIR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CORTE */}
            {mostrarCorte && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-800 uppercase italic">Resumen del Día</h3>
                            <button onClick={() => setMostrarCorte(false)} className="text-3xl hover:text-red-500 transition-colors">✕</button>
                        </div>

                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-2xl mb-6 shadow-xl text-center">
                            <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Total en Caja</p>
                            <p className="text-5xl font-black">${ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {ventasHoy.length > 0 ? ventasHoy.map((v, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded shadow-sm">
                                        {v.fecha?.seconds ? new Date(v.fecha.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </span>
                                    <span className="text-sm font-bold text-gray-600">{v.productos?.length} prod.</span>
                                    <span className="text-lg font-black text-blue-600">${v.total.toFixed(2)}</span>
                                </div>
                            )) : <p className="text-center text-gray-400 py-10 italic">No hay ventas registradas hoy.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentaEmpleado;