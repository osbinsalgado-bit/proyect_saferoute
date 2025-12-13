import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabaseClient';
import { uploadAvatarToStorage, resolveAvatarPublicUrl } from '../services/profileService';

// --- DEFINICIONES DE TIPOS ---

export interface RouteItem {
  id: string;
  name: string;
  origin_text: string;
  origin_lat: number;
  origin_lng: number;
  destination_text: string;
  destination_lat: number;
  destination_lng: number;
  scheduled_time?: string; // Solo para rutas programadas
  transport_mode?: string;
}

export interface ClientState {
  // Datos Perfil
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  
  // Estado UI
  loading: boolean;
  error: string | null;
  
  // Datos Casa
  homeAddress: string | null;   
  homeLatitude: number | null;   
  homeLongitude: number | null; 
  
  // Datos Rutas
  favoriteRoutes: RouteItem[];
  scheduledRoutes: RouteItem[];
}

const initialState: ClientState = {
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  profileImage: null,
  loading: false,
  error: null,
  homeAddress: null,
  homeLatitude: null,
  homeLongitude: null,
  favoriteRoutes: [],
  scheduledRoutes: [],
};

// ==========================================
// 1. GESTIÓN DE PERFIL Y CASA
// ==========================================

// --- TRAER PERFIL (Fetch) ---
export const fetchClientProfile = createAsyncThunk(
  'client/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Perfil no encontrado');

      const publicUrl = await resolveAvatarPublicUrl(data.avatar_url);

      return {
        id: data.id,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        profileImage: publicUrl,
        homeAddress: data.home_address_text || null,
        homeLatitude: data.home_latitude || null,
        homeLongitude: data.home_longitude || null,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error al obtener perfil');
    }
  }
);

// --- ACTUALIZAR DATOS DE TEXTO (Upsert) ---
export const upsertClientProfile = createAsyncThunk(
  'client/upsertProfile',
  async ({ userId, payload }: { userId: string; payload: Partial<ClientState> }, { rejectWithValue }) => {
    try {
      const updates = {
        id: userId,
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone: payload.phone,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(updates)
        .select()
        .single();

      if (error) throw error;

      return {
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error al actualizar perfil');
    }
  }
);

// --- GUARDAR CASA (Update Home) ---
export const updateHomeLocation = createAsyncThunk(
  'client/updateHomeLocation',
  async ({ userId, address, lat, lng }: { userId: string, address: string, lat: number, lng: number }, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          home_address_text: address,
          home_latitude: lat,
          home_longitude: lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      return { address, lat, lng };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error al guardar casa');
    }
  }
);

// --- SUBIR IMAGEN (Upload) ---
export const uploadProfileImage = createAsyncThunk(
  'client/uploadProfileImage',
  async ({ userId, fileUri }: { userId: string; fileUri: string }, { rejectWithValue }) => {
    try {
      const { path, publicUrl } = await uploadAvatarToStorage(fileUri, userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: path, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      return publicUrl; 
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error al subir imagen');
    }
  }
);

// --- VERIFICAR CONTRASEÑA (Seguridad) ---
export const verifyPassword = createAsyncThunk(
  'client/verifyPassword',
  async ({ email, password }: { email: string, password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      return rejectWithValue('Contraseña incorrecta');
    }
  }
);

// ==========================================
// 2. GESTIÓN DE RUTAS (FAVORITAS Y PROGRAMADAS)
// ==========================================

// --- Fetch Favoritas ---
export const fetchFavoriteRoutes = createAsyncThunk(
  'routes/fetchFavorites',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('favorite_routes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

// --- Guardar Favorita ---
export const saveFavoriteRoute = createAsyncThunk(
  'routes/saveFavorite',
  async (payload: { userId: string, name: string, origin: any, destination: any }, { rejectWithValue }) => {
    try {
      const { error } = await supabase.from('favorite_routes').insert({
        user_id: payload.userId,
        name: payload.name,
        origin_text: payload.origin.address,
        origin_lat: payload.origin.lat,
        origin_lng: payload.origin.lng,
        destination_text: payload.destination.address,
        destination_lat: payload.destination.lat,
        destination_lng: payload.destination.lng
      });
      if (error) throw error;
      return true;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

// --- Borrar Favoritas ---
export const deleteFavoriteRoutes = createAsyncThunk(
  'routes/deleteFavorites',
  async (ids: string[], { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('favorite_routes')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return ids;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

// --- Fetch Programadas ---
export const fetchScheduledRoutes = createAsyncThunk(
  'routes/fetchScheduled',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_routes')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_time', { ascending: true });
      if (error) throw error;
      return data;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

// --- Programar Nueva Ruta ---
export const scheduleRoute = createAsyncThunk(
  'routes/schedule',
  async (payload: { userId: string, name: string, date: string, origin: any, destination: any, mode: string }, { rejectWithValue }) => {
    try {
      const { error } = await supabase.from('scheduled_routes').insert({
        user_id: payload.userId,
        name: payload.name,
        scheduled_time: payload.date,
        origin_text: payload.origin.address,
        origin_lat: payload.origin.lat,
        origin_lng: payload.origin.lng,
        destination_text: payload.destination.address,
        destination_lat: payload.destination.lat,
        destination_lng: payload.destination.lng,
        transport_mode: payload.mode
      });
      if (error) throw error;
      return true;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

// --- Borrar Programadas ---
export const deleteScheduledRoutes = createAsyncThunk(
  'routes/deleteScheduled',
  async (ids: string[], { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('scheduled_routes')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return ids;
    } catch (err: any) { return rejectWithValue(err.message); }
  }
);

// ==========================================
// 3. SLICE PRINCIPAL
// ==========================================

const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    logoutClient: () => initialState,
    updateLocalClient: (state, action: PayloadAction<Partial<ClientState>>) => {
      Object.assign(state, action.payload);
    }
  },
  extraReducers: (builder) => {
    // --- PERFIL ---
    builder.addCase(fetchClientProfile.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchClientProfile.fulfilled, (state, action) => {
      state.loading = false;
      Object.assign(state, action.payload);
    });
    builder.addCase(fetchClientProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(upsertClientProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.firstName = action.payload.firstName;
      state.lastName = action.payload.lastName;
      state.phone = action.payload.phone;
    });

    // --- IMAGEN ---
    builder.addCase(uploadProfileImage.pending, (state) => { state.loading = true; });
    builder.addCase(uploadProfileImage.fulfilled, (state, action) => {
      state.loading = false;
      state.profileImage = action.payload;
    });

    // --- CASA ---
    builder.addCase(updateHomeLocation.pending, (state) => { state.loading = true; });
    builder.addCase(updateHomeLocation.fulfilled, (state, action) => {
      state.loading = false;
      state.homeAddress = action.payload.address;
      state.homeLatitude = action.payload.lat;
      state.homeLongitude = action.payload.lng;
    });
    builder.addCase(updateHomeLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
    });

    // --- FAVORITOS ---
    builder.addCase(fetchFavoriteRoutes.fulfilled, (state, action) => {
      state.favoriteRoutes = action.payload;
    });
    builder.addCase(deleteFavoriteRoutes.fulfilled, (state, action) => {
      // Elimina localmente las rutas que coinciden con los IDs borrados
      state.favoriteRoutes = state.favoriteRoutes.filter(r => !action.payload.includes(r.id));
    });

    // --- PROGRAMADAS ---
    builder.addCase(fetchScheduledRoutes.fulfilled, (state, action) => {
      state.scheduledRoutes = action.payload;
    });
    builder.addCase(deleteScheduledRoutes.fulfilled, (state, action) => {
      // Elimina localmente las rutas que coinciden con los IDs borrados
      state.scheduledRoutes = state.scheduledRoutes.filter(r => !action.payload.includes(r.id));
    });
    
    // Al guardar o programar, no actualizamos el estado aquí directamente 
    // porque es mejor volver a hacer un fetch o simplemente dejar que la UI lo maneje,
    // pero si quisieras agregarla manualmente al array, podrías hacerlo aquí retornando el objeto creado en el thunk.
  }
});

export const { logoutClient, updateLocalClient } = clientSlice.actions;
export default clientSlice.reducer;