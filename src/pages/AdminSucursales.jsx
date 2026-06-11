import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const IconEditar = () => (
    <svg className="admin-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
);

const IconEliminar = () => (
    <svg className="admin-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 15h10l1-15" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    </svg>
);

const AdminSucursales = () => {
    const [nombre, setNombre] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [editandoId, setEditandoId] = useState(null);
    const [procesando, setProcesando] = useState('');

    const cargarSucursales = async () => {
        const querySnapshot = await getDocs(collection(db, "sucursales"));
        setSucursales(querySnapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })));
    };

    useEffect(() => { cargarSucursales(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (procesando) return;
        setProcesando('guardar');
        try {
            if (editandoId) {
                await updateDoc(doc(db, "sucursales", editandoId), { nombre, ubicacion });
                setEditandoId(null);
            } else {
                await addDoc(collection(db, "sucursales"), { nombre, ubicacion });
            }
            setNombre('');
            setUbicacion('');
            await cargarSucursales();
        } catch (error) {
            console.error(error);
        } finally {
            setProcesando('');
        }
    };

    const prepararEdicion = (suc) => {
        setEditandoId(suc.id);
        setNombre(suc.nombre);
        setUbicacion(suc.ubicacion);
        window.scrollTo(0, 0);
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setNombre('');
        setUbicacion('');
    };

    const eliminarSucursal = async (id) => {
        if (procesando) return;
        if (await window.sellixConfirm("Seguro que quieres eliminar esta sucursal?", { title: 'Eliminar sucursal' })) {
            setProcesando(`eliminar:${id}`);
            try {
                await deleteDoc(doc(db, "sucursales", id));
                await cargarSucursales();
            } finally {
                setProcesando('');
            }
        }
    };

    return (
        <div className="admin-page">
            <AdminNavbar />
            <div className="admin-shell">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.95fr)_2fr] gap-5 items-start">
                    <form onSubmit={handleSubmit} className="bg-[#FFFDF7] border border-[#D8C7B5] rounded-2xl shadow-sm p-5 md:p-6">
                        <h2 className="text-xl font-black mb-6 text-[#1A2517]">
                            {editandoId ? 'Editando sucursal' : 'Nueva sucursal'}
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-base font-black text-[#1A2517] mb-1">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full h-11 px-4 border border-[#D8C7B5] rounded-lg bg-[#FFFDF7] shadow-sm outline-none focus:border-[#576238]"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-base font-black text-[#1A2517] mb-1">Ubicacion</label>
                                <input
                                    type="text"
                                    className="w-full h-11 px-4 border border-[#D8C7B5] rounded-lg bg-[#FFFDF7] shadow-sm outline-none focus:border-[#576238]"
                                    value={ubicacion}
                                    onChange={(e) => setUbicacion(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" disabled={procesando === 'guardar'} className={`w-full h-11 rounded-lg font-black text-white shadow-md disabled:opacity-50 ${editandoId ? 'bg-[#67625C]' : 'bg-[#1A2517]'}`}>
                                {procesando === 'guardar' ? 'Procesando...' : editandoId ? 'Actualizar sucursal' : 'Guardar sucursal'}
                            </button>
                            {editandoId && (
                                <button type="button" onClick={cancelarEdicion} className="w-full text-[#8A8377] font-black text-sm">
                                    Cancelar edicion
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="bg-[#FFFDF7] border border-[#D8C7B5] rounded-2xl shadow-sm p-5 md:p-6">
                        <h2 className="text-xl font-black mb-6 text-[#1A2517]">Sucursales</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-[#D8C7B5]">
                                        <th className="py-3 px-2 text-sm font-black text-[#67625C]">Nombre</th>
                                        <th className="py-3 px-2 text-sm font-black text-[#67625C]">Ubicacion</th>
                                        <th className="py-3 px-2 text-sm font-black text-[#67625C] text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D8C7B5]">
                                    {sucursales.map(s => (
                                        <tr key={s.id}>
                                            <td className="py-4 px-2 font-black text-[#1A2517]">{s.nombre}</td>
                                            <td className="py-4 px-2 text-[#1A2517]">{s.ubicacion}</td>
                                            <td className="py-4 px-2">
                                                <div className="admin-icon-actions justify-center">
                                                    <button onClick={() => prepararEdicion(s)} className="admin-icon-btn" title="Editar sucursal" aria-label="Editar sucursal">
                                                        <IconEditar />
                                                    </button>
                                                    <button onClick={() => eliminarSucursal(s.id)} disabled={procesando === `eliminar:${s.id}`} className="admin-icon-btn admin-icon-btn-danger" title="Eliminar sucursal" aria-label="Eliminar sucursal">
                                                        <IconEliminar />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSucursales;
