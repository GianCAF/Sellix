import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminSucursales from './pages/AdminSucursales';
import AdminUsuarios from './pages/AdminUsuarios';
import AdminCategorias from './pages/AdminCategorias';
import AdminMarcas from './pages/AdminMarcas';

// Componente para proteger las rutas
const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>;

  if (!user) return <Navigate to="/" />;

  if (roleRequired && user.rol !== roleRequired) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta Pública */}
          <Route path="/" element={<Login />} />

          {/* Rutas de Administrador */}
          <Route path="/admin" element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/marcas" element={
            <ProtectedRoute roleRequired="admin">
              <AdminMarcas />
            </ProtectedRoute>
          } />

          <Route path="/admin/usuarios" element={
            <ProtectedRoute roleRequired="admin">
              <AdminUsuarios />
            </ProtectedRoute>
          } />

          <Route path="/admin/sucursales" element={
            <ProtectedRoute roleRequired="admin">
              <AdminSucursales />
            </ProtectedRoute>
          } />

          <Route path="/admin/categorias" element={
            <ProtectedRoute roleRequired="admin">
              <AdminCategorias />
            </ProtectedRoute>
          } />

          {/* Ruta de Ventas (Empleado) */}
          <Route path="/venta" element={
            <ProtectedRoute roleRequired="empleado">
              <div className="p-10"><h1>Pantalla de Ventas - Próximamente</h1></div>
            </ProtectedRoute>
          } />

          {/* Redirección por defecto si la ruta no existe */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;