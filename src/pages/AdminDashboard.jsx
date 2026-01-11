import React from 'react';
import AdminNavbar from '../components/AdminNavbar';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Control Principal</h1>
                    <p className="text-gray-600 mt-2">Bienvenido, administrador. Gestiona tus sucursales y personal desde aquí.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                        {/* Tarjeta Sucursales */}
                        <div
                            onClick={() => navigate('/admin/sucursales')}
                            className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
                        >
                            <div className="text-4xl mb-4">🏢</div>
                            <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">Gestionar Sucursales</h2>
                            <p className="text-gray-500 mt-2">Crea, edita o elimina las sedes de tu negocio.</p>
                        </div>

                        {/* Tarjeta Usuarios */}
                        <div
                            onClick={() => navigate('/admin/usuarios')}
                            className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
                        >
                            <div className="text-4xl mb-4">👥</div>
                            <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">Gestionar Empleados</h2>
                            <p className="text-gray-500 mt-2">Registra nuevos empleados y asígnalos a una sucursal.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;