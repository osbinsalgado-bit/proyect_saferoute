// src/redux/index.ts
import { configureStore } from "@reduxjs/toolkit";
import clientReducer from './clientSlice'; // Asegura la ruta correcta

export const store = configureStore({
    reducer: {
        client: clientReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;