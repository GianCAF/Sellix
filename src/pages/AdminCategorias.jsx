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
            <div className="p-4 md:p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Sección Categorías */}
                <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm h-fit">
                    <h2 className="text-xl font-black mb-4 text-blue-600 uppercase italic">1. Categorías</h2>
                    <form onSubmit={crearCategoria} className="flex flex-col sm:flex-row gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Ej: Audífonos"
                            className="border-2 p-2 rounded-xl flex-1 outline-none focus:border-blue-400 font-bold"
                            value={nombreCat}
                            onChange={(e) => setNombreCat(e.target.value)}
                            required
                        />
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black hover:bg-blue-700 transition-colors uppercase text-sm">
                            Crear
                        </button>
                    </form>
                    <ul className="space-y-2">
                        {categorias.map(c => (
                            <li key={c.id} className="p-3 bg-gray-50 rounded-xl border flex justify-between items-center group transition-all hover:shadow-md">
                                <span className="font-bold text-gray-700">{c.nombre}</span>
                                <div className="flex gap-3">
                                    <button onClick={() => editarCategoria(c.id, c.nombre)} className="text-blue-500 text-xs font-black uppercase hover:underline">Editar</button>
                                    <button onClick={() => eliminarCategoria(c.id)} className="text-red-500 text-xs font-black uppercase hover:underline">Borrar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Sección Subcategorías */}
                <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm h-fit">
                    <h2 className="text-xl font-black mb-4 text-green-600 uppercase italic">2. Subcategorías</h2>
                    <form onSubmit={crearSubcategoria} className="space-y-4 mb-6">
                        <select
                            className="w-full border-2 p-2 rounded-xl font-bold bg-gray-50 outline-none focus:border-green-400"
                            value={categoriaSeleccionada}
                            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                            required
                        >
                            <option value="">¿A qué categoría pertenece?</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder="Ej: Diadema"
                                className="border-2 p-2 rounded-xl flex-1 outline-none focus:border-green-400 font-bold"
                                value={nombreSub}
                                onChange={(e) => setNombreSub(e.target.value)}
                                required
                            />
                            <button className="bg-green-600 text-white px-6 py-2 rounded-xl font-black hover:bg-green-700 transition-colors uppercase text-sm">
                                Añadir
                            </button>
                        </div>
                    </form>
                    <div className="space-y-4">
                        {categorias.map(c => (
                            <div key={c.id} className="border-l-4 border-blue-200 pl-4 py-1">
                                <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">{c.nombre}</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {subcategorias.filter(s => s.categoriaId === c.id).map(s => (
                                        <div key={s.id} className="bg-green-50 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-green-100 flex items-center gap-2 uppercase tracking-tighter">
                                            <span>{s.nombre}</span>
                                            <div className="flex gap-1 border-l pl-2 border-green-200">
                                                <button onClick={() => editarSubcategoria(s.id, s.nombre)} className="hover:text-blue-600">✎</button>
                                                <button onClick={() => eliminarSubcategoria(s.id)} className="hover:text-red-600 text-lg leading-none">×</button>
                                            </div>
                                        </div>
                                    ))}
                                    {subcategorias.filter(s => s.categoriaId === c.id).length === 0 && (
                                        <span className="text-[10px] italic text-gray-300 font-bold uppercase">Sin subcategorías</span>
                                    )}
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