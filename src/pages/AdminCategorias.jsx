import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminCategorias = () => {
    const [nombreCat, setNombreCat] = useState('');
    const [nombreSub, setNombreSub] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);

    const cargarDatos = async () => {
        const catSnap = await getDocs(query(collection(db, "categorias"), orderBy("nombre")));
        setCategorias(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const subSnap = await getDocs(collection(db, "subcategorias"));
        setSubcategorias(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    // --- FUNCIONES PARA CATEGORÍAS ---
    const crearCategoria = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "categorias"), { nombre: nombreCat });
        setNombreCat('');
        cargarDatos();
    };

    const editarCategoria = async (id, nombreActual) => {
        const nuevoNombre = prompt("Editar nombre de categoría:", nombreActual);
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            await updateDoc(doc(db, "categorias", id), { nombre: nuevoNombre });
            cargarDatos();
        }
    };

    const eliminarCategoria = async (id) => {
        if (window.confirm("¿Eliminar categoría? Esto no borrará las subcategorías, pero quedarán huérfanas.")) {
            await deleteDoc(doc(db, "categorias", id));
            cargarDatos();
        }
    };

    // --- FUNCIONES PARA SUBCATEGORÍAS ---
    const crearSubcategoria = async (e) => {
        e.preventDefault();
        if (!categoriaSeleccionada) return alert("Selecciona una categoría primero");
        await addDoc(collection(db, "subcategorias"), {
            nombre: nombreSub,
            categoriaId: categoriaSeleccionada
        });
        setNombreSub('');
        cargarDatos();
    };

    const editarSubcategoria = async (id, nombreActual) => {
        const nuevoNombre = prompt("Editar nombre de subcategoría:", nombreActual);
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            await updateDoc(doc(db, "subcategorias", id), { nombre: nuevoNombre });
            cargarDatos();
        }
    };

    const eliminarSubcategoria = async (id) => {
        if (window.confirm("¿Eliminar esta subcategoría?")) {
            await deleteDoc(doc(db, "subcategorias", id));
            cargarDatos();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Sección Categorías */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4 text-blue-600">1. Categorías</h2>
                    <form onSubmit={crearCategoria} className="flex gap-2 mb-6">
                        <input
                            type="text" placeholder="Ej: Audífonos" className="border p-2 rounded flex-1"
                            value={nombreCat} onChange={(e) => setNombreCat(e.target.value)} required
                        />
                        <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Crear</button>
                    </form>
                    <ul className="space-y-2">
                        {categorias.map(c => (
                            <li key={c.id} className="p-2 bg-gray-50 rounded border flex justify-between items-center group">
                                <span>{c.nombre}</span>
                                <div className="space-x-2">
                                    <button onClick={() => editarCategoria(c.id, c.nombre)} className="text-blue-500 text-sm hover:underline">Editar</button>
                                    <button onClick={() => eliminarCategoria(c.id)} className="text-red-500 text-sm hover:underline">Borrar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Sección Subcategorías */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4 text-green-600">2. Subcategorías</h2>
                    <form onSubmit={crearSubcategoria} className="space-y-4 mb-6">
                        <select
                            className="w-full border p-2 rounded"
                            value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)} required
                        >
                            <option value="">¿A qué categoría pertenece?</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <input
                                type="text" placeholder="Ej: Diadema" className="border p-2 rounded flex-1"
                                value={nombreSub} onChange={(e) => setNombreSub(e.target.value)} required
                            />
                            <button className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">Añadir</button>
                        </div>
                    </form>
                    <div className="space-y-4">
                        {categorias.map(c => (
                            <div key={c.id} className="border-l-4 border-blue-200 pl-4">
                                <h3 className="font-bold text-gray-700">{c.nombre}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {subcategorias.filter(s => s.categoriaId === c.id).map(s => (
                                        <div key={s.id} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200 flex items-center gap-2">
                                            <span>{s.nombre}</span>
                                            <button onClick={() => editarSubcategoria(s.id, s.nombre)} className="hover:text-blue-600 font-bold">✎</button>
                                            <button onClick={() => eliminarSubcategoria(s.id)} className="hover:text-red-600 font-bold">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminCategorias;