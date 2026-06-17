import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import { aplicarTenant, perteneceAlTenant, obtenerConfigGiro } from '../utils/tenant';

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

const AdminMarcas = () => {
    const { user } = useAuth();
    const recomendaciones = obtenerConfigGiro(user);
    const [nombreMarca, setNombreMarca] = useState('');
    const [marcas, setMarcas] = useState([]);
    const [procesando, setProcesando] = useState('');

    const cargarMarcas = async () => {
        const q = query(collection(db, "marcas"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        setMarcas(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => perteneceAlTenant(user, item)));
    };

    useEffect(() => { if (user) cargarMarcas(); }, [user]);

    const crearMarca = async (e) => {
        e.preventDefault();
        if (procesando) return;
        setProcesando('crear');
        try {
            await addDoc(collection(db, "marcas"), aplicarTenant(user, { nombre: nombreMarca }));
            setNombreMarca('');
            await cargarMarcas();
        } finally {
            setProcesando('');
        }
    };

    const editarMarca = async (id, nombreActual) => {
        if (procesando) return;
        const nuevoNombre = await window.sellixPrompt("Editar nombre de la marca:", nombreActual, { title: 'Editar marca' });
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            setProcesando(`editar:${id}`);
            try {
                await updateDoc(doc(db, "marcas", id), aplicarTenant(user, { nombre: nuevoNombre }));
                await cargarMarcas();
            } finally {
                setProcesando('');
            }
        }
    };

    const eliminarMarca = async (id) => {
        if (procesando) return;
        if (await window.sellixConfirm("¿Eliminar esta marca?", { title: 'Eliminar marca' })) {
            setProcesando(`eliminar:${id}`);
            try {
                await deleteDoc(doc(db, "marcas", id));
                await cargarMarcas();
            } finally {
                setProcesando('');
            }
        }
    };

    return (
        <div className="admin-page">
            <AdminNavbar />
            <div className="admin-shell max-w-4xl">
                <h2 className="text-2xl font-black mb-6 text-[#1A2517] uppercase italic">Registrar Marcas</h2>

                {/* Formulario Responsivo */}
                <form onSubmit={crearMarca} className="bg-[#FFFDF7] p-5 md:p-6 rounded-2xl shadow-sm mb-8 flex flex-col sm:flex-row gap-3 border border-[#E3D9C8]">
                    <input
                        type="text"
                        placeholder={recomendaciones.marca}
                        className="border-2 p-3 rounded-xl flex-1 outline-none focus:border-[#576238] font-bold transition-all"
                        value={nombreMarca}
                        onChange={(e) => setNombreMarca(e.target.value)}
                        required
                    />
                    <button disabled={procesando === 'crear'} className="bg-[#1A2517] text-white px-8 py-3 rounded-xl font-black hover:bg-[#576238] transition-all uppercase text-sm shadow-md active:scale-95 disabled:opacity-50">
                        {procesando === 'crear' ? 'Guardando...' : 'Guardar'}
                    </button>
                </form>

                {/* Tabla/Lista Responsiva */}
                <div className="bg-[#FFFDF7] rounded-2xl shadow-sm overflow-hidden border border-[#E3D9C8]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F8F5EC] border-b">
                                <tr>
                                    <th className="p-4 text-[10px] font-black text-[#8A8377] uppercase tracking-widest">Nombre de la Marca</th>
                                    <th className="p-4 text-[10px] font-black text-[#8A8377] uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0EADC]">
                                {marcas.map(m => (
                                    <tr key={m.id} className="hover:bg-[#E5EEDC]/20 transition-colors">
                                        <td className="p-4">
                                            <span className="font-bold text-[#3E4635] uppercase text-sm tracking-tighter">{m.nombre}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="admin-icon-actions">
                                                <button
                                                    onClick={() => editarMarca(m.id, m.nombre)}
                                                    disabled={procesando === `editar:${m.id}`}
                                                    className="admin-icon-btn"
                                                    title="Editar marca"
                                                    aria-label="Editar marca"
                                                >
                                                    <IconEditar />
                                                </button>
                                                <button
                                                    onClick={() => eliminarMarca(m.id)}
                                                    disabled={procesando === `eliminar:${m.id}`}
                                                    className="admin-icon-btn admin-icon-btn-danger"
                                                    title="Eliminar marca"
                                                    aria-label="Eliminar marca"
                                                >
                                                    <IconEliminar />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {marcas.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="p-10 text-center text-[#B8AD9D] font-black uppercase italic">
                                            No hay marcas registradas aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMarcas;
