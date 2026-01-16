import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

const AdminDesempeno = () => {
    const [ranking, setRanking] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    const hoyStr = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(hoyStr);
    const [fechaFin, setFechaFin] = useState(hoyStr);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // 1. Cargar nombres de empleados para mapear IDs
            const userSnap = await getDocs(collection(db, "usuarios"));
            const usersMap = {};
            userSnap.docs.forEach(d => {
                usersMap[d.id] = d.data().nombre;
            });
            setUsuarios(usersMap);

            // 2. Cargar ventas en rango
            const inicio = new Date(fechaInicio + "T00:00:00");
            const fin = new Date(fechaFin + "T23:59:59");
            const q = query(collection(db, "ventas"), where("fecha", ">=", inicio), where("fecha", "<=", fin));
            const ventSnap = await getDocs(q);

            // 3. Agrupar por empleado
            const performance = {};
            ventSnap.docs.forEach(doc => {
                const v = doc.data();
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

    useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AdminNavbar />
            <div className="p-8 max-w-4xl mx-auto">

                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <h2 className="text-4xl font-black uppercase italic text-gray-800 leading-none">Ranking de Desempeño</h2>

                    <div className="flex gap-4 bg-white p-4 rounded-[30px] shadow-sm border">
                        <div className="flex flex-col">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Desde</label>
                            <input type="date" className="font-bold outline-none text-sm" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                        </div>
                        <div className="flex flex-col border-l pl-4">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Hasta</label>
                            <input type="date" className="font-bold outline-none text-sm" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 font-black text-gray-300 text-2xl uppercase animate-pulse italic">Analizando Métricas...</div>
                ) : (
                    <div className="space-y-4">
                        {ranking.length > 0 ? ranking.map((emp, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-100 flex items-center justify-between hover:scale-[1.01] transition-all">
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-gray-800 uppercase italic leading-tight">{emp.nombre}</p>
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{emp.cantidadVentas} Ventas Realizadas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Generado</p>
                                    <p className="text-3xl font-black text-green-600">${emp.totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-gray-200">
                                <p className="font-black text-gray-300 text-2xl uppercase italic">No hay ventas registradas en este periodo</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDesempeno;