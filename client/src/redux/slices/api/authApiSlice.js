import { USERS_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/login`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),
    register: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/register`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/logout`,
        method: "POST",
        credentials: "include",
      }),
    }),
    verifyToken: builder.query({
      query: () => ({
        url: `${USERS_URL}/verify`,
        method: "GET",
        credentials: "include",
      }),
      transformResponse: (response) => {
        return { valid: true, ...response };
      },
      transformErrorResponse: (error) => {
        return { valid: false, error };
      },
      keepUnusedDataFor: 0, // Don't cache the verify result
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useLazyVerifyTokenQuery
} = authApiSlice;