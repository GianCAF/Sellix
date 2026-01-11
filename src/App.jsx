import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './services/firebase'; // <--- AGREGA ESTA LÍNEA
import Login from './pages/Login';

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!user) return <Navigate to="/" />;
  if (roleRequired && user.rol !== roleRequired) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/admin" element={
            <ProtectedRoute roleRequired="admin">
              <div className="p-10">
                <h1 className="text-3xl font-bold text-blue-600">Panel de Administrador</h1>
                <p className="mt-4 text-gray-600">Bienvenido, {auth.currentUser?.email}</p>
                <button
                  onClick={() => auth.signOut()}
                  className="mt-6 bg-red-500 text-white px-4 py-2 rounded"
                >
                  Cerrar Sesión
                </button>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/venta" element={
            <ProtectedRoute roleRequired="empleado">
              <div className="p-10">
                <h1 className="text-3xl font-bold text-green-600">Punto de Venta</h1>
                <p className="mt-4">Sesión de empleado activa.</p>
                <button
                  onClick={() => auth.signOut()}
                  className="mt-6 bg-red-500 text-white px-4 py-2 rounded"
                >
                  Cerrar Sesión
                </button>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;