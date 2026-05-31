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
    const [procesando, setProcesando] = useState('');

    const cargarDatos = async () => {
        const catSnap = await getDocs(query(collection(db, "categorias"), orderBy("nombre")));
        setCategorias(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const subSnap = await getDocs(collection(db, "subcategorias"));
        setSubcategorias(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    const crearCategoria = async (e) => {
        e.preventDefault();
        if (procesando) return;
        setProcesando('crearCategoria');
        try {
            await addDoc(collection(db, "categorias"), { nombre: nombreCat });
            setNombreCat('');
            await cargarDatos();
        } finally {
            setProcesando('');
        }
    };

    const editarCategoria = async (id, nombreActual) => {
        if (procesando) return;
        const nuevoNombre = prompt("Editar nombre de categoría:", nombreActual);
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            setProcesando(`editarCategoria:${id}`);
            try {
                await updateDoc(doc(db, "categorias", id), { nombre: nuevoNombre });
                await cargarDatos();
            } finally {
                setProcesando('');
            }
        }
    };

    const eliminarCategoria = async (id) => {
        if (procesando) return;
        if (window.confirm("¿Eliminar categoría? Esto no borrará las subcategorías, pero quedarán huérfanas.")) {
            setProcesando(`eliminarCategoria:${id}`);
            try {
                await deleteDoc(doc(db, "categorias", id));
                await cargarDatos();
            } finally {
                setProcesando('');
            }
        }
    };

    const crearSubcategoria = async (e) => {
        e.preventDefault();
        if (procesando) return;
        if (!categoriaSeleccionada) return alert("Selecciona una categoría primero");
        setProcesando('crearSubcategoria');
        try {
            await addDoc(collection(db, "subcategorias"), {
                nombre: nombreSub,
                categoriaId: categoriaSeleccionada
            });
            setNombreSub('');
            await cargarDatos();
        } finally {
            setProcesando('');
        }
    };

    const editarSubcategoria = async (id, nombreActual) => {
        if (procesando) return;
        const nuevoNombre = prompt("Editar nombre de subcategoría:", nombreActual);
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            setProcesando(`editarSubcategoria:${id}`);
            try {
                await updateDoc(doc(db, "subcategorias", id), { nombre: nuevoNombre });
                await cargarDatos();
            } finally {
                setProcesando('');
            }
        }
    };

    const eliminarSubcategoria = async (id) => {
        if (procesando) return;
        if (window.confirm("¿Eliminar esta subcategoría?")) {
            setProcesando(`eliminarSubcategoria:${id}`);
            try {
                await deleteDoc(doc(db, "subcategorias", id));
                await cargarDatos();
            } finally {
                setProcesando('');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F5EC]">
            <AdminNavbar />
            <div className="p-4 md:p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Sección Categorías */}
                <div className="bg-[#FFFDF7] p-5 md:p-6 rounded-xl shadow-sm h-fit">
                    <h2 className="text-xl font-black mb-4 text-[#1A2517] uppercase italic">1. Categorías</h2>
                    <form onSubmit={crearCategoria} className="flex flex-col sm:flex-row gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Ej: Audífonos"
                            className="border-2 p-2 rounded-xl flex-1 outline-none focus:border-[#576238] font-bold"
                            value={nombreCat}
                            onChange={(e) => setNombreCat(e.target.value)}
                            required
                        />
                        <button disabled={procesando === 'crearCategoria'} className="bg-[#1A2517] text-white px-6 py-2 rounded-xl font-black hover:bg-[#576238] transition-colors uppercase text-sm disabled:opacity-50">
                            {procesando === 'crearCategoria' ? 'Creando...' : 'Crear'}
                        </button>
                    </form>
                    <ul className="space-y-2">
                        {categorias.map(c => (
                            <li key={c.id} className="p-3 bg-[#F8F5EC] rounded-xl border flex justify-between items-center group transition-all hover:shadow-md">
                                <span className="font-bold text-[#3E4635]">{c.nombre}</span>
                                <div className="flex gap-3">
                                    <button onClick={() => editarCategoria(c.id, c.nombre)} disabled={procesando === `editarCategoria:${c.id}`} className="text-[#576238] text-xs font-black uppercase hover:underline disabled:opacity-50">Editar</button>
                                    <button onClick={() => eliminarCategoria(c.id)} disabled={procesando === `eliminarCategoria:${c.id}`} className="text-[#9A3B30] text-xs font-black uppercase hover:underline disabled:opacity-50">Borrar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Sección Subcategorías */}
                <div className="bg-[#FFFDF7] p-5 md:p-6 rounded-xl shadow-sm h-fit">
                    <h2 className="text-xl font-black mb-4 text-[#576238] uppercase italic">2. Subcategorías</h2>
                    <form onSubmit={crearSubcategoria} className="space-y-4 mb-6">
                        <select
                            className="w-full border-2 p-2 rounded-xl font-bold bg-[#F8F5EC] outline-none focus:border-[#576238]"
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
                                className="border-2 p-2 rounded-xl flex-1 outline-none focus:border-[#576238] font-bold"
                                value={nombreSub}
                                onChange={(e) => setNombreSub(e.target.value)}
                                required
                            />
                            <button disabled={procesando === 'crearSubcategoria'} className="bg-[#576238] text-white px-6 py-2 rounded-xl font-black hover:bg-[#1A2517] transition-colors uppercase text-sm disabled:opacity-50">
                                Añadir
                            </button>
                        </div>
                    </form>
                    <div className="space-y-4">
                        {categorias.map(c => (
                            <div key={c.id} className="border-l-4 border-[#ACC8A2] pl-4 py-1">
                                <h3 className="font-black text-[#8A8377] uppercase text-[10px] tracking-widest">{c.nombre}</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {subcategorias.filter(s => s.categoriaId === c.id).map(s => (
                                        <div key={s.id} className="bg-[#E5EEDC] text-[#1A2517] text-[10px] font-black px-3 py-1.5 rounded-full border border-[#D9E5D3] flex items-center gap-2 uppercase tracking-tighter">
                                            <span>{s.nombre}</span>
                                            <div className="flex gap-1 border-l pl-2 border-[#ACC8A2]">
                                                <button onClick={() => editarSubcategoria(s.id, s.nombre)} className="hover:text-[#1A2517]">✎</button>
                                                <button onClick={() => eliminarSubcategoria(s.id)} className="hover:text-[#9A3B30] text-lg leading-none">×</button>
                                            </div>
                                        </div>
                                    ))}
                                    {subcategorias.filter(s => s.categoriaId === c.id).length === 0 && (
                                        <span className="text-[10px] italic text-[#B8AD9D] font-bold uppercase">Sin subcategorías</span>
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
