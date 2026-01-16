import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminInventario = () => {
    // Datos de catálogos
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [productosMaestros, setProductosMaestros] = useState([]);

    // Estados de navegación y UI
    const [vistaActual, setVistaActual] = useState('registrar'); // 'registrar' o 'ver'
    const [editandoId, setEditandoId] = useState(null);

    // Estado del formulario
    const [catSel, setCatSel] = useState('');
    const [subSel, setSubSel] = useState('');
    const [marcaSel, setMarcaSel] = useState('');
    const [modelo, setModelo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('');
    const [colores, setColores] = useState(['']);
    const [codigos, setCodigos] = useState(['']);

    const cargarCatalogos = async () => {
        const catSnap = await getDocs(query(collection(db, "categorias"), orderBy("nombre")));
        const subSnap = await getDocs(collection(db, "subcategorias"));
        const marSnap = await getDocs(query(collection(db, "marcas"), orderBy("nombre")));
        const prodSnap = await getDocs(query(collection(db, "productos_maestros"), orderBy("fechaRegistro", "desc")));

        setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSubcategorias(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMarcas(marSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setProductosMaestros(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { cargarCatalogos(); }, []);

    // Lógica de descripción automática
    useEffect(() => {
        if (!editandoId) { // Solo autogenerar si no estamos editando manualmente
            const c = categorias.find(i => i.id === catSel)?.nombre || '';
            const s = subcategorias.find(i => i.id === subSel)?.nombre || '';
            const m = marcas.find(i => i.id === marcaSel)?.nombre || '';
            setDescripcion(`${c} ${s} ${m} ${modelo}`.trim());
        }
    }, [catSel, subSel, marcaSel, modelo, categorias, subcategorias, marcas, editandoId]);

    const handleAddField = (setter) => setter(prev => [...prev, '']);

    const handleUpdateArray = (index, value, setter) => {
        setter(prev => {
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
        });
    };

    const limpiarFormulario = () => {
        setEditandoId(null);
        setCatSel('');
        setSubSel('');
        setMarcaSel('');
        setModelo('');
        setDescripcion('');
        setPrecio('');
        setColores(['']);
        setCodigos(['']);
    };

    const guardarOActualizar = async (e) => {
        e.preventDefault();
        try {
            const data = {
                categoriaId: catSel,
                subcategoriaId: subSel || null,
                marcaId: marcaSel || null,
                modelo: modelo || '',
                descripcion: descripcion || 'Sin descripción',
                precio: parseFloat(precio),
                colores: colores.filter(c => c.trim() !== ''),
                codigos: codigos.filter(c => c.trim() !== '').map(c => c.toUpperCase()),
                fechaRegistro: new Date()
            };

            if (editandoId) {
                await updateDoc(doc(db, "productos_maestros", editandoId), data);
                alert("Producto maestro actualizado");
            } else {
                await addDoc(collection(db, "productos_maestros"), data);
                alert("Producto registrado en Catálogo Maestro");
            }

            limpiarFormulario();
            cargarCatalogos();
            setVistaActual('ver');
        } catch (error) {
            console.error(error);
            alert("Error al procesar el registro");
        }
    };

    const prepararEdicion = (prod) => {
        setEditandoId(prod.id);
        setCatSel(prod.categoriaId || '');
        setSubSel(prod.subcategoriaId || '');
        setMarcaSel(prod.marcaId || '');
        setModelo(prod.modelo || '');
        setDescripcion(prod.descripcion || '');
        setPrecio(prod.precio || '');
        setColores(prod.colores?.length ? prod.colores : ['']);
        setCodigos(prod.codigos?.length ? prod.codigos : ['']);
        setVistaActual('registrar');
        window.scrollTo(0, 0);
    };

    const eliminarProductoMaestro = async (id) => {
        if (window.confirm("¿Eliminar del catálogo maestro? Esto no borrará existencias en sucursales pero ya no podrás surtirlo.")) {
            await deleteDoc(doc(db, "productos_maestros", id));
            cargarCatalogos();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AdminNavbar />
            <div className="p-8 max-w-6xl mx-auto">

                {/* MENÚ HORIZONTAL SUPERIOR */}
                <div className="flex gap-4 mb-10 bg-white p-2 rounded-[25px] shadow-sm border border-gray-100 max-w-md mx-auto">
                    <button
                        onClick={() => { setVistaActual('registrar'); limpiarFormulario(); }}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase italic transition-all ${vistaActual === 'registrar' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-blue-600'}`}
                    >
                        {editandoId ? '✏️ Editando' : '➕ Registrar'}
                    </button>
                    <button
                        onClick={() => setVistaActual('ver')}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase italic transition-all ${vistaActual === 'ver' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-blue-600'}`}
                    >
                        📦 Ver Catálogo
                    </button>
                </div>

                {vistaActual === 'registrar' ? (
                    /* VISTA FORMULARIO */
                    <form onSubmit={guardarOActualizar} className="bg-white p-8 rounded-[40px] shadow-sm space-y-6 border border-gray-100 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-blue-600 uppercase mb-2">Categoría *</label>
                                <select className="w-full border-2 border-blue-100 p-3 rounded-xl bg-blue-50 font-bold outline-none" value={catSel} onChange={(e) => { setCatSel(e.target.value); setSubSel(''); }} required>
                                    <option value="">Seleccionar...</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Subcategoría</label>
                                <select className="w-full border-2 p-3 rounded-xl bg-gray-50 font-bold outline-none" value={subSel} onChange={(e) => setSubSel(e.target.value)} disabled={!catSel}>
                                    <option value="">Seleccionar...</option>
                                    {subcategorias.filter(s => s.categoriaId === catSel).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Marca</label>
                                <select className="w-full border-2 p-3 rounded-xl bg-gray-50 font-bold outline-none" value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Modelo</label>
                                <input type="text" className="w-full border-2 p-3 rounded-xl outline-none font-bold" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej: iPhone 15 Pro" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Descripción (Ficha Técnica)</label>
                                <input type="text" className="w-full border-2 border-gray-100 p-3 rounded-xl bg-gray-50 font-black text-gray-700 outline-none" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t pt-6 border-gray-100">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-4">Colores</label>
                                <div className="flex flex-wrap gap-2">
                                    {colores.map((color, idx) => (
                                        <input key={idx} type="text" className="border-2 p-2 rounded-xl w-28 font-bold" value={color} onChange={(e) => handleUpdateArray(idx, e.target.value, setColores)} />
                                    ))}
                                    <button type="button" onClick={() => handleAddField(setColores)} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-black">+</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-4">Códigos Globales</label>
                                <div className="space-y-2">
                                    {codigos.map((cod, idx) => (
                                        <input key={idx} type="text" className="border-2 p-2 rounded-xl w-full font-mono font-bold outline-none focus:border-blue-500" value={cod} onChange={(e) => handleUpdateArray(idx, e.target.value, setCodigos)} />
                                    ))}
                                    <button type="button" onClick={() => handleAddField(setCodigos)} className="text-blue-600 text-[10px] font-black uppercase tracking-widest">+ Añadir Código</button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <label className="block text-xs font-black text-green-500 uppercase mb-2">Precio Maestro Sugerido *</label>
                            <input type="number" step="0.01" className="w-full border-4 border-green-50 p-4 rounded-[25px] text-4xl font-black text-green-600 outline-none" placeholder="$ 0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
                        </div>

                        <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[30px] font-black text-2xl hover:bg-blue-700 shadow-xl uppercase italic">
                            {editandoId ? 'Actualizar Ficha Maestra' : 'Registrar en Catálogo'}
                        </button>
                    </form>
                ) : (
                    /* VISTA LISTADO DEL CATÁLOGO */
                    <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5 duration-500">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase">Información del Producto</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase text-center">Códigos</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase text-center">Precio</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {productosMaestros.map(prod => (
                                    <tr key={prod.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-5">
                                            <p className="font-black text-gray-700 uppercase leading-tight">{prod.descripcion}</p>
                                            <p className="text-[10px] text-blue-500 font-bold uppercase">{categorias.find(c => c.id === prod.categoriaId)?.nombre} | {prod.modelo}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex flex-col gap-1">
                                                {prod.codigos?.map((c, i) => (
                                                    <span key={i} className="text-[9px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center font-black text-green-600">${prod.precio}</td>
                                        <td className="p-5 text-right flex gap-2 justify-end">
                                            <button onClick={() => prepararEdicion(prod)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                                            <button onClick={() => eliminarProductoMaestro(prod.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminInventario;