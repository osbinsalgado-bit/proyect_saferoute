import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    // Importante: Prometemos devolver 'any' para manejar errores en la UI
    login: (email:string, password:string) => Promise<any>;
    register: (email:string, password:string, data: any) => Promise<any>;
    logout: () => Promise<void>;
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
        // Restaurar sesión al abrir la app
        const restoreSession = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setIsLoading(false);
        };
        restoreSession();

        // Escuchar cambios (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        // NO usamos Alert aquí. Retornamos el resultado para que LoginScreen muestre el mensaje con estilo.
        const result = await supabase.auth.signInWithPassword({ email, password });
        return result; 
    };

    const register = async (email: string, password: string, userData: any) => {
        const result = await supabase.auth.signUp({
            email,
            password,
            options: { data: userData } // Pasamos nombre, telefono para el trigger
        });
        return result;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};