import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        auth.signOut();
        navigate('/');
    };

    return (
        <nav className="bg-blue-700 text-white p-4 shadow-md flex justify-between items-center">
            <h1 className="font-bold text-xl">Panel Admin - POS</h1>
            <div className="space-x-4">
                <button onClick={() => navigate('/admin/sucursales')} className="hover:underline">Sucursales</button>
                <button onClick={() => navigate('/admin/usuarios')} className="hover:underline">Usuarios</button>
                <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition">
                    Salir
                </button>
            </div>
        </nav>
    );
};

export default AdminNavbar;