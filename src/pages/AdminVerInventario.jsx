import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminVerInventario = () => {
    const [inventario, setInventario] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('todas');
    const [editandoProd, setEditandoProd] = useState(null);
    const [nuevoStock, setNuevoStock] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');

    const cargarDatos = async () => {
        const sSnap = await getDocs(collection(db, "sucursales"));
        const iSnap = await getDocs(collection(db, "inventarios"));
        setSucursales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setInventario(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
        if (window.confirm("¿Eliminar este producto permanentemente?")) {
            await deleteDoc(doc(db, "inventarios", id));
            cargarDatos();
        }
    };

    const filtrados = filtroSucursal === 'todas' ? inventario : inventario.filter(p => p.sucursalId === filtroSucursal);

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black uppercase italic italic text-gray-800">Control de Existencias</h2>
                    <select className="p-3 bg-white rounded-xl shadow-sm font-bold outline-none" value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)}>
                        <option value="todas">Todas las Sedes</option>
                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </div>

                <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase">Producto</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase text-center">Stock</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase text-center">Precio</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtrados.map(p => (
                                <React.Fragment key={p.id}>
                                    <tr className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-5">
                                            <p className="font-black text-gray-700 leading-tight">{p.descripcion}</p>
                                            <p className="text-[10px] text-blue-500 font-bold uppercase">{sucursales.find(s => s.id === p.sucursalId)?.nombre}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${p.cantidad < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {p.cantidad} pz
                                            </span>
                                        </td>
                                        <td className="p-5 text-center font-black text-gray-600">${p.precio}</td>
                                        <td className="p-5 text-right flex gap-2 justify-end">
                                            <button onClick={() => { setEditandoProd(p.id); setNuevoStock(p.cantidad); setNuevoPrecio(p.precio); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg">✏️</button>
                                            <button onClick={() => eliminarProducto(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg">🗑️</button>
                                        </td>
                                    </tr>
                                    {editandoProd === p.id && (
                                        <tr className="bg-blue-50/50">
                                            <td colSpan="4" className="p-4">
                                                <div className="flex gap-4 items-center justify-center">
                                                    <input type="number" className="p-2 border rounded-lg w-24" value={nuevoStock} onChange={(e) => setNuevoStock(e.target.value)} placeholder="Stock" />
                                                    <input type="number" step="0.1" className="p-2 border rounded-lg w-24" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} placeholder="Precio" />
                                                    <button onClick={() => handleActualizar(p.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Guardar</button>
                                                    <button onClick={() => setEditandoProd(null)} className="text-gray-400 font-bold">X</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminVerInventario;