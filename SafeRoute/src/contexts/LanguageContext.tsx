import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18n } from "i18n-js";
import { translations } from "../util/translations";


export type Language = 'es' | 'en' | 'fr' | 'de';


const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = "es"; 

type LanguageContextProps = {
    language: Language;
    changeLanguage: (lng: Language) => Promise<void>;
    t: (scope: string, options?: any) => string;
    i18n: I18n;
}

const LanguageContext = createContext<LanguageContextProps | null>(null);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage debe usarse dentro de LanguageProvider");
    }
    return context; 
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguage] = useState<Language>("es");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const storedLanguage = await AsyncStorage.getItem("language");
                if (storedLanguage) {
                    const lang = storedLanguage as Language;
                    setLanguage(lang);
                    i18n.locale = lang;
                } else {
                    setLanguage("es");
                    i18n.locale = "es";
                }
            } catch (error) {
                console.error("Error cargando el idioma:", error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadLanguage();
    }, []);

    const changeLanguage = async (lng: Language) => {
        setLanguage(lng);
        i18n.locale = lng;
        try {
            await AsyncStorage.setItem("language", lng);
        } catch (error) {
            console.error("Error guardando el idioma:", error);
        }
    }

    const t = (scope: string, options?: any) => i18n.t(scope, options);

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t, i18n }}>
            {children}
        </LanguageContext.Provider>
    );
}

export { i18n };