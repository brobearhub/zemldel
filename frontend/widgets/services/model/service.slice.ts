import { ServiceRecord } from "@/entities/service";
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

/** Услуги провайдеров из указанного города. */
export const getServicesInCity = (cityId: string) =>
  createSelector([getServices], (services) =>
    services.filter((service) => service.provider.city?.id === cityId)
  );

/** Услуги провайдеров из других городов (с заданным городом, не совпадающим с cityId). */
export const getServicesInOtherCities = (cityId: string) =>
  createSelector([getServices], (services) =>
    services.filter(
      (service) =>
        service.provider.city?.id != null && service.provider.city.id !== cityId
    )
  );

export default serviceSlice.reducer;
