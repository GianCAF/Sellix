import React, { useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GIROS_NEGOCIO, GIRO_TECNOLOGIA } from '../utils/tenant';

const SuperAdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [nombre, setNombre] = useState('');
    const [negocioNombre, setNegocioNombre] = useState('');
    const [giroNegocio, setGiroNegocio] = useState(GIRO_TECNOLOGIA);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [procesando, setProcesando] = useState(false);

    const cargarAdmins = async () => {
        const snap = await getDocs(collection(db, "usuarios"));
        setAdmins(
            snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(item => item.rol === 'admin')
                .sort((a, b) => (a.negocioNombre || '').localeCompare(b.negocioNombre || ''))
        );
    };

    useEffect(() => { cargarAdmins(); }, []);

    const crearAdmin = async (e) => {
        e.preventDefault();
        if (procesando) return;
        if (password.length < 6) return window.sellixNotify?.('La contrasena debe tener al menos 6 caracteres', { type: 'warning' });
        setProcesando(true);
        try {
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`, {
                method: 'POST',
                body: JSON.stringify({ email: email.trim().toLowerCase(), password, returnSecureToken: true }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            await setDoc(doc(db, "usuarios", data.localId), {
                uid: data.localId,
                nombre,
                email: email.trim().toLowerCase(),
                rol: 'admin',
                negocioId: data.localId,
                adminId: data.localId,
                negocioNombre: negocioNombre || nombre,
                giroNegocio,
                creadoPorSuperAdminId: user.uid,
                fechaAlta: new Date()
            });

            setNombre('');
            setNegocioNombre('');
            setGiroNegocio(GIRO_TECNOLOGIA);
            setEmail('');
            setPassword('');
            await cargarAdmins();
            window.sellixNotify?.('Admin creado correctamente', { type: 'success' });
        } catch (error) {
            window.sellixNotify?.(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setProcesando(false);
        }
    };

    const cerrarSesion = async () => {
        await auth.signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#F0EADC] text-[#1A2517]">
            <header className="bg-[#1A2517] text-white px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase text-[#ACC8A2]">Sellix Global</p>
                    <h1 className="text-3xl font-black uppercase italic">Super Admin</h1>
                </div>
                <button onClick={cerrarSesion} className="btn-primary bg-[#ACC8A2] !text-[#1A2517]">Salir</button>
            </header>

            <main className="p-5 md:p-8 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                <form onSubmit={crearAdmin} className="bg-[#FFFDF7] border border-[#D8C7B5] rounded-2xl p-6 shadow-sm h-fit">
                    <h2 className="text-xl font-black uppercase italic mb-5">Crear admin de negocio</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="form-label">Nombre del dueno/admin</label>
                            <input className="login-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Nombre del negocio</label>
                            <input className="login-input" value={negocioNombre} onChange={(e) => setNegocioNombre(e.target.value)} placeholder="Ej: Archicell" required />
                        </div>
                        <div>
                            <label className="form-label">Giro del negocio</label>
                            <select className="login-input" value={giroNegocio} onChange={(e) => setGiroNegocio(e.target.value)} required>
                                {Object.entries(GIROS_NEGOCIO).map(([value, config]) => (
                                    <option key={value} value={value}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Correo</label>
                            <input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Contrasena temporal</label>
                            <input type="password" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button disabled={procesando} className="login-submit login-submit-active disabled:opacity-50">
                            {procesando ? 'Creando...' : 'Crear admin'}
                        </button>
                    </div>
                </form>

                <section className="admin-table-panel">
                    <div className="p-6 border-b border-[#D8C7B5] bg-[#F8F5EC]">
                        <h2 className="admin-section-title">Admins creados</h2>
                        <p className="admin-section-subtitle">Cada admin administra su propio entorno Sellix</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="admin-table">
                            <thead className="admin-table-head">
                                <tr>
                                    <th className="admin-th">Negocio</th>
                                    <th className="admin-th">Admin</th>
                                    <th className="admin-th">Giro</th>
                                    <th className="admin-th">Correo</th>
                                    <th className="admin-th">Negocio ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0EADC]">
                                {admins.map(admin => (
                                    <tr key={admin.id} className="admin-row">
                                        <td className="admin-td font-black uppercase">{admin.negocioNombre || 'Sin nombre'}</td>
                                        <td className="admin-td">{admin.nombre}</td>
                                        <td className="admin-td">{GIROS_NEGOCIO[admin.giroNegocio]?.label || GIROS_NEGOCIO[GIRO_TECNOLOGIA].label}</td>
                                        <td className="admin-td">{admin.email}</td>
                                        <td className="admin-td text-xs font-mono">{admin.negocioId || admin.id}</td>
                                    </tr>
                                ))}
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center font-black uppercase text-[#B8AD9D]">Aun no hay admins creados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
