import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SUPER_ADMIN_EMAIL } from '../utils/tenant';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Escucha si el estado de auth cambia (login/logout)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const docRef = doc(db, "usuarios", firebaseUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL && data.rol !== 'super_admin') {
                        await setDoc(docRef, { ...data, uid: firebaseUser.uid, email: firebaseUser.email, rol: 'super_admin', negocioId: 'sellix_global' }, { merge: true });
                        setUser({ uid: firebaseUser.uid, ...data, email: firebaseUser.email, rol: 'super_admin', negocioId: 'sellix_global' });
                    } else {
                        setUser({ uid: firebaseUser.uid, ...data });
                    }
                } else if (firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
                    const superAdmin = {
                        uid: firebaseUser.uid,
                        nombre: 'Super Admin',
                        email: firebaseUser.email,
                        rol: 'super_admin',
                        negocioId: 'sellix_global',
                        fechaAlta: new Date()
                    };
                    await setDoc(docRef, superAdmin);
                    setUser(superAdmin);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
