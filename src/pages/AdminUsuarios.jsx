import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import AdminNavbar from '../components/AdminNavbar';

const AdminUsuarios = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Cargar sucursales para el menú desplegable
    const cargarDatos = async () => {
        const sucSnapshot = await getDocs(collection(db, "sucursales"));
        setSucursales(sucSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const userSnapshot = await getDocs(collection(db, "usuarios"));
        setUsuarios(userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleCrearUsuario = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Nota: Firebase Auth por defecto loguea al nuevo usuario creado. 
            // Para evitar que el Admin pierda su sesión, usaremos una técnica de registro limpia.
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`, {
                method: 'POST',
                body: JSON.stringify({ email, password, returnSecureToken: true }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.localId) {
                // Guardar perfil en Firestore vinculado a la sucursal
                await addDoc(collection(db, "usuarios"), {
                    uid: data.localId, // El ID de autenticación
                    nombre,
                    email,
                    rol: 'empleado',
                    sucursalId: sucursalId,
                    fechaAlta: new Date()
                });

                alert("Empleado registrado con éxito");
                setEmail(''); setPassword(''); setNombre(''); setSucursalId('');
                cargarDatos();
            }
        } catch (error) {
            console.error(error);
            alert("Error al crear usuario");
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
                        type="text" placeholder="Nombre completo" className="border p-2 rounded"
                        value={nombre} onChange={(e) => setNombre(e.target.value)} required
                    />
                    <input
                        type="email" placeholder="Correo electrónico" className="border p-2 rounded"
                        value={email} onChange={(e) => setEmail(e.target.value)} required
                    />
                    <input
                        type="password" placeholder="Contraseña inicial" className="border p-2 rounded"
                        value={password} onChange={(e) => setPassword(e.target.value)} required
                    />

                    <select
                        className="border p-2 rounded"
                        value={sucursalId}
                        onChange={(e) => setSucursalId(e.target.value)}
                        required
                    >
                        <option value="">Seleccionar Sucursal...</option>
                        {sucursales.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nombre} - {s.ubicacion}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit" disabled={loading}
                        className="md:col-span-2 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading ? 'Registrando...' : 'Registrar Empleado'}
                    </button>
                </form>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Sucursal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.filter(u => u.rol === 'empleado').map(u => (
                                <tr key={u.id} className="border-t">
                                    <td className="p-4">{u.nombre}</td>
                                    <td className="p-4">{u.email}</td>
                                    <td className="p-4 text-blue-600 font-medium">
                                        {sucursales.find(s => s.id === u.sucursalId)?.nombre || 'Sin asignar'}
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