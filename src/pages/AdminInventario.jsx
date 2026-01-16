import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminInventario = () => {
    // Datos de catálogos
    const [sucursales, setSucursales] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [marcas, setMarcas] = useState([]);

    // Estado del formulario
    const [sucursalSel, setSucursalSel] = useState('');
    const [catSel, setCatSel] = useState('');
    const [subSel, setSubSel] = useState('');
    const [marcaSel, setMarcaSel] = useState('');
    const [modelo, setModelo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('');
    const [cantidad, setCantidad] = useState(0);
    const [colores, setColores] = useState(['']); // Array para múltiples colores
    const [codigos, setCodigos] = useState(['']); // Array para códigos ilimitados

    useEffect(() => {
        const cargarCatalogos = async () => {
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const catSnap = await getDocs(query(collection(db, "categorias"), orderBy("nombre")));
            const subSnap = await getDocs(collection(db, "subcategorias"));
            const marSnap = await getDocs(query(collection(db, "marcas"), orderBy("nombre")));

            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setSubcategorias(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setMarcas(marSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        cargarCatalogos();
    }, []);

    // Lógica de descripción automática
    useEffect(() => {
        const c = categorias.find(i => i.id === catSel)?.nombre || '';
        const s = subcategorias.find(i => i.id === subSel)?.nombre || '';
        const m = marcas.find(i => i.id === marcaSel)?.nombre || '';
        setDescripcion(`${c} ${s} ${m} ${modelo}`.trim());
    }, [catSel, subSel, marcaSel, modelo]);

    const handleAddField = (setter) => setter(prev => [...prev, '']);

    const handleUpdateArray = (index, value, setter) => {
        setter(prev => {
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
        });
    };

    const guardarInventario = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "inventarios"), {
                sucursalId: sucursalSel,
                categoriaId: catSel,
                subcategoriaId: subSel,
                marcaId: marcaSel,
                modelo,
                descripcion,
                precio: parseFloat(precio),
                cantidad: parseInt(cantidad),
                colores: colores.filter(c => c !== ''),
                codigos: codigos.filter(c => c !== ''),
                fechaRegistro: new Date()
            });
            alert("Producto ingresado al inventario con éxito");
            // Limpiar campos o redireccionar
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <AdminNavbar />
            <div className="p-8 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Ingresar Producto a Inventario</h2>

                <form onSubmit={guardarInventario} className="bg-white p-8 rounded-2xl shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Selección de Sucursal */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-bold mb-2">1. Seleccionar Sucursal</label>
                            <select className="w-full border p-3 rounded-xl bg-gray-50" value={sucursalSel} onChange={(e) => setSucursalSel(e.target.value)} required>
                                <option value="">-- Seleccione Destino --</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.ubicacion}</option>)}
                            </select>
                        </div>

                        {/* Jerarquía */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Categoría</label>
                            <select className="w-full border p-2 rounded-lg" value={catSel} onChange={(e) => { setCatSel(e.target.value); setSubSel(''); }} required>
                                <option value="">Seleccionar...</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Subcategoría</label>
                            <select className="w-full border p-2 rounded-lg" value={subSel} onChange={(e) => setSubSel(e.target.value)} required disabled={!catSel}>
                                <option value="">Seleccionar...</option>
                                {subcategorias.filter(s => s.categoriaId === catSel).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Marca</label>
                            <select className="w-full border p-2 rounded-lg" value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)} required>
                                <option value="">Seleccionar...</option>
                                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Modelo y Descripción */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Modelo</label>
                            <input type="text" className="w-full border p-2 rounded-lg" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej: Galaxy S24" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Descripción Final (Editable)</label>
                            <input type="text" className="w-full border p-2 rounded-lg bg-yellow-50 font-bold" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                        </div>
                    </div>

                    <hr />

                    {/* Colores Dinámicos */}
                    <div>
                        <label className="block text-sm font-bold mb-2">Colores</label>
                        <div className="flex flex-wrap gap-2">
                            {colores.map((color, idx) => (
                                <input key={idx} type="text" className="border p-2 rounded-lg w-32" placeholder="Color" value={color} onChange={(e) => handleUpdateArray(idx, e.target.value, setColores)} />
                            ))}
                            <button type="button" onClick={() => handleAddField(setColores)} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">+</button>
                        </div>
                    </div>

                    {/* Cantidad con Slider */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-blue-50 p-4 rounded-xl">
                        <div>
                            <label className="block text-sm font-bold mb-1">Cantidad en Existencia: {cantidad}</label>
                            <input type="range" min="0" max="200" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <input type="number" className="border p-2 rounded-lg w-full" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Cantidad exacta" />
                    </div>

                    {/* Códigos de Barras Ilimitados */}
                    <div>
                        <label className="block text-sm font-bold mb-2">Códigos de Barras</label>
                        <div className="space-y-2">
                            {codigos.map((cod, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input type="text" className="border p-2 rounded-lg flex-1" placeholder={`Código ${idx + 1}`} value={cod} onChange={(e) => handleUpdateArray(idx, e.target.value, setCodigos)} />
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddField(setCodigos)} className="text-blue-600 font-bold hover:underline">+ Agregar otro código</button>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <label className="block text-sm font-bold mb-1 text-green-700">Precio de Venta</label>
                        <input type="number" step="0.01" className="w-full border-2 border-green-200 p-4 rounded-xl text-2xl font-bold outline-none focus:border-green-500" placeholder="$ 0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-lg transition-transform active:scale-95">
                        REGISTRAR EN INVENTARIO
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminInventario;