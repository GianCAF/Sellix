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
        <div className="min-h-screen bg-[#F8F5EC]">
            <AdminNavbar />
            <div className="p-8 max-w-4xl mx-auto">
                <h2 className="text-2xl font-black mb-6 uppercase italic">
                    {editandoId ? '📝 Editando Sucursal' : '🏢 Nueva Sucursal'}
                </h2>

                <form onSubmit={handleSubmit} className="bg-[#FFFDF7] p-6 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder="Nombre de sucursal" className="flex-1 p-3 border-2 rounded-xl outline-none focus:border-[#576238]" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    <input type="text" placeholder="Ubicación" className="flex-1 p-3 border-2 rounded-xl outline-none focus:border-[#576238]" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} required />
                    <button type="submit" disabled={procesando === 'guardar'} className={`px-8 py-3 rounded-xl font-bold text-white disabled:opacity-50 ${editandoId ? 'bg-[#67625C]' : 'bg-[#1A2517]'}`}>
                        {procesando === 'guardar' ? 'PROCESANDO...' : editandoId ? 'ACTUALIZAR' : 'GUARDAR'}
                    </button>
                    {editandoId && <button onClick={() => { setEditandoId(null); setNombre(''); setUbicacion(''); }} className="text-[#8A8377] font-bold">Cancelar</button>}
                </form>

                <div className="grid gap-4">
                    {sucursales.map(s => (
                        <div key={s.id} className="bg-[#FFFDF7] p-6 rounded-2xl shadow-sm flex justify-between items-center border border-[#E3D9C8]">
                            <div>
                                <h3 className="font-black text-[#1A2517] uppercase">{s.nombre}</h3>
                                <p className="text-[#8A8377] text-sm">{s.ubicacion}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => prepararEdicion(s)} className="p-2 bg-[#E5EEDC] text-[#1A2517] rounded-lg hover:bg-[#1A2517] hover:text-white transition-all">✏️</button>
                                <button onClick={() => eliminarSucursal(s.id)} className="p-2 bg-[#F4E6E1] text-[#9A3B30] rounded-lg hover:bg-[#9A3B30] hover:text-white transition-all">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminSucursales;
