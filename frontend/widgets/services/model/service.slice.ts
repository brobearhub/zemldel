import { ServiceRecord, splitServicesByCity } from "@/entities/service";
import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/core/store/store";

interface ServiceState {
  services: ServiceRecord[];
}

const initialState: ServiceState = {
  services: [],
};

export const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {
    setServices: (state, action: PayloadAction<ServiceRecord[]>) => {
      state.services = action.payload;
    },
  },
});

export const { setServices } = serviceSlice.actions;

const selectServiceState = (state: RootState): ServiceState => state.service;

export const getServices = createSelector([selectServiceState], (state) => state.services);

/** Услуги, которые покрывают город явно или через область. */
export const getServicesInCity = (cityId: string, regionCode: string) =>
  createSelector([getServices], (services) =>
    splitServicesByCity(services, { id: cityId, regionCode }).mine,
  );

/** Услуги, которые выбранный город не покрывают. */
export const getServicesInOtherCities = (cityId: string, regionCode: string) =>
  createSelector([getServices], (services) =>
    splitServicesByCity(services, { id: cityId, regionCode }).other,
  );

export default serviceSlice.reducer;
