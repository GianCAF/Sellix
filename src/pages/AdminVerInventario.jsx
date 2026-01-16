import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminVerInventario = () => {
    const [inventario, setInventario] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('todas');
    const [loading, setLoading] = useState(true);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const invSnap = await getDocs(collection(db, "inventarios"));

            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setInventario(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error cargando inventario:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const eliminarProducto = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar este producto?")) {
            await deleteDoc(doc(db, "inventarios", id));
            cargarDatos();
        }
    };

    // 1. Filtrado lógico
    const productosFiltrados = filtroSucursal === 'todas'
        ? inventario
        : inventario.filter(p => p.sucursalId === filtroSucursal);

    // 2. Cálculo del Valor Total del Inventario Filtrado
    const inversionTotal = productosFiltrados.reduce((acc, p) => {
        const cant = p.cantidad > 0 ? p.cantidad : 0;
        return acc + (cant * (p.precio || 0));
    }, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-7xl mx-auto">

                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800">Control de Stock</h2>
                        <p className="text-gray-500">Visualización de activos por sede</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Tarjeta de Valor Total */}
                        <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center min-w-[200px]">
                            <span className="text-xs uppercase font-bold opacity-80">Valor Total {filtroSucursal === 'todas' ? 'Global' : 'Sede'}</span>
                            <span className="text-2xl font-black">${inversionTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border h-full">
                            <span className="text-sm font-bold text-gray-500">Filtrar Sede:</span>
                            <select
                                className="outline-none bg-transparent font-bold text-blue-600 cursor-pointer"
                                value={filtroSucursal}
                                onChange={(e) => setFiltroSucursal(e.target.value)}
                            >
                                <option value="todas">Todas las sucursales</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 font-bold text-gray-400 animate-pulse">Cargando existencias...</div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Descripción</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Sucursal</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Existencia</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Precio Unit.</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Valor Total</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {productosFiltrados.map((p) => {
                                    const valorFila = (p.cantidad > 0 ? p.cantidad : 0) * (p.precio || 0);
                                    return (
                                        <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-700">{p.descripcion}</div>
                                                <div className="text-[10px] text-gray-400 font-mono">ID: {p.id.substring(0, 8)}</div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 font-medium">
                                                {sucursales.find(s => s.id === p.sucursalId)?.nombre || 'Desconocida'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full font-bold text-xs ${p.cantidad < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {p.cantidad} pz
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-medium text-gray-600">
                                                ${p.precio?.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-center font-black text-gray-800 bg-gray-50/50">
                                                ${valorFila.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => eliminarProducto(p.id)} className="text-red-300 hover:text-red-600 transition-colors text-xl">
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {productosFiltrados.length === 0 && (
                            <div className="p-20 text-center text-gray-400 italic">No se encontraron productos registrados.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminVerInventario;