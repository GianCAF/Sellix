import React, { useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
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
    const [editandoId, setEditandoId] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [resetPasswordId, setResetPasswordId] = useState(null);

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

    const limpiarFormulario = () => {
        setEditandoId(null);
        setNombre('');
        setNegocioNombre('');
        setGiroNegocio(GIRO_TECNOLOGIA);
        setEmail('');
        setPassword('');
    };

    const guardarAdmin = async (e) => {
        e.preventDefault();
        if (procesando) return;
        if (!editandoId && password.length < 6) return window.sellixNotify?.('La contrasena debe tener al menos 6 caracteres', { type: 'warning' });
        setProcesando(true);
        try {
            if (editandoId) {
                await updateDoc(doc(db, "usuarios", editandoId), {
                    nombre,
                    negocioNombre: negocioNombre || nombre,
                    giroNegocio,
                    actualizadoPorSuperAdminId: user.uid,
                    actualizadoEn: new Date()
                });

                limpiarFormulario();
                await cargarAdmins();
                window.sellixNotify?.('Admin actualizado correctamente', { type: 'success' });
                return;
            }

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

            limpiarFormulario();
            await cargarAdmins();
            window.sellixNotify?.('Admin creado correctamente', { type: 'success' });
        } catch (error) {
            window.sellixNotify?.(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setProcesando(false);
        }
    };

    const prepararEdicion = (admin) => {
        setEditandoId(admin.id);
        setNombre(admin.nombre || '');
        setNegocioNombre(admin.negocioNombre || '');
        setGiroNegocio(admin.giroNegocio || GIRO_TECNOLOGIA);
        setEmail(admin.email || '');
        setPassword('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminarAdmin = async (admin) => {
        if (eliminandoId) return;
        const confirmado = await window.sellixConfirm?.(
            `Quitar acceso al admin ${admin.nombre || admin.email}? Sus sucursales, inventario y ventas no se borraran.`,
            { title: 'Quitar acceso de admin' }
        );
        if (!confirmado) return;
        setEliminandoId(admin.id);
        try {
            await deleteDoc(doc(db, "usuarios", admin.id));
            if (editandoId === admin.id) limpiarFormulario();
            await cargarAdmins();
            window.sellixNotify?.('Acceso de admin eliminado', { type: 'success' });
        } catch (error) {
            window.sellixNotify?.(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setEliminandoId(null);
        }
    };

    const enviarResetPassword = async (admin) => {
        if (resetPasswordId) return;
        if (!admin.email) return window.sellixNotify?.('Este admin no tiene correo registrado', { type: 'warning' });
        setResetPasswordId(admin.id);
        try {
            await sendPasswordResetEmail(auth, admin.email);
            window.sellixNotify?.('Correo de restablecimiento enviado', { type: 'success' });
        } catch (error) {
            window.sellixNotify?.(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setResetPasswordId(null);
        }
    };

    const cerrarSesion = async () => {
        await auth.signOut();
        navigate('/');
    };

    return (
        <div className="super-admin-page min-h-screen bg-[#F0EADC] text-[#1A2517]">
            <header className="super-admin-header bg-[#1A2517] text-white px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase text-[#ACC8A2]">Sellix Global</p>
                    <h1 className="text-3xl font-black uppercase italic">Super Admin</h1>
                </div>
                <button onClick={cerrarSesion} className="btn-primary bg-[#ACC8A2] !text-[#1A2517]">Salir</button>
            </header>

            <main className="super-admin-layout p-5 md:p-8 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                <form onSubmit={guardarAdmin} className="super-admin-form bg-[#FFFDF7] border border-[#D8C7B5] rounded-2xl p-6 shadow-sm h-fit">
                    <h2 className="text-xl font-black uppercase italic mb-5">
                        {editandoId ? 'Editar admin de negocio' : 'Crear admin de negocio'}
                    </h2>
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
                            <input type="email" className="login-input disabled:bg-[#F0EADC] disabled:text-[#8A8377]" value={email} onChange={(e) => setEmail(e.target.value)} required={!editandoId} disabled={!!editandoId} />
                            {editandoId && (
                                <p className="mt-2 text-[10px] font-black uppercase text-[#8A8377]">El correo de acceso se cambia desde Firebase Auth o con una funcion segura.</p>
                            )}
                        </div>
                        {!editandoId && (
                            <div>
                                <label className="form-label">Contrasena temporal</label>
                                <input type="password" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                        )}
                        <button disabled={procesando} className="login-submit login-submit-active disabled:opacity-50">
                            {procesando ? 'Procesando...' : editandoId ? 'Actualizar admin' : 'Crear admin'}
                        </button>
                        {editandoId && (
                            <button type="button" onClick={limpiarFormulario} className="w-full text-xs font-black uppercase text-[#8A8377]">
                                Cancelar edicion
                            </button>
                        )}
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
                                    <th className="admin-th text-right">Acciones</th>
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
                                        <td className="admin-td">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <button type="button" onClick={() => prepararEdicion(admin)} className="rounded-xl bg-[#F0EADC] px-3 py-2 text-[10px] font-black uppercase text-[#1A2517] shadow-sm transition-colors hover:bg-[#1A2517] hover:text-white" title="Editar admin" aria-label="Editar admin">
                                                    Editar
                                                </button>
                                                <button type="button" onClick={() => enviarResetPassword(admin)} disabled={resetPasswordId === admin.id} className="rounded-xl bg-[#E5EEDC] px-3 py-2 text-[10px] font-black uppercase text-[#1A2517] shadow-sm transition-colors hover:bg-[#576238] hover:text-white disabled:opacity-50" title="Enviar reset de contrasena" aria-label="Enviar reset de contrasena">
                                                    {resetPasswordId === admin.id ? '...' : 'Clave'}
                                                </button>
                                                <button type="button" onClick={() => eliminarAdmin(admin)} disabled={eliminandoId === admin.id} className="rounded-xl bg-[#9A3B30] px-3 py-2 text-[10px] font-black uppercase text-white shadow-sm transition-colors hover:bg-[#7E2F28] disabled:opacity-50" title="Quitar acceso" aria-label="Quitar acceso">
                                                    {eliminandoId === admin.id ? '...' : 'Eliminar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center font-black uppercase text-[#B8AD9D]">Aun no hay admins creados</td>
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
