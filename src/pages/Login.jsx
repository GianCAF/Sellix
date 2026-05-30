import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // La función debe ser async para poder usar await dentro
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Intentar login en Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Buscar el perfil en Firestore por UID
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // 3. Redirigir según el rol
                if (userData.rol === 'admin') {
                    navigate('/admin');
                } else if (userData.rol === 'empleado') {
                    navigate('/venta');
                } else {
                    setError("Rol no reconocido en el sistema.");
                }
            } else {
                setError("No se encontró un perfil de Firestore vinculado a este usuario.");
            }
        } catch (err) {
            console.error("Error en login:", err.code);
            // Manejo de errores específicos de Firebase
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("Correo o contraseña incorrectos.");
            } else if (err.code === 'auth/invalid-email') {
                setError("El formato del correo no es válido.");
            } else {
                setError("Error al conectar con el servidor. Revisa tu conexión.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h2 className="login-title">POS Multi-Sedes</h2>
                    <p className="login-subtitle">Panel de acceso</p>
                </div>

                <form onSubmit={handleSubmit} className="form-stack">
                    {error && (
                        <div className="login-error">
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="form-label">
                            Correo Institucional
                        </label>
                        <input
                            type="email"
                            required
                            className="login-input"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="form-label">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            className="login-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`login-submit ${loading ? 'login-submit-loading' : 'login-submit-active'
                            }`}
                    >
                        {loading ? 'Validando...' : 'Entrar al Sistema'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="app-footer-note">
                        Punto de Venta PWA - v1.0 2026
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
