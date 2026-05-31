import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, addDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminVerInventario = () => {
    const [inventario, setInventario] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [catalogoMaestro, setCatalogoMaestro] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('todas');

    const [editandoProd, setEditandoProd] = useState(null);
    const [nuevoStock, setNuevoStock] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');

    const [mostrarSurtir, setMostrarSurtir] = useState(false);
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
    const [cantidadSurtir, setCantidadSurtir] = useState(1);
    const [procesandoActualizar, setProcesandoActualizar] = useState(null);
    const [procesandoEliminar, setProcesandoEliminar] = useState(null);
    const [procesandoSurtir, setProcesandoSurtir] = useState(null);

    const cargarDatos = async () => {
        const sSnap = await getDocs(collection(db, "sucursales"));
        const iSnap = await getDocs(collection(db, "inventarios"));
        const cSnap = await getDocs(collection(db, "productos_maestros"));

        setSucursales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setInventario(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCatalogoMaestro(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    // --- LÓGICA DE CÁLCULO DE VALOR ---
    const obtenerResumenSucursal = (id) => {
        const items = inventario.filter(p => p.sucursalId === id);
        return {
            totalItems: items.reduce((acc, p) => acc + p.cantidad, 0),
            variedad: items.length,
            // Sumamos (Cantidad * Precio) de cada producto en la sucursal
            valorTotal: items.reduce((acc, p) => acc + (p.cantidad * p.precio), 0)
        };
    };

    const handleActualizar = async (id) => {
        if (procesandoActualizar) return;
        setProcesandoActualizar(id);
        try {
            await updateDoc(doc(db, "inventarios", id), {
                cantidad: parseInt(nuevoStock),
                precio: parseFloat(nuevoPrecio)
            });
            setEditandoProd(null);
            await cargarDatos();
        } finally {
            setProcesandoActualizar(null);
        }
    };

    const eliminarProducto = async (id) => {
        if (procesandoEliminar) return;
        if (await window.sellixConfirm("¿Eliminar este producto de esta sucursal?", { title: 'Eliminar de sucursal' })) {
            setProcesandoEliminar(id);
            try {
                await deleteDoc(doc(db, "inventarios", id));
                await cargarDatos();
            } finally {
                setProcesandoEliminar(null);
            }
        }
    };

    const handleSurtirEfectivo = async (prodMaestro) => {
        if (procesandoSurtir) return;
        setProcesandoSurtir(prodMaestro.id);
        try {
            const existe = inventario.find(p =>
                p.productoId === prodMaestro.id && p.sucursalId === filtroSucursal
            );

            if (existe) {
                const ref = doc(db, "inventarios", existe.id);
                await updateDoc(ref, { cantidad: existe.cantidad + parseInt(cantidadSurtir) });
            } else {
                await addDoc(collection(db, "inventarios"), {
                    productoId: prodMaestro.id,
                    sucursalId: filtroSucursal,
                    descripcion: prodMaestro.descripcion,
                    precio: prodMaestro.precio,
                    codigos: prodMaestro.codigos,
                    cantidad: parseInt(cantidadSurtir),
                    fechaAsignacion: new Date()
                });
            }
            alert("Inventario actualizado");
            setBusquedaCatalogo('');
            setMostrarSurtir(false);
            await cargarDatos();
        } catch (error) {
            alert("Error al surtir stock");
        } finally {
            setProcesandoSurtir(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F5EC] pb-20">
            <AdminNavbar />
            <div className="p-8 max-w-7xl mx-auto">

                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h2 className="text-4xl font-black uppercase italic text-[#1A2517] leading-none">Control de Existencias</h2>
                        {filtroSucursal !== 'todas' && (
                            <button onClick={() => setFiltroSucursal('todas')} className="text-[#1A2517] font-black text-xs uppercase mt-2 tracking-widest">← Volver a todas las sedes</button>
                        )}
                    </div>

                    {filtroSucursal !== 'todas' && (
                        <button
                            onClick={() => setMostrarSurtir(true)}
                            className="bg-[#1A2517] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase italic"
                        >
                            + Surtir Mercancía
                        </button>
                    )}
                </div>

                {filtroSucursal === 'todas' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[30px]">
                        {sucursales.map(suc => {
                            const resumen = obtenerResumenSucursal(suc.id);
                            return (
                                <div
                                    key={suc.id}
                                    onClick={() => setFiltroSucursal(suc.id)}
                                    className="bg-[#FFFDF7] p-10 rounded-[45px] shadow-sm border border-[#E3D9C8] flex flex-col items-center justify-center text-center hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
                                >
                                    <div className="text-5xl mb-4 group-hover:rotate-12 transition-transform">🏪</div>
                                    <h3 className="text-xl font-black text-[#1A2517] uppercase tracking-tighter">{suc.nombre}</h3>
                                    <p className="text-[#8A8377] text-xs font-bold mb-6 italic tracking-widest">{suc.ubicacion}</p>

                                    <div className="bg-[#E5EEDC] w-full py-6 rounded-[30px] space-y-4">
                                        <div className="grid grid-cols-2 border-b border-[#D9E5D3] pb-3 mx-4">
                                            <div>
                                                <p className="text-[9px] font-black text-[#ACC8A2] uppercase tracking-widest">Variedad</p>
                                                <p className="text-xl font-black text-[#1A2517]">{resumen.variedad}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-[#ACC8A2] uppercase tracking-widest">Stock Total</p>
                                                <p className="text-xl font-black text-[#1A2517]">{resumen.totalItems}</p>
                                            </div>
                                        </div>
                                        {/* VALOR TOTAL EN RECUADRO */}
                                        <div>
                                            <p className="text-[10px] font-black text-[#ACC8A2] uppercase tracking-widest mb-1">Valor en Mercancía</p>
                                            <p className="text-3xl font-black text-[#576238] italic">
                                                ${resumen.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="mt-4 text-[10px] font-black text-[#1A2517] uppercase tracking-widest">Ver Inventario →</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-[#FFFDF7] rounded-[40px] shadow-sm overflow-hidden border border-[#E3D9C8]">
                        {/* CABECERA DE DETALLE CON VALOR TOTAL */}
                        <div className="p-8 bg-[#F8F5EC] border-b flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-[#1A2517] uppercase italic">
                                    Sede: {sucursales.find(s => s.id === filtroSucursal)?.nombre}
                                </h3>
                                <p className="text-[#8A8377] text-xs font-bold uppercase tracking-widest">Desglose de existencias</p>
                            </div>
                            <div className="bg-[#FFFDF7] px-6 py-4 rounded-3xl border shadow-sm text-center">
                                <p className="text-[10px] font-black text-[#8A8377] uppercase tracking-widest mb-1">Valor Total en Sucursal</p>
                                <p className="text-3xl font-black text-[#576238] italic">
                                    ${obtenerResumenSucursal(filtroSucursal).valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-[#FFFDF7] border-b">
                                <tr>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest">Producto</th>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase text-center tracking-widest">Stock</th>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase text-center tracking-widest">Precio U.</th>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase text-center tracking-widest">Subtotal</th>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase text-right tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0EADC]">
                                {inventario.filter(p => p.sucursalId === filtroSucursal).map(p => (
                                    <React.Fragment key={p.id}>
                                        <tr className="hover:bg-[#E5EEDC]/20 transition-colors">
                                            <td className="p-5">
                                                <p className="font-black text-[#3E4635] leading-tight uppercase text-sm">{p.descripcion}</p>
                                                <p className="text-[10px] text-[#8A8377] font-mono">{p.codigos?.join(', ')}</p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`px-4 py-1 rounded-full text-[10px] font-black ${p.cantidad < 5 ? 'bg-[#E8C9BF] text-[#9A3B30]' : 'bg-[#D9E5D3] text-[#576238]'}`}>
                                                    {p.cantidad} PZ
                                                </span>
                                            </td>
                                            <td className="p-5 text-center font-bold text-[#67625C]">${p.precio.toFixed(2)}</td>
                                            {/* SUBTOTAL POR PRODUCTO */}
                                            <td className="p-5 text-center font-black text-[#1A2517]">${(p.cantidad * p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-5 text-right flex gap-2 justify-end">
                                                <button onClick={() => { setEditandoProd(p.id); setNuevoStock(p.cantidad); setNuevoPrecio(p.precio); }} className="p-2 bg-[#E5EEDC] text-[#1A2517] rounded-lg hover:bg-[#1A2517] hover:text-white transition-all">✏️</button>
                                                <button onClick={() => eliminarProducto(p.id)} disabled={procesandoEliminar === p.id} className="p-2 bg-[#F4E6E1] text-[#9A3B30] rounded-lg hover:bg-[#9A3B30] hover:text-white transition-all disabled:opacity-50">🗑️</button>
                                            </td>
                                        </tr>
                                        {editandoProd === p.id && (
                                            <tr className="bg-[#E5EEDC]/50">
                                                <td colSpan="5" className="p-6">
                                                    <div className="flex gap-4 items-end justify-center">
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] font-black text-[#1A2517] uppercase ml-1 mb-1 tracking-widest">Stock</label>
                                                            <input type="number" className="p-3 border-2 rounded-xl w-24 font-black outline-none focus:border-[#576238]" value={nuevoStock} onChange={(e) => setNuevoStock(e.target.value)} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] font-black text-[#1A2517] uppercase ml-1 mb-1 tracking-widest">Precio</label>
                                                            <input type="number" step="0.1" className="p-3 border-2 rounded-xl w-28 font-black outline-none focus:border-[#576238]" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
                                                        </div>
                                                        <button onClick={() => handleActualizar(p.id)} disabled={procesandoActualizar === p.id} className="bg-[#1A2517] text-white px-8 py-3 rounded-xl font-black shadow-md hover:bg-[#576238] transition-all uppercase text-xs disabled:opacity-50">{procesandoActualizar === p.id ? 'Guardando...' : 'Guardar Cambios'}</button>
                                                        <button onClick={() => setEditandoProd(null)} className="text-[#8A8377] font-black uppercase text-[10px] mb-3 ml-2">Cancelar</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL SURTIR */}
            {mostrarSurtir && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-[#FFFDF7] p-8 rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic text-[#1A2517]">Surtir Sede</h3>
                            <button onClick={() => setMostrarSurtir(false)} className="text-3xl hover:rotate-90 transition-transform">✕</button>
                        </div>

                        <input
                            type="text"
                            placeholder="Buscar en catálogo..."
                            className="w-full p-5 border-2 rounded-2xl mb-6 outline-none focus:border-[#576238] font-bold shadow-sm"
                            value={busquedaCatalogo}
                            onChange={(e) => setBusquedaCatalogo(e.target.value)}
                        />

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {catalogoMaestro
                                .filter(p =>
                                    p.descripcion.toLowerCase().includes(busquedaCatalogo.toLowerCase()) ||
                                    p.codigos?.some(c => c.includes(busquedaCatalogo.toUpperCase()))
                                )
                                .map(prod => (
                                    <div key={prod.id} className="bg-[#F8F5EC] p-5 rounded-3xl border-2 border-transparent hover:border-[#576238] transition-all flex justify-between items-center group">
                                        <div className="flex-1">
                                            <p className="font-black text-[#3E4635] uppercase text-sm">{prod.descripcion}</p>
                                            <p className="text-xs text-[#576238] font-black italic mt-1 tracking-widest">${prod.precio.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] font-black text-[#8A8377] uppercase mb-1">Cant.</span>
                                                <input
                                                    type="number"
                                                    className="w-16 p-2 border-2 rounded-xl text-center font-black outline-none focus:border-[#E5EEDC]0"
                                                    defaultValue={1}
                                                    onChange={(e) => setCantidadSurtir(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleSurtirEfectivo(prod)}
                                                disabled={procesandoSurtir === prod.id}
                                                className="bg-[#576238] text-white px-5 py-3 rounded-2xl font-black shadow-md hover:bg-[#576238] transition-all uppercase text-[10px] mt-3 disabled:opacity-50"
                                            >
                                                {procesandoSurtir === prod.id ? 'Añadiendo...' : 'Añadir'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVerInventario;
