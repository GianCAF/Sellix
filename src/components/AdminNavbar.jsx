import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/');
    };

    return (
        <nav className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
                <h1
                    onClick={() => navigate('/admin')}
                    className="font-black text-2xl text-blue-600 cursor-pointer"
                >
                    POS <span className="text-gray-800">ADMIN</span>
                </h1>

                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => navigate('/admin/sucursales')}
                        className="text-gray-600 hover:text-blue-600 font-medium"
                    >
                        Sucursales
                    </button>
                    <button
                        onClick={() => navigate('/admin/usuarios')}
                        className="text-gray-600 hover:text-blue-600 font-medium"
                    >
                        Empleados
                    </button>
                    <button
                        onClick={handleLogout}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default AdminNavbar;