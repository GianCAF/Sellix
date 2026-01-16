import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminUsuarios = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [editandoId, setEditandoId] = useState(null);

    const cargarDatos = async () => {
        const sSnap = await getDocs(collection(db, "sucursales"));
        setSucursales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const uSnap = await getDocs(collection(db, "usuarios"));
        setUsuarios(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleCrearOEditar = async (e) => {
        e.preventDefault();
        if (editandoId) {
            await updateDoc(doc(db, "usuarios", editandoId), { nombre, sucursalId });
            setEditandoId(null);
            alert("Empleado actualizado");
        } else {
            // Lógica de creación (SignUp API) que ya teníamos...
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`, {
                method: 'POST',
                body: JSON.stringify({ email, password, returnSecureToken: true }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.localId) {
                await setDoc(doc(db, "usuarios", data.localId), { uid: data.localId, nombre, email, rol: 'empleado', sucursalId, fechaAlta: new Date() });
                alert("Empleado creado");
            }
        }
        setNombre(''); setEmail(''); setPassword(''); setSucursalId('');
        cargarDatos();
    };

    const prepararEdicion = (u) => {
        setEditandoId(u.id);
        setNombre(u.nombre);
        setSucursalId(u.sucursalId);
        window.scrollTo(0, 0);
    };

    const eliminarUsuario = async (id) => {
        if (window.confirm("¿Quitar acceso a este empleado?")) {
            await deleteDoc(doc(db, "usuarios", id));
            cargarDatos();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-5xl mx-auto">
                <h2 className="text-2xl font-black mb-6 uppercase italic">{editandoId ? '✏️ Editando Empleado' : '👥 Nuevo Empleado'}</h2>
                <form onSubmit={handleCrearOEditar} className="bg-white p-6 rounded-3xl shadow-sm mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nombre completo" className="p-3 border-2 rounded-xl outline-none" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    {!editandoId && <input type="email" placeholder="Email" className="p-3 border-2 rounded-xl outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required />}
                    {!editandoId && <input type="password" placeholder="Contraseña" className="p-3 border-2 rounded-xl outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />}
                    <select className="p-3 border-2 rounded-xl outline-none font-bold text-gray-600" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required>
                        <option value="">Asignar Sucursal...</option>
                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                    <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-3 rounded-xl font-black">{editandoId ? 'ACTUALIZAR DATOS' : 'REGISTRAR EMPLEADO'}</button>
                </form>

                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 text-xs font-black text-gray-400 uppercase">Empleado</th>
                                <th className="p-4 text-xs font-black text-gray-400 uppercase">Sucursal</th>
                                <th className="p-4 text-xs font-black text-gray-400 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {usuarios.filter(u => u.rol === 'empleado').map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-black text-gray-700">{u.nombre}</p>
                                        <p className="text-xs text-gray-400">{u.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                                            {sucursales.find(s => s.id === u.sucursalId)?.nombre || '---'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex gap-2 justify-end">
                                        <button onClick={() => prepararEdicion(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg">✏️</button>
                                        <button onClick={() => eliminarUsuario(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsuarios;