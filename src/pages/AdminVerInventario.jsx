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
        if (window.confirm("¿Estás seguro de eliminar este producto del inventario?")) {
            await deleteDoc(doc(db, "inventarios", id));
            cargarDatos();
        }
    };

    // Filtrado lógico
    const productosFiltrados = filtroSucursal === 'todas'
        ? inventario
        : inventario.filter(p => p.sucursalId === filtroSucursal);

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h2 className="text-3xl font-extrabold text-gray-800">Control de Stock</h2>

                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
                        <span className="text-sm font-bold text-gray-500 ml-2">Filtrar por Sede:</span>
                        <select
                            className="outline-none bg-transparent font-medium text-blue-600"
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

                {loading ? (
                    <div className="text-center py-20 font-bold text-gray-400">Cargando existencias...</div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Descripción</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Sucursal</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Stock</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Precio</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Códigos</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {productosFiltrados.map((p) => (
                                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 font-semibold text-gray-700">{p.descripcion}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {sucursales.find(s => s.id === p.sucursalId)?.nombre || 'Desconocida'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full font-bold text-xs ${p.cantidad < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {p.cantidad} pz
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-blue-600">
                                            ${p.precio?.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                {p.codigos?.slice(0, 2).map((c, i) => (
                                                    <span key={i} className="text-[10px] font-mono bg-gray-100 p-1 rounded italic">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => eliminarProducto(p.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {productosFiltrados.length === 0 && (
                            <div className="p-10 text-center text-gray-400">No hay productos en esta sucursal.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminVerInventario;