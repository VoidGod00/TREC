import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, Mail, Lock } from 'lucide-react';
import { loginUser, clearError } from '../store/slices/authSlice';
import { Button, Input } from '../components/common';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const onSubmit = async (data) => {
    const result = await dispatch(loginUser(data));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            TREC
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 mt-3.5" />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 mt-3.5" />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
