import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
// Librerías para PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
        setTimeout(() => inputBusqueda.current?.focus(), 150);
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
        if (exacta) { agregarAlCarrito(exacta); } else { setProductos(encontrados); }
    };

    const agregarTempAlCarrito = (e) => {
        if (e) e.preventDefault();
        if (!tempNombre || !tempPrecio) return alert("Llena todos los campos");
        const nuevoTemp = {
            id: `TEMP-${tempNombre.toLowerCase().trim()}`, // ID basado en nombre para agrupar
            descripcion: `(TEMP) ${tempNombre}`,
            precio: parseFloat(tempPrecio),
            esTemporal: true,
            cantidad: 999
        };
        agregarAlCarrito(nuevoTemp);
        setTempNombre(''); setTempPrecio('');
        setMostrarModalTemp(false);
    };

    const consultarCorte = async () => {
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const q = query(collection(db, "ventas"), where("sucursalId", "==", user.sucursalId), where("fecha", ">=", hoy));
            const snap = await getDocs(q);
            setVentasHoy(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setMostrarCorte(true);
        } catch (error) { console.error(error); alert("Error al cargar el corte."); }
    };

    // FUNCIÓN PDF CON AGRUPACIÓN POR PRODUCTO
    const descargarPDFCorte = () => {
        const doc = new jsPDF();
        const hoy = new Date();
        const fechaTexto = hoy.toLocaleDateString('es-MX').replace(/\//g, '-');
        const totalCorte = ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0);

        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235);
        doc.text("CORTE DE CAJA - RESUMEN DE PRODUCTOS", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Sucursal: ${sucursalNombre}`, 14, 28);
        doc.text(`Fecha: ${hoy.toLocaleDateString()}`, 14, 33);
        doc.text(`Total Acumulado: $${totalCorte.toFixed(2)}`, 14, 38);

        // Lógica de Agrupación
        const productosAgrupados = {};

        ventasHoy.forEach(venta => {
            venta.productos.forEach(prod => {
                // Usamos la descripción como llave para agrupar (funciona para inventario y temporales)
                const llave = prod.descripcion;
                if (productosAgrupados[llave]) {
                    productosAgrupados[llave].cantidadTotal += prod.cantidadVenta;
                    productosAgrupados[llave].subtotalTotal += (prod.cantidadVenta * prod.precio);
                } else {
                    productosAgrupados[llave] = {
                        descripcion: prod.descripcion,
                        cantidadTotal: prod.cantidadVenta,
                        precioUnitario: prod.precio,
                        subtotalTotal: (prod.cantidadVenta * prod.precio)
                    };
                }
            });
        });

        const tablaData = Object.values(productosAgrupados).map(p => [
            p.descripcion,
            `${p.cantidadTotal} pz`,
            `$${p.precioUnitario.toFixed(2)}`,
            `$${p.subtotalTotal.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['Producto', 'Cant. Total', 'Precio U.', 'Subtotal']],
            body: tablaData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });

        doc.save(`corte_resumido_${fechaTexto}.pdf`);
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
                fecha: new Date()
            });
            for (const item of carrito) {
                if (!item.esTemporal) {
                    const productRef = doc(db, "inventarios", item.id);
                    await updateDoc(productRef, { cantidad: increment(-item.cantidadVenta) });
                }
            }
            alert("Venta guardada");
            setCarrito([]);
            enfocarBuscador();
        } catch (error) { alert("Error al cobrar"); }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* El resto del JSX se mantiene igual que la versión anterior */}
            <div className="flex-1 p-6 border-r overflow-y-auto">
                <header className="mb-4 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-blue-600 italic uppercase">{sucursalNombre}</h2>
                    <button onClick={() => auth.signOut()} className="text-gray-400 font-bold text-xs">SALIR</button>
                </header>

                <div className="flex gap-3 mb-6">
                    <button type="button" onClick={() => setMostrarModalTemp(true)} className="bg-orange-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg">➕ TEMPORAL</button>
                    <button type="button" onClick={consultarCorte} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg">📊 CORTE</button>
                </div>

                <form onSubmit={buscarProducto} className="mb-6">
                    <input ref={inputBusqueda} type="text" className="w-full p-5 rounded-2xl shadow-sm outline-none text-xl border-2 border-transparent focus:border-blue-400" placeholder="Escanear producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </form>

                <div className="space-y-3">
                    {productos.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="font-bold text-gray-700">{p.descripcion}</span>
                            <button onClick={() => agregarAlCarrito(p)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">${p.precio}</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-[420px] bg-white p-8 shadow-2xl flex flex-col h-screen sticky top-0">
                <h3 className="text-2xl font-black text-gray-800 italic uppercase mb-6">🛒 TICKET</h3>
                <div className="flex-1 overflow-y-auto space-y-4">
                    {carrito.map(item => (
                        <div key={item.id} className="flex justify-between border-b pb-2">
                            <div className="flex-1">
                                <p className="font-bold">{item.descripcion}</p>
                                <p className="text-xs text-gray-400">{item.cantidadVenta} x ${item.precio}</p>
                            </div>
                            <p className="font-black">${(item.cantidadVenta * item.precio).toFixed(2)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t-4 border-double">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-4xl font-black text-green-600">${carrito.reduce((acc, i) => acc + (i.precio * i.cantidadVenta), 0).toFixed(2)}</span>
                    </div>
                    <button onClick={finalizarVenta} disabled={carrito.length === 0} className="w-full bg-green-500 text-white py-5 rounded-3xl font-black text-2xl shadow-xl disabled:bg-gray-100">COBRAR</button>
                </div>
            </div>

            {/* MODAL TEMPORAL */}
            {mostrarModalTemp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
                        <h3 className="text-2xl font-black mb-6 italic">Venta Manual</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="¿Qué es?" className="w-full border-2 p-3 rounded-xl outline-none" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} />
                            <input type="number" placeholder="Precio $" className="w-full border-2 p-3 rounded-xl outline-none" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setMostrarModalTemp(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-xs">Cerrar</button>
                                <button type="button" onClick={agregarTempAlCarrito} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold">AÑADIR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CORTE */}
            {mostrarCorte && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-800 uppercase italic">Corte de Caja</h3>
                            <button onClick={() => setMostrarCorte(false)} className="text-3xl">✕</button>
                        </div>
                        <div className="bg-blue-600 text-white p-6 rounded-2xl mb-4 text-center">
                            <p className="text-5xl font-black">${ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0).toFixed(2)}</p>
                        </div>
                        <button onClick={descargarPDFCorte} className="w-full mb-6 bg-green-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2">📄 DESCARGAR RESUMEN PDF</button>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {ventasHoy.map((v, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <span className="text-xs font-bold text-gray-400">{v.fecha?.seconds ? new Date(v.fecha.seconds * 1000).toLocaleTimeString() : '---'}</span>
                                    <span className="text-lg font-black text-blue-600">${v.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentaEmpleado;