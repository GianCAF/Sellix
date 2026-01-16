import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, addDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminVerInventario = () => {
    const [inventario, setInventario] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [catalogoMaestro, setCatalogoMaestro] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('todas');

    // Estados para edición y surtido
    const [editandoProd, setEditandoProd] = useState(null);
    const [nuevoStock, setNuevoStock] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');

    // Estados para el buscador de surtido
    const [mostrarSurtir, setMostrarSurtir] = useState(false);
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
    const [cantidadSurtir, setCantidadSurtir] = useState(1);

    const cargarDatos = async () => {
        const sSnap = await getDocs(collection(db, "sucursales"));
        const iSnap = await getDocs(collection(db, "inventarios"));
        const cSnap = await getDocs(collection(db, "productos_maestros"));

        setSucursales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setInventario(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCatalogoMaestro(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleActualizar = async (id) => {
        await updateDoc(doc(db, "inventarios", id), {
            cantidad: parseInt(nuevoStock),
            precio: parseFloat(nuevoPrecio)
        });
        setEditandoProd(null);
        cargarDatos();
    };

    const eliminarProducto = async (id) => {
        if (window.confirm("¿Eliminar este producto de esta sucursal?")) {
            await deleteDoc(doc(db, "inventarios", id));
            cargarDatos();
        }
    };

    const handleSurtirEfectivo = async (prodMaestro) => {
        try {
            // Verificar si el producto ya existe en la sucursal filtrada
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
            cargarDatos();
        } catch (error) {
            alert("Error al surtir stock");
        }
    };

    const obtenerResumenSucursal = (id) => {
        const items = inventario.filter(p => p.sucursalId === id);
        return {
            totalItems: items.reduce((acc, p) => acc + p.cantidad, 0),
            variedad: items.length
        };
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AdminNavbar />
            <div className="p-8 max-w-7xl mx-auto">

                {/* CABECERA DINÁMICA */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h2 className="text-4xl font-black uppercase italic text-gray-800">Control de Existencias</h2>
                        {filtroSucursal !== 'todas' && (
                            <button onClick={() => setFiltroSucursal('todas')} className="text-blue-600 font-bold text-sm uppercase mt-2">← Volver a todas las sedes</button>
                        )}
                    </div>

                    {filtroSucursal !== 'todas' && (
                        <button
                            onClick={() => setMostrarSurtir(true)}
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase italic"
                        >
                            + Surtir Mercancía
                        </button>
                    )}
                </div>

                {/* VISTA DE RECUADROS (TODAS LAS SEDES) */}
                {filtroSucursal === 'todas' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[30px]">
                        {sucursales.map(suc => {
                            const resumen = obtenerResumenSucursal(suc.id);
                            return (
                                <div
                                    key={suc.id}
                                    onClick={() => setFiltroSucursal(suc.id)}
                                    className="bg-white p-10 rounded-[45px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
                                >
                                    <div className="text-5xl mb-4 group-hover:rotate-12 transition-transform">🏪</div>
                                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{suc.nombre}</h3>
                                    <p className="text-gray-400 text-xs font-bold mb-6 italic">{suc.ubicacion}</p>

                                    <div className="bg-blue-50 w-full py-6 rounded-[30px] grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase">Variedad</p>
                                            <p className="text-2xl font-black text-blue-600">{resumen.variedad}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase">Stock Total</p>
                                            <p className="text-2xl font-black text-blue-600">{resumen.totalItems}</p>
                                        </div>
                                    </div>
                                    <span className="mt-4 text-xs font-black text-blue-600 uppercase">Ver Inventario →</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* VISTA DETALLADA DE UNA SUCURSAL */
                    <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-black text-gray-600 uppercase italic">
                                Inventario: {sucursales.find(s => s.id === filtroSucursal)?.nombre}
                            </h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white border-b">
                                <tr>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase">Producto</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase text-center">Stock</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase text-center">Precio</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {inventario.filter(p => p.sucursalId === filtroSucursal).map(p => (
                                    <React.Fragment key={p.id}>
                                        <tr className="hover:bg-blue-50/20 transition-colors">
                                            <td className="p-5">
                                                <p className="font-black text-gray-700 leading-tight">{p.descripcion}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{p.codigos?.join(', ')}</p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black ${p.cantidad < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {p.cantidad} pz
                                                </span>
                                            </td>
                                            <td className="p-5 text-center font-black text-gray-600">${p.precio}</td>
                                            <td className="p-5 text-right flex gap-2 justify-end">
                                                <button onClick={() => { setEditandoProd(p.id); setNuevoStock(p.cantidad); setNuevoPrecio(p.precio); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                                                <button onClick={() => eliminarProducto(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                                            </td>
                                        </tr>
                                        {editandoProd === p.id && (
                                            <tr className="bg-blue-50/50">
                                                <td colSpan="4" className="p-4">
                                                    <div className="flex gap-4 items-center justify-center">
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Stock</label>
                                                            <input type="number" className="p-2 border rounded-xl w-24 font-bold" value={nuevoStock} onChange={(e) => setNuevoStock(e.target.value)} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Precio</label>
                                                            <input type="number" step="0.1" className="p-2 border rounded-xl w-24 font-bold" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
                                                        </div>
                                                        <button onClick={() => handleActualizar(p.id)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold mt-4 shadow-md">Guardar</button>
                                                        <button onClick={() => setEditandoProd(null)} className="text-gray-400 font-bold mt-4">Cancelar</button>
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

            {/* MODAL PARA SURTIR PRODUCTOS DEL CATÁLOGO */}
            {mostrarSurtir && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic">Surtir Sede</h3>
                            <button onClick={() => setMostrarSurtir(false)} className="text-3xl hover:rotate-90 transition-transform">✕</button>
                        </div>

                        <input
                            type="text"
                            placeholder="Buscar en catálogo por nombre o código..."
                            className="w-full p-4 border-2 rounded-2xl mb-6 outline-none focus:border-blue-500 font-bold"
                            value={busquedaCatalogo}
                            onChange={(e) => setBusquedaCatalogo(e.target.value)}
                        />

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {catalogoMaestro
                                .filter(p =>
                                    p.descripcion.toLowerCase().includes(busquedaCatalogo.toLowerCase()) ||
                                    p.codigos?.some(c => c.includes(busquedaCatalogo.toUpperCase()))
                                )
                                .map(prod => (
                                    <div key={prod.id} className="bg-gray-50 p-4 rounded-2xl border flex justify-between items-center group hover:border-blue-400 transition-all">
                                        <div className="flex-1">
                                            <p className="font-black text-gray-700 uppercase">{prod.descripcion}</p>
                                            <p className="text-xs text-blue-500 font-bold italic">${prod.precio} (Precio Maestro)</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                className="w-16 p-2 border-2 rounded-xl text-center font-bold"
                                                defaultValue={1}
                                                onChange={(e) => setCantidadSurtir(e.target.value)}
                                            />
                                            <button
                                                onClick={() => handleSurtirEfectivo(prod)}
                                                className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-green-600"
                                            >
                                                AÑADIR
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