import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminVoiceAssistant from './AdminVoiceAssistant';
import { useAuth } from '../context/AuthContext';
import { Boxes, Home, Layers3, LogOut, Menu, Package, Store, Tags, Users } from 'lucide-react';

const AdminNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/');
    };

    const fechaActual = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    const menuItems = [
        { label: 'Inicio', path: '/admin', icon: Home },
        { label: 'Sucursales', path: '/admin/sucursales', icon: Store },
        { label: 'Categorías', path: '/admin/categorias', icon: Tags },
        { label: 'Marcas', path: '/admin/marcas', icon: Layers3 },
        { label: 'Inventario', path: '/admin/inventario', icon: Package },
        { label: 'Ver Stock', path: '/admin/ver-inventario', icon: Boxes },
        { label: 'Empleados', path: '/admin/usuarios', icon: Users },
    ];

    const navegar = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    const esActivo = (path) => path === '/admin'
        ? location.pathname === '/admin'
        : location.pathname.startsWith(path);

    const etiquetaRol = user?.rol === 'super_admin'
        ? 'Super admin'
        : user?.rol === 'admin'
            ? 'Administrador'
            : 'Usuario';

    const etiquetaSesion = user?.negocioNombre
        ? user.negocioNombre
        : 'Sesion protegida';

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="admin-mobile-menu"
                aria-label="Abrir menu admin"
            >
                <Menu size={20} />
            </button>

            {isOpen && (
                <div
                    className="admin-sidebar-backdrop"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`admin-sidebar ${isOpen ? 'admin-sidebar-open' : ''}`}>
                <div className="admin-brand" onClick={() => navegar('/admin')} role="button" tabIndex={0}>
                    <div className="admin-brand-mark">S</div>
                    <div>
                        <p className="admin-brand-title">Sellix</p>
                        <p className="admin-brand-subtitle">{user?.negocioNombre || 'Admin'}</p>
                    </div>
                </div>

                <nav className="admin-side-menu">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.path}
                                type="button"
                                onClick={() => navegar(item.path)}
                                className={`admin-side-link ${esActivo(item.path) ? 'admin-side-link-active' : ''}`}
                            >
                                <span className="admin-side-icon"><Icon size={18} strokeWidth={1.8} /></span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="admin-side-link mt-5"
                    >
                        <span className="admin-side-icon"><LogOut size={18} strokeWidth={1.8} /></span>
                        <span>Salir</span>
                    </button>
                </nav>

                <div className="admin-user-foot">
                    <p>{etiquetaRol}</p>
                    <span>{etiquetaSesion}</span>
                </div>
            </aside>

            <header className="admin-topbar">
                <h1>Panel administrativo</h1>
                <p>{fechaActual}</p>
            </header>

            <AdminVoiceAssistant />
        </>
    );
};

export default AdminNavbar;
