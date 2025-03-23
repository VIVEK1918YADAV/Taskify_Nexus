// src/redux/slices/api/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // You can add authorization headers here if needed
      return headers;
    },
    credentials: 'include', // This will send cookies with requests
  }),
  tagTypes: ['User', 'Task', 'Manager'],
  endpoints: (builder) => ({
    // Base endpoints can go here if needed
  }),
});

// Export hooks for usage in components
export const {
  // Any hooks generated from base endpoints
} = apiSlice;