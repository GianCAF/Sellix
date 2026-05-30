import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NOMBRE_TIENDA_TICKET = 'ARCHICELL';
const CONTACTO_TICKET = '7731708400';

const VentaEmpleado = () => {
    const { user } = useAuth();
    const [busqueda, setBusqueda] = useState('');
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [sucursalNombre, setSucursalNombre] = useState('');
    const [fondoInicial, setFondoInicial] = useState(0);
    const [mostrarModalFondo, setMostrarModalFondo] = useState(false);
    const [inputFondo, setInputFondo] = useState('');
    const [verificandoCaja, setVerificandoCaja] = useState(true);
    const [mostrarModalMov, setMostrarModalMov] = useState(false);
    const [movTipo, setMovTipo] = useState('entrada');
    const [movCantidad, setMovCantidad] = useState('');
    const [movMotivo, setMovMotivo] = useState('');
    const [mostrarCorte, setMostrarCorte] = useState(false);
    const [verDetallesCorte, setVerDetallesCorte] = useState(false);
    const [ventasHoy, setVentasHoy] = useState([]);
    const [movimientosHoy, setMovimientosHoy] = useState([]);
    const [mostrarModalTemp, setMostrarModalTemp] = useState(false);
    const [tempNombre, setTempNombre] = useState('');
    const [tempPrecio, setTempPrecio] = useState('');
    const [procesandoVenta, setProcesandoVenta] = useState(false);
    const [ticketActual, setTicketActual] = useState(null);
    const [mostrarConfirmacionVenta, setMostrarConfirmacionVenta] = useState(false);
    const [inventarioSucursal, setInventarioSucursal] = useState([]);
    const [mostrarInventario, setMostrarInventario] = useState(false);
    const [cargandoInventario, setCargandoInventario] = useState(false);
    const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);
    const [productoDescuento, setProductoDescuento] = useState(null);
    const [descuentoCantidad, setDescuentoCantidad] = useState('');
    const [descuentoMotivo, setDescuentoMotivo] = useState('');
    const [modoOffline, setModoOffline] = useState(!navigator.onLine);
    const [ventasPendientes, setVentasPendientes] = useState(0);
    const [ultimaVentaOffline, setUltimaVentaOffline] = useState(false);
    const [vozDisponible, setVozDisponible] = useState(false);
    const [escuchandoVoz, setEscuchandoVoz] = useState(false);
    const [mensajeAsistente, setMensajeAsistente] = useState('Asistente apagado');
    const [resultadoAsistente, setResultadoAsistente] = useState(null);

    const inputBusqueda = useRef(null);
    const reconocimientoVoz = useRef(null);
    const asistenteEscuchando = useRef(false);
    const inventarioSucursalRef = useRef([]);
    const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const monedaSinCentavos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const normalizarTexto = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const subtotalProducto = (item) => Math.max(0, (Number(item.precio) || 0) * (Number(item.cantidadVenta) || 0) - (Number(item.descuento) || 0));
    const totalCarrito = carrito.reduce((acc, item) => acc + subtotalProducto(item), 0);
    const inventarioCacheKey = user?.sucursalId ? `sellix_inventario_${user.sucursalId}` : '';
    const ventasOfflineKey = user?.sucursalId ? `sellix_ventas_offline_${user.sucursalId}` : '';

    const getFechaLocalID = () => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    useEffect(() => { if (user) { obtenerSucursal(); verificarCajaHoy(); } }, [user]);
    const enfocarBuscador = () => setTimeout(() => inputBusqueda.current?.focus(), 150);

    useEffect(() => {
        inventarioSucursalRef.current = inventarioSucursal;
    }, [inventarioSucursal]);

    useEffect(() => {
        if (!user?.sucursalId) return;
        cargarInventarioDesdeCache();
        actualizarConteoPendientes();

        const manejarOnline = () => {
            setModoOffline(false);
            sincronizarVentasOffline();
        };
        const manejarOffline = () => setModoOffline(true);

        window.addEventListener('online', manejarOnline);
        window.addEventListener('offline', manejarOffline);
        if (navigator.onLine) sincronizarVentasOffline();

        return () => {
            window.removeEventListener('online', manejarOnline);
            window.removeEventListener('offline', manejarOffline);
        };
    }, [user?.sucursalId]);

    const leerJsonLocal = (key, fallback = []) => {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch {
            return fallback;
        }
    };

    const guardarJsonLocal = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const cargarInventarioDesdeCache = () => {
        if (!inventarioCacheKey) return [];
        const cache = leerJsonLocal(inventarioCacheKey, []);
        setInventarioSucursal(cache);
        return cache;
    };

    const guardarInventarioCache = (items) => {
        if (!inventarioCacheKey) return;
        guardarJsonLocal(inventarioCacheKey, items);
        inventarioSucursalRef.current = items;
        setInventarioSucursal(items);
    };

    const actualizarConteoPendientes = () => {
        if (!ventasOfflineKey) return;
        setVentasPendientes(leerJsonLocal(ventasOfflineKey, []).length);
    };

    const obtenerSucursal = async () => {
        if (user?.sucursalId) {
            const sucSnap = await getDocs(collection(db, "sucursales"));
            const miSuc = sucSnap.docs.find(d => d.id === user.sucursalId);
            setSucursalNombre(miSuc?.data().nombre || 'Mi Sucursal');
        }
    };

    const verificarCajaHoy = async () => {
        setVerificandoCaja(true);
        try {
            const docRef = doc(db, "cajas_inicio", `${user.sucursalId}_${getFechaLocalID()}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setFondoInicial(Number(docSnap.data().monto) || 0);
                setMostrarModalFondo(false);
            } else { setMostrarModalFondo(true); }
        } catch (error) { setMostrarModalFondo(true); } finally { setVerificandoCaja(false); }
    };

    const abrirCaja = async () => {
        if (!inputFondo || isNaN(inputFondo) || parseFloat(inputFondo) < 0) return alert("Monto no válido");
        try {
            await setDoc(doc(db, "cajas_inicio", `${user.sucursalId}_${getFechaLocalID()}`), {
                monto: parseFloat(inputFondo), sucursalId: user.sucursalId, empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado', fecha: Timestamp.now(), fechaString: getFechaLocalID()
            });
            setFondoInicial(parseFloat(inputFondo)); setMostrarModalFondo(false);
        } catch (e) { alert("Error"); }
    };

    const registrarMovimiento = async () => {
        if (!movCantidad || !movMotivo) return alert("Faltan datos");
        try {
            await addDoc(collection(db, "movimientos_caja"), {
                tipo: movTipo, monto: parseFloat(movCantidad), motivo: movMotivo, sucursalId: user.sucursalId,
                empleadoId: user.uid, nombreEmpleado: user.nombre || 'Empleado', fecha: Timestamp.now(), fechaString: getFechaLocalID()
            });
            setMostrarModalMov(false); setMovCantidad(''); setMovMotivo(''); alert("Registrado");
        } catch (e) { alert("Error"); }
    };

    const consultarCorteCompleto = async () => {
        try {
            const fechaHoy = getFechaLocalID();
            const [snapV, snapM] = await Promise.all([
                getDocs(query(collection(db, "ventas"), where("sucursalId", "==", user.sucursalId))),
                getDocs(query(collection(db, "movimientos_caja"), where("sucursalId", "==", user.sucursalId)))
            ]);
            const vData = snapV.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.fecha && `${String(v.fecha.toDate().getDate()).padStart(2, '0')}-${String(v.fecha.toDate().getMonth() + 1).padStart(2, '0')}-${v.fecha.toDate().getFullYear()}` === fechaHoy).sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
            const mData = snapM.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.fechaString === fechaHoy).sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
            setVentasHoy(vData); setMovimientosHoy(mData); setMostrarCorte(true);
        } catch (error) { alert("Error"); }
    };

    const obtenerInventarioSucursal = async () => {
        setCargandoInventario(true);
        try {
            if (!navigator.onLine) {
                cargarInventarioDesdeCache();
                setMostrarInventario(true);
                setModoOffline(true);
                return;
            }
            const snap = await getDocs(query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId)));
            const items = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''));
            guardarInventarioCache(items);
            setMostrarInventario(true);
        } catch (error) {
            cargarInventarioDesdeCache();
            setMostrarInventario(true);
            alert("Modo offline: mostrando inventario guardado localmente");
        } finally {
            setCargandoInventario(false);
        }
    };

    const obtenerDetalleInventario = (item) => ({
        descripcion: item.descripcion || '',
        codigo: (item.codigos || []).join(', '),
        stock: item.cantidad ?? 0,
        precio: Number(item.precio) || 0,
        valor: (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
        marca: item.marcaNombre || item.marca || '',
        modelo: item.modelo || '',
        categoria: item.categoriaNombre || item.categoria || '',
        subcategoria: item.subcategoriaNombre || item.subcategoria || '',
        colores: (item.colores || []).join(', '),
        productoId: item.productoId || '',
        inventarioId: item.id || ''
    });

    const exportarInventarioExcel = () => {
        const filas = inventarioSucursal.map(obtenerDetalleInventario);
        const headers = ['Descripcion', 'Codigos', 'Stock', 'Precio', 'Valor', 'Marca', 'Modelo', 'Categoria', 'Subcategoria', 'Colores', 'Producto ID', 'Inventario ID'];
        const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const rowsHtml = filas.map(item => `
            <tr>
                <td>${escapeHtml(item.descripcion)}</td>
                <td>${escapeHtml(item.codigo)}</td>
                <td>${escapeHtml(item.stock)}</td>
                <td>${escapeHtml(item.precio)}</td>
                <td>${escapeHtml(item.valor)}</td>
                <td>${escapeHtml(item.marca)}</td>
                <td>${escapeHtml(item.modelo)}</td>
                <td>${escapeHtml(item.categoria)}</td>
                <td>${escapeHtml(item.subcategoria)}</td>
                <td>${escapeHtml(item.colores)}</td>
                <td>${escapeHtml(item.productoId)}</td>
                <td>${escapeHtml(item.inventarioId)}</td>
            </tr>
        `).join('');
        const html = `
            <html>
                <head><meta charset="UTF-8" /></head>
                <body>
                    <table border="1">
                        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </body>
            </html>
        `;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventario_${sucursalNombre || 'sucursal'}_${getFechaLocalID()}.xls`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const coincideBusquedaProducto = (producto, termino) => {
        const textoProducto = [
            producto.descripcion,
            producto.modelo,
            producto.marca,
            producto.marcaNombre,
            producto.categoria,
            producto.categoriaNombre,
            producto.subcategoria,
            producto.subcategoriaNombre,
            ...(producto.codigos || []),
            ...(producto.colores || [])
        ].map(normalizarTexto).join(' ');

        return textoProducto.includes(termino);
    };

    const hablarAsistente = (texto) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const voz = new SpeechSynthesisUtterance(texto);
        voz.lang = 'es-MX';
        voz.rate = 1;
        voz.pitch = 1;
        window.speechSynthesis.speak(voz);
    };

    const extraerConsultaAsistente = (texto) => {
        const limpio = normalizarTexto(texto);
        const activadores = ['sellix', 'selix', 'celix', 'zelix', 'celis', 'felix'];
        const coincidencias = activadores
            .map(palabra => ({ palabra, indice: limpio.indexOf(palabra) }))
            .filter(item => item.indice >= 0)
            .sort((a, b) => a.indice - b.indice);

        if (coincidencias.length === 0) return null;

        const { palabra, indice } = coincidencias[0];
        let consulta = limpio.slice(indice + palabra.length);
        consulta = consulta
            .replace(/\b(tenemos|tienes|hay|existe|busca|buscar|consulta|checa|revisa|stock|inventario|producto|productos|de|del|la|el|un|una|por favor)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return consulta;
    };

    const obtenerInventarioParaAsistente = async () => {
        let inventarioBase = inventarioSucursalRef.current.length ? inventarioSucursalRef.current : cargarInventarioDesdeCache();

        if (navigator.onLine && user?.sucursalId) {
            try {
                const snap = await getDocs(query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId)));
                inventarioBase = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                guardarInventarioCache(inventarioBase);
                setModoOffline(false);
            } catch {
                inventarioBase = cargarInventarioDesdeCache();
                setModoOffline(true);
            }
        }

        return inventarioBase;
    };

    const calificarProductoVoz = (producto, termino) => {
        const tokens = termino.split(' ').filter(Boolean);
        const codigos = (producto.codigos || []).map(normalizarTexto);
        const descripcion = normalizarTexto(producto.descripcion);
        const textoProducto = [
            producto.descripcion,
            producto.modelo,
            producto.marca,
            producto.marcaNombre,
            producto.categoria,
            producto.categoriaNombre,
            producto.subcategoria,
            producto.subcategoriaNombre,
            ...(producto.codigos || []),
            ...(producto.colores || [])
        ].map(normalizarTexto).join(' ');

        let puntaje = 0;
        if (codigos.some(codigo => codigo === termino)) puntaje += 100;
        if (descripcion === termino) puntaje += 80;
        if (descripcion.includes(termino)) puntaje += 45;
        if (textoProducto.includes(termino)) puntaje += 30;
        puntaje += tokens.filter(token => textoProducto.includes(token)).length * 12;
        if (Number(producto.cantidad) > 0) puntaje += 3;
        return puntaje;
    };

    const buscarProductoPorVoz = (inventarioBase, consulta) => {
        const termino = normalizarTexto(consulta);
        return inventarioBase
            .map(producto => ({ producto, puntaje: calificarProductoVoz(producto, termino) }))
            .filter(item => item.puntaje > 0)
            .sort((a, b) => b.puntaje - a.puntaje || (Number(b.producto.cantidad) || 0) - (Number(a.producto.cantidad) || 0));
    };

    const procesarComandoVoz = async (texto) => {
        const consulta = extraerConsultaAsistente(texto);
        if (consulta === null) return;

        if (!consulta) {
            const respuesta = 'Te escucho. Dime que producto quieres consultar.';
            setMensajeAsistente(respuesta);
            setResultadoAsistente(null);
            hablarAsistente(respuesta);
            return;
        }

        setMensajeAsistente(`Buscando: ${consulta}`);
        const inventarioBase = await obtenerInventarioParaAsistente();
        const resultados = buscarProductoPorVoz(inventarioBase, consulta);
        const mejor = resultados[0]?.producto;
        const stock = Number(mejor?.cantidad) || 0;

        if (!mejor || stock <= 0) {
            const respuesta = `Segun inventario no tenemos ${consulta} en esta sucursal.`;
            setMensajeAsistente(respuesta);
            setResultadoAsistente({ consulta, encontrado: false });
            hablarAsistente(respuesta);
            return;
        }

        const respuesta = `Segun inventario hay ${stock} pieza${stock === 1 ? '' : 's'} de ${mejor.descripcion}.`;
        setMensajeAsistente(respuesta);
        setResultadoAsistente({
            consulta,
            encontrado: true,
            descripcion: mejor.descripcion,
            stock,
            precio: Number(mejor.precio) || 0,
            codigo: mejor.codigos?.[0] || 'N/A'
        });
        hablarAsistente(respuesta);
    };

    const iniciarEscuchaVoz = () => {
        if (!reconocimientoVoz.current || asistenteEscuchando.current) return false;

        try {
            asistenteEscuchando.current = true;
            reconocimientoVoz.current.start();
            setEscuchandoVoz(true);
            setMensajeAsistente('Escuchando. Di Sellix y el producto.');
            return true;
        } catch {
            setMensajeAsistente('No pude iniciar el microfono.');
            asistenteEscuchando.current = false;
            setEscuchandoVoz(false);
            return false;
        }
    };

    const detenerEscuchaVoz = () => {
        if (!reconocimientoVoz.current) return;
        asistenteEscuchando.current = false;
        reconocimientoVoz.current.stop();
        setEscuchandoVoz(false);
        setMensajeAsistente('Asistente apagado');
    };

    useEffect(() => {
        const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Reconocimiento) {
            setVozDisponible(false);
            setMensajeAsistente('Voz no disponible en este navegador');
            return;
        }

        const reconocimiento = new Reconocimiento();
        reconocimiento.lang = 'es-MX';
        reconocimiento.continuous = true;
        reconocimiento.interimResults = false;
        reconocimiento.maxAlternatives = 1;

        reconocimiento.onresult = (event) => {
            const ultimo = event.results[event.results.length - 1]?.[0]?.transcript || '';
            procesarComandoVoz(ultimo);
        };

        reconocimiento.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                asistenteEscuchando.current = false;
                setEscuchandoVoz(false);
                setMensajeAsistente('Permite el microfono para activar el asistente automatico.');
                return;
            }
            setMensajeAsistente('No pude escuchar bien. Intentalo de nuevo.');
        };

        reconocimiento.onend = () => {
            if (!asistenteEscuchando.current) return;
            try {
                reconocimiento.start();
            } catch {
                setEscuchandoVoz(false);
                asistenteEscuchando.current = false;
            }
        };

        reconocimientoVoz.current = reconocimiento;
        setVozDisponible(true);
        const inicioAutomatico = setTimeout(() => iniciarEscuchaVoz(), 500);

        return () => {
            clearTimeout(inicioAutomatico);
            asistenteEscuchando.current = false;
            reconocimiento.stop();
        };
    }, [user?.sucursalId]);

    const toggleAsistenteVoz = () => {
        if (!vozDisponible || !reconocimientoVoz.current) return;

        if (asistenteEscuchando.current) {
            detenerEscuchaVoz();
            return;
        }

        iniciarEscuchaVoz();
    };

    const totalVentas = ventasHoy.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const totalEntradas = movimientosHoy.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const totalSalidas = movimientosHoy.filter(m => m.tipo === 'salida').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const netoCaja = Number(fondoInicial) + totalVentas + totalEntradas - totalSalidas;
    const formatearFechaTicket = (fecha) => fecha.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const descargarPDFCorteDetallado = () => {
        const doc = new jsPDF();
        const movimientosOrdenados = [
            ...ventasHoy.map(v => ({
                tipo: 'Venta',
                fecha: v.fecha?.toDate?.() || null,
                empleado: v.nombreEmpleado || 'N/A',
                detalle: (v.productos || []).map(p => {
                    const descuento = Number(p.descuento) > 0 ? ` | Desc: ${moneda.format(Number(p.descuento) || 0)} (${p.motivoDescuento || 'Sin motivo'})` : '';
                    return `${p.cantidadVenta}x ${p.descripcion} - ${moneda.format(Number(p.subtotal) || ((Number(p.precio) || 0) * (Number(p.cantidadVenta) || 0)))}${descuento}`;
                }).join('\n'),
                monto: Number(v.total) || 0
            })),
            ...movimientosHoy.map(m => ({
                tipo: m.tipo === 'entrada' ? 'Entrada efectivo' : 'Salida efectivo',
                fecha: m.fecha?.toDate?.() || null,
                empleado: m.nombreEmpleado || 'N/A',
                detalle: m.motivo || '',
                monto: m.tipo === 'entrada' ? Number(m.monto) || 0 : -(Number(m.monto) || 0)
            }))
        ].sort((a, b) => (b.fecha?.getTime?.() || 0) - (a.fecha?.getTime?.() || 0));

        doc.setFont("helvetica", "bold");
        doc.text("CORTE DE CAJA DETALLADO", 14, 16);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Sucursal: ${sucursalNombre}`, 14, 23);
        doc.text(`Fecha: ${getFechaLocalID()}`, 14, 29);
        doc.text(`Empleado: ${user?.nombre || 'N/A'}`, 14, 35);

        autoTable(doc, {
            startY: 42,
            head: [['Concepto', 'Monto']],
            body: [
                ['Fondo Inicial', moneda.format(fondoInicial)],
                ['Ventas', moneda.format(totalVentas)],
                ['Entradas', moneda.format(totalEntradas)],
                ['Salidas', moneda.format(totalSalidas)],
                ['Caja Actual', moneda.format(netoCaja)]
            ],
            theme: 'grid'
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Hora', 'Tipo', 'Empleado', 'Detalle', 'Monto']],
            body: movimientosOrdenados.map(m => [
                m.fecha ? m.fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                m.tipo,
                m.empleado,
                m.detalle,
                moneda.format(m.monto)
            ]),
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 28 },
                2: { cellWidth: 28 },
                3: { cellWidth: 82 },
                4: { cellWidth: 28, halign: 'right' }
            },
            theme: 'striped'
        });

        doc.save(`corte_${sucursalNombre}.pdf`);
    };

    const crearVentaPayload = () => {
        const productosVendidos = carrito.map(item => ({ ...item, subtotal: subtotalProducto(item) }));
        const totalVenta = productosVendidos.reduce((acc, i) => acc + subtotalProducto(i), 0);
        const fechaTicket = new Date();
        const ventaId = `venta_${user.sucursalId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        return {
            ventaId,
            fechaTicket,
            productosVendidos,
            totalVenta,
            data: {
                empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado',
                sucursalId: user.sucursalId,
                productos: productosVendidos,
                total: totalVenta,
                fecha: Timestamp.fromDate(fechaTicket)
            }
        };
    };

    const descontarInventarioLocal = (productosVendidos) => {
        const cache = leerJsonLocal(inventarioCacheKey, inventarioSucursal);
        const actualizado = cache.map(item => {
            const vendido = productosVendidos.find(p => p.id === item.id && !p.esTemporal);
            if (!vendido) return item;
            return { ...item, cantidad: Math.max(0, (Number(item.cantidad) || 0) - (Number(vendido.cantidadVenta) || 0)) };
        });
        guardarInventarioCache(actualizado);
    };

    const guardarVentaOffline = ({ ventaId, fechaTicket, productosVendidos, totalVenta, data }) => {
        const pendientes = leerJsonLocal(ventasOfflineKey, []);
        const ventaOffline = {
            ventaId,
            fechaISO: fechaTicket.toISOString(),
            totalVenta,
            data: {
                ...data,
                fecha: fechaTicket.toISOString(),
                guardadaOffline: true
            }
        };
        guardarJsonLocal(ventasOfflineKey, [...pendientes, ventaOffline]);
        actualizarConteoPendientes();
        descontarInventarioLocal(productosVendidos);
        setModoOffline(true);
    };

    const sincronizarVentasOffline = async () => {
        if (!ventasOfflineKey || !navigator.onLine) return;
        const pendientes = leerJsonLocal(ventasOfflineKey, []);
        if (pendientes.length === 0) {
            setVentasPendientes(0);
            return;
        }

        const restantes = [];
        for (const venta of pendientes) {
            try {
                const ventaData = {
                    ...venta.data,
                    fecha: Timestamp.fromDate(new Date(venta.fechaISO)),
                    sincronizadaDesdeOffline: true
                };
                await setDoc(doc(db, "ventas", venta.ventaId), ventaData);
                for (const item of ventaData.productos || []) {
                    if (!item.esTemporal) await updateDoc(doc(db, "inventarios", item.id), { cantidad: increment(-item.cantidadVenta) });
                }
            } catch (error) {
                restantes.push(venta);
            }
        }
        guardarJsonLocal(ventasOfflineKey, restantes);
        setVentasPendientes(restantes.length);
    };

    const finalizarVenta = async () => {
        if (carrito.length === 0 || procesandoVenta) return;
        setProcesandoVenta(true);
        let venta = null;
        try {
            venta = crearVentaPayload();

            if (!navigator.onLine) {
                guardarVentaOffline(venta);
                setUltimaVentaOffline(true);
            } else {
                await setDoc(doc(db, "ventas", venta.ventaId), venta.data);
                for (const item of carrito) { if (!item.esTemporal) await updateDoc(doc(db, "inventarios", item.id), { cantidad: increment(-item.cantidadVenta) }); }
                descontarInventarioLocal(venta.productosVendidos);
                setUltimaVentaOffline(false);
            }
            setTicketActual({
                tienda: NOMBRE_TIENDA_TICKET,
                sucursal: sucursalNombre,
                fecha: venta.fechaTicket,
                productos: venta.productosVendidos,
                total: venta.totalVenta,
                contacto: CONTACTO_TICKET
            });
            setCarrito([]);
            setMostrarConfirmacionVenta(true);
        } catch (e) {
            if (venta) {
                guardarVentaOffline(venta);
                setUltimaVentaOffline(true);
                setTicketActual({
                    tienda: NOMBRE_TIENDA_TICKET,
                    sucursal: sucursalNombre,
                    fecha: venta.fechaTicket,
                    productos: venta.productosVendidos,
                    total: venta.totalVenta,
                    contacto: CONTACTO_TICKET
                });
                setCarrito([]);
                setMostrarConfirmacionVenta(true);
            } else {
                alert("Error");
            }
        } finally { setProcesandoVenta(false); }
    };

    const imprimirTicketConfirmado = () => {
        setMostrarConfirmacionVenta(false);
        requestAnimationFrame(() => window.print());
    };

    const buscarProducto = async (e, autoAgregarExacto = true) => {
        if (e) e.preventDefault();
        const termino = normalizarTexto(busqueda.trim());
        if (!termino) return setProductos([]);

        let inventarioBase = inventarioSucursal.length ? inventarioSucursal : cargarInventarioDesdeCache();
        if (navigator.onLine) {
            try {
                const snap = await getDocs(query(collection(db, "inventarios"), where("sucursalId", "==", user.sucursalId)));
                inventarioBase = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                guardarInventarioCache(inventarioBase);
            } catch {
                inventarioBase = cargarInventarioDesdeCache();
                setModoOffline(true);
            }
        }

        const enc = inventarioBase
            .filter(p => coincideBusquedaProducto(p, termino))
            .sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''));
        const exactoPorCodigo = enc.find(p => p.codigos?.some(c => normalizarTexto(c) === termino));
        if (autoAgregarExacto && exactoPorCodigo) agregarAlCarrito(exactoPorCodigo); else setProductos(enc);
    };

    useEffect(() => {
        if (!user?.sucursalId) return;
        const timer = setTimeout(() => { buscarProducto(null, false); }, 250);
        return () => clearTimeout(timer);
    }, [busqueda, user?.sucursalId]);

    const agregarAlCarrito = (p) => {
        const ex = carrito.find(i => i.id === p.id);
        if (!p.esTemporal && Number(p.cantidad) <= 0) return alert("Producto sin stock disponible");
        if (ex && !p.esTemporal && ex.cantidadVenta >= Number(p.cantidad)) return alert("No hay mas stock disponible");
        if (ex) setCarrito(carrito.map(i => i.id === p.id ? { ...i, cantidadVenta: i.cantidadVenta + 1 } : i));
        else setCarrito([...carrito, { ...p, cantidadVenta: 1, descuento: 0, motivoDescuento: '' }]);
        setBusqueda(''); setProductos([]); enfocarBuscador();
    };

    const eliminarDelCarrito = (id) => {
        setCarrito(carrito.filter(item => item.id !== id));
    };

    const agregarTempAlCarrito = () => {
        agregarAlCarrito({ id: `TEMP-${Date.now()}`, descripcion: `(TEMP) ${tempNombre}`, precio: parseFloat(tempPrecio), esTemporal: true, cantidad: 999 });
        setTempNombre(''); setTempPrecio(''); setMostrarModalTemp(false);
    };

    const abrirDescuento = (item) => {
        setProductoDescuento(item);
        setDescuentoCantidad(item.descuento ? String(item.descuento) : '');
        setDescuentoMotivo(item.motivoDescuento || '');
        setMostrarModalDescuento(true);
    };

    const aplicarDescuento = () => {
        const monto = Number(descuentoCantidad);
        const bruto = (Number(productoDescuento?.precio) || 0) * (Number(productoDescuento?.cantidadVenta) || 0);
        if (!productoDescuento) return;
        if (!monto || monto <= 0) return alert("Ingresa un descuento valido");
        if (monto >= bruto) return alert("El descuento no puede ser igual o mayor al subtotal del producto");
        if (!descuentoMotivo.trim()) return alert("Ingresa el motivo del descuento");

        setCarrito(carrito.map(item => item.id === productoDescuento.id ? {
            ...item,
            descuento: monto,
            motivoDescuento: descuentoMotivo.trim()
        } : item));
        setMostrarModalDescuento(false);
        setProductoDescuento(null);
        setDescuentoCantidad('');
        setDescuentoMotivo('');
    };

    const quitarDescuento = (id) => {
        setCarrito(carrito.map(item => item.id === id ? { ...item, descuento: 0, motivoDescuento: '' } : item));
    };

    if (verificandoCaja) return <div className="pos-container items-center justify-center font-black italic text-blue-600">SINCRONIZANDO...</div>;

    return (
        <div className="pos-container">
            {/* MODAL APERTURA */}
            {mostrarModalFondo && (
                <div className="modal-apertura-overlay">
                    <div className="modal-content-sm text-gray-800">
                        <h2 className="text-3xl font-black italic uppercase">Apertura</h2>
                        <p className="text-gray-400 font-bold mb-8 uppercase text-[10px] tracking-widest">{sucursalNombre}</p>
                        <input type="number" className="w-full p-5 border-4 border-blue-50 rounded-[30px] text-5xl font-black text-center mb-8 outline-none" value={inputFondo} onChange={(e) => setInputFondo(e.target.value)} autoFocus />
                        <button onClick={abrirCaja} className="btn-primary w-full py-6 text-2xl rounded-[30px]">Abrir Turno</button>
                    </div>
                </div>
            )}

            <div className="pos-main-panel">
                <header className="mb-4 flex justify-between items-center text-gray-800">
                    <div>
                        <h2 className="text-2xl font-black text-blue-600 italic uppercase">{sucursalNombre}</h2>
                        {(modoOffline || ventasPendientes > 0) && (
                            <p className="text-[10px] font-black text-orange-500 uppercase">
                                Modo offline {ventasPendientes > 0 ? `| ${ventasPendientes} venta(s) pendiente(s)` : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setMostrarModalMov(true)} className="btn-dark">💸 Efectivo</button>
                        <button onClick={() => auth.signOut()} className="text-gray-400 font-bold text-xs uppercase">Salir</button>
                    </div>
                </header>
                <div className="flex gap-3 mb-6">
                    <button onClick={() => setMostrarModalTemp(true)} className="btn-orange">➕ Temporal</button>
                    <button onClick={consultarCorteCompleto} className="btn-primary">📊 Corte</button>
                </div>
                <div className="flex flex-wrap gap-3 mb-6">
                    <button onClick={obtenerInventarioSucursal} className="btn-dark">{cargandoInventario ? 'Cargando...' : 'Ver inventario'}</button>
                    <button
                        onClick={toggleAsistenteVoz}
                        disabled={!vozDisponible}
                        className={`${escuchandoVoz ? 'btn-orange' : 'btn-dark'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {escuchandoVoz ? 'Escuchando voz' : 'Asistente voz'}
                    </button>
                </div>
                {(escuchandoVoz || resultadoAsistente || !vozDisponible) && (
                    <div className="bg-white border border-blue-50 rounded-2xl shadow-sm p-4 mb-6 text-gray-800">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Asistente Sellix</p>
                        <p className="text-sm font-bold mt-1">{mensajeAsistente}</p>
                        {resultadoAsistente?.encontrado && (
                            <div className="mt-3 text-xs font-black uppercase text-gray-400">
                                <p>{resultadoAsistente.descripcion}</p>
                                <p>Stock: {resultadoAsistente.stock} | Codigo: {resultadoAsistente.codigo} | Precio: {moneda.format(resultadoAsistente.precio)}</p>
                            </div>
                        )}
                    </div>
                )}
                <form onSubmit={buscarProducto} className="mb-6">
                    <input ref={inputBusqueda} type="text" className="input-pos" placeholder="Buscar por codigo, nombre, marca..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </form>
                <div className="space-y-3">
                    {productos.map(p => (
                        <div key={p.id} className="product-card text-gray-800">
                            <div className="flex-1 pr-4">
                                <p className="font-bold uppercase text-sm">{p.descripcion}</p>
                                <p className="text-[10px] text-gray-400 font-black uppercase">
                                    Stock: {p.cantidad ?? 0} | Codigo: {p.codigos?.[0] || 'N/A'}
                                </p>
                                <p className="text-lg font-black text-green-600">{moneda.format(Number(p.precio) || 0)}</p>
                            </div>
                            <button onClick={() => agregarAlCarrito(p)} className="btn-primary">Agregar</button>
                        </div>
                    ))}
                    {busqueda && productos.length === 0 && (
                        <div className="text-center py-10 text-gray-300 font-black uppercase italic">
                            Sin resultados
                        </div>
                    )}
                </div>
            </div>

            <div className="pos-sidebar">
                <h3 className="text-2xl font-black italic uppercase mb-6 tracking-tighter text-gray-800">🛒 Venta Actual</h3>
                <div className="flex-1 overflow-y-auto space-y-4 text-gray-700">
                    {carrito.map(item => (
                        <div key={item.id} className="ticket-item">
                            <div className="flex-1">
                                <p className="font-bold uppercase text-xs">{item.descripcion}</p>
                                <p className="text-[10px] text-gray-400">{item.cantidadVenta} x {moneda.format(Number(item.precio) || 0)}</p>
                                {Number(item.descuento) > 0 && (
                                    <p className="text-[10px] text-red-500 font-black uppercase">
                                        Desc: -{moneda.format(Number(item.descuento) || 0)} | {item.motivoDescuento}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="font-black text-blue-600">{moneda.format(subtotalProducto(item))}</p>
                                    <button onClick={() => abrirDescuento(item)} className="text-[9px] font-black text-orange-500 uppercase">Descuento</button>
                                    {Number(item.descuento) > 0 && (
                                        <button onClick={() => quitarDescuento(item.id)} className="block text-[9px] font-black text-gray-400 uppercase">Quitar</button>
                                    )}
                                </div>
                                <button onClick={() => eliminarDelCarrito(item.id)} className="btn-remove">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t-4 border-double">
                    <p className="text-4xl font-black text-green-600 mb-6 text-center">{moneda.format(totalCarrito)}</p>
                    <button onClick={finalizarVenta} disabled={carrito.length === 0 || procesandoVenta} className="btn-green w-full uppercase">
                        {procesandoVenta ? "Procesando..." : "Cobrar"}
                    </button>
                </div>
            </div>

            {/* MODAL CORTE */}
            {mostrarCorte && (
                <div className="modal-overlay">
                    <div className="modal-content text-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic">Resumen Diario</h3>
                            <button onClick={() => { setMostrarCorte(false); setVerDetallesCorte(false); }} className="text-3xl">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                            <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-black text-gray-400 uppercase">Fondo</p><p className="text-xl font-black">${Number(fondoInicial).toFixed(2)}</p></div>
                            <div className="p-4 bg-green-50 rounded-2xl text-green-700"><p className="text-[10px] font-black uppercase">Ventas</p><p className="text-xl font-black">${totalVentas.toFixed(2)}</p></div>
                            <div className="p-4 bg-red-50 rounded-2xl text-red-700"><p className="text-[10px] font-black uppercase">Salidas</p><p className="text-xl font-black">${totalSalidas.toFixed(2)}</p></div>
                            <div className="p-4 bg-blue-600 rounded-2xl text-white"><p className="text-[10px] font-black uppercase font-black">Caja Actual</p><p className="text-xl font-black">${netoCaja.toFixed(2)}</p></div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setVerDetallesCorte(!verDetallesCorte)} className="btn-dark flex-1">👁️ Detalles</button>
                            <button onClick={descargarPDFCorteDetallado} className="btn-primary flex-1">📄 PDF Auditoría</button>
                        </div>
                        {verDetallesCorte && (
                            <div className="flex-1 overflow-y-auto space-y-4 italic text-sm">
                                {ventasHoy.map((v, i) => (
                                    <div key={i} className="border-b pb-1 mb-2">
                                        <div className="flex justify-between text-[10px] font-black text-gray-400">
                                            <span>{v.fecha?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="uppercase text-blue-500">Vendedor: {v.nombreEmpleado || 'N/A'}</span>
                                        </div>
                                        {v.productos.map((p, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between">
                                                    <span>{p.cantidadVenta}x {p.descripcion}</span>
                                                    <span className="font-bold">{moneda.format(Number(p.subtotal) || ((Number(p.precio) || 0) * (Number(p.cantidadVenta) || 0)))}</span>
                                                </div>
                                                {Number(p.descuento) > 0 && (
                                                    <div className="text-[10px] text-red-500 font-black uppercase">
                                                        Descuento: -{moneda.format(Number(p.descuento) || 0)} | {p.motivoDescuento}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL EFECTIVO - CON BOTÓN DE CIERRE "X" */}
            {mostrarModalMov && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-gray-800 relative">
                        <button
                            onClick={() => setMostrarModalMov(false)}
                            className="btn-close-modal"
                        >✕</button>
                        <h3 className="text-2xl font-black mb-6 italic uppercase text-center">Movimiento Efectivo</h3>
                        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
                            <button onClick={() => setMovTipo('entrada')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'entrada' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400'}`}>ENTRADA</button>
                            <button onClick={() => setMovTipo('salida')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'salida' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400'}`}>SALIDA</button>
                        </div>
                        <input type="number" placeholder="Monto $" className="input-modal" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} />
                        <input type="text" placeholder="Motivo..." className="input-modal" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} />
                        <button onClick={registrarMovimiento} className="btn-dark w-full py-4 rounded-2xl">Registrar</button>
                    </div>
                </div>
            )}

            {mostrarInventario && (
                <div className="modal-overlay">
                    <div className="modal-content text-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic">Inventario de Sucursal</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase">{sucursalNombre}</p>
                                <button onClick={exportarInventarioExcel} className="btn-primary mt-2">Descargar Excel</button>
                            </div>
                            <button onClick={() => setMostrarInventario(false)} className="text-3xl font-black text-gray-800">X</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {inventarioSucursal.map(item => (
                                <div key={item.id} className="product-card text-gray-800">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black uppercase text-sm">{item.descripcion}</p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase">
                                            Codigo: {item.codigos?.[0] || 'N/A'} | Stock: {item.cantidad ?? 0}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase">
                                            Marca: {item.marcaNombre || item.marca || 'N/A'} | Modelo: {item.modelo || 'N/A'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase">
                                            Categoria: {item.categoriaNombre || item.categoria || 'N/A'} | Colores: {item.colores?.join(', ') || 'N/A'}
                                        </p>
                                        <p className="text-lg font-black text-green-600">{moneda.format(Number(item.precio) || 0)}</p>
                                    </div>
                                </div>
                            ))}
                            {inventarioSucursal.length === 0 && (
                                <div className="text-center py-12 text-gray-300 font-black uppercase italic">
                                    Sin inventario en esta sucursal
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalDescuento && productoDescuento && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-gray-800 relative">
                        <button onClick={() => setMostrarModalDescuento(false)} className="btn-close-modal">âœ•</button>
                        <h3 className="text-2xl font-black mb-2 italic uppercase text-center">Descuento</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase mb-6">{productoDescuento.descripcion}</p>
                        <input
                            type="number"
                            placeholder="Monto a descontar $"
                            className="input-modal"
                            value={descuentoCantidad}
                            onChange={(e) => setDescuentoCantidad(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Motivo del descuento"
                            className="input-modal"
                            value={descuentoMotivo}
                            onChange={(e) => setDescuentoMotivo(e.target.value)}
                        />
                        <button onClick={aplicarDescuento} className="btn-orange w-full py-4 rounded-2xl">
                            Aplicar descuento
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL VENTA MANUAL */}
            {mostrarModalTemp && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-gray-800">
                        <h3 className="text-2xl font-black mb-6 italic uppercase">Venta Manual</h3>
                        <input type="text" placeholder="¿Qué es?" className="input-modal" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} />
                        <input type="number" placeholder="Precio $" className="input-modal" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} />
                        <button onClick={agregarTempAlCarrito} className="btn-orange w-full py-4 rounded-xl mb-2">Añadir</button>
                        <button onClick={() => setMostrarModalTemp(false)} className="text-xs font-bold text-gray-400 uppercase">Cerrar</button>
                    </div>
                </div>
            )}

            {mostrarConfirmacionVenta && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-gray-800">
                        <h3 className="text-2xl font-black mb-3 italic uppercase">{ultimaVentaOffline ? 'Modo offline' : 'Venta procesada'}</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-6">
                            {ultimaVentaOffline ? 'Venta guardada localmente. Se sincronizara al volver internet.' : 'El ticket esta listo para imprimir'}
                        </p>
                        <button onClick={imprimirTicketConfirmado} className="btn-green w-full uppercase">
                            Aceptar e imprimir
                        </button>
                    </div>
                </div>
            )}

            {ticketActual && (
                <div className="print-ticket">
                    <div className="print-ticket-title">{ticketActual.tienda}</div>
                    <div className="print-ticket-center print-ticket-header-line">{ticketActual.sucursal}</div>
                    <div className="print-ticket-center print-ticket-header-line">{formatearFechaTicket(ticketActual.fecha)}</div>
                    <div className="print-ticket-rule" />
                    {ticketActual.productos.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="print-ticket-product">
                            <div>{item.descripcion}</div>
                            <div className="print-ticket-row">
                                <span>{item.cantidadVenta} x {moneda.format(Number(item.precio) || 0)}</span>
                                <span className="print-ticket-line-amount">{moneda.format(subtotalProducto(item))}</span>
                            </div>
                            {Number(item.descuento) > 0 && (
                                <div className="print-ticket-row">
                                    <span>Descuento</span>
                                    <span className="print-ticket-line-amount">-{moneda.format(Number(item.descuento) || 0)}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="print-ticket-rule" />
                    <div className="print-ticket-row print-ticket-total">
                        <span>Total</span>
                        <span className="print-ticket-total-amount">{monedaSinCentavos.format(ticketActual.total)}</span>
                    </div>
                    <div className="print-ticket-rule" />
                    <div className="print-ticket-center">Dudas o aclaraciones:</div>
                    <div className="print-ticket-center print-ticket-contact">{ticketActual.contacto}</div>
                </div>
            )}
        </div>
    );
};

export default VentaEmpleado;
