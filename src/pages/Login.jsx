import React, { useState } from 'react';
import { auth, db } from '../services/firebase'; // Importamos la conexión
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // Para mostrar errores al usuario

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // 1. Intentar login en Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Consultar el rol del usuario en Firestore
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("Bienvenido:", userData.nombre, "Rol:", userData.rol);
                alert(`Bienvenido ${userData.nombre} (${userData.rol})`);

                // Aquí es donde después redireccionaremos según el rol
            } else {
                setError("El usuario no tiene datos registrados en el sistema.");
            }
        } catch (err) {
            console.error(err);
            setError("Correo o contraseña incorrectos.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Punto de Venta</h2>
                    <p className="text-gray-500">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="admin@test.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Entrar al sistema
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;