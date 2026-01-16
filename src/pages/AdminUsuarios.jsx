import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, setDoc, doc, getDocs, query, orderBy } from 'firebase/firestore'; // Importamos setDoc y doc
import AdminNavbar from '../components/AdminNavbar';

const AdminUsuarios = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);

    const cargarDatos = async () => {
        const sucSnapshot = await getDocs(collection(db, "sucursales"));
        setSucursales(sucSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const userSnapshot = await getDocs(collection(db, "usuarios"));
        setUsuarios(userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleCrearUsuario = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Registro en Firebase Auth vía API para no cerrar sesión del Admin
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`, {
                method: 'POST',
                body: JSON.stringify({ email, password, returnSecureToken: true }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.localId) {
                // CORRECCIÓN: Usamos setDoc con el UID (localId) como ID del documento
                await setDoc(doc(db, "usuarios", data.localId), {
                    uid: data.localId,
                    nombre,
                    email,
                    rol: 'empleado',
                    sucursalId: sucursalId,
                    fechaAlta: new Date()
                });

                alert("Empleado registrado con éxito. Ya puede iniciar sesión.");
                setEmail(''); setPassword(''); setNombre(''); setSucursalId('');
                cargarDatos();
            } else {
                alert("Error: " + (data.error?.message || "No se pudo crear el usuario"));
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al crear usuario");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Gestionar Empleados</h2>

                <form onSubmit={handleCrearUsuario} className="bg-white p-6 rounded-xl shadow-sm mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text" placeholder="Nombre completo" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400"
                        value={nombre} onChange={(e) => setNombre(e.target.value)} required
                    />
                    <input
                        type="email" placeholder="Correo electrónico" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400"
                        value={email} onChange={(e) => setEmail(e.target.value)} required
                    />
                    <input
                        type="password" placeholder="Contraseña inicial" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400"
                        value={password} onChange={(e) => setPassword(e.target.value)} required
                    />

                    <select
                        className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400"
                        value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required
                    >
                        <option value="">Seleccionar Sucursal (Nombre - Ubicación)...</option>
                        {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre} - {s.ubicacion}</option>
                        ))}
                    </select>

                    <button
                        type="submit" disabled={loading}
                        className="md:col-span-2 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                    >
                        {loading ? 'Registrando en la nube...' : 'Registrar Empleado'}
                    </button>
                </form>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Sucursal Asignada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.filter(u => u.rol === 'empleado').map(u => (
                                <tr key={u.id} className="border-t hover:bg-gray-50">
                                    <td className="p-4 font-medium">{u.nombre}</td>
                                    <td className="p-4 text-gray-600">{u.email}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm font-bold">
                                            {sucursales.find(s => s.id === u.sucursalId)?.nombre || 'Cargando...'}
                                        </span>
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