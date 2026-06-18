import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const auth = getAuth();

const GIROS_VALIDOS = new Set(["tecnologia", "tienda", "comida"]);
const ROLES_STAFF_VALIDOS = new Set(["empleado", "tecnico"]);
const REGION = "us-central1";
const OPCIONES_SEGURAS = {
    region: REGION,
    enforceAppCheck: true
};

const normalizarEmail = (email) => String(email || "").trim().toLowerCase();
const limpiarTexto = (value, max = 120) => String(value || "").trim().slice(0, max);

const exigirAuth = async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Inicia sesion para continuar.");
    }
    const snap = await db.collection("usuarios").doc(request.auth.uid).get();
    if (!snap.exists) {
        throw new HttpsError("permission-denied", "Usuario sin perfil autorizado.");
    }
    return { uid: request.auth.uid, ...snap.data() };
};

const exigirRol = (user, roles) => {
    if (!roles.includes(user.rol)) {
        throw new HttpsError("permission-denied", "No tienes permisos para esta accion.");
    }
};

const exigirTenant = (user, data) => {
    if (user.rol === "super_admin") return;
    if (!data?.negocioId || data.negocioId !== user.negocioId) {
        throw new HttpsError("permission-denied", "El recurso no pertenece a tu negocio.");
    }
};

const aplicarRateLimit = async (uid, action, maxIntentos = 20, ventanaMs = 60 * 1000) => {
    const ref = db.collection("_rate_limits").doc(`${uid}_${action}`);
    const ahora = Date.now();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : {};
        const resetAt = Number(data.resetAt || 0);
        const countActual = resetAt > ahora ? Number(data.count || 0) : 0;

        if (countActual >= maxIntentos) {
            throw new HttpsError("resource-exhausted", "Demasiados intentos. Espera un momento.");
        }

        tx.set(ref, {
            uid,
            action,
            count: countActual + 1,
            resetAt: resetAt > ahora ? resetAt : ahora + ventanaMs,
            updatedAt: new Date()
        }, { merge: true });
    });
};

const crearUsuarioAuth = async ({ email, password, nombre }) => {
    try {
        return await auth.createUser({
            email,
            password,
            displayName: nombre,
            emailVerified: false,
            disabled: false
        });
    } catch (error) {
        if (error.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "Ese correo ya esta registrado.");
        }
        if (error.code === "auth/invalid-password") {
            throw new HttpsError("invalid-argument", "La contrasena no cumple los requisitos.");
        }
        throw new HttpsError("internal", error.message || "No se pudo crear el usuario.");
    }
};

export const createAdminAccount = onCall(OPCIONES_SEGURAS, async (request) => {
    const requester = await exigirAuth(request);
    exigirRol(requester, ["super_admin"]);
    await aplicarRateLimit(requester.uid, "create_admin", 10, 60 * 60 * 1000);

    const nombre = limpiarTexto(request.data?.nombre);
    const negocioNombre = limpiarTexto(request.data?.negocioNombre);
    const giroNegocio = GIROS_VALIDOS.has(request.data?.giroNegocio) ? request.data.giroNegocio : "tecnologia";
    const email = normalizarEmail(request.data?.email);
    const password = String(request.data?.password || "");

    if (!nombre || !negocioNombre || !email || password.length < 6) {
        throw new HttpsError("invalid-argument", "Completa nombre, negocio, correo y contrasena valida.");
    }

    const created = await crearUsuarioAuth({ email, password, nombre });
    const now = new Date();

    await db.collection("usuarios").doc(created.uid).set({
        uid: created.uid,
        nombre,
        email,
        rol: "admin",
        negocioId: created.uid,
        adminId: created.uid,
        negocioNombre: negocioNombre || nombre,
        giroNegocio,
        creadoPorSuperAdminId: requester.uid,
        fechaAlta: now
    });

    return { uid: created.uid };
});

export const updateAdminAccount = onCall(OPCIONES_SEGURAS, async (request) => {
    const requester = await exigirAuth(request);
    exigirRol(requester, ["super_admin"]);
    await aplicarRateLimit(requester.uid, "update_admin", 60, 60 * 1000);

    const adminId = limpiarTexto(request.data?.adminId);
    const nombre = limpiarTexto(request.data?.nombre);
    const negocioNombre = limpiarTexto(request.data?.negocioNombre);
    const giroNegocio = GIROS_VALIDOS.has(request.data?.giroNegocio) ? request.data.giroNegocio : "tecnologia";

    if (!adminId || !nombre || !negocioNombre) {
        throw new HttpsError("invalid-argument", "Faltan datos para actualizar el admin.");
    }

    await db.collection("usuarios").doc(adminId).update({
        nombre,
        negocioNombre,
        giroNegocio,
        actualizadoPorSuperAdminId: requester.uid,
        actualizadoEn: new Date()
    });

    return { ok: true };
});

