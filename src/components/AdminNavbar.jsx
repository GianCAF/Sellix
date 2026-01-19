import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/');
    };

    const menuItems = [
        { label: 'Inicio', path: '/admin' },
        { label: 'Sucursales', path: '/admin/sucursales' },
        { label: 'Categorías', path: '/admin/categorias' },
        { label: 'Marcas', path: '/admin/marcas' },
        { label: 'Inventario', path: '/admin/inventario' },
        { label: 'Ver Stock', path: '/admin/ver-inventario' },
        { label: 'Empleados', path: '/admin/usuarios' },
    ];

    const navegarYEnchufar = (path) => {
        navigate(path);
        setIsOpen(false); // Cierra el menú al navegar
    };

    return (
        <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-[100] shadow-sm">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* LOGO */}
                <h1
                    onClick={() => navigate('/admin')}
                    className="font-black text-2xl text-blue-600 cursor-pointer uppercase italic tracking-tighter"
                >
                    POS <span className="text-gray-800">ADMIN</span>
                </h1>

                {/* BOTÓN HAMBURGUESA (Solo visible en móvil) */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="lg:hidden text-gray-800 focus:outline-none p-2"
                >
                    <div className="space-y-1.5">
                        <span className={`block w-6 h-0.5 bg-gray-800 transition-transform ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                        <span className={`block w-6 h-0.5 bg-gray-800 ${isOpen ? 'opacity-0' : ''}`}></span>
                        <span className={`block w-6 h-0.5 bg-gray-800 transition-transform ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                    </div>
                </button>

                {/* MENÚ ESCRITORIO (Oculto en móvil) */}
                <div className="hidden lg:flex items-center space-x-6">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest transition-colors"
                        >
                            {item.label}
                        </button>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                        Salir
                    </button>
                </div>
            </div>

            {/* MENÚ MÓVIL DESPLEGABLE */}
            {isOpen && (
                <>
                    {/* Backdrop para previsualizar el fondo */}
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[90] lg:hidden"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Lista de botones a la izquierda */}
                    <div className="absolute top-full left-0 w-64 bg-white/95 backdrop-blur-md shadow-2xl border-r border-b border-gray-100 py-4 flex flex-col items-start z-[100] animate-in slide-in-from-left duration-300 lg:hidden">
                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navegarYEnchufar(item.path)}
                                className="w-full text-left px-8 py-4 text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest border-l-4 border-transparent hover:border-blue-600 hover:bg-blue-50/50 transition-all"
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="w-full px-6 pt-4 mt-2 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-black text-xs uppercase shadow-sm"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
};

export default AdminNavbar;