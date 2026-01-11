import React, { useState } from 'react';
import { auth, db } from '../services/firebase'; // Nuestra conexión a Firebase
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
            // 1. Autenticación con Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Obtener los datos adicionales (rol) desde Firestore
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // 3. Redirección basada en el ROL
                if (userData.rol === 'admin') {
                    navigate('/admin');
                } else if (userData.rol === 'empleado') {
                    navigate('/venta');
                } else {
                    setError("El rol de este usuario no está definido.");
                }
            } else {
                setError("El usuario no tiene un perfil registrado en la base de datos.");
            }
        } catch (err) {
            console.error("Error en login:", err.code);
            // Mensajes de error amigables
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("Correo o contraseña incorrectos.");
            } else if (err.code === 'auth/invalid-email') {
                setError("El formato del correo no es válido.");
            } else {
                setError("Ocurrió un error al intentar ingresar. Revisa tu conexión.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 transition-all">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-extrabold text-blue-600">POS Multi-Sedes</h2>
                    <p className="text-gray-500 mt-2 font-medium">Panel de acceso</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm animate-pulse">
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Correo Institucional
                        </label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition-all active:scale-95 ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? 'Validando...' : 'Entrar al Sistema'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">
                        Punto de Venta PWA - v1.0 2026
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;