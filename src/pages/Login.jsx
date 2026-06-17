import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from '../utils/tenant';

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
            const correoNormalizado = email.trim().toLowerCase();
            let userCredential;
            try {
                userCredential = await signInWithEmailAndPassword(auth, correoNormalizado, password);
            } catch (err) {
                if (
                    correoNormalizado === SUPER_ADMIN_EMAIL &&
                    password === SUPER_ADMIN_PASSWORD &&
                    ['auth/user-not-found', 'auth/invalid-credential'].includes(err.code)
                ) {
                    userCredential = await createUserWithEmailAndPassword(auth, correoNormalizado, password);
                    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
                        uid: userCredential.user.uid,
                        nombre: 'Super Admin',
                        email: correoNormalizado,
                        rol: 'super_admin',
                        negocioId: 'sellix_global',
                        fechaAlta: new Date()
                    });
                } else {
                    throw err;
                }
            }
            const user = userCredential.user;
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();

                if (correoNormalizado === SUPER_ADMIN_EMAIL && userData.rol !== 'super_admin') {
                    await setDoc(doc(db, "usuarios", user.uid), {
                        ...userData,
                        uid: user.uid,
                        email: correoNormalizado,
                        rol: 'super_admin',
                        negocioId: 'sellix_global'
                    }, { merge: true });
                    navigate('/super-admin');
                } else if (userData.rol === 'super_admin') {
                    navigate('/super-admin');
                } else if (userData.rol === 'admin') {
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
