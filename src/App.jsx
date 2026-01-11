import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

// Componente para proteger rutas
const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();
  if (loading) return <p>Cargando...</p>;
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

          {/* Ruta solo para Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roleRequired="admin">
              <div className="p-10">
                <h1 className="text-2xl font-bold">Panel de Administrador</h1>
                <p>Bienvenido, {auth.currentUser?.email}</p>
              </div>
            </ProtectedRoute>
          } />

          {/* Ruta para Empleados */}
          <Route path="/venta" element={
            <ProtectedRoute roleRequired="empleado">
              <div className="p-10"><h1>Punto de Venta (Sucursal)</h1></div>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;