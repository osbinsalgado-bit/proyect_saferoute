import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabaseClient';
import { uploadAvatarToStorage, resolveAvatarPublicUrl } from '../services/profileService';

// Definición del estado
export interface ClientState {
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  loading: boolean;
  error: string | null;
  homeAddress: string | null;   
  homeLatitude: number | null;   
  homeLongitude: number | null; 
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
};

// --- 1. TRAER PERFIL (Fetch) ---
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

// --- 2. ACTUALIZAR DATOS DE TEXTO (Upsert) ---
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

// --- 3. GUARDAR CASA (Update Home) ---
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

// --- 4. SUBIR IMAGEN (Upload) ---
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

// --- SLICE ---
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
    // Fetch Profile
    builder.addCase(fetchClientProfile.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchClientProfile.fulfilled, (state, action) => {
      state.loading = false;
      Object.assign(state, action.payload);
    });
    builder.addCase(fetchClientProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Upsert Profile
    builder.addCase(upsertClientProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.firstName = action.payload.firstName;
      state.lastName = action.payload.lastName;
      state.phone = action.payload.phone;
    });

    // Upload Image
    builder.addCase(uploadProfileImage.pending, (state) => { state.loading = true; });
    builder.addCase(uploadProfileImage.fulfilled, (state, action) => {
      state.loading = false;
      state.profileImage = action.payload;
    });

    // Update Home Location
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
  }
});

export const { logoutClient, updateLocalClient } = clientSlice.actions;
export default clientSlice.reducer;