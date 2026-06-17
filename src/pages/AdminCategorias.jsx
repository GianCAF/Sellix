import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import { aplicarTenant, perteneceAlTenant } from '../utils/tenant';

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

const AdminCategorias = () => {
    const { user } = useAuth();
    const [nombreCat, setNombreCat] = useState('');
    const [nombreSub, setNombreSub] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [procesando, setProcesando] = useState('');

    const cargarDatos = async () => {
        const catSnap = await getDocs(query(collection(db, "categorias"), orderBy("nombre")));
        setCategorias(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => perteneceAlTenant(user, item)));

        const subSnap = await getDocs(collection(db, "subcategorias"));
        setSubcategorias(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => perteneceAlTenant(user, item)));
    };

    useEffect(() => { if (user) cargarDatos(); }, [user]);

    const crearCategoria = async (e) => {
        e.preventDefault();
        if (procesando) return;
        setProcesando('crearCategoria');
        try {
            await addDoc(collection(db, "categorias"), aplicarTenant(user, { nombre: nombreCat }));
            setNombreCat('');
            await cargarDatos();
        } finally {
            setProcesando('');
        }
    };

    const editarCategoria = async (id, nombreActual) => {
        if (procesando) return;
        const nuevoNombre = await window.sellixPrompt("Editar nombre de categoria:", nombreActual, { title: 'Editar categoria' });
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            setProcesando(`editarCategoria:${id}`);
            try {
                await updateDoc(doc(db, "categorias", id), aplicarTenant(user, { nombre: nuevoNombre }));
                await cargarDatos();
            } finally {
                setProcesando('');
            }
        }
    };

    const eliminarCategoria = async (id) => {
        if (procesando) return;
        if (await window.sellixConfirm("Eliminar categoria? Esto no borrara las subcategorias, pero quedaran huerfanas.", { title: 'Eliminar categoria' })) {
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
        if (!categoriaSeleccionada) return alert("Selecciona una categoria primero");
        setProcesando('crearSubcategoria');
        try {
            await addDoc(collection(db, "subcategorias"), aplicarTenant(user, {
                nombre: nombreSub,
                categoriaId: categoriaSeleccionada
            }));
            setNombreSub('');
            await cargarDatos();
        } finally {
            setProcesando('');
        }
    };

    const editarSubcategoria = async (id, nombreActual) => {
        if (procesando) return;
        const nuevoNombre = await window.sellixPrompt("Editar nombre de subcategoria:", nombreActual, { title: 'Editar subcategoria' });
        if (nuevoNombre && nuevoNombre !== nombreActual) {
            setProcesando(`editarSubcategoria:${id}`);
            try {
                await updateDoc(doc(db, "subcategorias", id), aplicarTenant(user, { nombre: nuevoNombre }));
                await cargarDatos();
            } finally {
                setProcesando('');
            }
        }
    };

    const eliminarSubcategoria = async (id) => {
        if (procesando) return;
        if (await window.sellixConfirm("Eliminar esta subcategoria?", { title: 'Eliminar subcategoria' })) {
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
        <div className="admin-page">
            <AdminNavbar />
            <div className="admin-shell grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF7] p-5 md:p-6 rounded-xl shadow-sm h-fit border border-[#D8C7B5]">
                    <h2 className="text-xl font-black mb-4 text-[#1A2517] uppercase italic">1. Categorias</h2>
                    <form onSubmit={crearCategoria} className="flex flex-col sm:flex-row gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Ej: Audifonos"
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
                            <li key={c.id} className="p-3 bg-[#F8F5EC] rounded-xl border border-[#D8C7B5] flex justify-between items-center group transition-all hover:shadow-md">
                                <span className="font-bold text-[#3E4635]">{c.nombre}</span>
                                <div className="admin-icon-actions">
                                    <button onClick={() => editarCategoria(c.id, c.nombre)} disabled={procesando === `editarCategoria:${c.id}`} className="admin-icon-btn" title="Editar categoria" aria-label="Editar categoria">
                                        <IconEditar />
                                    </button>
                                    <button onClick={() => eliminarCategoria(c.id)} disabled={procesando === `eliminarCategoria:${c.id}`} className="admin-icon-btn admin-icon-btn-danger" title="Eliminar categoria" aria-label="Eliminar categoria">
                                        <IconEliminar />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-[#FFFDF7] p-5 md:p-6 rounded-xl shadow-sm h-fit border border-[#D8C7B5]">
                    <h2 className="text-xl font-black mb-4 text-[#576238] uppercase italic">2. Subcategorias</h2>
                    <form onSubmit={crearSubcategoria} className="space-y-4 mb-6">
                        <select
                            className="w-full border-2 p-2 rounded-xl font-bold bg-[#F8F5EC] outline-none focus:border-[#576238]"
                            value={categoriaSeleccionada}
                            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                            required
                        >
                            <option value="">A que categoria pertenece?</option>
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
                                Anadir
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
                                                <button
                                                    onClick={() => editarSubcategoria(s.id, s.nombre)}
                                                    disabled={procesando === `editarSubcategoria:${s.id}`}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#F8F5EC] text-[#1A2517] shadow-sm transition-colors hover:bg-[#1A2517] hover:text-white disabled:opacity-50"
                                                    title="Editar subcategoria"
                                                    aria-label="Editar subcategoria"
                                                >
                                                    <IconEditar />
                                                </button>
                                                <button
                                                    onClick={() => eliminarSubcategoria(s.id)}
                                                    disabled={procesando === `eliminarSubcategoria:${s.id}`}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#9A3B30] text-white shadow-sm transition-colors hover:bg-[#7E2F28] disabled:opacity-50"
                                                    title="Eliminar subcategoria"
                                                    aria-label="Eliminar subcategoria"
                                                >
                                                    <IconEliminar />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {subcategorias.filter(s => s.categoriaId === c.id).length === 0 && (
                                        <span className="text-[10px] italic text-[#B8AD9D] font-bold uppercase">Sin subcategorias</span>
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
