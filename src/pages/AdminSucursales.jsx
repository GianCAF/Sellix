import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminSucursales = () => {
    const [nombre, setNombre] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [sucursales, setSucursales] = useState([]);

    // Cargar sucursales existentes
    const fetchSucursales = async () => {
        const querySnapshot = await getDocs(collection(db, "sucursales"));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSucursales(docs);
    };

    useEffect(() => {
        fetchSucursales();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "sucursales"), {
                nombre: nombre,
                ubicacion: ubicacion,
                fechaCreacion: new Date()
            });
            setNombre('');
            setUbicacion('');
            fetchSucursales(); // Recargar lista
            alert("Sucursal creada con éxito");
        } catch (error) {
            console.error("Error al crear sucursal:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Gestionar Sucursales</h2>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm mb-8 flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Nombre de Sucursal</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Ubicación / Ciudad</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={ubicacion}
                            onChange={(e) => setUbicacion(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">
                        Agregar
                    </button>
                </form>

                {/* Tabla de Sucursales */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Ubicación</th>
                                <th className="p-4">ID de Sucursal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sucursales.map(s => (
                                <tr key={s.id} className="border-t">
                                    <td className="p-4 font-medium">{s.nombre}</td>
                                    <td className="p-4 text-gray-600">{s.ubicacion}</td>
                                    <td className="p-4 text-xs text-gray-400 font-mono">{s.id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminSucursales;