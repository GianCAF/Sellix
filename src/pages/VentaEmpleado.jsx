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

  useEffect(() => {
    const obtenerSucursal = async () => {
      if (user?.sucursalId) {
        const sucSnap = await getDocs(query(collection(db, "sucursales")));
        const miSuc = sucSnap.docs.find(d => d.id === user.sucursalId);
        setSucursalNombre(miSuc?.data().nombre || 'Mi Sucursal');
      }
    };
    obtenerSucursal();
  }, [user]);

  const buscarProducto = async (e) => {
    e.preventDefault();
    if (!busqueda) return;

    // Buscamos productos que coincidan con el código de barras o descripción en la sucursal del empleado
    const q = query(
      collection(db, "inventarios"),
      where("sucursalId", "==", user.sucursalId)
    );
    
    const snap = await getDocs(q);
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Filtrado por código o nombre (Firebase no permite 'array-contains' y 'OR' fácilmente, lo hacemos en local)
    const encontrados = todos.filter(p => 
      p.codigos.includes(busqueda) || 
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    );

    setProductos(encontrados);
  };

  const agregarAlCarrito = (p) => {
    if (p.cantidad <= 0) return alert("Producto sin stock");
    
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      if (existe.cantidadVenta >= p.cantidad) return alert("No hay más stock disponible");
      setCarrito(carrito.map(item => 
        item.id === p.id ? { ...item, cantidadVenta: item.cantidadVenta + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...p, cantidadVenta: 1 }]);
    }
    setBusqueda('');
    setProductos([]);
  };

  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidadVenta), 0);

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    
    try {
      // 1. Registrar la venta en una nueva colección
      await addDoc(collection(db, "ventas"), {
        empleadoId: user.uid,
        sucursalId: user.sucursalId,
        productos: carrito,
        total: totalVenta,
        fecha: new Date()
      });

      // 2. Descontar stock de cada producto
      for (const item of carrito) {
        const productRef = doc(db, "inventarios", item.id);
        await updateDoc(productRef, {
          cantidad: increment(-item.cantidadVenta)
        });
      }

      alert("Venta realizada con éxito");
      setCarrito([]);
    } catch (error) {
      console.error(error);
      alert("Error al procesar la venta");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Lado Izquierdo: Buscador y Resultados */}
      <div className="flex-1 p-6 border-r">
        <header className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-black text-blue-600 uppercase italic">{sucursalNombre}</h2>
          <button onClick={() => auth.signOut()} className="text-red-500 font-bold text-sm">Cerrar Sesión</button>
        </header>

        <form onSubmit={buscarProducto} className="relative mb-6">
          <input 
            type="text"
            className="w-full p-4 rounded-2xl shadow-sm border-none outline-none text-xl"
            placeholder="Escanear código o buscar nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          <button className="absolute right-4 top-4 text-gray-400">🔍</button>
        </form>

        <div className="grid grid-cols-1 gap-4">
          {productos.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
              <div>
                <p className="font-bold">{p.descripcion}</p>
                <p className="text-xs text-gray-400">Stock: {p.cantidad} pz</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-black text-blue-600">${p.precio}</span>
                <button 
                  onClick={() => agregarAlCarrito(p)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
                >
                  + Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lado Derecho: Carrito de Cobro */}
      <div className="w-full md:w-96 bg-white p-6 shadow-2xl flex flex-col h-screen sticky top-0">
        <h3 className="text-xl font-bold mb-4 border-b pb-2">Ticket de Venta</h3>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {carrito.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium">{item.descripcion}</p>
                <p className="text-gray-400">{item.cantidadVenta} x ${item.precio}</p>
              </div>
              <p className="font-bold">${(item.cantidadVenta * item.precio).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between text-2xl font-black mb-6">
            <span>TOTAL:</span>
            <span className="text-green-600">${totalVenta.toFixed(2)}</span>
          </div>
          <button 
            onClick={finalizarVenta}
            disabled={carrito.length === 0}
            className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-600 transition-all disabled:bg-gray-200"
          >
            COBRAR (F5)
          </button>
        </div>
      </div>
    </div>
  );
};

export default VentaEmpleado;