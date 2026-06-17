export const SUPER_ADMIN_EMAIL = 'gianarellano98@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'Carlosgian';

export const esSuperAdmin = (user) => user?.rol === 'super_admin';

export const obtenerNegocioId = (user) => {
    if (!user) return '';
    if (esSuperAdmin(user)) return 'super_admin';
    return user.negocioId || user.adminId || user.uid || '';
};

export const aplicarTenant = (user, data = {}) => {
    const negocioId = obtenerNegocioId(user);
    return {
        ...data,
        negocioId,
        adminId: user?.rol === 'admin' ? user.uid : (user?.adminId || negocioId),
        creadoPorId: user?.uid || '',
        creadoPorNombre: user?.nombre || user?.email || ''
    };
};

export const perteneceAlTenant = (user, item = {}) => {
    if (!user) return false;
    if (esSuperAdmin(user)) return true;
    const negocioId = obtenerNegocioId(user);
    if (!item.negocioId && !item.adminId) return !user.negocioId && !user.adminId;
    return item.negocioId === negocioId || item.adminId === negocioId || item.creadoPorId === user.uid;
};
