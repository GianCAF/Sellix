import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminMarcas = () => {
    const [nombreMarca, setNombreMarca] = useState('');
    const [marcas, setMarcas] = useState([]);

    const cargarMarcas = async () => {
        const q = query(collection(db, "marcas"), orderBy("nombre"));
        const querySnapshot = await getDocs(q);
        setMarcas(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { cargarMarcas(); }, []);

    const crearMarca = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "marcas"), { nombre: nombreMarca });
        setNombreMarca('');
        cargarMarcas();
    };

    const editarMarca = async (id, nombreActual) => {
        const nuevoNombre = prompt("Editar nombre de la marca:", nombreActual);
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            await updateDoc(doc(db, "marcas", id), { nombre: nuevoNombre });
            cargarMarcas();
        }
    };

    const eliminarMarca = async (id) => {
        if (window.confirm("¿Eliminar esta marca?")) {
            await deleteDoc(doc(db, "marcas", id));
            cargarMarcas();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-black mb-6 text-gray-800 uppercase italic">Registrar Marcas</h2>

                {/* Formulario Responsivo */}
                <form onSubmit={crearMarca} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm mb-8 flex flex-col sm:flex-row gap-3 border border-gray-100">
                    <input
                        type="text"
                        placeholder="Ej: Samsung, Apple, Sony..."
                        className="border-2 p-3 rounded-xl flex-1 outline-none focus:border-blue-500 font-bold transition-all"
                        value={nombreMarca}
                        onChange={(e) => setNombreMarca(e.target.value)}
                        required
                    />
                    <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 transition-all uppercase text-sm shadow-md active:scale-95">
                        Guardar
                    </button>
                </form>

                {/* Tabla/Lista Responsiva */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre de la Marca</th>
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {marcas.map(m => (
                                    <tr key={m.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-4">
                                            <span className="font-bold text-gray-700 uppercase text-sm tracking-tighter">{m.nombre}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => editarMarca(m.id, m.nombre)}
                                                    className="text-blue-500 hover:text-blue-700 text-xs font-black uppercase tracking-tighter"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => eliminarMarca(m.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-black uppercase tracking-tighter"
                                                >
                                                    Borrar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {marcas.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="p-10 text-center text-gray-300 font-black uppercase italic">
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