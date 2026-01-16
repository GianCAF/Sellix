import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const VentaEmpleado = () => {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [sucursalNombre, setSucursalNombre] = useState('');
  
  // Estados para el Producto Temporal
  const [mostrarModalTemp, setMostrarModalTemp] = useState(false);
  const [tempNombre, setTempNombre] = useState('');
  const [tempPrecio, setTempPrecio] = useState('');
  const [tempCant, setTempCant] = useState(1);

  useEffect(() => {
    const obtenerSucursal = async () => {
      if (user?.sucursalId) {
        const sucSnap = await getDocs(collection(db, "sucursales"));
        const miSuc = sucSnap.docs.find(d => d.id === user.sucursalId);
        setSucursalNombre(miSuc?.data().nombre || 'Mi Sucursal');
      }
    };
    obtenerSucursal();
  }, [user]);

  const buscarProducto = async (e) => {
    e.preventDefault();
    if (!busqueda) return;
    const q = query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId));
    const snap = await getDocs(q);
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const encontrados = todos.filter(p => 
      p.codigos?.includes(busqueda) || 
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    );
    setProductos(encontrados);
  };

  const agregarAlCarrito = (p) => {
    if (p.cantidad <= 0) return alert("Producto sin stock");
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      if (existe.cantidadVenta >= p.cantidad) return alert("No hay más stock disponible");
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidadVenta: item.cantidadVenta + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidadVenta: 1 }]);
    }
    setBusqueda('');
    setProductos([]);
  };

  // Función para agregar el producto manual/temporal
  const agregarTempAlCarrito = (e) => {
    e.preventDefault();
    const nuevoTemp = {
      id: `TEMP-${Date.now()}`, // ID único temporal
      descripcion: `(TEMP) ${tempNombre}`,
      precio: parseFloat(tempPrecio),
      cantidadVenta: parseInt(tempCant),
      esTemporal: true
    };
    setCarrito([...carrito, nuevoTemp]);
    setTempNombre(''); setTempPrecio(''); setTempCant(1);
    setMostrarModalTemp(false);
  };

  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidadVenta), 0);

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    try {
      await addDoc(collection(db, "ventas"), {
        empleadoId: user.uid,
        sucursalId: user.sucursalId,
        productos: carrito,
        total: totalVenta,
        fecha: new Date()
      });

      for (const item of carrito) {
        if (!item.esTemporal) { // Solo descontamos si no es temporal
          const productRef = doc(db, "inventarios", item.id);
          await updateDoc(productRef, { cantidad: increment(-item.cantidadVenta) });
        }
      }
      alert("Venta realizada con éxito");
      setCarrito([]);
    } catch (error) {
      console.error(error);
      alert("Error al procesar la venta");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      <div className="flex-1 p-6 border-r overflow-y-auto">
        <header className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-black text-blue-600 uppercase italic tracking-tighter">{sucursalNombre}</h2>
          <button onClick={() => auth.signOut()} className="text-gray-400 hover:text-red-500 font-bold text-xs transition-colors">Cerrar Sesión</button>
        </header>

        {/* MENÚ HORIZONTAL SUPERIOR */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setMostrarModalTemp(true)}
            className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-bold text-sm border border-orange-200 hover:bg-orange-200 transition-all whitespace-nowrap"
          >
            ➕ Producto Temporal
          </button>
          {/* Aquí podrás agregar más botones de acceso rápido después */}
        </div>

        <form onSubmit={buscarProducto} className="relative mb-6">
          <input 
            type="text"
            className="w-full p-5 rounded-2xl shadow-sm border-2 border-transparent focus:border-blue-500 outline-none text-xl transition-all"
            placeholder="Escanear o buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
        </form>

        <div className="grid grid-cols-1 gap-3">
          {productos.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
              <div>
                <p className="font-bold text-gray-800">{p.descripcion}</p>
                <p className="text-xs font-bold text-blue-500 uppercase">{p.cantidad} disponibles</p>
              </div>
              <button 
                onClick={() => agregarAlCarrito(p)}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                ${p.precio}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARRITO (TICKET) */}
      <div className="w-full md:w-[400px] bg-white p-6 shadow-2xl flex flex-col h-screen sticky top-0 border-l border-gray-100">
        <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🧾</span>
            <h3 className="text-xl font-black text-gray-800 uppercase italic">Ticket Actual</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {carrito.map(item => (
            <div key={item.id} className="flex justify-between items-start group">
              <div className="flex-1">
                <p className="font-bold text-gray-700 leading-tight">{item.descripcion}</p>
                <p className="text-xs font-medium text-gray-400">{item.cantidadVenta} pz x ${item.precio}</p>
              </div>
              <p className="font-black text-gray-800">${(item.cantidadVenta * item.precio).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-100">
          <div className="flex justify-between items-end mb-6">
            <span className="text-gray-400 font-bold text-sm uppercase">Total a pagar</span>
            <span className="text-4xl font-black text-green-600 tracking-tighter">${totalVenta.toFixed(2)}</span>
          </div>
          <button 
            onClick={finalizarVenta}
            disabled={carrito.length === 0}
            className="w-full bg-green-500 text-white py-5 rounded-3xl font-black text-2xl hover:bg-green-600 transition-all shadow-xl shadow-green-100 disabled:bg-gray-100 disabled:shadow-none active:scale-95"
          >
            REALIZAR COBRO
          </button>
        </div>
      </div>

      {/* MODAL PRODUCTO TEMPORAL */}
      {mostrarModalTemp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={agregarTempAlCarrito} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black mb-6 text-gray-800">Venta Manual</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Descripción</label>
                <input type="text" className="w-full border-2 p-3 rounded-xl outline-none focus:border-orange-400" placeholder="Ej: Protector genérico" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Precio</label>
                    <input type="number" step="0.01" className="w-full border-2 p-3 rounded-xl outline-none focus:border-orange-400 font-bold" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} required />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Cantidad</label>
                    <input type="number" className="w-full border-2 p-3 rounded-xl outline-none focus:border-orange-400 font-bold" value={tempCant} onChange={(e) => setTempCant(e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button type="button" onClick={() => setMostrarModalTemp(false)} className="flex-1 py-3 font-bold text-gray-400">Cancelar</button>
              <button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-100">Agregar al Ticket</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VentaEmpleado;