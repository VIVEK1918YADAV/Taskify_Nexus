import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Textbox } from "../components";
import { useLoginMutation, useLazyVerifyTokenQuery } from "../redux/slices/api/authApiSlice";
import { setCredentials, logout } from "../redux/slices/authSlice";
import { useEffect, useState } from "react";

const Login = () => {
  const { user } = useSelector((state) => state.auth);
  const [isValidating, setIsValidating] = useState(true);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [verifyToken] = useLazyVerifyTokenQuery();

  // Handle login form submission
  const handleLogin = async (data) => {
    try {
      const res = await login(data).unwrap();
      dispatch(setCredentials(res));
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  // Check if token is valid when component mounts
  useEffect(() => {
    const validateSession = async () => {
      if (user && user.token) {
        try {
          // Attempt to verify the token
          const result = await verifyToken().unwrap();
          if (result && result.valid) {
            navigate("/dashboard");
          } else {
            // Token invalid, clear credentials
            dispatch(logout());
            setIsValidating(false);
          }
        } catch (error) {
          // API call failed, token is likely invalid
          dispatch(logout());
          setIsValidating(false);
        }
      } else {
        // No user or token found, no need to validate
        setIsValidating(false);
      }
    };

    validateSession();
  }, [user, navigate, dispatch, verifyToken]);

  // Don't render login if already logged in and redirecting
  if (user && user.token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#302943] via-slate-900 to-black">
        <Loading />
      </div>
    );
  }

  // Show loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#302943] via-slate-900 to-black">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#302943] via-slate-900 to-black">
      {/* Main container with max width */}
      <div className="w-full max-w-md p-4">
        {/* Login form card */}
        <form
          onSubmit={handleSubmit(handleLogin)}
          className="bg-white dark:bg-slate-900 rounded-lg shadow-lg px-8 pt-10 pb-10 w-full"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-blue-600 text-3xl font-bold text-center mb-2">
              Welcome back!
            </h1>
            <p className="text-center text-base text-gray-700 dark:text-gray-500">
              Keep all your credentials safe!
            </p>
          </div>

          {/* Form fields */}
          <div className="space-y-6">
            <Textbox
              placeholder="test@gmail.com"
              type="email"
              name="email"
              label="Email Address"
              className="w-full rounded-full"
              register={register("email", {
                required: "Email Address is required!",
              })}
              error={errors.email ? errors.email.message : ""}
            />
            <Textbox
              placeholder="password"
              type="password"
              name="password"
              label="Password"
              className="w-full rounded-full"
              register={register("password", {
                required: "Password is required!",
              })}
              error={errors.password ? errors.password?.message : ""}
            />
            <div className="text-right">
              {/* <span className="text-sm text-gray-600 hover:underline cursor-pointer">
                Forgot Password?
              </span> */}
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-8">
            {isLoading ? (
              <Loading />
            ) : (
              <Button
                type="submit"
                label="Log in"
                className="w-full h-10 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors"
              />
            )}
          </div>
        </form>
      </div>  
    </div>
  );
};

export default Login;