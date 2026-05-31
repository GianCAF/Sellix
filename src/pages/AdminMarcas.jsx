import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminMarcas = () => {
    const [nombreMarca, setNombreMarca] = useState('');
    const [marcas, setMarcas] = useState([]);
    const [procesando, setProcesando] = useState('');

    const cargarMarcas = async () => {
        const q = query(collection(db, "marcas"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        setMarcas(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { cargarMarcas(); }, []);

    const crearMarca = async (e) => {
        e.preventDefault();
        if (procesando) return;
        setProcesando('crear');
        try {
            await addDoc(collection(db, "marcas"), { nombre: nombreMarca });
            setNombreMarca('');
            await cargarMarcas();
        } finally {
            setProcesando('');
        }
    };

    const editarMarca = async (id, nombreActual) => {
        if (procesando) return;
        const nuevoNombre = prompt("Editar nombre de la marca:", nombreActual);
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            setProcesando(`editar:${id}`);
            try {
                await updateDoc(doc(db, "marcas", id), { nombre: nuevoNombre });
                await cargarMarcas();
            } finally {
                setProcesando('');
            }
        }
    };

    const eliminarMarca = async (id) => {
        if (procesando) return;
        if (window.confirm("¿Eliminar esta marca?")) {
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
        <div className="min-h-screen bg-[#F8F5EC]">
            <AdminNavbar />
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-black mb-6 text-[#1A2517] uppercase italic">Registrar Marcas</h2>

                {/* Formulario Responsivo */}
                <form onSubmit={crearMarca} className="bg-[#FFFDF7] p-5 md:p-6 rounded-2xl shadow-sm mb-8 flex flex-col sm:flex-row gap-3 border border-[#E3D9C8]">
                    <input
                        type="text"
                        placeholder="Ej: Samsung, Apple, Sony..."
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
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => editarMarca(m.id, m.nombre)}
                                                    disabled={procesando === `editar:${m.id}`}
                                                    className="text-[#576238] hover:text-[#1A2517] text-xs font-black uppercase tracking-tighter disabled:opacity-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => eliminarMarca(m.id)}
                                                    disabled={procesando === `eliminar:${m.id}`}
                                                    className="text-[#9A3B30] hover:text-[#7E2F28] text-xs font-black uppercase tracking-tighter disabled:opacity-50"
                                                >
                                                    Borrar
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
