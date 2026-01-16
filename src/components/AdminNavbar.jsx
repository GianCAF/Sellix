import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/');
    };

    return (
        <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-[100]">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1
                    onClick={() => navigate('/admin')}
                    className="font-black text-2xl text-blue-600 cursor-pointer uppercase italic tracking-tighter"
                >
                    POS <span className="text-gray-800">ADMIN</span>
                </h1>

                <div className="flex items-center space-x-6">
                    {/* Botón de Inicio añadido */}
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Inicio
                    </button>

                    <button
                        onClick={() => navigate('/admin/sucursales')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Sucursales
                    </button>

                    <button
                        onClick={() => navigate('/admin/categorias')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Categorías
                    </button>

                    <button
                        onClick={() => navigate('/admin/marcas')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Marcas
                    </button>

                    <button
                        onClick={() => navigate('/admin/inventario')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Inventario
                    </button>

                    <button
                        onClick={() => navigate('/admin/ver-inventario')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Ver Stock
                    </button>

                    <button
                        onClick={() => navigate('/admin/usuarios')}
                        className="text-gray-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                        Empleados
                    </button>

                    <button
                        onClick={handleLogout}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default AdminNavbar;