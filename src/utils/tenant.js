export const SUPER_ADMIN_EMAIL = 'gianarellano98@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'Carlosgian';

export const GIRO_TECNOLOGIA = 'tecnologia';
export const GIRO_TIENDA = 'tienda';

export const GIROS_NEGOCIO = {
    [GIRO_TECNOLOGIA]: {
        label: 'Tecnologia',
        categoria: 'Ej: Audifonos',
        subcategoria: 'Ej: Diadema',
        marca: 'Ej: Samsung, Apple, Sony...',
        modelo: 'Ej: iPhone 15 Pro',
        descripcion: 'Ej: Cargador tipo C Samsung blanco',
        color: 'Ej: Negro, blanco, transparente',
        codigo: 'Ej: 7501001',
        busquedaVenta: 'Buscar por codigo, nombre, marca...',
        busquedaInventario: 'Codigo, nombre, marca, modelo...'
    },
    [GIRO_TIENDA]: {
        label: 'Tienda',
        categoria: 'Ej: Abarrotes',
        subcategoria: 'Ej: Enlatados',
        marca: 'Ej: La Costena, Herdez, Bimbo...',
        modelo: 'Ej: 220 g, familiar, paquete',
        descripcion: 'Ej: Salsa verde La Costena 220 g',
        color: 'Ej: Presentacion, sabor o tamano',
        codigo: 'Ej: 7501001001001',
        busquedaVenta: 'Buscar por codigo, producto, marca...',
        busquedaInventario: 'Codigo, producto, marca, presentacion...'
    }
};

export const esSuperAdmin = (user) => user?.rol === 'super_admin';

export const obtenerGiroNegocio = (user) => user?.giroNegocio || GIRO_TECNOLOGIA;

export const obtenerConfigGiro = (userOrGiro) => {
    const giro = typeof userOrGiro === 'string' ? userOrGiro : obtenerGiroNegocio(userOrGiro);
    return GIROS_NEGOCIO[giro] || GIROS_NEGOCIO[GIRO_TECNOLOGIA];
};

export const permiteTecnicos = (user) => obtenerGiroNegocio(user) === GIRO_TECNOLOGIA;

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
        giroNegocio: data.giroNegocio || obtenerGiroNegocio(user),
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
