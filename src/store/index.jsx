// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import deviceReducer   from './slices/deviceSlice';
import licenseReducer  from './slices/licenseSlice';
import trialReducer    from './slices/trialSlice';

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    dashboard: dashboardReducer,
    devices:   deviceReducer,
    licenses:  licenseReducer,
    trial:     trialReducer,
  },
});

export default store;