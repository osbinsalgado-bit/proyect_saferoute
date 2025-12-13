import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    login: (email:string, password:string) => Promise<any>;
    register: (email:string, password:string, data: any) => Promise<any>;
    logout: () => Promise<void>;
    // AGREGAMOS ESTO: Definición de la nueva función
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
}

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setIsLoading(false);
        };
        restoreSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const result = await supabase.auth.signInWithPassword({ email, password });
        return result; 
    };

    const register = async (email: string, password: string, userData: any) => {
        const result = await supabase.auth.signUp({
            email,
            password,
            options: { data: userData }
        });
        return result;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    };

    // --- NUEVA FUNCIÓN AGREGADA ---
    const changePassword = async (oldPassword: string, newPassword: string) => {
        if (!user || !user.email) throw new Error("No hay usuario autenticado.");

        // 1. Verificar la contraseña vieja haciendo un re-login silencioso
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: oldPassword
        });

        if (signInError) {
            throw new Error("La contraseña actual es incorrecta.");
        }

        // 2. Si la vieja es correcta, actualizamos a la nueva
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            throw new Error(updateError.message);
        }
    };

    return (
        // Agregamos changePassword al value del provider
        <AuthContext.Provider value={{ user, session, isLoading, login, register, logout, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
};