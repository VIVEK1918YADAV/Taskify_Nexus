import { Dialog } from "@headlessui/react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { useRegisterMutation } from "../redux/slices/api/authApiSlice";
import { useUpdateUserMutation, useGetManagersQuery } from "../redux/slices/api/userApiSlice";
import { setCredentials } from "../redux/slices/authSlice";
import { Button, Loading, ModalWrapper, Textbox } from "./";

const AddUser = ({ open, setOpen, userData }) => {
  let defaultValues = userData ?? {};
  const { user } = useSelector((state) => state.auth);
  const [hasManager, setHasManager] = useState(userData?.managerId ? true : false);
  const [needsManager, setNeedsManager] = useState(userData?.managerId ? true : false);
  const [selectedTeam, setSelectedTeam] = useState(userData?.team || "");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    clearErrors
  } = useForm({ defaultValues });

  const dispatch = useDispatch();
  const watchRole = watch("role");
  const watchTeam = watch("team");

  // Fetch all managers - we'll filter them in the component
  const { data: allManagers = [], isLoading: isLoadingManagers } = useGetManagersQuery('', {
    refetchOnMountOrArgChange: true,
  });

  // Filter managers based on the selected team
  const filteredManagers = selectedTeam 
    ? allManagers.filter(manager => manager.team === selectedTeam)
    : [];

  const [addNewUser, { isLoading }] = useRegisterMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  // Update selectedTeam when watchTeam changes
  useEffect(() => {
    if (watchTeam) {
      setSelectedTeam(watchTeam);
      // Clear manager selection when team changes
      setValue("managerId", "");
    }
  }, [watchTeam, setValue]);

  // Predefined roles
  const roles = [
    { value: "sub_admin", label: "Sub Admin" },
    { value: "manager", label: "Manager" },
    { value: "team_lead", label: "Team Lead" },
    { value: "team_member", label: "Team Member" }
  ];

  // Predefined teams
  const teams = [
    { value: "Development", label: "Development" },
    { value: "Sales", label: "Sales" },
    { value: "Infrastructure", label: "Infrastructure" },
    { value: "Design", label: "Design" },
    { value: "Marketing", label: "Marketing" }
  ];

  // Effect to handle role changes
  useEffect(() => {
    if (watchRole === "sub_admin") {
      setValue("managerId", "");
      setValue("team", "");
      setHasManager(false);
      clearErrors("managerId");
      clearErrors("team");
    } else if (watchRole === "manager") {
      setValue("managerId", "");
      setHasManager(false);
      clearErrors("managerId");
    } else {
      setHasManager(true);
      setNeedsManager(true);
    }
  }, [watchRole, setValue, clearErrors]);

  const handleOnSubmit = async (data) => {
    try {
      // If manager is not needed, clear the managerId field
      if (!needsManager) {
        data.managerId = "";
      }
      
      if (userData) {
        const res = await updateUser(data).unwrap();
        toast.success(res?.message);
        if (userData?._id === user?._id) {
          dispatch(setCredentials({ ...res?.user }));
        }
      } else {
        const res = await addNewUser({
          ...data,
          password: data?.email,
        }).unwrap();
        toast.success("New User added successfully");
      }

      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err) {
      console.log(err);
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <ModalWrapper open={open} setOpen={setOpen}>
      <form onSubmit={handleSubmit(handleOnSubmit)} className=''>
        <Dialog.Title
          as='h3'
          className='text-lg font-semibold leading-6 text-gray-900 mb-4'
        >
          {userData ? "UPDATE PROFILE" : "ADD NEW USER"}
        </Dialog.Title>
        <div className='mt-2 flex flex-col gap-5'>
          <Textbox
            placeholder='Full name'
            type='text'
            name='name'
            label='Full Name'
            className='w-full rounded'
            register={register("name", {
              required: "Full name is required!",
            })}
            error={errors.name ? errors.name.message : ""}
          />
          
          <Textbox
            placeholder='Title'
            type='text'
            name='title'
            label='Title'
            className='w-full rounded'
            register={register("title", {
              required: "Title is required!",
            })}
            error={errors.title ? errors.title.message : ""}
          />

          <Textbox
            placeholder='Email Address'
            type='email'
            name='email'
            label='Email Address'
            className='w-full rounded'
            register={register("email", {
              required: "Email Address is required!",
            })}
            error={errors.email ? errors.email.message : ""}
          />

          {/* Role Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              {...register("role", { required: "Role is required!" })}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <span className="text-sm text-red-500">{errors.role.message}</span>
            )}
          </div>

          {/* Team Dropdown - only required if not sub_admin */}
          {watchRole !== "sub_admin" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Team</label>
              <select
                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                {...register("team", { 
                  required: watchRole !== "sub_admin" ? "Team is required!" : false 
                })}
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
              {errors.team && (
                <span className="text-sm text-red-500">{errors.team.message}</span>
              )}
            </div>
          )}

          {/* Manager Selection Checkbox and Dropdown */}
          {hasManager && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="needsManager"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={needsManager}
                  onChange={(e) => {
                    setNeedsManager(e.target.checked);
                    if (!e.target.checked) {
                      setValue("managerId", "");
                      clearErrors("managerId");
                    }
                  }}
                />
                <label htmlFor="needsManager" className="text-sm font-medium text-gray-700">
                  Assign a manager to this user
                </label>
              </div>

              {needsManager && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Manager</label>
                  {isLoadingManagers ? (
                    <div className="p-2">Loading managers...</div>
                  ) : !selectedTeam ? (
                    <div className="text-sm text-amber-600 p-2">
                      Please select a team first to see available managers
                    </div>
                  ) : filteredManagers.length === 0 ? (
                    <div className="text-sm text-red-600 p-2">
                      No managers available for {selectedTeam} team
                    </div>
                  ) : (
                    <select
                      className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      {...register("managerId", {
                        required: needsManager ? "Manager selection is required!" : false,
                      })}
                    >
                      <option value="">Select Manager</option>
                      {filteredManagers.map((manager) => (
                        <option key={manager._id} value={manager._id}>
                          {manager.name} ({manager.team})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.managerId && (
                    <span className="text-sm text-red-500">{errors.managerId.message}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading || isUpdating ? (
          <div className='py-5'>
            <Loading />
          </div>
        ) : (
          <div className='py-3 mt-6 sm:flex sm:flex-row-reverse gap-3'>
            <Button
              type='submit'
              className='bg-blue-600 px-8 py-2 text-sm font-semibold text-white hover:bg-blue-700 rounded-md shadow-sm sm:w-auto'
              label='Submit'
            />
            <Button
              type='button'
              className='mt-3 bg-white px-5 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto'
              onClick={() => setOpen(false)}
              label='Cancel'
            />
          </div>
        )}
      </form>
    </ModalWrapper>
  );
};

export default AddUser;