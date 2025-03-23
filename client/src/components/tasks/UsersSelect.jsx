import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { BsChevronExpand } from "react-icons/bs";
import { MdCheck } from "react-icons/md";
import { 
  useGetTeamMembersForTaskAssignmentQuery 
} from "../../redux/slices/api/userApiSlice.js";
import { getInitials } from "../../utils/index.js";

export default function UserList({ team, setTeam }) {
  const { 
    data: teamMembers, 
    isLoading, 
    error 
  } = useGetTeamMembersForTaskAssignmentQuery();
  
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userOptions, setUserOptions] = useState([]);

  // Process team members
  useEffect(() => {
    if (teamMembers && Array.isArray(teamMembers)) {
      // Normalize user data
      const processedUsers = teamMembers.map(member => ({
        _id: member._id || member.id || member.userId,
        name: member.name || member.fullName || member.username || 'Unknown User',
        email: member.email || '',
        team: member.team || member.department || ''
      }));

      setUserOptions(processedUsers);

      // Handle initial team selection
      if (team && team.length > 0) {
        const initialSelectedUsers = team.map(teamId => 
          processedUsers.find(user => 
            user._id === teamId || 
            user.id === teamId
          )
        ).filter(Boolean);

        if (initialSelectedUsers.length > 0) {
          setSelectedUsers(initialSelectedUsers);
        }
      }
    }
  }, [teamMembers, team]);

  // Handle user selection
  const handleChange = (selectedItems) => {
    // Ensure we're working with an array
    const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [selectedItems];
    
    setSelectedUsers(safeSelectedItems);
    
    // Extract IDs for setTeam
    const selectedIds = safeSelectedItems.map(item => 
      item._id || item.id || item
    ).filter(Boolean);
    
    setTeam(selectedIds);
  };

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <div className=''>
      <p className='text-slate-900 dark:text-gray-500'>Assign Task To:</p>
      <Listbox
        value={selectedUsers}
        onChange={handleChange}
        multiple
      >
        <div className='relative mt-1'>
          <Listbox.Button className='relative w-full cursor-default rounded bg-white pl-3 pr-10 text-left px-3 py-2.5 2xl:py-3 border border-gray-300 dark:border-gray-600 sm:text-sm'>
            <span className='block truncate'>
              {selectedUsers && selectedUsers.length > 0 
                ? selectedUsers.map(user => 
                    user?.name || user?.username || 'Unknown User'
                  ).join(", ")
                : "Select team members"}
            </span>
           
            <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
              <BsChevronExpand
                className='h-5 w-5 text-gray-400'
                aria-hidden='true'
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Listbox.Options className='z-50 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm'>
              {userOptions.map((user) => (
                <Listbox.Option
                  key={user._id || user.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? "bg-amber-100 text-amber-900" : "text-gray-900"
                    }`
                  }
                  value={user}
                >
                  {({ selected }) => (
                    <>
                      <div
                        className={`flex items-center gap-2 truncate ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        <div
                          className={
                            "w-6 h-6 rounded-full text-white flex items-center justify-center bg-violet-600"
                          }
                        >
                          <span className='text-center text-[10px]'>
                            {getInitials(user.name || 'UN')}
                          </span>
                        </div>
                        <span>{user.name}</span>
                        {user.team && <span className="text-xs text-gray-500">({user.team})</span>}
                      </div>
                      {selected ? (
                        <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600'>
                          <MdCheck className='h-5 w-5' aria-hidden='true' />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}