export const deleteAdminAccount = onCall(OPCIONES_SEGURAS, async (request) => {
    const requester = await exigirAuth(request);
    exigirRol(requester, ["super_admin"]);
    await aplicarRateLimit(requester.uid, "delete_admin", 20, 60 * 1000);

    const adminId = limpiarTexto(request.data?.adminId);
    if (!adminId || adminId === requester.uid) {
        throw new HttpsError("invalid-argument", "Admin invalido.");
    }

    await db.collection("usuarios").doc(adminId).delete();
    try {
        await auth.deleteUser(adminId);
    } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
    }

    return { ok: true };
});

export const createStaffAccount = onCall(OPCIONES_SEGURAS, async (request) => {
    const requester = await exigirAuth(request);
    exigirRol(requester, ["admin"]);
    await aplicarRateLimit(requester.uid, "create_staff", 20, 60 * 60 * 1000);

    const nombre = limpiarTexto(request.data?.nombre);
    const email = normalizarEmail(request.data?.email);
    const password = String(request.data?.password || "");
    const rolSolicitado = String(request.data?.rol || "empleado");
    const rol = ROLES_STAFF_VALIDOS.has(rolSolicitado) ? rolSolicitado : "empleado";
    const sucursalId = limpiarTexto(request.data?.sucursalId);
    const permiteTecnicos = requester.giroNegocio === "tecnologia";
    const rolSeguro = permiteTecnicos ? rol : "empleado";

    if (!nombre || !email || password.length < 6) {
        throw new HttpsError("invalid-argument", "Completa nombre, correo y contrasena valida.");
    }
    if (rolSeguro === "empleado" && !sucursalId) {
        throw new HttpsError("invalid-argument", "Selecciona una sucursal.");
    }

    const created = await crearUsuarioAuth({ email, password, nombre });
    const now = new Date();

    await db.collection("usuarios").doc(created.uid).set({
        uid: created.uid,
        nombre,
        email,
        rol: rolSeguro,
        sucursalId: rolSeguro === "empleado" ? sucursalId : "",
        negocioId: requester.negocioId,
        adminId: requester.uid,
        giroNegocio: requester.giroNegocio || "tecnologia",
        creadoPorId: requester.uid,
        creadoPorNombre: requester.nombre || requester.email || "Admin",
        fechaAlta: now
    });

    return { uid: created.uid };
});

export const updateStaffAccount = onCall(OPCIONES_SEGURAS, async (request) => {
    const requester = await exigirAuth(request);
    exigirRol(requester, ["admin"]);
    await aplicarRateLimit(requester.uid, "update_staff", 80, 60 * 1000);

    const userId = limpiarTexto(request.data?.userId);
    const nombre = limpiarTexto(request.data?.nombre);
    const rolSolicitado = String(request.data?.rol || "empleado");
    const rol = ROLES_STAFF_VALIDOS.has(rolSolicitado) ? rolSolicitado : "empleado";
    const sucursalId = limpiarTexto(request.data?.sucursalId);
    const permiteTecnicos = requester.giroNegocio === "tecnologia";
    const rolSeguro = permiteTecnicos ? rol : "empleado";

    if (!userId || !nombre) {
        throw new HttpsError("invalid-argument", "Faltan datos para actualizar usuario.");
    }

    const targetRef = db.collection("usuarios").doc(userId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
        throw new HttpsError("not-found", "Usuario no encontrado.");
    }
    exigirTenant(requester, targetSnap.data());

    await targetRef.update({
        nombre,
        rol: rolSeguro,
        sucursalId: rolSeguro === "empleado" ? sucursalId : "",
        negocioId: requester.negocioId,
        adminId: requester.uid,
        giroNegocio: requester.giroNegocio || "tecnologia",
        actualizadoPorId: requester.uid,
        actualizadoEn: new Date()
    });

    await auth.updateUser(userId, { displayName: nombre });

    return { ok: true };
});

export const deleteStaffAccount = onCall(OPCIONES_SEGURAS, async (request) => {
    const requester = await exigirAuth(request);
    exigirRol(requester, ["admin"]);
    await aplicarRateLimit(requester.uid, "delete_staff", 40, 60 * 1000);

    const userId = limpiarTexto(request.data?.userId);
    if (!userId || userId === requester.uid) {
        throw new HttpsError("invalid-argument", "Usuario invalido.");
    }

    const targetRef = db.collection("usuarios").doc(userId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
        throw new HttpsError("not-found", "Usuario no encontrado.");
    }
    const target = targetSnap.data();
    exigirTenant(requester, target);
    if (!ROLES_STAFF_VALIDOS.has(target.rol)) {
        throw new HttpsError("permission-denied", "Solo puedes quitar empleados o tecnicos.");
    }

    await targetRef.delete();
    try {
        await auth.deleteUser(userId);
    } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
    }

    return { ok: true };
});
