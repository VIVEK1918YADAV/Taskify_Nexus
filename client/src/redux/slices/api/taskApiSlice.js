import { TASKS_URL, USERS_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const postApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createTask: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/create`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    duplicateTask: builder.mutation({
      query: (id) => ({
        url: `${TASKS_URL}/duplicate/${id}`,
        method: "POST",
        body: {},
        credentials: "include",
      }),
    }),

    updateTask: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/update/${data._id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    getAllTask: builder.query({
      query: ({ strQuery, isTrashed, search, managerId }) => ({
        url: `${TASKS_URL}?stage=${strQuery}&isTrashed=${isTrashed}&search=${search}${managerId ? `&managerId=${managerId}` : ''}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getSingleTask: builder.query({
      query: (id) => ({
        url: `${TASKS_URL}/${id}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    createSubTask: builder.mutation({
      query: ({ data, id }) => ({
        url: `${TASKS_URL}/create-subtask/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    postTaskActivity: builder.mutation({
      query: ({ data, id }) => ({
        url: `${TASKS_URL}/activity/${id}`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    trashTast: builder.mutation({
      query: ({ id }) => ({
        url: `${TASKS_URL}/${id}`,
        method: "PUT",
        credentials: "include",
      }),
    }),

    deleteRestoreTast: builder.mutation({
      query: ({ id, actionType }) => ({
        url: `${TASKS_URL}/delete-restore/${id}?actionType=${actionType}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    getDasboardStats: builder.query({
      query: (managerId) => ({
        url: `${TASKS_URL}/dashboard${managerId ? `?managerId=${managerId}` : ''}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    changeTaskStage: builder.mutation({
      query: (data) => ({
        url: `${TASKS_URL}/change-stage/${data?.id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
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
  usePostTaskActivityMutation,
  useCreateTaskMutation,
  useGetAllTaskQuery,
  useCreateSubTaskMutation,
  useTrashTastMutation,
  useDeleteRestoreTastMutation,
  useDuplicateTaskMutation,
  useUpdateTaskMutation,
  useGetSingleTaskQuery,
  useGetDasboardStatsQuery,
  useChangeTaskStageMutation,
  useGetTeamMembersQuery,
} = postApiSlice;