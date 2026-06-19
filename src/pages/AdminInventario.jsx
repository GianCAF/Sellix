import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import { aplicarTenant, obtenerConfigGiro } from '../utils/tenant';
import { getTenantDocs, ordenarPorCampoTexto } from '../services/firestoreTenant';

const AdminInventario = () => {
    const { user } = useAuth();
    const recomendaciones = obtenerConfigGiro(user);
    // Datos de catálogos
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [productosMaestros, setProductosMaestros] = useState([]);

    // Estados de navegación y UI
    const [vistaActual, setVistaActual] = useState('registrar'); // 'registrar' o 'ver'
    const [editandoId, setEditandoId] = useState(null);
    const [procesandoGuardar, setProcesandoGuardar] = useState(false);
    const [procesandoEliminar, setProcesandoEliminar] = useState(null);

    // Estado del formulario
    const [catSel, setCatSel] = useState('');
    const [subSel, setSubSel] = useState('');
    const [marcaSel, setMarcaSel] = useState('');
    const [modelo, setModelo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('');
    const [colores, setColores] = useState(['']);
    const [codigos, setCodigos] = useState(['']);
    const [importaStock, setImportaStock] = useState(true);

    const cargarCatalogos = async () => {
        const [cats, subs, mars, prods] = await Promise.all([
            getTenantDocs("categorias", user),
            getTenantDocs("subcategorias", user),
            getTenantDocs("marcas", user),
            getTenantDocs("productos_maestros", user)
        ]);

        setCategorias(ordenarPorCampoTexto(cats, 'nombre'));
        setSubcategorias(ordenarPorCampoTexto(subs, 'nombre'));
        setMarcas(ordenarPorCampoTexto(mars, 'nombre'));
        setProductosMaestros([...prods].sort((a, b) => {
            const fechaA = a.fechaRegistro?.toMillis?.() || new Date(a.fechaRegistro || 0).getTime() || 0;
            const fechaB = b.fechaRegistro?.toMillis?.() || new Date(b.fechaRegistro || 0).getTime() || 0;
            return fechaB - fechaA;
        }));
    };

    useEffect(() => { if (user) cargarCatalogos(); }, [user]);

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
        setImportaStock(true);
    };

    const guardarOActualizar = async (e) => {
        e.preventDefault();
        if (procesandoGuardar) return;
        setProcesandoGuardar(true);
        try {
            const data = aplicarTenant(user, {
                categoriaId: catSel,
                subcategoriaId: subSel || null,
                marcaId: marcaSel || null,
                modelo: modelo || '',
                descripcion: descripcion || 'Sin descripción',
                precio: parseFloat(precio),
                importaStock,
                colores: colores.filter(c => c.trim() !== ''),
                codigos: codigos.filter(c => c.trim() !== '').map(c => c.toUpperCase()),
                fechaRegistro: new Date()
            });

            if (editandoId) {
                await updateDoc(doc(db, "productos_maestros", editandoId), data);
                alert("Producto maestro actualizado");
            } else {
                await addDoc(collection(db, "productos_maestros"), data);
                alert("Producto registrado en Catálogo Maestro");
            }

            limpiarFormulario();
            await cargarCatalogos();
            setVistaActual('ver');
        } catch (error) {
            console.error(error);
            alert("Error al procesar el registro");
        } finally {
            setProcesandoGuardar(false);
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
        setImportaStock(prod.importaStock !== false);
        setVistaActual('registrar');
        window.scrollTo(0, 0);
    };

    const eliminarProductoMaestro = async (id) => {
        if (procesandoEliminar) return;
        if (await window.sellixConfirm("¿Eliminar del catálogo maestro? Esto no borrará existencias en sucursales pero ya no podrás surtirlo.", { title: 'Eliminar producto maestro' })) {
            setProcesandoEliminar(id);
            try {
                await deleteDoc(doc(db, "productos_maestros", id));
                await cargarCatalogos();
            } finally {
                setProcesandoEliminar(null);
            }
        }
    };

    return (
        <div className="admin-page">
            <AdminNavbar />
            <div className="admin-shell-md">

                {/* MENÚ HORIZONTAL SUPERIOR */}
                <div className="inventory-tabs">
                    <button
                        onClick={() => { setVistaActual('registrar'); limpiarFormulario(); }}
                        className={`inventory-tab ${vistaActual === 'registrar' ? 'inventory-tab-active' : 'inventory-tab-idle'}`}
                    >
                        {editandoId ? '✏️ Editando' : '➕ Registrar'}
                    </button>
                    <button
                        onClick={() => setVistaActual('ver')}
                        className={`inventory-tab ${vistaActual === 'ver' ? 'inventory-tab-active' : 'inventory-tab-idle'}`}
                    >
                        📦 Ver Catálogo
                    </button>
                </div>

                {vistaActual === 'registrar' ? (
                    /* VISTA FORMULARIO */
                    <form onSubmit={guardarOActualizar} className="inventory-form">
                        <div className="inventory-grid-3">
                            <div>
                                <label className="block text-xs font-black text-[#1A2517] uppercase mb-2">Categoría *</label>
                                <select className="inventory-select-primary" value={catSel} onChange={(e) => { setCatSel(e.target.value); setSubSel(''); }} required>
                                    <option value="">Seleccionar...</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#8A8377] uppercase mb-2">Subcategoría</label>
                                <select className="inventory-select" value={subSel} onChange={(e) => setSubSel(e.target.value)} disabled={!catSel}>
                                    <option value="">Seleccionar...</option>
                                    {subcategorias.filter(s => s.categoriaId === catSel).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#8A8377] uppercase mb-2">Marca</label>
                                <select className="inventory-select" value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="inventory-grid-2">
                            <div>
                                <label className="block text-xs font-black text-[#8A8377] uppercase mb-2">Modelo</label>
                                <input type="text" className="inventory-input" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={recomendaciones.modelo} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#8A8377] uppercase mb-2">Descripción (Ficha Técnica)</label>
                                <input type="text" className="inventory-input-soft" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={recomendaciones.descripcion} />
                            </div>
                        </div>

                        <div className="inventory-array-section">
                            <div>
                                <label className="block text-xs font-black text-[#8A8377] uppercase mb-4">Colores</label>
                                <div className="flex flex-wrap gap-2">
                                    {colores.map((color, idx) => (
                                        <input key={idx} type="text" className="inventory-pill-input" value={color} onChange={(e) => handleUpdateArray(idx, e.target.value, setColores)} placeholder={recomendaciones.color} />
                                    ))}
                                    <button type="button" onClick={() => handleAddField(setColores)} className="inventory-add-small">+</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#8A8377] uppercase mb-4">Códigos Globales</label>
                                <div className="space-y-2">
                                    {codigos.map((cod, idx) => (
                                        <input key={idx} type="text" className="inventory-code-input" value={cod} onChange={(e) => handleUpdateArray(idx, e.target.value, setCodigos)} placeholder={recomendaciones.codigo} />
                                    ))}
                                    <button type="button" onClick={() => handleAddField(setCodigos)} className="inventory-add-link">+ Añadir Código</button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <label className="block text-xs font-black text-[#576238] uppercase mb-2">Precio Maestro Sugerido *</label>
                            <input type="number" step="0.01" className="inventory-price-input" placeholder="$ 0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
                        </div>

                        <div className="rounded-3xl border border-[#D8C7B5] bg-[#F8F5EC] p-5">
                            <label className="block text-xs font-black text-[#1A2517] uppercase mb-3">Importa stock</label>
                            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F0EADC] p-1">
                                <button
                                    type="button"
                                    onClick={() => setImportaStock(true)}
                                    className={`rounded-xl py-3 text-xs font-black uppercase transition-all ${importaStock ? 'bg-[#1A2517] text-white shadow-sm' : 'text-[#67625C]'}`}
                                >
                                    Si
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportaStock(false)}
                                    className={`rounded-xl py-3 text-xs font-black uppercase transition-all ${!importaStock ? 'bg-[#576238] text-white shadow-sm' : 'text-[#67625C]'}`}
                                >
                                    No
                                </button>
                            </div>
                            <p className="mt-3 text-[10px] font-black uppercase text-[#8A8377]">
                                Si importa stock, Sellix bloquea la venta cuando no hay existencias. Si no importa, se puede vender aunque el stock este en cero.
                            </p>
                        </div>

                        <button type="submit" disabled={procesandoGuardar} className="inventory-submit disabled:opacity-50">
                            {procesandoGuardar ? 'Procesando...' : editandoId ? 'Actualizar Ficha Maestra' : 'Registrar en Catálogo'}
                        </button>
                    </form>
                ) : (
                    /* VISTA LISTADO DEL CATÁLOGO */
                    <div className="inventory-list-panel">
                        <table className="admin-table">
                            <thead className="bg-[#F8F5EC]">
                                <tr>
                                    <th className="p-5 text-xs font-black text-[#8A8377] uppercase">Información del Producto</th>
                                    <th className="p-5 text-xs font-black text-[#8A8377] uppercase text-center">Códigos</th>
                                    <th className="p-5 text-xs font-black text-[#8A8377] uppercase text-center">Precio</th>
                                    <th className="p-5 text-xs font-black text-[#8A8377] uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0EADC]">
                                {productosMaestros.map(prod => (
                                    <tr key={prod.id} className="admin-row">
                                        <td className="admin-td">
                                            <p className="inventory-product-title">{prod.descripcion}</p>
                                            <p className="inventory-product-meta">
                                                {categorias.find(c => c.id === prod.categoriaId)?.nombre} | {prod.modelo} | {prod.importaStock === false ? 'No importa stock' : 'Importa stock'}
                                            </p>
                                        </td>
                                        <td className="admin-td text-center">
                                            <div className="flex flex-col gap-1">
                                                {prod.codigos?.map((c, i) => (
                                                    <span key={i} className="inventory-code-badge">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="admin-td text-center font-black text-[#576238]">${prod.precio}</td>
                                        <td className="admin-td text-right flex gap-2 justify-end">
                                            <button onClick={() => prepararEdicion(prod)} className="inventory-edit-btn">✏️</button>
                                            <button onClick={() => eliminarProductoMaestro(prod.id)} disabled={procesandoEliminar === prod.id} className="inventory-delete-btn disabled:opacity-50">🗑️</button>
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
