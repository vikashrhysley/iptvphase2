// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import deviceReducer   from './slices/deviceSlice';
import heartbeatReducer from './slices/heartbeatSlice';
import licenseReducer  from './slices/licenseSlice';
import trialReducer    from './slices/trialSlice';
import adminUsersReducer from './slices/adminUsersSlice';
import appUsersReducer   from './slices/appUsersSlice';

export const store = configureStore({
  reducer: {
    auth:       authReducer,
    dashboard:  dashboardReducer,
    devices:    deviceReducer,
    heartbeat:  heartbeatReducer,
    licenses:   licenseReducer,
    trial:      trialReducer,
    adminUsers: adminUsersReducer,
    appUsers:   appUsersReducer,
  },
});


export default store;
