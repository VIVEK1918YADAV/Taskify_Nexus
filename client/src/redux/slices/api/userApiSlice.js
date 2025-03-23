import { USERS_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/profile`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),
    
    getTeamLists: builder.query({
      query: ({ search }) => ({
        url: `${USERS_URL}/get-team?search=${search}`,
        method: "GET",
        credentials: "include",
      }),
    }),
    
    // Endpoint to get team members for task assignment
    getTeamMembersForTaskAssignment: builder.query({
      query: () => ({
        url: `${USERS_URL}/team-members-for-tasks`,
        method: "GET",
        credentials: "include",
      }),
      transformResponse: (response) => {
        if (!response || response.length === 0) {
          return [];
        }
        return response;
      }
    }),
    
    // Endpoint to get all teams
    getAllTeams: builder.query({
      query: () => ({
        url: `${USERS_URL}/teams`,
        method: "GET",
        credentials: "include",
      }),
    }),
    
    // Updated endpoint to get managers with optional team filter
    getManagers: builder.query({
      query: (params) => {
        let url = `${USERS_URL}/managers`;
        // Add team filter if provided
        if (params && params.team) {
          url += `?team=${params.team}`;
        }
        return {
          url,
          method: "GET",
          credentials: "include",
        };
      },
    }),
    
    // Endpoint to get manager hierarchy
    getManagerHierarchy: builder.query({
      query: (managerId) => ({
        url: `${USERS_URL}/manager-hierarchy/${managerId}`,
        method: "GET",
        credentials: "include",
      }),
    }),
    
    getNotifications: builder.query({
      query: () => ({
        url: `${USERS_URL}/notifications`,
        method: "GET",
        credentials: "include",
      }),
    }),
    
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `${USERS_URL}/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),
    
    userAction: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/${data?.id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),
    
    markNotiAsRead: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/read-noti?isReadType=${data.type}&id=${data?.id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),
    
    changePassword: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/change-password`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),
    
    // Register a new user
    registerUser: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/register`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),
    
    // Assign manager to user
    assignManager: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/assign-manager`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),
    
    // Get teams query to return predefined teams
    getTeams: builder.query({
      query: () => ({
        url: `${USERS_URL}/teams`,
        method: "GET",
        credentials: "include",
      }),
      // Transform the response to provide default teams if API fails or returns empty
      transformResponse: (response) => {
        // Check if response has data
        if (!response || response.length === 0) {
          // Return a predefined list of teams
          return [
            "Development",
            "Sales",
            "Infrastructure",
            "Design",
            "Marketing"
          ];
        }
        return response;
      }
    }),
    
    // Get team members under a manager
    getTeamMembers: builder.query({
      query: (managerId) => ({
        url: `${USERS_URL}/team-members/${managerId}`,
        method: "GET",
        credentials: "include",
      }),
    }),
  }),
});

export const {
  useUpdateUserMutation,
  useGetTeamListsQuery,
  useDeleteUserMutation,
  useUserActionMutation,
  useChangePasswordMutation,
  useGetNotificationsQuery,
  useMarkNotiAsReadMutation,
  useGetAllTeamsQuery,
  useGetTeamsQuery,
  useGetManagersQuery,
  useGetManagerHierarchyQuery,
  useAssignManagerMutation,
  useGetTeamMembersQuery,
  useRegisterUserMutation,
  useGetTeamMembersForTaskAssignmentQuery,
} = userApiSlice;