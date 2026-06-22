import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, addDoc, doc, updateDoc, increment, Timestamp, getDoc, setDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { obtenerNegocioId, obtenerConfigGiro, obtenerGiroNegocio, permiteTecnicos } from '../utils/tenant';
import { getTenantDocs } from '../services/firestoreTenant';

const NOMBRE_TIENDA_TICKET = 'ARCHICELL';
const CONTACTO_TICKET = '7731708400';

const VentaEmpleado = () => {
    const { user } = useAuth();
    const recomendaciones = obtenerConfigGiro(user);
    const negocioPermiteTecnicos = permiteTecnicos(user);
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
    const [cierreCaja, setCierreCaja] = useState(null);
    const [efectivoReal, setEfectivoReal] = useState('');
    const [procesandoCierreCaja, setProcesandoCierreCaja] = useState(false);
    const [mostrarModalTemp, setMostrarModalTemp] = useState(false);
    const [tempNombre, setTempNombre] = useState('');
    const [tempPrecio, setTempPrecio] = useState('');
    const [procesandoVenta, setProcesandoVenta] = useState(false);
    const [ticketActual, setTicketActual] = useState(null);
    const [mostrarConfirmacionVenta, setMostrarConfirmacionVenta] = useState(false);
    const [inventarioSucursal, setInventarioSucursal] = useState([]);
    const [mostrarInventario, setMostrarInventario] = useState(false);
    const [cargandoInventario, setCargandoInventario] = useState(false);
    const [modoComprobarInventario, setModoComprobarInventario] = useState(false);
    const [busquedaComprobarInventario, setBusquedaComprobarInventario] = useState('');
    const [existenciasReales, setExistenciasReales] = useState({});
    const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);
    const [productoDescuento, setProductoDescuento] = useState(null);
    const [descuentoCantidad, setDescuentoCantidad] = useState('');
    const [descuentoMotivo, setDescuentoMotivo] = useState('');
    const [modoOffline, setModoOffline] = useState(!navigator.onLine);
    const [ventasPendientes, setVentasPendientes] = useState(0);
    const [ultimaVentaOffline, setUltimaVentaOffline] = useState(false);
    const [procesandoCaja, setProcesandoCaja] = useState(false);
    const [procesandoMovimiento, setProcesandoMovimiento] = useState(false);
    const [procesandoTemporal, setProcesandoTemporal] = useState(false);
    const [procesandoImpresion, setProcesandoImpresion] = useState(false);
    const [mostrarPendientes, setMostrarPendientes] = useState(false);
    const [pendientesSucursal, setPendientesSucursal] = useState([]);
    const [nuevaNotaPendiente, setNuevaNotaPendiente] = useState('');
    const [tipoPendiente, setTipoPendiente] = useState('general');
    const [procesandoPendiente, setProcesandoPendiente] = useState(false);
    const [pendienteCompletandoId, setPendienteCompletandoId] = useState(null);
    const [vozDisponible, setVozDisponible] = useState(false);
    const [escuchandoVoz, setEscuchandoVoz] = useState(false);
    const [mensajeAsistente, setMensajeAsistente] = useState('Asistente apagado');
    const [resultadoAsistente, setResultadoAsistente] = useState(null);

    const inputBusqueda = useRef(null);
    const reconocimientoVoz = useRef(null);
    const asistenteEscuchando = useRef(false);
    const inventarioSucursalRef = useRef([]);
    const productosAgregandoRef = useRef(new Set());
    const ticketRef = useRef(null);
    const ticketPrintStyleRef = useRef(null);
    const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const monedaSinCentavos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const normalizarTexto = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizarBusquedaVoz = (texto) => normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const productoImportaStock = (producto) => producto?.esTemporal || producto?.importaStock !== false;
    const subtotalProducto = (item) => Math.max(0, (Number(item.precio) || 0) * (Number(item.cantidadVenta) || 0) - (Number(item.descuento) || 0));
    const totalCarrito = carrito.reduce((acc, item) => acc + subtotalProducto(item), 0);
    const inventarioCacheKey = user?.sucursalId ? `sellix_inventario_${user.sucursalId}` : '';
    const ventasOfflineKey = user?.sucursalId ? `sellix_ventas_offline_${user.sucursalId}` : '';

    const getFechaLocalID = () => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    useEffect(() => { if (user) { obtenerSucursal(); verificarCajaHoy(); } }, [user]);
    useEffect(() => {
        if (!negocioPermiteTecnicos && tipoPendiente === 'celular_por_venir') setTipoPendiente('general');
    }, [negocioPermiteTecnicos, tipoPendiente]);
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

    useEffect(() => {
        if (!user?.sucursalId) return;
        const pendientesQuery = query(
            collection(db, "pendientes_sucursal"),
            where("sucursalId", "==", user.sucursalId)
        );
        const unsub = onSnapshot(pendientesQuery, (snap) => {
            const items = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(item => (item.estado || 'pendiente') === 'pendiente')
                .sort((a, b) => obtenerMillisFecha(b.fecha) - obtenerMillisFecha(a.fecha));
            setPendientesSucursal(items);
        }, () => {
            setPendientesSucursal([]);
        });

        return () => unsub();
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

    const cargarInventarioSucursalActualizado = async () => {
        const [inventarioItems, catalogoItems] = await Promise.all([
            getTenantDocs("inventarios", user, [where("sucursalId", "==", user.sucursalId)]),
            getTenantDocs("productos_maestros", user)
        ]);
        const catalogoPorId = new Map(catalogoItems.map(item => [item.id, item]));
        return inventarioItems
            .map(item => {
                const maestro = catalogoPorId.get(item.productoId);
                return {
                    ...item,
                    importaStock: maestro?.importaStock ?? item.importaStock ?? true
                };
            })
            .sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''));
    };

    const actualizarConteoPendientes = () => {
        if (!ventasOfflineKey) return;
        setVentasPendientes(leerJsonLocal(ventasOfflineKey, []).length);
    };

    const obtenerMillisFecha = (fecha) => {
        if (!fecha) return 0;
        if (typeof fecha.toMillis === 'function') return fecha.toMillis();
        const valor = new Date(fecha).getTime();
        return Number.isNaN(valor) ? 0 : valor;
    };

    const formatearFechaPendiente = (fecha) => {
        const millis = obtenerMillisFecha(fecha);
        if (!millis) return 'Sin fecha';
        return new Date(millis).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const obtenerSucursal = async () => {
        if (user?.sucursalId) {
            const sucSnap = await getDoc(doc(db, "sucursales", user.sucursalId));
            setSucursalNombre(sucSnap.exists() ? (sucSnap.data().nombre || 'Mi Sucursal') : 'Mi Sucursal');
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
        if (procesandoCaja) return;
        if (!inputFondo || isNaN(inputFondo) || parseFloat(inputFondo) < 0) return alert("Monto no valido");
        setProcesandoCaja(true);
        if (!inputFondo || isNaN(inputFondo) || parseFloat(inputFondo) < 0) return alert("Monto no válido");
        try {
            await setDoc(doc(db, "cajas_inicio", `${user.sucursalId}_${getFechaLocalID()}`), {
                negocioId: obtenerNegocioId(user),
                monto: parseFloat(inputFondo), sucursalId: user.sucursalId, empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado', fecha: Timestamp.now(), fechaString: getFechaLocalID()
            });
            setFondoInicial(parseFloat(inputFondo)); setMostrarModalFondo(false);
        } catch (e) { alert("Error"); } finally { setProcesandoCaja(false); }
    };

    const registrarMovimiento = async () => {
        if (procesandoMovimiento) return;
        if (!movCantidad || !movMotivo) return alert("Faltan datos");
        setProcesandoMovimiento(true);
        if (!movCantidad || !movMotivo) return alert("Faltan datos");
        try {
            await addDoc(collection(db, "movimientos_caja"), {
                negocioId: obtenerNegocioId(user),
                tipo: movTipo, monto: parseFloat(movCantidad), motivo: movMotivo, sucursalId: user.sucursalId,
                empleadoId: user.uid, nombreEmpleado: user.nombre || 'Empleado', fecha: Timestamp.now(), fechaString: getFechaLocalID()
            });
            setMostrarModalMov(false); setMovCantidad(''); setMovMotivo(''); alert("Registrado");
        } catch (e) { alert("Error"); } finally { setProcesandoMovimiento(false); }
    };

    const agregarPendienteSucursal = async () => {
        const nota = nuevaNotaPendiente.trim();
        if (procesandoPendiente) return;
        if (!nota) return alert("Escribe la nota pendiente");
        const tipoSeguro = negocioPermiteTecnicos ? tipoPendiente : 'general';
        setProcesandoPendiente(true);
        try {
            await addDoc(collection(db, "pendientes_sucursal"), {
                negocioId: obtenerNegocioId(user),
                giroNegocio: obtenerGiroNegocio(user),
                sucursalId: user.sucursalId,
                sucursalNombre,
                nota,
                tipo: tipoSeguro,
                tipoLabel: tipoSeguro === 'celular_por_venir' ? 'Celular por venir' : 'General',
                estado: 'pendiente',
                creadoPorId: user.uid,
                creadoPorNombre: user.nombre || 'Empleado',
                fecha: Timestamp.now(),
                fechaString: getFechaLocalID()
            });
            setNuevaNotaPendiente('');
            setTipoPendiente('general');
        } catch (error) {
            alert("Error al guardar pendiente");
        } finally {
            setProcesandoPendiente(false);
        }
    };

    const completarPendienteSucursal = async (id) => {
        if (pendienteCompletandoId) return;
        setPendienteCompletandoId(id);
        try {
            await updateDoc(doc(db, "pendientes_sucursal", id), {
                estado: 'hecho',
                completadoPorId: user.uid,
                completadoPorNombre: user.nombre || 'Empleado',
                completadoEn: Timestamp.now()
            });
        } catch (error) {
            alert("Error al completar pendiente");
        } finally {
            setPendienteCompletandoId(null);
        }
    };

    const consultarCorteCompleto = async () => {
        try {
            const fechaHoy = getFechaLocalID();
            const inicio = new Date();
            inicio.setHours(0, 0, 0, 0);
            const fin = new Date();
            fin.setHours(23, 59, 59, 999);
            const [ventasDia, movimientosDia] = await Promise.all([
                getTenantDocs("ventas", user, [
                    where("sucursalId", "==", user.sucursalId),
                    where("fecha", ">=", inicio),
                    where("fecha", "<=", fin)
                ]),
                getTenantDocs("movimientos_caja", user, [
                    where("sucursalId", "==", user.sucursalId),
                    where("fechaString", "==", fechaHoy)
                ])
            ]);
            const vData = ventasDia.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
            const mData = movimientosDia.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
            const cierreSnap = await getDoc(doc(db, "cajas_cierre", `${user.sucursalId}_${fechaHoy}`));
            const cierreData = cierreSnap.exists() ? { id: cierreSnap.id, ...cierreSnap.data() } : null;
            setVentasHoy(vData); setMovimientosHoy(mData); setCierreCaja(cierreData); setEfectivoReal(cierreData ? String(cierreData.efectivoReal || '') : ''); setMostrarCorte(true);
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
            const items = await cargarInventarioSucursalActualizado();
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

    const exportarInventarioExcel = () => {
        const headers = ['Codigo', 'Nombre', 'Existencia'];
        const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const rowsHtml = inventarioSucursal.map(item => `
            <tr>
                <td>${escapeHtml((item.codigos || []).join(', ') || 'N/A')}</td>
                <td>${escapeHtml(item.descripcion || '')}</td>
                <td>${escapeHtml(item.cantidad ?? 0)}</td>
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

    const obtenerInventarioComprobacion = () => {
        const termino = normalizarTexto(busquedaComprobarInventario.trim());
        if (!termino) return inventarioSucursal;
        return inventarioSucursal.filter(item => coincideBusquedaProducto(item, termino));
    };

    const calcularDiferenciaInventario = (item) => {
        const valorReal = existenciasReales[item.id];
        if (valorReal === undefined || valorReal === '') return null;
        return (Number(valorReal) || 0) - (Number(item.cantidad) || 0);
    };

    const describirDiferenciaInventario = (diferencia) => {
        if (diferencia === null) return 'Pendiente';
        if (diferencia === 0) return 'Correcto';
        const piezas = Math.abs(diferencia);
        return diferencia < 0
            ? `${piezas} pieza${piezas === 1 ? '' : 's'} faltante${piezas === 1 ? '' : 's'}`
            : `${piezas} pieza${piezas === 1 ? '' : 's'} sobrante${piezas === 1 ? '' : 's'}`;
    };

    const descargarComprobacionInventarioPDF = () => {
        const doc = new jsPDF();
        const filas = inventarioSucursal.map(item => [
            item.descripcion || 'Sin nombre',
            String(item.cantidad ?? 0),
            describirDiferenciaInventario(calcularDiferenciaInventario(item))
        ]);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('COMPROBACION DE INVENTARIO', 14, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Sucursal: ${sucursalNombre || 'Sin sucursal'}`, 14, 25);
        doc.text(`Fecha: ${new Date().toLocaleString('es-MX')}`, 14, 31);

        autoTable(doc, {
            startY: 37,
            head: [['Producto', 'Inventario', 'Resultado']],
            body: filas,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [87, 98, 56], textColor: [255, 255, 255] },
            columnStyles: {
                0: { cellWidth: 95 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 55 }
            }
        });

        doc.save(`comprobacion_inventario_${sucursalNombre || 'sucursal'}_${getFechaLocalID()}.pdf`);
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

    const obtenerContextoAsistente = (texto) => {
        const limpio = normalizarTexto(texto);
        const activadores = ['sellix', 'selix', 'celix', 'zelix', 'celis', 'felix'];
        const coincidencia = activadores
            .map(palabra => ({ palabra, indice: limpio.indexOf(palabra) }))
            .filter(item => item.indice >= 0)
            .sort((a, b) => a.indice - b.indice)[0];

        if (!coincidencia) return null;

        const comando = limpio.slice(coincidencia.indice + coincidencia.palabra.length).replace(/\s+/g, ' ').trim();
        const preguntaCantidad = /\b(cuantos|cuantas|cuanto|cuanta|cantidad|stock|inventario)\b/.test(comando);
        const preguntaExistencia = /\b(hay|tenemos|tienes|existe|busca|buscar|consulta|checa|revisa)\b/.test(comando);
        const esInventario = preguntaCantidad || preguntaExistencia;
        const otraSucursal = /\b(?:alguna?\s+)?otras?\s+(?:sucursales?|tiendas?)\b/.test(comando);

        let consulta = comando
            .replace(/\b(cuantos|cuantas|cuanto|cuanta|cantidad|tenemos|tienes|hay|existe|busca|buscar|consulta|checa|revisa|stock|inventario|producto|productos|marca|modelo|en|algun|alguna|otra|otras|sucursal|sucursales|tienda|tiendas|de|del|la|el|un|una|por favor)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return {
            consulta,
            esInventario,
            intencion: preguntaCantidad ? 'cantidad' : 'existencia',
            otraSucursal
        };
    };

    const obtenerInventarioParaAsistente = async () => {
        let inventarioBase = inventarioSucursalRef.current.length ? inventarioSucursalRef.current : cargarInventarioDesdeCache();

        if (navigator.onLine && user?.sucursalId) {
            try {
                inventarioBase = await cargarInventarioSucursalActualizado();
                guardarInventarioCache(inventarioBase);
                setModoOffline(false);
            } catch {
                inventarioBase = cargarInventarioDesdeCache();
                setModoOffline(true);
            }
        }

        return inventarioBase;
    };

    const obtenerInventarioOtrasSucursales = async () => {
        if (!navigator.onLine) throw new Error('Sin conexion');

        const [inventarios, catalogo, sucursales] = await Promise.all([
            getTenantDocs('inventarios', user),
            getTenantDocs('productos_maestros', user),
            getTenantDocs('sucursales', user)
        ]);
        const catalogoPorId = new Map(catalogo.map(item => [item.id, item]));
        const sucursalesPorId = new Map(sucursales.map(item => [item.id, item.nombre || 'Otra sucursal']));

        return inventarios
            .filter(item => item.sucursalId && item.sucursalId !== user?.sucursalId)
            .map(item => {
                const maestro = catalogoPorId.get(item.productoId);
                return {
                    ...maestro,
                    ...item,
                    descripcion: item.descripcion || maestro?.descripcion || 'Producto',
                    importaStock: maestro?.importaStock ?? item.importaStock ?? true,
                    sucursalNombre: sucursalesPorId.get(item.sucursalId) || 'Otra sucursal'
                };
            });
    };

    const obtenerTextoProductoVoz = (producto) => [
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
        ].map(normalizarBusquedaVoz).join(' ');

    const obtenerVariantesTokenVoz = (token) => {
        const variantes = [token];
        if (token.endsWith('es') && token.length > 4) variantes.push(token.slice(0, -2));
        if (token.endsWith('s') && token.length > 3) variantes.push(token.slice(0, -1));
        if (!token.endsWith('s') && token.length > 2) variantes.push(`${token}s`);
        if (!token.endsWith('es') && token.length > 3) variantes.push(`${token}es`);
        return [...new Set(variantes)];
    };

    const tokenCoincideProductoVoz = (textoProducto, token) => {
        if (token.length === 1) {
            return new RegExp(`(^|\\s)${token}($|\\s)`).test(textoProducto);
        }
        return obtenerVariantesTokenVoz(token).some(variante => textoProducto.includes(variante));
    };

    const obtenerTokensBusquedaVoz = (termino) => termino.split(' ').filter(Boolean);

    const obtenerFrasesRequeridasVoz = (termino) => {
        const frases = [];
        const tipo = termino.match(/\btipo\s+([a-z0-9]+)\b/)?.[0];
        if (tipo) frases.push(tipo);
        return frases;
    };

    const calificarProductoVoz = (producto, termino) => {
        const tokens = obtenerTokensBusquedaVoz(termino);
        const codigos = (producto.codigos || []).map(normalizarBusquedaVoz);
        const descripcion = normalizarBusquedaVoz(producto.descripcion);
        const textoProducto = obtenerTextoProductoVoz(producto);

        let puntaje = 0;
        if (codigos.some(codigo => codigo === termino)) puntaje += 100;
        if (descripcion === termino) puntaje += 80;
        if (descripcion.includes(termino)) puntaje += 45;
        if (textoProducto.includes(termino)) puntaje += 30;
        puntaje += tokens.filter(token => tokenCoincideProductoVoz(textoProducto, token)).length * 12;
        if (Number(producto.cantidad) > 0) puntaje += 3;
        return puntaje;
    };

    const buscarProductoPorVoz = (inventarioBase, consulta) => {
        const termino = normalizarBusquedaVoz(consulta);
        const tokens = obtenerTokensBusquedaVoz(termino);
        const frasesRequeridas = obtenerFrasesRequeridasVoz(termino);
        return inventarioBase
            .map(producto => ({
                producto,
                puntaje: calificarProductoVoz(producto, termino),
                textoProducto: obtenerTextoProductoVoz(producto)
            }))
            .filter(item =>
                item.puntaje > 0
                && tokens.every(token => tokenCoincideProductoVoz(item.textoProducto, token))
                && frasesRequeridas.every(frase => item.textoProducto.includes(frase))
            )
            .sort((a, b) => b.puntaje - a.puntaje || (Number(b.producto.cantidad) || 0) - (Number(a.producto.cantidad) || 0));
    };

    const obtenerCoincidenciasVoz = (resultados) => {
        const conStock = resultados.filter(item => (Number(item.producto.cantidad) || 0) > 0);
        const mejorPuntaje = conStock[0]?.puntaje || 0;
        return conStock
            .filter(item => item.puntaje >= Math.max(10, mejorPuntaje * 0.65))
            .slice(0, 8)
            .map(item => item.producto);
    };

    const resumirCoincidenciasVoz = (productos) => {
        return productos
            .map(producto => {
                const stock = Number(producto.cantidad) || 0;
                return `${stock} pieza${stock === 1 ? '' : 's'} de ${producto.descripcion}`;
            })
            .join(', ');
    };

    const describirProductoSinCantidad = (producto) => {
        const marca = producto.marcaNombre || producto.marca || '';
        const descripcion = producto.descripcion || 'producto';
        if (!marca || normalizarTexto(descripcion).includes(normalizarTexto(marca))) return descripcion;
        return `${descripcion} de ${marca}`;
    };

    const resumirExistenciasVoz = (productos) => productos.map(describirProductoSinCantidad).join(', ');

    const procesarComandoVoz = async (texto) => {
        const contexto = obtenerContextoAsistente(texto);
        if (contexto === null) return;

        const { consulta, esInventario, intencion, otraSucursal } = contexto;

        if (!consulta) {
            const respuesta = 'Te escucho. Dime que producto quieres consultar.';
            setMensajeAsistente(respuesta);
            setResultadoAsistente(null);
            hablarAsistente(respuesta);
            return;
        }

        if (!esInventario) {
            const respuesta = 'lo siento no puedo responder a eso';
            setMensajeAsistente(respuesta);
            setResultadoAsistente(null);
            hablarAsistente(respuesta);
            return;
        }

        if (otraSucursal) {
            setMensajeAsistente(`Buscando ${consulta} en otras sucursales`);
            try {
                const inventarioOtrasSucursales = await obtenerInventarioOtrasSucursales();
                const resultados = buscarProductoPorVoz(inventarioOtrasSucursales, consulta);
                const conStock = resultados.filter(item => (Number(item.producto.cantidad) || 0) > 0);
                const mejorPuntaje = conStock[0]?.puntaje || 0;
                const sucursalesDisponibles = [...new Set(conStock
                    .filter(item => item.puntaje >= Math.max(10, mejorPuntaje * 0.65))
                    .map(item => item.producto.sucursalNombre)
                    .filter(Boolean))];

                const nombresSucursales = sucursalesDisponibles.length > 1
                    ? `${sucursalesDisponibles.slice(0, -1).join(', ')} y ${sucursalesDisponibles.at(-1)}`
                    : sucursalesDisponibles[0];
                const respuesta = sucursalesDisponibles.length
                    ? `Si, tenemos ${consulta} en ${nombresSucursales}.`
                    : `No tenemos ${consulta} en otra sucursal.`;

                setMensajeAsistente(respuesta);
                setResultadoAsistente({ consulta, encontrado: false, otraSucursal: true });
                hablarAsistente(respuesta);
            } catch {
                const respuesta = navigator.onLine
                    ? 'No pude consultar otras sucursales en este momento.'
                    : 'Necesito conexion a internet para consultar otras sucursales.';
                setMensajeAsistente(respuesta);
                setResultadoAsistente({ consulta, encontrado: false, otraSucursal: true });
                hablarAsistente(respuesta);
            }
            return;
        }

        setMensajeAsistente(`Buscando: ${consulta}`);
        const inventarioBase = await obtenerInventarioParaAsistente();
        const resultados = buscarProductoPorVoz(inventarioBase, consulta);
        const coincidencias = obtenerCoincidenciasVoz(resultados);
        const mejor = coincidencias[0];
        const stock = Number(mejor?.cantidad) || 0;

        if (!mejor || stock <= 0) {
            const respuesta = `Segun inventario no tenemos ${consulta} en esta sucursal.`;
            setMensajeAsistente(respuesta);
            setResultadoAsistente({ consulta, encontrado: false });
            hablarAsistente(respuesta);
            return;
        }

        const respuesta = intencion === 'existencia'
            ? `Si, hay ${resumirExistenciasVoz(coincidencias)}.`
            : coincidencias.length > 1
                ? `Segun inventario encontre ${coincidencias.length} coincidencias: ${resumirCoincidenciasVoz(coincidencias)}.`
                : `Segun inventario hay ${stock} pieza${stock === 1 ? '' : 's'} de ${mejor.descripcion}.`;
        setMensajeAsistente(respuesta);
        setResultadoAsistente({
            consulta,
            encontrado: true,
            descripcion: mejor.descripcion,
            stock,
            precio: Number(mejor.precio) || 0,
            codigo: mejor.codigos?.[0] || 'N/A',
            productos: coincidencias.map(producto => ({
                id: producto.id,
                descripcion: producto.descripcion,
                stock: Number(producto.cantidad) || 0,
                precio: Number(producto.precio) || 0,
                codigo: producto.codigos?.[0] || 'N/A'
            }))
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
    const efectivoRealNumero = Number(efectivoReal) || 0;
    const diferenciaCaja = efectivoReal ? efectivoRealNumero - netoCaja : Number(cierreCaja?.diferencia) || 0;
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
                ['Caja Esperada', moneda.format(netoCaja)],
                ['Efectivo Real', cierreCaja ? moneda.format(Number(cierreCaja.efectivoReal) || 0) : 'Sin cierre'],
                ['Diferencia', cierreCaja ? moneda.format(Number(cierreCaja.diferencia) || 0) : 'Sin cierre']
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

    const registrarCierreCaja = async () => {
        if (procesandoCierreCaja) return;
        if (efectivoReal === '' || Number.isNaN(Number(efectivoReal)) || Number(efectivoReal) < 0) return alert("Ingresa el efectivo real");
        setProcesandoCierreCaja(true);
        try {
            const fechaHoy = getFechaLocalID();
            const data = {
                negocioId: obtenerNegocioId(user),
                sucursalId: user.sucursalId,
                sucursalNombre,
                empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado',
                fecha: Timestamp.now(),
                fechaString: fechaHoy,
                fondoInicial: Number(fondoInicial) || 0,
                totalVentas,
                totalEntradas,
                totalSalidas,
                cajaEsperada: netoCaja,
                efectivoReal: Number(efectivoReal),
                diferencia: Number(efectivoReal) - netoCaja
            };
            await setDoc(doc(db, "cajas_cierre", `${user.sucursalId}_${fechaHoy}`), data);
            setCierreCaja(data);
            window.sellixNotify?.('Cierre de caja guardado', { type: 'success' });
        } catch {
            alert("No pude guardar el cierre de caja");
        } finally {
            setProcesandoCierreCaja(false);
        }
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
                negocioId: obtenerNegocioId(user),
                empleadoId: user.uid,
                nombreEmpleado: user.nombre || 'Empleado',
                sucursalId: user.sucursalId,
                productos: productosVendidos,
                total: totalVenta,
                fecha: Timestamp.fromDate(fechaTicket),
                fechaString: getFechaLocalID()
            }
        };
    };

    const descontarInventarioLocal = (productosVendidos) => {
        const cache = leerJsonLocal(inventarioCacheKey, inventarioSucursal);
        const actualizado = cache.map(item => {
            const vendido = productosVendidos.find(p => p.id === item.id && !p.esTemporal && productoImportaStock(p));
            if (!vendido) return item;
            return { ...item, cantidad: Math.max(0, (Number(item.cantidad) || 0) - (Number(vendido.cantidadVenta) || 0)) };
        });
        guardarInventarioCache(actualizado);
    };

    const guardarVentaOffline = ({ ventaId, fechaTicket, productosVendidos, totalVenta, data }) => {
        const pendientes = leerJsonLocal(ventasOfflineKey, []);
        if (pendientes.some(v => v.ventaId === ventaId)) {
            setModoOffline(true);
            actualizarConteoPendientes();
            return;
        }
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

    const registrarVentaFirestore = async (ventaId, ventaData) => {
        const batch = writeBatch(db);
        batch.set(doc(db, "ventas", ventaId), ventaData);
        for (const item of ventaData.productos || []) {
            if (!item.esTemporal && productoImportaStock(item)) {
                batch.update(doc(db, "inventarios", item.id), {
                    cantidad: increment(-Number(item.cantidadVenta || 0))
                });
            }
        }
        await batch.commit();
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
                await registrarVentaFirestore(venta.ventaId, ventaData);
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
                await registrarVentaFirestore(venta.ventaId, venta.data);
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
            return true;
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
                return true;
            } else {
                alert("Error");
                return false;
            }
        } finally { setProcesandoVenta(false); }
    };

    const abrirConfirmacionVenta = () => {
        if (carrito.length === 0 || procesandoVenta) return;
        setMostrarConfirmacionVenta(true);
    };

    const cancelarConfirmacionVenta = () => {
        if (procesandoVenta || procesandoImpresion) return;
        setMostrarConfirmacionVenta(false);
    };

    const esperarFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const limpiarPreparacionImpresionTicket = () => {
        document.body.classList.remove('preparing-ticket-print');
        if (ticketPrintStyleRef.current) {
            ticketPrintStyleRef.current.remove();
            ticketPrintStyleRef.current = null;
        }
    };

    const prepararImpresionTicket = async () => {
        document.body.classList.add('preparing-ticket-print');
        await esperarFrame();
        const ticket = ticketRef.current;
        const altoPx = Math.ceil(ticket?.getBoundingClientRect().height || 0);
        const altoMm = Math.max(58, Math.ceil((altoPx * 25.4) / 96) + 6);
        limpiarPreparacionImpresionTicket();

        const style = document.createElement('style');
        style.id = 'sellix-ticket-page-size';
        style.textContent = `
            @media print {
                @page { size: 58mm ${altoMm}mm; margin: 0; }
                html, body, .pos-container {
                    height: ${altoMm}mm !important;
                    max-height: ${altoMm}mm !important;
                    overflow: hidden !important;
                }
            }
        `;
        document.head.appendChild(style);
        ticketPrintStyleRef.current = style;
    };

    const confirmarVentaEImprimir = async () => {
        if (procesandoVenta || procesandoImpresion) return;
        const ventaLista = await finalizarVenta();
        if (!ventaLista) return;
        setProcesandoImpresion(true);
        setMostrarConfirmacionVenta(false);
        window.setTimeout(async () => {
            try {
                await prepararImpresionTicket();
                window.print();
            } finally {
                setTimeout(() => {
                    limpiarPreparacionImpresionTicket();
                    setTicketActual(null);
                    setProcesandoImpresion(false);
                }, 1400);
            }
        }, 150);
    };

    const buscarProducto = async (e, autoAgregarExacto = true) => {
        if (e) e.preventDefault();
        const termino = normalizarTexto(busqueda.trim());
        if (!termino) return setProductos([]);

        let inventarioBase = inventarioSucursal.length ? inventarioSucursal : cargarInventarioDesdeCache();
        if (navigator.onLine) {
            try {
                inventarioBase = await cargarInventarioSucursalActualizado();
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
        if (productosAgregandoRef.current.has(p.id)) return;
        productosAgregandoRef.current.add(p.id);
        setTimeout(() => productosAgregandoRef.current.delete(p.id), 500);
        const ex = carrito.find(i => i.id === p.id);
        const validaStock = !p.esTemporal && productoImportaStock(p);
        if (validaStock && Number(p.cantidad) <= 0) return alert("Producto sin stock disponible");
        if (ex && validaStock && ex.cantidadVenta >= Number(p.cantidad)) return alert("No hay mas stock disponible");
        if (ex) setCarrito(carrito.map(i => i.id === p.id ? { ...i, cantidadVenta: i.cantidadVenta + 1 } : i));
        else setCarrito([...carrito, { ...p, cantidadVenta: 1, descuento: 0, motivoDescuento: '' }]);
        setBusqueda(''); setProductos([]); enfocarBuscador();
    };

    const eliminarDelCarrito = (id) => {
        setCarrito(carrito.filter(item => item.id !== id));
    };

    const agregarTempAlCarrito = () => {
        if (procesandoTemporal) return;
        setProcesandoTemporal(true);
        agregarAlCarrito({ id: `TEMP-${Date.now()}`, descripcion: `(TEMP) ${tempNombre}`, precio: parseFloat(tempPrecio), esTemporal: true, cantidad: 999 });
        setTempNombre(''); setTempPrecio(''); setMostrarModalTemp(false);
        setTimeout(() => setProcesandoTemporal(false), 500);
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

    if (verificandoCaja) return <div className="pos-container items-center justify-center font-black italic text-[#1A2517]">SINCRONIZANDO...</div>;

    return (
        <div className="pos-container">
            {/* MODAL APERTURA */}
            {mostrarModalFondo && (
                <div className="modal-apertura-overlay">
                    <div className="modal-content-sm text-[#1A2517]">
                        <h2 className="text-3xl font-black italic uppercase">Apertura</h2>
                        <p className="text-[#8A8377] font-bold mb-8 uppercase text-[10px] tracking-widest">{sucursalNombre}</p>
                        <input type="number" className="w-full p-5 border-4 border-[#E5EEDC] rounded-[30px] text-5xl font-black text-center mb-8 outline-none" value={inputFondo} onChange={(e) => setInputFondo(e.target.value)} autoFocus />
                        <button onClick={abrirCaja} disabled={procesandoCaja} className="btn-primary w-full py-6 text-2xl rounded-[30px] disabled:opacity-50">{procesandoCaja ? 'Abriendo...' : 'Abrir Turno'}</button>
                    </div>
                </div>
            )}

            <div className="pos-main-panel">
                <header className="pos-header text-[#1A2517]">
                    <div>
                        <h2 className="text-2xl font-black text-[#1A2517] italic uppercase">{sucursalNombre}</h2>
                        {(modoOffline || ventasPendientes > 0) && (
                            <p className="text-[10px] font-black text-[#9A6B3F] uppercase">
                                Modo offline {ventasPendientes > 0 ? `| ${ventasPendientes} venta(s) pendiente(s)` : ''}
                            </p>
                        )}
                    </div>
                    <div className="pos-header-actions">
                        <button onClick={() => setMostrarPendientes(true)} className="btn-icon-status relative" title="Pendientes">
                            <span aria-hidden="true">&#128276;</span>
                            <span className="hidden lg:inline">Pendientes</span>
                            {pendientesSucursal.length > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1 rounded-full bg-[#9A3B30] text-white text-[10px] font-black flex items-center justify-center border-2 border-[#FFFDF7]">
                                    {pendientesSucursal.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setMostrarModalMov(true)} className="btn-dark">💸 Efectivo</button>
                        <button onClick={() => auth.signOut()} className="text-[#8A8377] font-bold text-xs uppercase">Salir</button>
                    </div>
                </header>
                <div className="pos-action-bar">
                    <div className="pos-action-group">
                        <button onClick={() => setMostrarModalTemp(true)} className="btn-orange pos-action-button">➕ Temporal</button>
                        <button onClick={consultarCorteCompleto} className="btn-primary pos-action-button">📊 Corte</button>
                    </div>
                    <div className="pos-action-group">
                        <button onClick={obtenerInventarioSucursal} className="btn-dark pos-action-button">{cargandoInventario ? 'Cargando...' : 'Ver inventario'}</button>
                        <button
                            onClick={toggleAsistenteVoz}
                            disabled={!vozDisponible}
                            className={`${escuchandoVoz ? 'btn-orange' : 'btn-dark'} pos-action-button disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            {escuchandoVoz ? 'Escuchando voz' : 'Asistente voz'}
                        </button>
                    </div>
                </div>
                {(escuchandoVoz || resultadoAsistente || !vozDisponible) && (
                    <div className="bg-[#FFFDF7] border border-[#E5EEDC] rounded-2xl shadow-sm p-4 mb-6 text-[#1A2517]">
                        <p className="text-[10px] font-black text-[#576238] uppercase tracking-widest">Asistente Sellix</p>
                        <p className="text-sm font-bold mt-1">{mensajeAsistente}</p>
                        {resultadoAsistente?.encontrado && (
                            <div className="mt-3 text-xs font-black uppercase text-[#8A8377]">
                                {(resultadoAsistente.productos || []).length > 1 ? (
                                    <div className="space-y-2">
                                        {resultadoAsistente.productos.map(producto => (
                                            <div key={producto.id} className="flex justify-between gap-3">
                                                <span>{producto.descripcion}</span>
                                                <span className="text-[#576238] shrink-0">{producto.stock} PZ</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <p>{resultadoAsistente.descripcion}</p>
                                        <p>Stock: {resultadoAsistente.stock} | Codigo: {resultadoAsistente.codigo} | Precio: {moneda.format(resultadoAsistente.precio)}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <form onSubmit={buscarProducto} className="mb-6">
                    <input ref={inputBusqueda} type="text" className="input-pos" placeholder={recomendaciones.busquedaVenta} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </form>
                <div className="space-y-3">
                    {productos.map(p => (
                        <div key={p.id} className="product-card text-[#1A2517]">
                            <div className="flex-1 pr-4">
                                <p className="font-bold uppercase text-sm">{p.descripcion}</p>
                                <p className="text-[10px] text-[#8A8377] font-black uppercase">
                                    {productoImportaStock(p) ? `Stock: ${p.cantidad ?? 0} | ` : ''}Codigo: {p.codigos?.[0] || 'N/A'}
                                </p>
                                <p className="text-lg font-black text-[#576238]">{moneda.format(Number(p.precio) || 0)}</p>
                            </div>
                            <button onClick={() => agregarAlCarrito(p)} className="btn-primary">Agregar</button>
                        </div>
                    ))}
                    {busqueda && productos.length === 0 && (
                        <div className="text-center py-10 text-[#B8AD9D] font-black uppercase italic">
                            Sin resultados
                        </div>
                    )}
                </div>
            </div>

            <div className="pos-sidebar">
                <h3 className="text-2xl font-black italic uppercase mb-6 tracking-tighter text-[#1A2517]">🛒 Venta Actual</h3>
                <div className="flex-1 overflow-y-auto space-y-4 text-[#3E4635]">
                    {carrito.map(item => (
                        <div key={item.id} className="ticket-item">
                            <div className="flex-1">
                                <p className="font-bold uppercase text-xs">{item.descripcion}</p>
                                <p className="text-[10px] text-[#8A8377]">{item.cantidadVenta} x {moneda.format(Number(item.precio) || 0)}</p>
                                {Number(item.descuento) > 0 && (
                                    <p className="text-[10px] text-[#9A3B30] font-black uppercase">
                                        Desc: -{moneda.format(Number(item.descuento) || 0)} | {item.motivoDescuento}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="font-black text-[#1A2517]">{moneda.format(subtotalProducto(item))}</p>
                                    <button onClick={() => abrirDescuento(item)} className="text-[9px] font-black text-[#9A6B3F] uppercase">Descuento</button>
                                    {Number(item.descuento) > 0 && (
                                        <button onClick={() => quitarDescuento(item.id)} className="block text-[9px] font-black text-[#8A8377] uppercase">Quitar</button>
                                    )}
                                </div>
                                <button onClick={() => eliminarDelCarrito(item.id)} className="btn-remove">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t-4 border-double">
                    <p className="text-4xl font-black text-[#576238] mb-6 text-center">{moneda.format(totalCarrito)}</p>
                    <button onClick={abrirConfirmacionVenta} disabled={carrito.length === 0 || procesandoVenta} className="btn-green w-full uppercase">
                        {procesandoVenta ? "Procesando..." : "Cobrar"}
                    </button>
                </div>
            </div>

            {/* MODAL CORTE */}
            {mostrarCorte && (
                <div className="modal-overlay">
                    <div className="modal-content text-[#1A2517]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic">Resumen Diario</h3>
                            <button onClick={() => { setMostrarCorte(false); setVerDetallesCorte(false); }} className="text-3xl">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                            <div className="p-4 bg-[#F8F5EC] rounded-2xl"><p className="text-[10px] font-black text-[#8A8377] uppercase">Fondo</p><p className="text-xl font-black">${Number(fondoInicial).toFixed(2)}</p></div>
                            <div className="p-4 bg-[#E5EEDC] rounded-2xl text-[#1A2517]"><p className="text-[10px] font-black uppercase">Ventas</p><p className="text-xl font-black">${totalVentas.toFixed(2)}</p></div>
                            <div className="p-4 bg-[#F4E6E1] rounded-2xl text-[#7E2F28]"><p className="text-[10px] font-black uppercase">Salidas</p><p className="text-xl font-black">${totalSalidas.toFixed(2)}</p></div>
                            <div className="p-4 bg-[#1A2517] rounded-2xl text-white"><p className="text-[10px] font-black uppercase font-black">Caja Esperada</p><p className="text-xl font-black">${netoCaja.toFixed(2)}</p></div>
                        </div>
                        <div className="bg-[#F8F5EC] border border-[#E3D9C8] rounded-2xl p-4 mb-5">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                                <div>
                                    <label className="text-[10px] font-black text-[#8A8377] uppercase ml-2">Efectivo real entregado</label>
                                    <input
                                        type="number"
                                        className="input-modal !mb-0 bg-[#FFFDF7]"
                                        placeholder="Monto fisico contado"
                                        value={efectivoReal}
                                        onChange={(e) => setEfectivoReal(e.target.value)}
                                    />
                                </div>
                                <button onClick={registrarCierreCaja} disabled={procesandoCierreCaja} className="btn-primary py-4 disabled:opacity-50">
                                    {procesandoCierreCaja ? 'Guardando...' : cierreCaja ? 'Actualizar cierre' : 'Cerrar caja'}
                                </button>
                            </div>
                            {(efectivoReal || cierreCaja) && (
                                <div className={`mt-3 rounded-2xl p-3 text-center font-black uppercase ${diferenciaCaja < 0 ? 'bg-[#F4E6E1] text-[#9A3B30]' : diferenciaCaja > 0 ? 'bg-[#EFE2B8] text-[#9A6B3F]' : 'bg-[#E5EEDC] text-[#1A2517]'}`}>
                                    {diferenciaCaja < 0 ? 'Faltante' : diferenciaCaja > 0 ? 'Sobrante' : 'Cuadre exacto'}: {moneda.format(Math.abs(diferenciaCaja))}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setVerDetallesCorte(!verDetallesCorte)} className="btn-dark flex-1">👁️ Detalles</button>
                            <button onClick={descargarPDFCorteDetallado} className="btn-primary flex-1">📄 PDF Auditoría</button>
                        </div>
                        {verDetallesCorte && (
                            <div className="flex-1 overflow-y-auto space-y-4 italic text-sm">
                                {ventasHoy.map((v, i) => (
                                    <div key={i} className="border-b pb-1 mb-2">
                                        <div className="flex justify-between text-[10px] font-black text-[#8A8377]">
                                            <span>{v.fecha?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="uppercase text-[#576238]">Vendedor: {v.nombreEmpleado || 'N/A'}</span>
                                        </div>
                                        {v.productos.map((p, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between">
                                                    <span>{p.cantidadVenta}x {p.descripcion}</span>
                                                    <span className="font-bold">{moneda.format(Number(p.subtotal) || ((Number(p.precio) || 0) * (Number(p.cantidadVenta) || 0)))}</span>
                                                </div>
                                                {Number(p.descuento) > 0 && (
                                                    <div className="text-[10px] text-[#9A3B30] font-black uppercase">
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
                    <div className="modal-content-sm text-[#1A2517] relative">
                        <button
                            onClick={() => setMostrarModalMov(false)}
                            className="btn-close-modal"
                        >✕</button>
                        <h3 className="text-2xl font-black mb-6 italic uppercase text-center">Movimiento Efectivo</h3>
                        <div className="flex gap-2 mb-6 bg-[#F0EADC] p-1 rounded-2xl">
                            <button onClick={() => setMovTipo('entrada')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'entrada' ? 'bg-[#576238] text-white shadow-md' : 'text-[#8A8377]'}`}>ENTRADA</button>
                            <button onClick={() => setMovTipo('salida')} className={`flex-1 py-3 rounded-xl font-black text-xs ${movTipo === 'salida' ? 'bg-[#9A3B30] text-white shadow-md' : 'text-[#8A8377]'}`}>SALIDA</button>
                        </div>
                        <input type="number" placeholder="Monto $" className="input-modal" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} />
                        <input type="text" placeholder="Motivo..." className="input-modal" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} />
                        <button onClick={registrarMovimiento} disabled={procesandoMovimiento} className="btn-dark w-full py-4 rounded-2xl disabled:opacity-50">{procesandoMovimiento ? 'Registrando...' : 'Registrar'}</button>
                    </div>
                </div>
            )}

            {mostrarPendientes && (
                <div className="modal-overlay">
                    <div className="modal-content text-[#1A2517]">
                        <div className="flex justify-between items-start gap-4 mb-6">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic">Pendientes</h3>
                                <p className="text-[10px] font-black text-[#8A8377] uppercase">{sucursalNombre}</p>
                            </div>
                            <button onClick={() => setMostrarPendientes(false)} className="text-3xl font-black text-[#1A2517]">X</button>
                        </div>

                        <div className="bg-[#F8F5EC] border border-[#E3D9C8] rounded-2xl p-4 mb-5">
                            <div className={`grid grid-cols-1 ${negocioPermiteTecnicos ? 'md:grid-cols-2' : ''} gap-3 mb-3`}>
                                <button
                                    type="button"
                                    onClick={() => setTipoPendiente('general')}
                                    className={`rounded-2xl py-3 text-xs font-black uppercase ${tipoPendiente === 'general' ? 'bg-[#1A2517] text-white' : 'bg-[#F0EADC] text-[#67625C]'}`}
                                >
                                    Pendiente general
                                </button>
                                {negocioPermiteTecnicos && (
                                    <button
                                        type="button"
                                        onClick={() => setTipoPendiente('celular_por_venir')}
                                        className={`rounded-2xl py-3 text-xs font-black uppercase ${tipoPendiente === 'celular_por_venir' ? 'bg-[#576238] text-white' : 'bg-[#F0EADC] text-[#67625C]'}`}
                                    >
                                        Celular por venir
                                    </button>
                                )}
                            </div>
                            <textarea
                                className="w-full min-h-28 p-4 rounded-2xl border-2 border-[#FFFDF7] outline-none focus:border-[#576238] font-bold resize-none"
                                placeholder="Escribe que queda pendiente para el siguiente turno..."
                                value={nuevaNotaPendiente}
                                onChange={(e) => setNuevaNotaPendiente(e.target.value)}
                            />
                            <button onClick={agregarPendienteSucursal} disabled={procesandoPendiente} className="btn-primary mt-3 w-full disabled:opacity-50">
                                {procesandoPendiente ? 'Guardando...' : 'Agregar nota'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3">
                            {pendientesSucursal.map(item => (
                                <div key={item.id} className="bg-[#FFFDF7] border border-[#E3D9C8] rounded-2xl p-4 shadow-sm">
                                    <div className="flex justify-between gap-4">
                                        <div className="flex-1">
                                            <span className={`inline-flex mb-2 rounded-full px-3 py-1 text-[9px] font-black uppercase ${item.tipo === 'celular_por_venir' ? 'bg-[#E5EEDC] text-[#1A2517]' : 'bg-[#F0EADC] text-[#67625C]'}`}>
                                                {item.tipoLabel || (item.tipo === 'celular_por_venir' ? 'Celular por venir' : 'General')}
                                            </span>
                                            <p className="text-sm font-black text-[#1A2517] whitespace-pre-wrap">{item.nota}</p>
                                            <p className="text-[10px] font-black text-[#8A8377] uppercase mt-3">
                                                {item.creadoPorNombre || 'Empleado'} | {formatearFechaPendiente(item.fecha)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => completarPendienteSucursal(item.id)}
                                            disabled={pendienteCompletandoId === item.id}
                                            className="btn-green self-start disabled:opacity-50"
                                        >
                                            {pendienteCompletandoId === item.id ? '...' : 'Hecho'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {pendientesSucursal.length === 0 && (
                                <div className="text-center py-12 text-[#B8AD9D] font-black uppercase italic">
                                    No hay pendientes para esta sucursal
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {mostrarInventario && (
                <div className="modal-overlay">
                    <div className="modal-content text-[#1A2517]">
                        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic">Inventario de Sucursal</h3>
                                <p className="text-[10px] font-black text-[#8A8377] uppercase">{sucursalNombre}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button onClick={exportarInventarioExcel} className="btn-primary">Descargar Excel</button>
                                    <button
                                        type="button"
                                        onClick={() => setModoComprobarInventario(prev => !prev)}
                                        className={modoComprobarInventario ? 'btn-green !py-2 !text-xs !rounded-xl' : 'btn-dark'}
                                    >
                                        {modoComprobarInventario ? 'Vista normal' : 'Comprobar'}
                                    </button>
                                    {modoComprobarInventario && (
                                        <button type="button" onClick={descargarComprobacionInventarioPDF} className="btn-primary">
                                            Descargar comprobacion
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setMostrarInventario(false)} className="text-3xl font-black text-[#1A2517]">X</button>
                        </div>
                        {modoComprobarInventario && (
                            <div className="mb-4 rounded-2xl border border-[#D8C7B5] bg-[#F8F5EC] p-4">
                                <label className="mb-2 block text-[10px] font-black uppercase text-[#8A8377]">Buscar producto para auditoria</label>
                                <input
                                    type="text"
                                    className="w-full rounded-2xl border-2 border-[#FFFDF7] bg-[#FFFDF7] p-4 font-black outline-none focus:border-[#576238]"
                                    placeholder={recomendaciones.busquedaInventario}
                                    value={busquedaComprobarInventario}
                                    onChange={(e) => setBusquedaComprobarInventario(e.target.value)}
                                />
                            </div>
                        )}
                        <div className={modoComprobarInventario ? 'flex-1 overflow-y-auto' : 'flex-1 overflow-y-auto space-y-3'}>
                            {modoComprobarInventario ? (
                                <div className="overflow-x-auto rounded-2xl border border-[#D8C7B5] bg-[#FFFDF7]">
                                    <table className="w-full min-w-[820px] text-left">
                                        <thead className="bg-[#F0EADC]">
                                            <tr>
                                                <th className="p-3 text-[10px] font-black uppercase text-[#8A8377]">Codigo</th>
                                                <th className="p-3 text-[10px] font-black uppercase text-[#8A8377]">Producto</th>
                                                <th className="p-3 text-[10px] font-black uppercase text-[#8A8377] text-right">Precio</th>
                                                <th className="p-3 text-[10px] font-black uppercase text-[#8A8377] text-center">Inventario</th>
                                                <th className="p-3 text-[10px] font-black uppercase text-[#8A8377] text-center">Existencia real</th>
                                                <th className="p-3 text-[10px] font-black uppercase text-[#8A8377]">Resultado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F0EADC]">
                                            {obtenerInventarioComprobacion().map(item => {
                                                const diferencia = calcularDiferenciaInventario(item);
                                                return (
                                                    <tr key={item.id} className="hover:bg-[#E5EEDC]/20">
                                                        <td className="p-3 align-top text-xs font-black text-[#67625C]">{item.codigos?.[0] || 'N/A'}</td>
                                                        <td className="p-3 align-top">
                                                            <p className="text-sm font-black uppercase text-[#1A2517]">{item.descripcion}</p>
                                                            <p className="text-[10px] font-black uppercase text-[#8A8377]">
                                                                {item.marcaNombre || item.marca || 'N/A'} | {item.modelo || 'N/A'}
                                                            </p>
                                                        </td>
                                                        <td className="p-3 align-top text-right text-sm font-black text-[#576238]">{moneda.format(Number(item.precio) || 0)}</td>
                                                        <td className="p-3 align-top text-center">
                                                            <span className="inline-flex min-w-14 justify-center rounded-xl bg-[#E5EEDC] px-3 py-2 text-sm font-black text-[#1A2517]">
                                                                {item.cantidad ?? 0}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 align-top text-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-24 rounded-xl border-2 border-[#D8C7B5] bg-[#FFFDF7] p-2 text-center font-black outline-none focus:border-[#576238]"
                                                                value={existenciasReales[item.id] ?? ''}
                                                                onChange={(e) => setExistenciasReales(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className={`p-3 align-middle ${diferencia === null ? 'bg-[#F8F5EC]' : diferencia === 0 ? 'bg-[#E5F2DF]' : diferencia < 0 ? 'bg-[#F8DEDA]' : 'bg-[#FFF1C9]'}`}>
                                                            <span className={`inline-flex rounded-xl px-3 py-2 text-xs font-black uppercase ${diferencia === null ? 'text-[#67625C]' : diferencia === 0 ? 'text-[#31552B]' : diferencia < 0 ? 'text-[#9A3B30]' : 'text-[#8A6426]'}`}>
                                                                {describirDiferenciaInventario(diferencia)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {obtenerInventarioComprobacion().length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="p-12 text-center text-[#B8AD9D] font-black uppercase italic">
                                                        Sin productos para comprobar
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : inventarioSucursal.map(item => (
                                <div key={item.id} className="product-card text-[#1A2517]">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black uppercase text-sm">{item.descripcion}</p>
                                        {productoImportaStock(item) ? (
                                            <p className="text-[10px] text-[#8A8377] font-black uppercase">
                                                Codigo: {item.codigos?.[0] || 'N/A'} | Stock: {item.cantidad ?? 0}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-[#8A8377] font-black uppercase">
                                                Codigo: {item.codigos?.[0] || 'N/A'}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-[#8A8377] font-black uppercase">
                                            Marca: {item.marcaNombre || item.marca || 'N/A'} | Modelo: {item.modelo || 'N/A'}
                                        </p>
                                        <p className="text-[10px] text-[#8A8377] font-black uppercase">
                                            Categoria: {item.categoriaNombre || item.categoria || 'N/A'} | Colores: {item.colores?.join(', ') || 'N/A'}
                                        </p>
                                        <p className="text-lg font-black text-[#576238]">{moneda.format(Number(item.precio) || 0)}</p>
                                    </div>
                                </div>
                            ))}
                            {!modoComprobarInventario && inventarioSucursal.length === 0 && (
                                <div className="text-center py-12 text-[#B8AD9D] font-black uppercase italic">
                                    Sin inventario en esta sucursal
                                </div>
                            )}
                            {modoComprobarInventario && inventarioSucursal.length > 0 && (
                                <div className="mt-4 rounded-2xl bg-[#F8F5EC] p-4 text-[10px] font-black uppercase text-[#8A8377]">
                                    Captura la existencia fisica real. Sellix calcula faltantes o sobrantes contra el inventario registrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalDescuento && productoDescuento && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-[#1A2517] relative">
                        <button onClick={() => setMostrarModalDescuento(false)} className="btn-close-modal">âœ•</button>
                        <h3 className="text-2xl font-black mb-2 italic uppercase text-center">Descuento</h3>
                        <p className="text-[10px] text-[#8A8377] font-black uppercase mb-6">{productoDescuento.descripcion}</p>
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
                    <div className="modal-content-sm text-[#1A2517]">
                        <h3 className="text-2xl font-black mb-6 italic uppercase">Venta Manual</h3>
                        <input type="text" placeholder="¿Qué es?" className="input-modal" value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} />
                        <input type="number" placeholder="Precio $" className="input-modal" value={tempPrecio} onChange={(e) => setTempPrecio(e.target.value)} />
                        <button onClick={agregarTempAlCarrito} disabled={procesandoTemporal} className="btn-orange w-full py-4 rounded-xl mb-2 disabled:opacity-50">{procesandoTemporal ? 'Añadiendo...' : 'Añadir'}</button>
                        <button onClick={() => setMostrarModalTemp(false)} className="text-xs font-bold text-[#8A8377] uppercase">Cerrar</button>
                    </div>
                </div>
            )}

            {mostrarConfirmacionVenta && (
                <div className="modal-overlay">
                    <div className="modal-content-sm text-[#1A2517]">
                        <h3 className="text-2xl font-black mb-3 italic uppercase">Confirmar compra</h3>
                        <p className="text-[#8A8377] text-xs font-bold uppercase mb-6">
                            Revisa la venta antes de registrarla. Si cancelas, los productos se quedan en venta actual.
                        </p>
                        <div className="bg-[#F8F5EC] rounded-2xl p-4 mb-6">
                            <p className="text-[10px] font-black uppercase text-[#8A8377]">Total a cobrar</p>
                            <p className="text-4xl font-black text-[#576238]">{moneda.format(totalCarrito)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={cancelarConfirmacionVenta} disabled={procesandoVenta || procesandoImpresion} className="app-dialog-cancel">
                                Cancelar venta
                            </button>
                            <button onClick={confirmarVentaEImprimir} disabled={procesandoVenta || procesandoImpresion} className="app-dialog-confirm">
                                {procesandoVenta || procesandoImpresion ? 'Procesando...' : 'Confirmar compra'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {ticketActual && (
                <div ref={ticketRef} className="print-ticket">
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
