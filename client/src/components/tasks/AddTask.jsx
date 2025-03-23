import { Dialog } from "@headlessui/react";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { BiImages } from "react-icons/bi";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "../../redux/slices/api/taskApiSlice";
import { dateFormatter } from "../../utils";
import { app } from "../../utils/firebase";
import Button from "../Button";
import Loading from "../Loading";
import ModalWrapper from "../ModalWrapper";
import SelectList from "../SelectList";
import Textbox from "../Textbox";
import UserList from "./UsersSelect";

const LISTS = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORITY = ["HIGH", "MEDIUM", "NORMAL", "LOW"];

const AddTask = ({ open, setOpen, task }) => {
  // Get user from Redux store to check role
  const { user } = useSelector((state) => state.auth);
  
  const defaultValues = {
    title: task?.title || "",
    date: dateFormatter(task?.date || new Date()),
    team: [],
    stage: task?.stage || LISTS[0],
    priority: task?.priority || PRIORITY[2],
    assets: [],
  };
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({ defaultValues });

  const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
  const [team, setTeam] = useState(task?.team || []);
  const [priority, setPriority] = useState(
    task?.priority?.toUpperCase() || PRIORITY[2]
  );
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileURLs, setUploadedFileURLs] = useState([]);

  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [existingAssets, setExistingAssets] = useState(task?.assets || []);

  // Function to handle team selection
  const handleTeamSelect = (selectedTeam) => {
    console.log("Team selected:", selectedTeam);
    setTeam(selectedTeam);
  };
  
  // Simplified isAdminOrManager function
  const isAdmin = () => {
    if (!user) return false;
    
    if (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') {
      return true;
    }
    
    if (user.isAdmin === true) {
      return true;
    }
    
    if (Array.isArray(user.roles) && user.roles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin')) {
      return true;
    }
    
    return false;
  };
  
  const isManager = () => {
    if (!user) return false;
    
    if (typeof user.role === 'string' && user.role.toLowerCase() === 'manager') {
      return true;
    }
    
    if (user.isManager === true) {
      return true;
    }
    
    if (Array.isArray(user.roles) && user.roles.some(r => typeof r === 'string' && r.toLowerCase() === 'manager')) {
      return true;
    }
    
    return false;
  };

  // Update form values when stage or priority changes
  useEffect(() => {
    setValue("stage", stage);
  }, [stage, setValue]);

  useEffect(() => {
    setValue("priority", priority);
  }, [priority, setValue]);
  
  // File upload function
  const uploadFile = async (file) => {
    const storage = getStorage(app);
    const name = new Date().getTime() + file.name;
    const storageRef = ref(storage, name);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error("Upload error:", error);
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => {
              console.log("File available at", downloadURL);
              resolve(downloadURL);
            })
            .catch((error) => {
              console.error("GetDownloadURL error:", error);
              reject(error);
            });
        }
      );
    });
  };

  const handleOnSubmit = async (data) => {
    // Validate that team is not empty
    if (team.length === 0) {
      toast.error("Please assign the task to at least one team member.");
      return;
    }

    try {
      setUploading(true);
      const uploadedURLs = [];
      
      // Upload each asset
      if (assets.length > 0) {
        for (let i = 0; i < assets.length; i++) {
          const file = assets[i];
          const downloadURL = await uploadFile(file);
          uploadedURLs.push(downloadURL);
        }
      }
      
      // Combine existing assets with newly uploaded ones
      const allAssets = [...existingAssets, ...uploadedURLs];
      
      const newData = {
        ...data,
        assets: allAssets,
        team,
        stage,
        priority,
      };

      console.log("Submitting task with data:", newData);

      const res = task?._id
        ? await updateTask({ ...newData, _id: task._id }).unwrap()
        : await createTask(newData).unwrap();

      toast.success(res.message);

      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("Error submitting task:", err);
      toast.error(err?.data?.message || err.error || "Failed to save task");
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log("Files selected:", e.target.files);
      setAssets(Array.from(e.target.files));
    }
  };

  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen}>
        <form onSubmit={handleSubmit(handleOnSubmit)} className=''>
          <Dialog.Title
            as='h2'
            className='text-base font-bold leading-6 text-gray-900 mb-4'
          >
            {task ? "UPDATE TASK" : "ADD TASK"}
          </Dialog.Title>
          <div className='mt-2 flex flex-col gap-6'>
            <Textbox
              placeholder='Task title'
              type='text'
              name='title'
              label='Task Title'
              className='w-full rounded'
              register={register("title", {
                required: "Title is required!",
              })}
              error={errors.title ? errors.title.message : ""}
            />
            
            {/* UserList component with required validation */}
            <div>
              <UserList setTeam={handleTeamSelect} team={team} />
              {team.length === 0 && (
                <p className="text-red-500 text-sm mt-1">Please assign the task to at least one person</p>
              )}
            </div>
            
            <div className='flex gap-4'>
              <SelectList
                label='Task Stage'
                lists={LISTS}
                selected={stage}
                setSelected={setStage}
                required={true}
              />
              <SelectList
                label='Priority Level'
                lists={PRIORITY}
                selected={priority}
                setSelected={setPriority}
                required={true}
              />
            </div>

            <div className='flex gap-4'>
              <div className='w-full'>
                <Textbox
                  placeholder='Date'
                  type='date'
                  name='date'
                  label='Task Date'
                  className='w-full rounded'
                  register={register("date", {
                    required: "Date is required!",
                  })}
                  error={errors.date ? errors.date.message : ""}
                />
              </div>
              {/* <div className='w-full flex items-center justify-center mt-4'>
                <label
                  className='flex items-center gap-1 text-base text-ascent-2 hover:text-ascent-1 cursor-pointer my-4'
                  htmlFor='imgUpload'
                >
                  <input
                    type='file'
                    className='hidden'
                    id='imgUpload'
                    onChange={handleSelect}
                    accept='.jpg, .png, .jpeg'
                    multiple={true}
                  />
                  <BiImages />
                  <span>Add Assets</span>
                </label>
                {assets.length > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    {assets.length} file(s) selected
                  </span>
                )}
              </div> */}
            </div>

            {existingAssets.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Existing Assets:</p>
                <div className="flex flex-wrap gap-2">
                  {existingAssets.map((url, index) => (
                    <div key={index} className="text-xs text-blue-600">
                      Asset {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isLoading || isUpdating || uploading ? (
            <div className='py-4'>
              <Loading />
            </div>
          ) : (
            <div className='bg-gray-50 py-6 sm:flex sm:flex-row-reverse gap-4'>
              <Button
                label='Submit'
                type='submit'
                className='bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto'
              />

              <Button
                type='button'
                className='bg-white px-5 text-sm font-semibold text-gray-900 sm:w-auto'
                onClick={() => setOpen(false)}
                label='Cancel'
              />
            </div>
          )}
        </form>
      </ModalWrapper>
    </>
  );
};

export default AddTask;