import React, { useState, useEffect } from 'react';
import { where } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import { getTenantDocs } from '../services/firestoreTenant';

const AdminDesempeno = () => {
    const { user } = useAuth();
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    const hoyStr = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(hoyStr);
    const [fechaFin, setFechaFin] = useState(hoyStr);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // 1. Cargar nombres de empleados para mapear IDs
            const usuariosTenant = await getTenantDocs("usuarios", user);
            const usersMap = {};
            usuariosTenant.forEach(item => {
                usersMap[item.id] = item.nombre;
            });

            // 2. Cargar ventas en rango
            const inicio = new Date(fechaInicio + "T00:00:00");
            const fin = new Date(fechaFin + "T23:59:59");
            const ventas = await getTenantDocs("ventas", user, [
                where("fecha", ">=", inicio),
                where("fecha", "<=", fin)
            ]);

            // 3. Agrupar por empleado
            const performance = {};
            ventas.forEach(v => {
                const empId = v.empleadoId;
                if (!performance[empId]) {
                    performance[empId] = {
                        nombre: usersMap[empId] || "Empleado Desconocido",
                        totalVendido: 0,
                        cantidadVentas: 0
                    };
                }
                performance[empId].totalVendido += Number(v.total || 0);
                performance[empId].cantidadVentas += 1;
            });

            // 4. Convertir a array y ordenar
            const sorted = Object.values(performance).sort((a, b) => b.totalVendido - a.totalVendido);
            setRanking(sorted);

        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => { if (user) cargarDatos(); }, [fechaInicio, fechaFin, user]);

    return (
        <div className="admin-page">
            <AdminNavbar />
            <div className="admin-shell">

                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <h2 className="text-4xl font-black uppercase italic text-[#1A2517] leading-none">Ranking de Desempeño</h2>

                    <div className="flex gap-4 bg-[#FFFDF7] p-4 rounded-[30px] shadow-sm border">
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black text-[#8A8377] uppercase ml-1">Desde</label>
                            <input type="date" className="font-bold outline-none text-sm" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                        </div>
                        <div className="flex flex-col border-l pl-4">
                            <label className="text-[9px] font-black text-[#8A8377] uppercase ml-1">Hasta</label>
                            <input type="date" className="font-bold outline-none text-sm" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 font-black text-[#B8AD9D] text-2xl uppercase animate-pulse italic">Analizando Métricas...</div>
                ) : (
                    <div className="space-y-4">
                        {ranking.length > 0 ? ranking.map((emp, idx) => (
                            <div key={idx} className="bg-[#FFFDF7] p-6 rounded-[35px] shadow-sm border border-[#E3D9C8] flex items-center justify-between hover:scale-[1.01] transition-all">
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-[#EFE2B8] text-[#7A672B]' : 'bg-[#F0EADC] text-[#8A8377]'}`}>
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-[#1A2517] uppercase italic leading-tight">{emp.nombre}</p>
                                        <p className="text-[10px] font-black text-[#576238] uppercase tracking-widest">{emp.cantidadVentas} Ventas Realizadas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-[#8A8377] uppercase mb-1">Total Generado</p>
                                    <p className="text-3xl font-black text-[#576238]">${emp.totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-[#FFFDF7] p-20 rounded-[40px] text-center border-2 border-dashed border-[#D8C7B5]">
                                <p className="font-black text-[#B8AD9D] text-2xl uppercase italic">No hay ventas registradas en este periodo</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDesempeno;
