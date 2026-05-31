import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminUsuarios = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [rol, setRol] = useState('empleado');
    const [sucursales, setSucursales] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [editandoId, setEditandoId] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);

    const cargarDatos = async () => {
        const sSnap = await getDocs(collection(db, "sucursales"));
        setSucursales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const uSnap = await getDocs(collection(db, "usuarios"));
        setUsuarios(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { cargarDatos(); }, []);

    const handleCrearOEditar = async (e) => {
        e.preventDefault();
        setCargando(true);

        try {
            if (editandoId) {
                await updateDoc(doc(db, "usuarios", editandoId), {
                    nombre,
                    rol,
                    sucursalId: rol === 'empleado' ? sucursalId : ''
                });
                setEditandoId(null);
                alert("Empleado actualizado con éxito");
            } else {
                // Validación básica de contraseña
                if (password.length < 6) {
                    alert("La contraseña debe tener al menos 6 caracteres");
                    setCargando(false);
                    return;
                }

                const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`, {
                    method: 'POST',
                    body: JSON.stringify({ email, password, returnSecureToken: true }),
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message);
                }

                if (data.localId) {
                    await setDoc(doc(db, "usuarios", data.localId), {
                        uid: data.localId,
                        nombre,
                        email,
                        rol,
                        sucursalId: rol === 'empleado' ? sucursalId : '',
                        fechaAlta: new Date()
                    });
                    alert("Empleado registrado correctamente");
                }
            }
            // Resetear campos
            setNombre(''); setEmail(''); setPassword(''); setSucursalId(''); setRol('empleado');
            await cargarDatos();
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            setCargando(false);
        }
    };

    const prepararEdicion = (u) => {
        setEditandoId(u.id);
        setNombre(u.nombre);
        setSucursalId(u.sucursalId || '');
        setRol(u.rol || 'empleado');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminarUsuario = async (id) => {
        if (eliminandoId) return;
        if (await window.sellixConfirm("¿Seguro que deseas quitar el acceso a este empleado?", { title: 'Quitar acceso' })) {
            setEliminandoId(id);
            try {
                await deleteDoc(doc(db, "usuarios", id));
                await cargarDatos();
            } finally {
                setEliminandoId(null);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F5EC]">
            <AdminNavbar />
            <div className="p-4 md:p-8 max-w-5xl mx-auto">
                <h2 className="text-2xl font-black mb-6 uppercase italic text-[#1A2517]">
                    {editandoId ? 'Editando Usuario' : 'Nuevo Usuario'}
                </h2>

                {/* Formulario Responsivo */}
                <form onSubmit={handleCrearOEditar} className="bg-[#FFFDF7] p-6 rounded-[30px] shadow-sm mb-10 grid grid-cols-1 md:grid-cols-2 gap-4 border border-[#E3D9C8]">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-[#8A8377] uppercase ml-2 mb-1">Nombre Completo</label>
                        <input type="text" className="p-3 border-2 rounded-xl outline-none focus:border-[#576238] font-bold" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-[#8A8377] uppercase ml-2 mb-1">Rol</label>
                        <select className="p-3 border-2 rounded-xl outline-none font-bold text-[#67625C] bg-[#F8F5EC]" value={rol} onChange={(e) => setRol(e.target.value)} required>
                            <option value="empleado">Empleado</option>
                            <option value="tecnico">Tecnico</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-[#8A8377] uppercase ml-2 mb-1">Sucursal Asignada</label>
                        <select className="p-3 border-2 rounded-xl outline-none font-bold text-[#67625C] bg-[#F8F5EC]" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required={rol === 'empleado'} disabled={rol !== 'empleado'}>
                            <option value="">-- Seleccionar --</option>
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>

                    {!editandoId && (
                        <>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-[#8A8377] uppercase ml-2 mb-1">Correo Electrónico</label>
                                <input type="email" className="p-3 border-2 rounded-xl outline-none focus:border-[#576238] font-bold" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-[#8A8377] uppercase ml-2 mb-1">Contraseña</label>
                                <input type="password" placeholder="Mín. 6 caracteres" className="p-3 border-2 rounded-xl outline-none focus:border-[#576238] font-bold" value={password} onChange={(e) => setPassword(e.target.value)} required={!editandoId} />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={cargando}
                        className={`md:col-span-2 py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${editandoId ? 'bg-[#67625C]' : 'bg-[#1A2517] hover:bg-[#576238]'} disabled:bg-[#D8C7B5]`}
                    >
                        {cargando ? 'PROCESANDO...' : editandoId ? 'ACTUALIZAR DATOS' : 'REGISTRAR USUARIO'}
                    </button>

                    {editandoId && (
                        <button type="button" onClick={() => { setEditandoId(null); setNombre(''); setSucursalId(''); setRol('empleado'); }} className="md:col-span-2 text-[#8A8377] font-black text-xs uppercase italic">Cancelar Edición</button>
                    )}
                </form>

                {/* Tabla Responsiva con Scroll Horizontal */}
                <div className="bg-[#FFFDF7] rounded-[30px] shadow-sm overflow-hidden border border-[#E3D9C8]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F8F5EC]">
                                <tr>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest">Empleado</th>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest">Rol / Sucursal</th>
                                    <th className="p-5 text-[10px] font-black text-[#8A8377] uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0EADC]">
                                {usuarios.filter(u => ['empleado', 'tecnico'].includes(u.rol)).map(u => (
                                    <tr key={u.id} className="hover:bg-[#E5EEDC]/20 transition-colors">
                                        <td className="p-5">
                                            <p className="font-black text-[#3E4635] uppercase text-sm">{u.nombre}</p>
                                            <p className="text-[10px] font-bold text-[#8A8377] italic">{u.email}</p>
                                        </td>
                                        <td className="p-5">
                                            <span className="bg-[#E5EEDC] text-[#1A2517] px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic border border-[#D9E5D3]">
                                                {u.rol === 'tecnico' ? 'Tecnico' : sucursales.find(s => s.id === u.sucursalId)?.nombre || '---'}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => prepararEdicion(u)} className="p-2 bg-[#E5EEDC] text-[#1A2517] rounded-xl hover:bg-[#1A2517] hover:text-white transition-all shadow-sm">✏️</button>
                                                <button onClick={() => eliminarUsuario(u.id)} disabled={eliminandoId === u.id} className="p-2 bg-[#F4E6E1] text-[#9A3B30] rounded-xl hover:bg-[#9A3B30] hover:text-white transition-all shadow-sm disabled:opacity-50">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {usuarios.filter(u => ['empleado', 'tecnico'].includes(u.rol)).length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="p-10 text-center text-[#B8AD9D] font-black uppercase italic">No hay empleados registrados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUsuarios;
