import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <div className="not-found-card">
                <div className="not-found-illustration" aria-hidden="true">
                    <svg viewBox="0 0 420 260" role="img">
                        <rect x="74" y="42" width="272" height="154" rx="24" fill="#FFFDF7" stroke="#1A2517" strokeWidth="8" />
                        <rect x="102" y="72" width="216" height="54" rx="12" fill="#E5EEDC" />
                        <path d="M130 162h160" stroke="#1A2517" strokeWidth="10" strokeLinecap="round" />
                        <path d="M150 190h120" stroke="#576238" strokeWidth="8" strokeLinecap="round" />
                        <circle cx="142" cy="99" r="10" fill="#1A2517" />
                        <circle cx="278" cy="99" r="10" fill="#1A2517" />
                        <path d="M178 102c18 18 46 18 64 0" stroke="#576238" strokeWidth="7" fill="none" strokeLinecap="round" />
                        <path d="M92 214h236" stroke="#D8C7B5" strokeWidth="9" strokeLinecap="round" />
                        <path d="M52 238h316" stroke="#ACC8A2" strokeWidth="7" strokeLinecap="round" />
                    </svg>
                </div>
                <p className="not-found-kicker">Ruta no encontrada</p>
                <h1>Ticket perdido en caja 404</h1>
                <p className="not-found-copy">
                    Esta pantalla no existe o el enlace se fue a una sucursal equivocada. Regresa al inicio para continuar operando Sellix.
                </p>
                <button onClick={() => navigate('/')} className="btn-primary not-found-button">
                    Volver al inicio
                </button>
            </div>
        </div>
    );
};

export default NotFound;
