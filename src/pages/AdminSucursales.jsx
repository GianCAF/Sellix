import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminSucursales = () => {
    const [nombre, setNombre] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [editandoId, setEditandoId] = useState(null);
    const [procesando, setProcesando] = useState('');

    const cargarSucursales = async () => {
        const querySnapshot = await getDocs(collection(db, "sucursales"));
        setSucursales(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { cargarSucursales(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (procesando) return;
        setProcesando('guardar');
        try {
            if (editandoId) {
                await updateDoc(doc(db, "sucursales", editandoId), { nombre, ubicacion });
                setEditandoId(null);
            } else {
                await addDoc(collection(db, "sucursales"), { nombre, ubicacion });
            }
            setNombre(''); setUbicacion('');
            await cargarSucursales();
        } catch (error) { console.error(error); } finally { setProcesando(''); }
    };

    const prepararEdicion = (suc) => {
        setEditandoId(suc.id);
        setNombre(suc.nombre);
        setUbicacion(suc.ubicacion);
        window.scrollTo(0, 0);
    };

    const eliminarSucursal = async (id) => {
        if (procesando) return;
        if (window.confirm("¿Seguro que quieres eliminar esta sucursal?")) {
            setProcesando(`eliminar:${id}`);
            try {
                await deleteDoc(doc(db, "sucursales", id));
                await cargarSucursales();
            } finally {
                setProcesando('');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-4xl mx-auto">
                <h2 className="text-2xl font-black mb-6 uppercase italic">
                    {editandoId ? '📝 Editando Sucursal' : '🏢 Nueva Sucursal'}
                </h2>

                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder="Nombre de sucursal" className="flex-1 p-3 border-2 rounded-xl outline-none focus:border-blue-500" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    <input type="text" placeholder="Ubicación" className="flex-1 p-3 border-2 rounded-xl outline-none focus:border-blue-500" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} required />
                    <button type="submit" disabled={procesando === 'guardar'} className={`px-8 py-3 rounded-xl font-bold text-white disabled:opacity-50 ${editandoId ? 'bg-orange-500' : 'bg-blue-600'}`}>
                        {procesando === 'guardar' ? 'PROCESANDO...' : editandoId ? 'ACTUALIZAR' : 'GUARDAR'}
                    </button>
                    {editandoId && <button onClick={() => { setEditandoId(null); setNombre(''); setUbicacion(''); }} className="text-gray-400 font-bold">Cancelar</button>}
                </form>

                <div className="grid gap-4">
                    {sucursales.map(s => (
                        <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center border border-gray-100">
                            <div>
                                <h3 className="font-black text-gray-800 uppercase">{s.nombre}</h3>
                                <p className="text-gray-400 text-sm">{s.ubicacion}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => prepararEdicion(s)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                                <button onClick={() => eliminarSucursal(s.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminSucursales;
