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
            <div className="p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Registrar Marcas</h2>

                <form onSubmit={crearMarca} className="bg-white p-6 rounded-xl shadow-sm mb-8 flex gap-2">
                    <input
                        type="text" placeholder="Ej: Samsung, Apple, Sony..." className="border p-2 rounded flex-1 outline-none focus:ring-2 focus:ring-blue-500"
                        value={nombreMarca} onChange={(e) => setNombreMarca(e.target.value)} required
                    />
                    <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition-colors">
                        Guardar
                    </button>
                </form>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4">Nombre de la Marca</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marcas.map(m => (
                                <tr key={m.id} className="border-t hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-700">{m.nombre}</td>
                                    <td className="p-4 text-right space-x-3">
                                        <button onClick={() => editarMarca(m.id, m.nombre)} className="text-blue-500 hover:underline text-sm">Editar</button>
                                        <button onClick={() => eliminarMarca(m.id)} className="text-red-500 hover:underline text-sm">Borrar</button>
                                    </td>
                                </tr>
                            ))}
                            {marcas.length === 0 && (
                                <tr>
                                    <td colSpan="2" className="p-8 text-center text-gray-400 italic">No hay marcas registradas aún.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminMarcas;