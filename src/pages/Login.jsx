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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();

                if (userData.rol === 'admin') {
                    navigate('/admin');
                } else if (userData.rol === 'empleado') {
                    navigate('/venta');
                } else if (userData.rol === 'tecnico') {
                    navigate('/tecnico');
                } else {
                    setError("Rol no reconocido en el sistema.");
                }
            } else {
                setError("No se encontro un perfil de Firestore vinculado a este usuario.");
            }
        } catch (err) {
            console.error("Error en login:", err.code);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("Correo o contrasena incorrectos.");
            } else if (err.code === 'auth/invalid-email') {
                setError("El formato del correo no es valido.");
            } else {
                setError("Error al conectar con el servidor. Revisa tu conexion.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-shell">
                <div className="login-header">
                    <div className="login-logo">S</div>
                    <h2 className="login-title">Sellix</h2>
                    <p className="login-subtitle">Punto de venta multi-sucursal</p>
                </div>

                <div className="login-card">
                    <form onSubmit={handleSubmit} className="form-stack">
                        {error && (
                            <div className="login-error">
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="form-label">
                                Correo
                            </label>
                            <input
                                type="email"
                                required
                                className="login-input"
                                placeholder="admin@sellix.mx"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="form-label">
                                Contrasena
                            </label>
                            <input
                                type="password"
                                required
                                className="login-input"
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`login-submit ${loading ? 'login-submit-loading' : 'login-submit-active'}`}
                        >
                            {loading ? 'Validando...' : 'Iniciar sesion'}
                        </button>

                        <div className="login-auto-role">
                            <span />
                            <p>Acceso automatico por rol</p>
                            <span />
                        </div>
                    </form>
                </div>

                <p className="app-footer-note">
                    Sellix POS - operacion segura multi-sucursal
                </p>
            </div>
        </div>
    );
};

export default Login;
