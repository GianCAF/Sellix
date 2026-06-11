import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminVoiceAssistant from './AdminVoiceAssistant';

const AdminNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
        { label: 'Inicio', path: '/admin', icon: '⌂' },
        { label: 'Sucursales', path: '/admin/sucursales', icon: '▣' },
        { label: 'Categorías', path: '/admin/categorias', icon: '◇' },
        { label: 'Marcas', path: '/admin/marcas', icon: '▤' },
        { label: 'Inventario', path: '/admin/inventario', icon: '▧' },
        { label: 'Ver Stock', path: '/admin/ver-inventario', icon: '✣' },
        { label: 'Empleados', path: '/admin/usuarios', icon: '♙' },
    ];

    const navegar = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    const esActivo = (path) => path === '/admin'
        ? location.pathname === '/admin'
        : location.pathname.startsWith(path);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="admin-mobile-menu"
                aria-label="Abrir menu admin"
            >
                ☰
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
                        <p className="admin-brand-subtitle">Admin</p>
                    </div>
                </div>

                <nav className="admin-side-menu">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            type="button"
                            onClick={() => navegar(item.path)}
                            className={`admin-side-link ${esActivo(item.path) ? 'admin-side-link-active' : ''}`}
                        >
                            <span className="admin-side-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="admin-side-link mt-5"
                    >
                        <span className="admin-side-icon">↪</span>
                        <span>Salir</span>
                    </button>
                </nav>

                <div className="admin-user-foot">
                    <p>Administrador</p>
                    <span>admin@sellix.mx</span>
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
