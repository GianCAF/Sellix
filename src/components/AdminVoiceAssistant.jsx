import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

const normalizarTexto = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizarBusqueda = (texto) => normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const formatearPesos = (monto) => `${Number(monto || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} pesos`;
const ADMIN_VOICE_GUIDE_STORAGE_KEY = 'sellix_admin_voice_guide';

const crearMensajeGuia = (guia) => guia ? `${guia.titulo}: ${guia.pasos.join(' ')}` : '';

const cargarGuiaPersistida = () => {
    try {
        return JSON.parse(sessionStorage.getItem(ADMIN_VOICE_GUIDE_STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
};

const guardarGuiaPersistida = (resultado, guia) => {
    try {
        sessionStorage.setItem(ADMIN_VOICE_GUIDE_STORAGE_KEY, JSON.stringify({ resultado, guia }));
    } catch {
        // No bloquea el asistente si el navegador no permite sessionStorage.
    }
};

const limpiarGuiaPersistida = () => {
    try {
        sessionStorage.removeItem(ADMIN_VOICE_GUIDE_STORAGE_KEY);
    } catch {
        // No bloquea el asistente si el navegador no permite sessionStorage.
    }
};

const GUIAS_ADMIN = {
    agregarProducto: {
        titulo: 'Agregar producto nuevo',
        activadores: [
            /\b(como|cómo).*\b(agrego|agregar|registro|registrar|crear|creo|doy de alta).*\b(producto|mercancia|articulo)\b/,
            /\b(producto|mercancia|articulo).*\b(nuevo|nueva)\b/
        ],
        pasos: [
            'Revisa si el producto ya existe en el catalogo maestro.',
            'Revisa si la categoría ya existe. Por ejemplo, Audifonos.',
            'Revisa si la subcategoria ya existe. Por ejemplo, Diadema, Bluetooth o Tipo C.',
            'Revisa si la marca ya esta registrada en Marcas.',
            'Ve a Inventario.',
            'Selecciona categoría, subcategoria y marca.',
            'Agrega modelo si aplica y descripcion si hace falta.',
            'Indica los colores disponibles del producto.',
            'Escanea el codigo de barras. Si tiene varios codigos, da clic en Anadir codigo.',
            'Asigna el precio de venta.',
            'Da clic en Registrar.',
            'Despues ve a Ver Stock.',
            'Selecciona la sucursal donde llevaras producto.',
            'Da clic en Surtir Mercancia.',
            'Busca el producto que quieres surtir en la tienda seleccionada.',
            'Agrega cuantas piezas llevaras a la sucursal.',
            'Da clic en Agregar.',
            'Para verificar, vuelve a Ver Stock, selecciona la sucursal y confirma que el producto aparezca en su stock.'
        ]
    },
    surtirMercancia: {
        titulo: 'Surtir mercancia',
        activadores: [
            /\b(como|cómo).*\b(surto|surtir|agrego stock|agregar stock|llevo mercancia|llevar mercancia)\b/,
            /\b(surtir|stock).*\b(sucursal|tienda)\b/
        ],
        pasos: [
            'Ve a Ver Stock.',
            'Selecciona la sucursal que recibira la mercancia.',
            'Da clic en Surtir Mercancia.',
            'Busca el producto en el catalogo.',
            'Escribe cuantas piezas llevaras a esa sucursal.',
            'Da clic en Agregar.',
            'Verifica que el producto aparezca con el stock actualizado en esa sucursal.'
        ]
    },
    crearCategoriaMarca: {
        titulo: 'Preparar categoria, subcategoria o marca',
        activadores: [
            /\b(como|cómo).*\b(agrego|crear|creo|registro|registrar).*\b(categoria|subcategoria|marca)\b/,
            /\b(categoria|subcategoria|marca).*\b(nueva|nuevo|registrar|crear)\b/
        ],
        pasos: [
            'Antes de crear un producto, revisa si ya existe la categoría, subcategoria o marca.',
            'Si falta una categoría o subcategoria, entra a Categorias y registrala.',
            'Si falta la marca, entra a Marcas y registrala.',
            'Despues vuelve a Inventario para crear el producto usando esos datos.'
        ]
    },
    despuesDeCategoria: {
        titulo: 'Despues de crear categoría',
        activadores: [
            /\b(ya|listo).*\b(cree|registre|hice|agregue).*\b(categoria)\b.*\b(ahora|sigue|siguiente|hago)\b/,
            /\b(categoria).*\b(lista|creada|registrada)\b.*\b(ahora|sigue|hago)\b/
        ],
        pasos: [
            'Ahora crea la subcategoria del producto si todavia no existe.',
            'Si ya creaste la subcategoria, ve a Marcas.',
            'Verifica que ya exista la marca del producto.',
            'Si la marca no existe, agregala en Marcas.',
            'Cuando categoría, subcategoria y marca esten listas, vuelve a Inventario para registrar el producto.'
        ]
    },
    despuesDeMarca: {
        titulo: 'Despues de verificar marca',
        activadores: [
            /\b(ya|listo).*\b(agregue|registre|existe|existia|cree|verifique).*\b(marca)\b/,
            /\b(marca).*\b(lista|registrada|existia|existe)\b.*\b(ahora|sigue|hago)\b/
        ],
        pasos: [
            'Ahora entra a Inventario.',
            'Selecciona la categoría, subcategoria y marca del producto.',
            'Ingresa el modelo si aplica.',
            'Agrega la descripcion si hace falta.',
            'Indica que colores hay disponibles.',
            'Escanea el codigo de barras.',
            'Si el producto tiene mas de un codigo, selecciona Anadir codigo.',
            'Agrega el precio.',
            'Da clic en Registrar en catalogo.'
        ]
    },
    despuesDeInventario: {
        titulo: 'Agregar producto a sucursal',
        activadores: [
            /\b(ya|listo).*\b(registre|agregue|cree).*\b(inventario|catalogo|producto)\b.*\b(sucursal|tienda|stock|agrego|surto)\b/,
            /\b(como).*\b(agrego|surto|llevo).*\b(producto).*\b(sucursal|tienda|stock)\b/
        ],
        pasos: [
            'Ahora da clic en Ver Stock.',
            'Selecciona la tienda donde surtiras el producto.',
            'Da clic en Surtir Mercancia.',
            'Busca el producto que llevaras a la sucursal.',
            'Ingresa la cantidad de piezas.',
            'Da clic en Anadir.',
            'Verifica en Ver Stock que el producto aparezca en la sucursal con la cantidad correcta.'
        ]
    }
};

const palabrasNumero = {
    cero: 0,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    quince: 15,
    veinte: 20,
    cien: 100,
    ciento: 100,
    doscientos: 200,
    trescientos: 300,
    cuatrocientos: 400,
    quinientos: 500,
    seiscientos: 600,
    setecientos: 700,
    ochocientos: 800,
    novecientos: 900,
    mil: 1000
};

const AdminVoiceAssistant = () => {
    const guiaPersistida = cargarGuiaPersistida();
    const [vozDisponible, setVozDisponible] = useState(false);
    const [escuchando, setEscuchando] = useState(false);
    const [mensaje, setMensaje] = useState(guiaPersistida?.resultado?.tipo === 'guia' ? crearMensajeGuia(guiaPersistida.resultado) : 'Asistente admin apagado');
    const [resultado, setResultado] = useState(guiaPersistida?.resultado || null);

    const reconocimientoVoz = useRef(null);
    const asistenteEscuchando = useRef(false);
    const cacheDatos = useRef({ sucursales: [], inventario: [], actualizado: 0 });
    const cacheVentas = useRef({ key: '', ventas: [], actualizado: 0 });
    const ultimaGuia = useRef(guiaPersistida?.guia || (guiaPersistida?.resultado?.tipo === 'guia' ? {
        titulo: guiaPersistida.resultado.titulo,
        pasos: guiaPersistida.resultado.pasos
    } : null));

    useEffect(() => {
        if (resultado?.tipo === 'guia') {
            guardarGuiaPersistida(resultado, ultimaGuia.current || {
                titulo: resultado.titulo,
                pasos: resultado.pasos
            });
        } else if (resultado) {
            limpiarGuiaPersistida();
        }
    }, [resultado]);

    const hablar = (texto) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const voz = new SpeechSynthesisUtterance(texto);
        voz.lang = 'es-MX';
        voz.rate = 1;
        window.speechSynthesis.speak(voz);
    };

    const extraerConsulta = (texto) => {
        const limpio = normalizarTexto(texto);
        const activadores = ['sellix', 'selix', 'celix', 'zelix', 'celis', 'felix'];
        const coincidencia = activadores
            .map(palabra => ({ palabra, indice: limpio.indexOf(palabra) }))
            .filter(item => item.indice >= 0)
            .sort((a, b) => a.indice - b.indice)[0];

        if (!coincidencia) return null;
        return limpio.slice(coincidencia.indice + coincidencia.palabra.length).replace(/\s+/g, ' ').trim();
    };

    const obtenerDatos = async () => {
        const ahora = Date.now();
        const cacheVigente = cacheDatos.current.sucursales.length > 0 && ahora - cacheDatos.current.actualizado < 60000;
        if (cacheVigente) return cacheDatos.current;

        const [sSnap, iSnap] = await Promise.all([
            getDocs(collection(db, "sucursales")),
            getDocs(collection(db, "inventarios"))
        ]);

        const datos = {
            sucursales: sSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            inventario: iSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            actualizado: ahora
        };
        cacheDatos.current = datos;
        return datos;
    };

    const obtenerNumero = (texto) => {
        const numero = texto.match(/\d+(?:[.,]\d+)?/)?.[0];
        if (numero) return Number(numero.replace(',', '.'));
        const palabra = texto.split(' ').find(token => palabrasNumero[token] !== undefined);
        return palabra ? palabrasNumero[palabra] : null;
    };

    const obtenerMonto = (texto) => {
        const cantidad = texto.match(/\d[\d,]*(?:\.\d+)?/)?.[0];
        if (cantidad) return Number(cantidad.replace(/,/g, ''));
        return obtenerNumero(texto);
    };

    const fechaLocalISO = (fecha) => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const cerrarDia = (fecha) => {
        const fin = new Date(fecha);
        fin.setHours(23, 59, 59, 999);
        return fin;
    };

    const iniciarDia = (fecha) => {
        const inicio = new Date(fecha);
        inicio.setHours(0, 0, 0, 0);
        return inicio;
    };

    const detectarPeriodoVentas = (texto) => {
        const hoy = new Date();
        let inicio = iniciarDia(hoy);
        let fin = cerrarDia(hoy);
        let etiqueta = 'hoy';

        if (/\bayer\b/.test(texto)) {
            inicio = iniciarDia(hoy);
            inicio.setDate(inicio.getDate() - 1);
            fin = cerrarDia(inicio);
            etiqueta = 'ayer';
        } else if (/\b(esta semana|semana actual)\b/.test(texto)) {
            inicio = iniciarDia(hoy);
            const diaSemana = inicio.getDay() || 7;
            inicio.setDate(inicio.getDate() - diaSemana + 1);
            fin = cerrarDia(hoy);
            etiqueta = 'esta semana';
        } else if (/\b(mes pasado)\b/.test(texto)) {
            inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            fin = cerrarDia(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
            etiqueta = 'el mes pasado';
        } else if (/\b(este mes|mes actual|ultimo mes|último mes)\b/.test(texto)) {
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            fin = cerrarDia(hoy);
            etiqueta = 'este mes';
        } else if (/\b(este ano|este año|ano actual|año actual)\b/.test(texto)) {
            inicio = new Date(hoy.getFullYear(), 0, 1);
            fin = cerrarDia(hoy);
            etiqueta = 'este año';
        }

        return {
            inicio,
            fin,
            etiqueta,
            key: `${fechaLocalISO(inicio)}_${fechaLocalISO(fin)}`
        };
    };

    const obtenerVentasPeriodo = async (periodo) => {
        const ahora = Date.now();
        const cacheVigente = cacheVentas.current.key === periodo.key && ahora - cacheVentas.current.actualizado < 60000;
        if (cacheVigente) return cacheVentas.current.ventas;

        const ventasSnap = await getDocs(query(
            collection(db, "ventas"),
            where("fecha", ">=", periodo.inicio),
            where("fecha", "<=", periodo.fin)
        ));

        const ventas = ventasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheVentas.current = { key: periodo.key, ventas, actualizado: ahora };
        return ventas;
    };

    const obtenerResumenVentas = (sucursales, ventas) => {
        return sucursales
            .map(sucursal => ({
                sucursal,
                total: ventas
                    .filter(venta => venta.sucursalId === sucursal.id)
                    .reduce((acc, venta) => acc + (Number(venta.total) || 0), 0)
            }))
            .sort((a, b) => a.total - b.total);
    };

    const esConsultaVentas = (texto) => /\b(venta|ventas|vendido|vendio|vendieron|lleva vendido|facturo|ingreso|ingresos)\b/.test(texto);
    const esConsultaInventario = (texto) => /\b(inventario|stock|existencia|existencias|producto|productos|pieza|piezas|agotado|agotados|tenemos|hay)\b/.test(texto);
    const esConsultaProductosPocoVendidos = (texto) => /\b(producto|productos)\b/.test(texto)
        && /\b(venden|vendieron|vendido|ventas|venta)\b/.test(texto)
        && /\b(poco|poca|nada|menos|bajo|baja|lento|lentos|sin venta|sin ventas)\b/.test(texto);

    const obtenerGuiaAdmin = (consulta) => {
        return Object.values(GUIAS_ADMIN).find(guia => guia.activadores.some(regex => regex.test(consulta))) || null;
    };

    const responderGuiaAdmin = (guia) => {
        ultimaGuia.current = guia;
        const respuesta = `${guia.titulo}: ${guia.pasos.join(' ')}`;
        setMensaje(respuesta);
        setResultado({ tipo: 'guia', titulo: guia.titulo, pasos: guia.pasos });
        hablar(respuesta);
    };

    const repetirUltimaGuia = () => {
        if (!ultimaGuia.current) {
            const respuesta = 'lo siento, no puedo responder a eso';
            setMensaje(respuesta);
            setResultado(null);
            hablar(respuesta);
            return;
        }
        responderGuiaAdmin(ultimaGuia.current);
    };

    const obtenerPuntoDeGuia = (consulta) => {
        return consulta
            .replace(/\b(me quede|me quede en|voy en|estoy en|llegue a|ya hice|ya estoy en|me quede por)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const responderDesdePuntoGuia = (consulta) => {
        const guia = ultimaGuia.current || GUIAS_ADMIN.agregarProducto;
        const punto = obtenerPuntoDeGuia(consulta);
        const tokens = normalizarTexto(punto).split(' ').filter(token => token.length > 2);
        const indice = guia.pasos.findIndex(paso => {
            const pasoNormalizado = normalizarTexto(paso);
            return tokens.length > 0 && tokens.every(token => pasoNormalizado.includes(token));
        });

        const pasosRestantes = indice >= 0 ? guia.pasos.slice(indice + 1) : guia.pasos;
        if (pasosRestantes.length === 0) {
            const respuesta = 'Si ya completaste ese paso, solo verifica que el producto aparezca con el stock correcto.';
            setMensaje(respuesta);
            setResultado({ tipo: 'guia', titulo: guia.titulo, pasos: [respuesta] });
            hablar(respuesta);
            return;
        }

        const titulo = indice >= 0 ? `Despues de ${punto}` : guia.titulo;
        const respuesta = `${titulo}: ${pasosRestantes.join(' ')}`;
        ultimaGuia.current = { ...guia, titulo, pasos: pasosRestantes };
        setMensaje(respuesta);
        setResultado({ tipo: 'guia', titulo, pasos: pasosRestantes });
        hablar(respuesta);
    };

    const detectarSucursal = (texto, sucursales) => {
        const textoNormalizado = normalizarTexto(texto);
        return sucursales
            .map(sucursal => ({
                sucursal,
                nombre: normalizarTexto(sucursal.nombre),
                ubicacion: normalizarTexto(sucursal.ubicacion),
            }))
            .map(item => {
                const tokens = `${item.nombre} ${item.ubicacion}`
                    .split(' ')
                    .filter(token => token.length > 2 && !['sucursal', 'tienda', 'local'].includes(token));
                let puntaje = 0;
                if (item.nombre && textoNormalizado.includes(item.nombre)) puntaje += 100;
                if (item.ubicacion && textoNormalizado.includes(item.ubicacion)) puntaje += 80;
                puntaje += tokens.filter(token => textoNormalizado.includes(token)).length * 10;
                return { ...item, puntaje };
            })
            .filter(item => item.puntaje > 0)
            .sort((a, b) => b.puntaje - a.puntaje || b.nombre.length - a.nombre.length)[0]?.sucursal || null;
    };

    const resumirProductos = (productos) => {
        if (productos.length === 0) return '';
        return productos.map(p => `${p.descripcion} (${Number(p.cantidad) || 0} piezas)`).join(', ');
    };

    const obtenerVariantesToken = (token) => {
        const variantes = [token];
        if (token.endsWith('es') && token.length > 4) variantes.push(token.slice(0, -2));
        if (token.endsWith('s') && token.length > 3) variantes.push(token.slice(0, -1));
        if (!token.endsWith('s') && token.length > 2) variantes.push(`${token}s`);
        if (!token.endsWith('es') && token.length > 3) variantes.push(`${token}es`);
        return [...new Set(variantes)];
    };

    const textoProductoAdmin = (producto) => [
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
    ].map(normalizarBusqueda).join(' ');

    const tokenCoincide = (textoProducto, token) => {
        if (token.length === 1) return new RegExp(`(^|\\s)${token}($|\\s)`).test(textoProducto);
        return obtenerVariantesToken(token).some(variante => textoProducto.includes(variante));
    };

    const limpiarConsultaProductoSucursal = (consulta, sucursal) => {
        const tokensSucursal = normalizarBusqueda(`${sucursal.nombre || ''} ${sucursal.ubicacion || ''}`)
            .split(' ')
            .filter(token => token.length > 2);
        return normalizarBusqueda(consulta)
            .split(' ')
            .filter(token => ![
                'en', 'sucursal', 'tienda', 'local', 'hay', 'tienen', 'tenemos', 'existe',
                'producto', 'productos', 'la', 'el', 'un', 'una', 'de', 'del'
            ].includes(token))
            .filter(token => !tokensSucursal.includes(token))
            .join(' ')
            .trim();
    };

    const esConsultaExistenciaProducto = (consulta) => {
        return /\b(hay|tienen|tenemos|existe)\b/.test(consulta)
            && !/\b(menos|mayor|mas|más|bajo|baja|agotado|agotados|sin stock|cero|0 piezas|0 pieza)\b/.test(consulta);
    };

    const responderExistenciaProducto = (consulta, sucursal, inventario) => {
        const busquedaProducto = limpiarConsultaProductoSucursal(consulta, sucursal);
        const tokens = busquedaProducto.split(' ').filter(Boolean);

        if (tokens.length === 0) {
            const respuesta = 'lo siento, no puedo responder a eso';
            setMensaje(respuesta);
            setResultado(null);
            hablar(respuesta);
            return true;
        }

        const productos = inventario
            .filter(item => item.sucursalId === sucursal.id && (Number(item.cantidad) || 0) > 0)
            .map(item => ({ item, texto: textoProductoAdmin(item) }))
            .filter(({ texto }) => tokens.every(token => tokenCoincide(texto, token)))
            .map(({ item }) => item)
            .sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''));

        if (productos.length === 0) {
            const respuesta = `No, no hay ${busquedaProducto} en ${sucursal.nombre}.`;
            setMensaje(respuesta);
            setResultado({ sucursal: sucursal.nombre, criterio: `existencia de ${busquedaProducto}`, productos: [] });
            hablar(respuesta);
            return true;
        }

        const lista = productos.map(item => item.descripcion).join(', ');
        const respuesta = productos.length === 1
            ? `Si, hay ${lista} en ${sucursal.nombre}.`
            : `Si, hay ${productos.length} coincidencias en ${sucursal.nombre}: ${lista}.`;
        setMensaje(respuesta);
        setResultado({ sucursal: sucursal.nombre, criterio: `existencia de ${busquedaProducto}`, productos });
        hablar(respuesta);
        return true;
    };

    const responderConsultaVentas = async (consulta, sucursales) => {
        const periodo = detectarPeriodoVentas(consulta);
        const ventas = await obtenerVentasPeriodo(periodo);
        const resumen = obtenerResumenVentas(sucursales, ventas);
        const monto = obtenerMonto(consulta);
        const pideMenos = /\b(menos|menor|bajo|baja)\b/.test(consulta);
        const pideMas = /\b(mas|mayor|alto|alta)\b/.test(consulta);

        if (!pideMenos && !pideMas) {
            const respuesta = 'lo siento, no puedo responder a eso';
            setMensaje(respuesta);
            setResultado(null);
            hablar(respuesta);
            return;
        }

        if (monto !== null && (pideMenos || pideMas)) {
            const tiendas = resumen
                .filter(item => pideMenos ? item.total < monto : item.total > monto)
                .sort((a, b) => pideMenos ? a.total - b.total : b.total - a.total);
            const criterio = pideMenos ? `menos de ${formatearPesos(monto)}` : `mas de ${formatearPesos(monto)}`;

            if (tiendas.length === 0) {
                const respuesta = `Ninguna tienda vendio ${criterio} ${periodo.etiqueta}.`;
                setMensaje(respuesta);
                setResultado({ tipo: 'ventas', criterio: `${criterio} ${periodo.etiqueta}`, tiendas: [] });
                hablar(respuesta);
                return;
            }

            const lista = tiendas.map(item => `${item.sucursal.nombre} con ${formatearPesos(item.total)}`).join(', ');
            const respuesta = `Las tiendas que vendieron ${criterio} ${periodo.etiqueta} son: ${lista}.`;
            setMensaje(respuesta);
            setResultado({ tipo: 'ventas', criterio: `${criterio} ${periodo.etiqueta}`, tiendas });
            hablar(respuesta);
            return;
        }

        const tiendasConVenta = resumen.filter(item => item.total > 0);
        const base = pideMenos ? resumen : (tiendasConVenta.length > 0 ? tiendasConVenta : resumen);
        const ordenadas = pideMenos ? base : [...base].sort((a, b) => b.total - a.total);
        const totalReferencia = ordenadas[0]?.total;
        const tiendasEmpatadas = ordenadas.filter(item => item.total === totalReferencia);

        if (totalReferencia === undefined) {
            const respuesta = `No encontre ventas registradas ${periodo.etiqueta}.`;
            setMensaje(respuesta);
            setResultado({ tipo: 'ventas', criterio: periodo.etiqueta, tiendas: [] });
            hablar(respuesta);
            return;
        }

        const comparativo = pideMenos ? 'vendio menos' : 'vendio mas';
        const lista = tiendasEmpatadas.map(item => item.sucursal.nombre).join(', ');
        const respuesta = tiendasEmpatadas.length === 1
            ? `La tienda que ${comparativo} ${periodo.etiqueta} es ${lista}, con ${formatearPesos(totalReferencia)}.`
            : `Las tiendas que ${comparativo} ${periodo.etiqueta} son ${lista}, con ${formatearPesos(totalReferencia)} cada una.`;
        setMensaje(respuesta);
        setResultado({ tipo: 'ventas', criterio: `${comparativo} ${periodo.etiqueta}`, tiendas: tiendasEmpatadas });
        hablar(respuesta);
    };

    const responderProductosPocoVendidos = async (consulta, sucursales, inventario) => {
        const periodo = detectarPeriodoVentas(consulta);
        const ventas = await obtenerVentasPeriodo(periodo);
        const sucursal = detectarSucursal(consulta, sucursales);
        const umbral = /\b(sin venta|sin ventas|nada|cero|0)\b/.test(consulta) ? 0 : obtenerNumero(consulta) ?? 2;
        const ventasPeriodo = sucursal ? ventas.filter(v => v.sucursalId === sucursal.id) : ventas;
        const ventasPorProducto = {};

        ventasPeriodo.forEach(venta => {
            (venta.productos || []).forEach(prod => {
                const llave = `${venta.sucursalId || 'sin-sucursal'}_${prod.productoId || prod.id || prod.descripcion}`;
                if (!ventasPorProducto[llave]) ventasPorProducto[llave] = { cantidad: 0, total: 0 };
                ventasPorProducto[llave].cantidad += Number(prod.cantidadVenta) || 0;
                ventasPorProducto[llave].total += Number(prod.subtotal) || ((Number(prod.precio) || 0) * (Number(prod.cantidadVenta) || 0));
            });
        });

        const productos = inventario
            .filter(item => !sucursal || item.sucursalId === sucursal.id)
            .map(item => {
                const llave = `${item.sucursalId || 'sin-sucursal'}_${item.productoId || item.id || item.descripcion}`;
                const venta = ventasPorProducto[llave] || { cantidad: 0, total: 0 };
                const sucursalItem = sucursales.find(s => s.id === item.sucursalId);
                return {
                    ...item,
                    cantidad: venta.cantidad,
                    cantidadVendidaPeriodo: venta.cantidad,
                    totalVendidoPeriodo: venta.total,
                    sucursalNombre: sucursalItem?.nombre || item.sucursalNombre || 'Sucursal'
                };
            })
            .filter(item => item.cantidadVendidaPeriodo <= umbral)
            .sort((a, b) => a.cantidadVendidaPeriodo - b.cantidadVendidaPeriodo || (a.descripcion || '').localeCompare(b.descripcion || ''))
            .slice(0, 20);

        const criterio = umbral === 0 ? `sin ventas ${periodo.etiqueta}` : `con ${umbral} ventas o menos ${periodo.etiqueta}`;
        if (productos.length === 0) {
            const respuesta = sucursal
                ? `En ${sucursal.nombre} no encontre productos ${criterio}.`
                : `No encontre productos ${criterio}.`;
            setMensaje(respuesta);
            setResultado({ sucursal: sucursal?.nombre || 'Todas', criterio, productos: [] });
            hablar(respuesta);
            return;
        }

        const lista = productos.map(item => `${item.descripcion} en ${item.sucursalNombre}, ${item.cantidadVendidaPeriodo} piezas`).join(', ');
        const respuesta = sucursal
            ? `En ${sucursal.nombre} encontre ${productos.length} productos ${criterio}: ${lista}.`
            : `En todas las sucursales encontre ${productos.length} productos ${criterio}: ${lista}.`;
        setMensaje(respuesta);
        setResultado({ sucursal: sucursal?.nombre || 'Todas', criterio, productos });
        hablar(respuesta);
    };

    const procesarConsulta = async (texto) => {
        const consulta = extraerConsulta(texto);
        if (consulta === null) return;

        if (!consulta) {
            const respuesta = 'Te escucho. Preguntame por inventario de una sucursal.';
            setMensaje(respuesta);
            setResultado(null);
            hablar(respuesta);
            return;
        }

        setMensaje(`Consultando: ${consulta}`);

        try {
            if (/\b(repite|repetir|otra vez|vuelve a decir).*\b(instrucciones|pasos|guia|guía)\b/.test(consulta)) {
                repetirUltimaGuia();
                return;
            }

            if (/\b(me quede|voy en|estoy en|llegue a|ya hice|ya estoy en)\b/.test(consulta)) {
                responderDesdePuntoGuia(consulta);
                return;
            }

            const guia = obtenerGuiaAdmin(consulta);
            if (guia) {
                responderGuiaAdmin(guia);
                return;
            }

            const { sucursales, inventario } = await obtenerDatos();

            if (esConsultaProductosPocoVendidos(consulta)) {
                await responderProductosPocoVendidos(consulta, sucursales, inventario);
                return;
            }

            if (esConsultaVentas(consulta)) {
                await responderConsultaVentas(consulta, sucursales);
                return;
            }

            if (!esConsultaInventario(consulta)) {
                const respuesta = 'lo siento, no puedo responder a eso';
                setMensaje(respuesta);
                setResultado(null);
                hablar(respuesta);
                return;
            }

            const sucursal = detectarSucursal(consulta, sucursales);

            if (!sucursal) {
                const respuesta = 'lo siento, no puedo responder a eso';
                setMensaje(respuesta);
                setResultado(null);
                hablar(respuesta);
                return;
            }

            if (esConsultaExistenciaProducto(consulta) && responderExistenciaProducto(consulta, sucursal, inventario)) {
                return;
            }

            const numeroInventario = obtenerNumero(consulta);
            const esSinStock = /\b(sin stock|no hay stock|no tenemos stock|agotado|agotados|en cero|cero piezas|0 piezas|0 pieza)\b/.test(consulta) || numeroInventario === 0;
            const umbral = esSinStock ? 1 : numeroInventario ?? 5;
            const productosSucursal = inventario.filter(item => item.sucursalId === sucursal.id);
            const productos = productosSucursal
                .filter(item => esSinStock ? (Number(item.cantidad) || 0) <= 0 : (Number(item.cantidad) || 0) < umbral)
                .sort((a, b) => (Number(a.cantidad) || 0) - (Number(b.cantidad) || 0) || (a.descripcion || '').localeCompare(b.descripcion || ''));

            const criterio = esSinStock ? 'sin stock o 0 piezas' : `con menos de ${umbral} piezas`;
            if (productos.length === 0) {
                const respuesta = `En ${sucursal.nombre} no encontre productos ${criterio}.`;
                setMensaje(respuesta);
                setResultado({ sucursal: sucursal.nombre, criterio, productos: [] });
                hablar(respuesta);
                return;
            }

            const lista = resumirProductos(productos);
            const respuesta = `En ${sucursal.nombre} hay ${productos.length} producto${productos.length === 1 ? '' : 's'} ${criterio}: ${lista}.`;
            setMensaje(respuesta);
            setResultado({ sucursal: sucursal.nombre, criterio, productos });
            hablar(respuesta);
        } catch {
            const respuesta = 'No pude consultar inventario en este momento.';
            setMensaje(respuesta);
            setResultado(null);
            hablar(respuesta);
        }
    };

    const iniciarEscucha = () => {
        if (!reconocimientoVoz.current || asistenteEscuchando.current) return;
        try {
            asistenteEscuchando.current = true;
            reconocimientoVoz.current.start();
            setEscuchando(true);
            setMensaje('Escuchando admin. Di Sellix y tu consulta.');
        } catch {
            asistenteEscuchando.current = false;
            setEscuchando(false);
            setMensaje('No pude iniciar el microfono.');
        }
    };

    const detenerEscucha = () => {
        if (!reconocimientoVoz.current) return;
        asistenteEscuchando.current = false;
        reconocimientoVoz.current.stop();
        setEscuchando(false);
        setMensaje('Asistente admin apagado');
    };

    useEffect(() => {
        const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Reconocimiento) {
            setVozDisponible(false);
            setMensaje('Voz no disponible en este navegador');
            return;
        }

        const reconocimiento = new Reconocimiento();
        reconocimiento.lang = 'es-MX';
        reconocimiento.continuous = true;
        reconocimiento.interimResults = false;
        reconocimiento.maxAlternatives = 1;

        reconocimiento.onresult = (event) => {
            const ultimo = event.results[event.results.length - 1]?.[0]?.transcript || '';
            procesarConsulta(ultimo);
        };

        reconocimiento.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                asistenteEscuchando.current = false;
                setEscuchando(false);
                setMensaje('Permite el microfono para activar el asistente admin.');
                return;
            }
            setMensaje('No pude escuchar bien. Intentalo de nuevo.');
        };

        reconocimiento.onend = () => {
            if (!asistenteEscuchando.current) return;
            try {
                reconocimiento.start();
            } catch {
                asistenteEscuchando.current = false;
                setEscuchando(false);
            }
        };

        reconocimientoVoz.current = reconocimiento;
        setVozDisponible(true);
        const inicioAutomatico = setTimeout(() => iniciarEscucha(), 500);

        return () => {
            clearTimeout(inicioAutomatico);
            asistenteEscuchando.current = false;
            reconocimiento.stop();
        };
    }, []);

    const toggleEscucha = () => {
        if (!vozDisponible) return;
        if (asistenteEscuchando.current) detenerEscucha();
        else iniciarEscucha();
    };

    return (
        <div className="fixed bottom-5 right-5 z-[180] w-[min(360px,calc(100vw-40px))]">
            <div className="bg-[#FFFDF7] border border-[#D9E5D3] rounded-2xl shadow-2xl p-4 text-[#1A2517]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black text-[#576238] uppercase tracking-widest">Asistente Admin</p>
                        <p className="text-xs font-bold mt-1">{mensaje}</p>
                    </div>
                    <button
                        type="button"
                        onClick={toggleEscucha}
                        disabled={!vozDisponible}
                        className={`${escuchando ? 'btn-orange' : 'btn-dark'} shrink-0 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {escuchando ? 'On' : 'Off'}
                    </button>
                </div>

                {resultado && (
                    <div className="mt-3 border-t border-[#E3D9C8] pt-3">
                        <p className="text-[10px] font-black uppercase text-[#8A8377]">
                            {resultado.tipo === 'ventas' ? 'Ventas' : resultado.tipo === 'guia' ? 'Guia' : resultado.sucursal} | {resultado.tipo === 'guia' ? resultado.titulo : resultado.criterio}
                        </p>
                        <div className="max-h-40 overflow-y-auto mt-2 space-y-2">
                            {resultado.tipo === 'guia' && resultado.pasos.map((paso, index) => (
                                <div key={paso} className="flex gap-2 text-xs">
                                    <span className="font-black text-[#1A2517] shrink-0">{index + 1}.</span>
                                    <span className="font-bold text-[#67625C]">{paso}</span>
                                </div>
                            ))}
                            {resultado.tipo === 'ventas' && resultado.tiendas.length === 0 && (
                                <p className="text-xs font-bold text-[#576238]">Sin tiendas en este criterio</p>
                            )}
                            {resultado.tipo === 'ventas' && resultado.tiendas.map(item => (
                                <div key={item.sucursal.id} className="flex justify-between gap-3 text-xs">
                                    <span className="font-bold uppercase">{item.sucursal.nombre}</span>
                                    <span className="font-black text-[#1A2517] shrink-0">
                                        {item.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                    </span>
                                </div>
                            ))}
                            {resultado.tipo !== 'ventas' && resultado.tipo !== 'guia' && resultado.productos.length === 0 ? (
                                <p className="text-xs font-bold text-[#576238]">Sin productos en alerta</p>
                            ) : resultado.tipo !== 'ventas' && resultado.tipo !== 'guia' && resultado.productos.map(item => (
                                <div key={item.id} className="flex justify-between gap-3 text-xs">
                                    <span className="font-bold uppercase">{item.descripcion}</span>
                                    <span className="font-black text-[#9A3B30] shrink-0">{Number(item.cantidad) || 0} PZ</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminVoiceAssistant;
