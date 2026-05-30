import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const normalizarTexto = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
    veinte: 20
};

const AdminVoiceAssistant = () => {
    const [vozDisponible, setVozDisponible] = useState(false);
    const [escuchando, setEscuchando] = useState(false);
    const [mensaje, setMensaje] = useState('Asistente admin apagado');
    const [resultado, setResultado] = useState(null);

    const reconocimientoVoz = useRef(null);
    const asistenteEscuchando = useRef(false);
    const cacheDatos = useRef({ sucursales: [], inventario: [], actualizado: 0 });

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
        const numero = texto.match(/\d+/)?.[0];
        if (numero) return Number(numero);
        const palabra = texto.split(' ').find(token => palabrasNumero[token] !== undefined);
        return palabra ? palabrasNumero[palabra] : null;
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
            const { sucursales, inventario } = await obtenerDatos();
            const sucursal = detectarSucursal(consulta, sucursales);

            if (!sucursal) {
                const respuesta = 'No identifique la sucursal. Di el nombre de la sucursal en la consulta.';
                setMensaje(respuesta);
                setResultado(null);
                hablar(respuesta);
                return;
            }

            const esSinStock = /\b(sin stock|no hay stock|no tenemos stock|agotado|agotados|en cero|cero piezas)\b/.test(consulta);
            const umbral = esSinStock ? 1 : obtenerNumero(consulta) ?? 5;
            const productosSucursal = inventario.filter(item => item.sucursalId === sucursal.id);
            const productos = productosSucursal
                .filter(item => esSinStock ? (Number(item.cantidad) || 0) <= 0 : (Number(item.cantidad) || 0) < umbral)
                .sort((a, b) => (Number(a.cantidad) || 0) - (Number(b.cantidad) || 0) || (a.descripcion || '').localeCompare(b.descripcion || ''));

            const criterio = esSinStock ? 'sin stock' : `con menos de ${umbral} piezas`;
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
            <div className="bg-white border border-blue-100 rounded-2xl shadow-2xl p-4 text-gray-800">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Asistente Admin</p>
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
                    <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-black uppercase text-gray-400">
                            {resultado.sucursal} | {resultado.criterio}
                        </p>
                        <div className="max-h-40 overflow-y-auto mt-2 space-y-2">
                            {resultado.productos.length === 0 ? (
                                <p className="text-xs font-bold text-green-600">Sin productos en alerta</p>
                            ) : resultado.productos.map(item => (
                                <div key={item.id} className="flex justify-between gap-3 text-xs">
                                    <span className="font-bold uppercase">{item.descripcion}</span>
                                    <span className="font-black text-red-500 shrink-0">{Number(item.cantidad) || 0} PZ</span>
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
